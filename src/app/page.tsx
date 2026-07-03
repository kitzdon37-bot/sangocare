"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import type { UserRole } from "@/store/appStore";

type AuthStep = "role" | "form";
type AuthMode = "login" | "register";

const ROLES: { id: UserRole; icon: string; label: string; sub: string; color: string; defaultName: string; href: string }[] = [
  {
    id: "patient",
    icon: "person",
    label: "Patient",
    sub: "Prendre rendez-vous",
    color: "#0E7C7B",
    defaultName: "Nadège Yakité",
    href: "/patient",
  },
  {
    id: "medecin",
    icon: "stethoscope",
    label: "Médecin / Pro de santé",
    sub: "Gérer mon agenda",
    color: "#2563EB",
    defaultName: "Dr. Béatrice Nzapa",
    href: "/clinique",
  },
  {
    id: "agent",
    icon: "person_pin_circle",
    label: "Agent ASC",
    sub: "Accompagner mes patients",
    color: "#059669",
    defaultName: "Pierre Yangba",
    href: "/agent",
  },
  {
    id: "etablissement",
    icon: "local_hospital",
    label: "Établissement",
    sub: "Gérer la clinique",
    color: "#7C3AED",
    defaultName: "Clinique SICA",
    href: "/clinique",
  },
];

