import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FILE = path.join(process.cwd(), "src/data/chat.json");

function readData() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return { conversations: [], messages: [] };
  }
}

function writeData(data: object) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// GET /api/conv — liste toutes les conversations
export async function GET() {
  const data = readData();
  const convs = [...data.conversations].sort(
    (a: { last_msg_at: string }, b: { last_msg_at: string }) =>
      new Date(b.last_msg_at).getTime() - new Date(a.last_msg_at).getTime()
  );
  return NextResponse.json(convs);
}

// POST /api/conv — crée ou retrouve une conversation par numéro de téléphone
export async function POST(req: NextRequest) {
  const { patient_phone, patient_name } = await req.json();
  const data = readData();

  const existing = data.conversations.find(
    (c: { patient_phone: string }) => c.patient_phone === patient_phone
  );
  if (existing) return NextResponse.json(existing);

  const conv = {
    id: randomUUID(),
    patient_phone,
    patient_name,
    created_at: new Date().toISOString(),
    last_msg_at: new Date().toISOString(),
  };
  data.conversations.push(conv);
  writeData(data);
  return NextResponse.json(conv);
}
