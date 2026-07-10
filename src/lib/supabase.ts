// Supabase est optionnel — la messagerie fonctionne en local par défaut via /api/conv
export const isSupabaseConfigured = false;
export const supabase = null;

export interface Conversation {
  id: string;
  patient_phone: string;
  patient_name: string;
  created_at: string;
  last_msg_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_role: "patient" | "personnel";
  sender_name: string;
  content: string;
  created_at: string;
  read: boolean;
}

/** Retourne (ou crée) la conversation d'un patient via l'API locale */
export async function getOrCreateConversation(
  phone: string,
  name: string
): Promise<Conversation | null> {
  try {
    const res = await fetch("/api/conv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_phone: phone, patient_name: name }),
    });
    return await res.json();
  } catch {
    return null;
  }
}
