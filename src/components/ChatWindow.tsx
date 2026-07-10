"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  sender_role: "patient" | "personnel";
  sender_name: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Props {
  conversationId: string;
  myRole: "patient" | "personnel";
  myName: string;
  peerName: string;
  onBack?: () => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday)
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function ChatWindow({
  conversationId,
  myRole,
  myName,
  peerName,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastTimestamp = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chargement initial
  useEffect(() => {
    fetch(`/api/conv/${conversationId}/msg`)
      .then((r) => r.json())
      .then((msgs: Message[]) => {
        setMessages(msgs);
        if (msgs.length > 0)
          lastTimestamp.current = msgs[msgs.length - 1].created_at;
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Marquer les messages de l'autre comme lus
    fetch(`/api/conv/${conversationId}/msg`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_role: myRole === "patient" ? "personnel" : "patient",
      }),
    });
  }, [conversationId, myRole]);

  // Polling toutes les 2 secondes pour les nouveaux messages
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const url = lastTimestamp.current
        ? `/api/conv/${conversationId}/msg?after=${encodeURIComponent(lastTimestamp.current)}`
        : `/api/conv/${conversationId}/msg`;
      try {
        const res = await fetch(url);
        const newMsgs: Message[] = await res.json();
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const added = newMsgs.filter((m) => !ids.has(m.id));
            if (added.length === 0) return prev;
            lastTimestamp.current = added[added.length - 1].created_at;
            return [...prev, ...added];
          });
        }
      } catch {
        // silencieux
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();

    // Ajout optimiste
    const optimistic: Message = {
      id: "opt-" + Date.now(),
      conversation_id: conversationId,
      sender_role: myRole,
      sender_name: myName,
      content,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await fetch(`/api/conv/${conversationId}/msg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_role: myRole, sender_name: myName, content }),
      });
      const saved: Message = await res.json();
      // Remplace l'optimiste par le vrai
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m))
      );
      lastTimestamp.current = saved.created_at;
    } catch {
      // garde l'optimiste en cas d'erreur réseau
    }
    setSending(false);
  }, [input, sending, conversationId, myRole, myName]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #E2EAE8",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#fff",
          flexShrink: 0,
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#0E7C7B",
              display: "flex",
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
              arrow_back
            </span>
          </button>
        )}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: myRole === "patient" ? "#0E7C7B" : "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {peerName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F1F24" }}>
            {peerName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#059669",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#059669",
                display: "inline-block",
              }}
            />
            En ligne
          </div>
        </div>
      </div>

      {/* Zone messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "#F4F7F6",
        }}
      >
        {loading && (
          <div
            style={{
              textAlign: "center",
              color: "#8AA4A8",
              fontSize: 13,
              paddingTop: 40,
            }}
          >
            Chargement…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#8AA4A8",
              fontSize: 13,
              paddingTop: 40,
            }}
          >
            Aucun message pour l&apos;instant.
            <br />
            Envoyez le premier message !
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_role === myRole;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: mine ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "72%",
                  background: mine ? "#0E7C7B" : "#fff",
                  color: mine ? "#fff" : "#0F1F24",
                  borderRadius: mine
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  padding: "9px 14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {!mine && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#0E7C7B",
                      marginBottom: 3,
                    }}
                  >
                    {m.sender_name}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: mine ? "rgba(255,255,255,0.65)" : "#8AA4A8",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {formatTime(m.created_at)}
                  {mine && (
                    <span style={{ marginLeft: 4 }}>
                      {m.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone saisie */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid #E2EAE8",
          background: "#fff",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Votre message… (Entrée pour envoyer)"
          rows={1}
          style={{
            flex: 1,
            border: "1.5px solid #E2EAE8",
            borderRadius: 20,
            padding: "10px 14px",
            fontSize: 13,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            background: "#F4F7F6",
            lineHeight: 1.5,
            maxHeight: 100,
            overflowY: "auto",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: input.trim() ? "#0E7C7B" : "#E2EAE8",
            border: "none",
            cursor: input.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 20, color: input.trim() ? "#fff" : "#8AA4A8" }}
          >
            send
          </span>
        </button>
      </div>
    </div>
  );
}
