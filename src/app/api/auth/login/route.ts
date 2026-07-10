import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME } from "@/lib/auth";

// ── Registre serveur (jamais envoyé au client) ────────────────────────────────
// En production : remplacer par une requête base de données
const PERSONNEL_REGISTRY: Record<string, { name: string; code: string }> = {
  "75000101": { name: "Dr. Béatrice Nzapa", code: "SICA2026" },
  "75000202": { name: "Dr. Jean-Paul Koyt",  code: "CHU2026"  },
  "75000303": { name: "Pauline Sérémadé",    code: "MSP-RCA"  },
  "75000404": { name: "Dr. Alphonse Gbékou", code: "CHU2026"  },
  "75000505": { name: "Pierre Yangba",        code: "PRO2026"  },
  "75000606": { name: "Dr. Marie Sata",       code: "PRO2026"  },
};

// Patients autorisés (en production : table users en base de données)
// Ici on accepte tout numéro non listé comme personnel → patient
const PATIENT_BLOCKLIST: string[] = []; // Numéros bannis

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });

  const { phone, role, proCode } = body as {
    phone: string;
    role: "patient" | "personnel";
    proCode?: string;
  };

  if (!phone || !role) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const cleanPhone = phone.replace(/[\s+]/g, "").replace(/^236/, "");

  // ── Vérification personnel ────────────────────────────────────────────────
  if (role === "personnel") {
    const record = PERSONNEL_REGISTRY[cleanPhone];
    const isValid = record && proCode && record.code === proCode.trim().toUpperCase();

    if (!isValid) {
      // Délai artificiel pour ralentir le brute-force
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json(
        { error: "Numéro ou code établissement incorrect. Contactez votre administrateur." },
        { status: 401 }
      );
    }

    const token = await signToken({ phone: "+236 " + phone, name: record.name, role: "personnel" });
    const res = NextResponse.json({ name: record.name, role: "personnel" });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,   // Inaccessible depuis JS → protège contre XSS
      sameSite: "lax",  // Protège contre CSRF
      secure: process.env.NODE_ENV === "production", // HTTPS uniquement en prod
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });
    return res;
  }

  // ── Vérification patient ──────────────────────────────────────────────────
  if (PATIENT_BLOCKLIST.includes(cleanPhone)) {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const patientName = body.name || "Utilisateur";
  const token = await signToken({ phone: "+236 " + phone, name: patientName, role: "patient" });
  const res = NextResponse.json({ name: patientName, role: "patient" });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
