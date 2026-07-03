"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";

export default function LoginPage() {
  const { login } = useAppStore();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [hovLogin, setHovLogin] = useState(false);
  const [hovCreate, setHovCreate] = useState(false);
  const [hovSwitch, setHovSwitch] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!phone) { setError("Entrez votre numéro de téléphone"); return; }
    setError("");
    login("+236 " + phone, mode === "register" ? (name || undefined) : undefined);
    router.push("/patient");
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 12, padding: "13px 16px", fontSize: 15, color: "#fff", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0C1A1E 0%, #0E2D2C 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 36, color: "#fff" }}>calendar_add_on</span>
        </div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em" }}>SangoCare</div>
        <div style={{ color: "#8AA4A8", fontSize: 13, marginTop: 4 }}>Plateforme de rendez-vous santé · Centrafrique</div>
      </div>

      {/* Card */}
      <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 400 }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </div>
        <div style={{ color: "#8AA4A8", fontSize: 13, marginBottom: 24 }}>
          {mode === "login" ? "Entrez votre numéro et votre code PIN" : "Créez votre compte SangoCare"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div>
              <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Nom complet</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom Nom" style={inp} />
            </div>
          )}

          <div>
            <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Numéro de téléphone</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...inp, width: 70, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8AA4A8", fontSize: 14 }}>+236</div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="72 00 00 00" style={{ ...inp, flex: 1 }} />
            </div>
          </div>

          <div>
            <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Code PIN</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••••" maxLength={6} style={inp} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <span style={{ color: "#0E7C7B", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Code oublié ?</span>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 10, padding: "10px 14px", color: "#FCA5A5", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin}
            onMouseEnter={() => setHovLogin(true)} onMouseLeave={() => setHovLogin(false)}
            style={{ background: hovLogin ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>

          <div style={{ textAlign: "center", color: "#8AA4A8", fontSize: 13 }}>ou</div>

          <button onClick={() => setMode(mode === "login" ? "register" : "login")}
            onMouseEnter={() => setHovCreate(true)} onMouseLeave={() => setHovCreate(false)}
            style={{ background: hovCreate ? "rgba(255,255,255,0.08)" : "transparent", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>

          <button onClick={() => { login("+236 72 00 00 00", "Nadège Yakité"); router.push("/patient"); }}
            onMouseEnter={() => setHovSwitch(true)} onMouseLeave={() => setHovSwitch(false)}
            style={{ background: hovSwitch ? "rgba(14,124,123,0.15)" : "rgba(14,124,123,0.08)", border: "1.5px dashed rgba(14,124,123,0.5)", borderRadius: 12, padding: "12px", color: "#0E7C7B", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>play_circle</span>
            Accès démo — entrez sans compte
          </button>
        </div>
      </div>

      {/* USSD */}
      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, color: "#8AA4A8", fontSize: 13 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>lock</span>
        <span>Connexion aussi possible par <strong style={{ color: "#fff" }}>USSD *123#</strong> sans internet</span>
      </div>
    </div>
  );
}