export default function LoginPage() {
  const { login } = useAppStore();
  const router = useRouter();

  const [step, setStep] = useState<AuthStep>("role");
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [hovRole, setHovRole] = useState<string | null>(null);
  const [hovSubmit, setHovSubmit] = useState(false);
  const [hovDemo, setHovDemo] = useState<string | null>(null);

  const roleInfo = ROLES.find(r => r.id === selectedRole);

  const handleSelectRole = (roleId: UserRole) => {
    setSelectedRole(roleId);
    setStep("form");
    setError("");
  };

  const handleLogin = () => {
    if (!phone) { setError("Entrez votre numéro de téléphone"); return; }
    if (!selectedRole) { setError("Choisissez un profil"); return; }
    setError("");
    const n = mode === "register" ? (name || roleInfo?.defaultName || "Utilisateur") : (roleInfo?.defaultName || "Utilisateur");
    login("+236 " + phone, n, selectedRole);
    router.push(roleInfo?.href || "/patient");
  };

  const handleDemo = (roleId: UserRole) => {
    const r = ROLES.find(x => x.id === roleId)!;
    login("+236 72 00 00 00", r.defaultName, roleId);
    router.push(r.href);
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 12, padding: "13px 16px", fontSize: 15, color: "#fff", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  // ── STEP 1 : Sélection du rôle ─────────────────────────────────────────────
  if (step === "role") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0C1A1E 0%, #0E2D2C 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {/* Logo */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 32, color: "#fff" }}>calendar_add_on</span>
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>SangoCare</div>
          <div style={{ color: "#8AA4A8", fontSize: 13, marginTop: 4 }}>Plateforme de rendez-vous santé · Centrafrique</div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 440 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Qui êtes-vous ?</div>
          <div style={{ color: "#8AA4A8", fontSize: 13, marginBottom: 22 }}>Choisissez votre profil pour continuer</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ROLES.map(r => (
              <button key={r.id}
                onClick={() => handleSelectRole(r.id)}
                onMouseEnter={() => setHovRole(r.id)} onMouseLeave={() => setHovRole(null)}
                style={{
                  background: hovRole === r.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${hovRole === r.id ? r.color : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14, textAlign: "left", fontFamily: "inherit",
                }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${r.color}22`, border: `1.5px solid ${r.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: r.color }}>{r.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                  <div style={{ color: "#8AA4A8", fontSize: 12, marginTop: 2 }}>{r.sub}</div>
                </div>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>chevron_right</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo rapide */}
        <div style={{ marginTop: 20, width: "100%", maxWidth: 440 }}>
          <div style={{ color: "#8AA4A8", fontSize: 12, textAlign: "center", marginBottom: 10, fontWeight: 600 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 4 }}>play_circle</span>
            Accès démo rapide — sans compte
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map(r => (
              <button key={r.id}
                onClick={() => handleDemo(r.id)}
                onMouseEnter={() => setHovDemo(r.id)} onMouseLeave={() => setHovDemo(null)}
                style={{ background: hovDemo === r.id ? `${r.color}22` : "rgba(255,255,255,0.04)", border: `1px dashed ${r.color}66`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", color: r.color, fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* USSD */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, color: "#8AA4A8", fontSize: 12 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>signal_cellular_alt</span>
          <span>Aussi accessible par <strong style={{ color: "#fff" }}>USSD *123#</strong> sans internet</span>
        </div>
      </div>
    );
  }

  // ── STEP 2 : Formulaire selon rôle ────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0C1A1E 0%, #0E2D2C 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: roleInfo?.color || "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 28, color: "#fff" }}>{roleInfo?.icon || "person"}</span>
        </div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>SangoCare</div>
        <div style={{ color: "#8AA4A8", fontSize: 12, marginTop: 3 }}>{roleInfo?.label}</div>
      </div>

      {/* Card */}
      <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 400 }}>
        {/* Back */}
        <button onClick={() => { setStep("role"); setError(""); setPhone(""); setPin(""); setName(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8AA4A8", fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginBottom: 18, fontFamily: "inherit", padding: 0 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
          Changer de profil
        </button>

        <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </div>
        <div style={{ color: "#8AA4A8", fontSize: 12, marginBottom: 22 }}>
          {mode === "login"
            ? `Connectez-vous en tant que ${roleInfo?.label}`
            : `Créez votre compte ${roleInfo?.label}`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Nom — pour inscription ou certains rôles */}
          {(mode === "register" || selectedRole === "medecin" || selectedRole === "etablissement") && mode === "register" && (
            <div>
              <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {selectedRole === "etablissement" ? "Nom de l'établissement" : "Nom complet"}
              </label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={selectedRole === "etablissement" ? "Ex : Clinique SICA · Bangui" : "Prénom Nom"}
                style={inp} />
            </div>
          )}

          {/* Téléphone */}
          <div>
            <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Numéro de téléphone</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...inp, width: 70, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8AA4A8", fontSize: 14 }}>+236</div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="72 00 00 00" style={{ ...inp, flex: 1 }} />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Code PIN</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="••••••" maxLength={6} style={inp}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
            {mode === "login" && (
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <span style={{ color: roleInfo?.color || "#0E7C7B", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Code oublié ?</span>
              </div>
            )}
          </div>

          {/* Numéro d'ordre — médecins uniquement à l'inscription */}
          {selectedRole === "medecin" && mode === "register" && (
            <div>
              <label style={{ color: "#8AA4A8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>N° Ordre National des Médecins</label>
              <input placeholder="ONM-RCA-XXXX" style={inp} />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 10, padding: "10px 14px", color: "#FCA5A5", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleLogin}
            onMouseEnter={() => setHovSubmit(true)} onMouseLeave={() => setHovSubmit(false)}
            style={{ background: hovSubmit ? (roleInfo?.color ? roleInfo.color + "DD" : "#0A6060") : (roleInfo?.color || "#0E7C7B"), border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>

          <div style={{ textAlign: "center", color: "#8AA4A8", fontSize: 13 }}>ou</div>

          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>

          {/* Demo pour ce rôle */}
          <button onClick={() => handleDemo(selectedRole!)}
            style={{ background: `${roleInfo?.color || "#0E7C7B"}10`, border: `1.5px dashed ${roleInfo?.color || "#0E7C7B"}66`, borderRadius: 12, padding: "11px", color: roleInfo?.color || "#0E7C7B", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 15 }}>play_circle</span>
            Démo — {roleInfo?.label}
          </button>
        </div>
      </div>
    </div>
  );
}
