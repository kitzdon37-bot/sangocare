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

// GET /api/conv/[id]/msg?after=ISO — messages d'une conversation (optionnellement après une date)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const after = req.nextUrl.searchParams.get("after");
  const data = readData();
  let msgs = data.messages.filter((m: { conversation_id: string }) => m.conversation_id === id);
  if (after) {
    msgs = msgs.filter(
      (m: { created_at: string }) => new Date(m.created_at) > new Date(after)
    );
  }
  return NextResponse.json(msgs);
}

// POST /api/conv/[id]/msg — envoie un message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { sender_role, sender_name, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  const data = readData();
  const msg = {
    id: randomUUID(),
    conversation_id: id,
    sender_role,
    sender_name,
    content: content.trim(),
    created_at: new Date().toISOString(),
    read: false,
  };
  data.messages.push(msg);

  // Mettre à jour last_msg_at de la conversation
  const conv = data.conversations.find((c: { id: string }) => c.id === id);
  if (conv) conv.last_msg_at = msg.created_at;

  writeData(data);
  return NextResponse.json(msg);
}

// PATCH /api/conv/[id]/msg — marquer comme lus
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { sender_role } = await req.json();
  const data = readData();
  data.messages = data.messages.map((m: { conversation_id: string; sender_role: string }) =>
    m.conversation_id === id && m.sender_role === sender_role
      ? { ...m, read: true }
      : m
  );
  writeData(data);
  return NextResponse.json({ ok: true });
}
