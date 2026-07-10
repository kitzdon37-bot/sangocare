"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import type { ActiveView, NetworkMode, UserRole } from "@/store/appStore";

const NAV_ITEMS: { view: ActiveView; icon: string; label: string; href: string; roles: UserRole[] }[] = [
  { view: "site",     icon: "language",    label: "Accueil",    href: "/",         roles: ["patient"] },
  { view: "clinique", icon: "stethoscope", label: "Espace pro", href: "/clinique", roles: ["personnel"] },
];

const ROLE_LABELS: Record<UserRole, { label: string; icon: string; color: string }> = {
  patient:   { label: "Patient",            icon: "person",      color: "#0E7C7B" },
  personnel: { label: "Personnel de santé", icon: "stethoscope", color: "#2563EB" },
};

const NET: Record<NetworkMode, { icon: string; label: string; sub: string; color: string }> = {
  online:  { icon: "wifi",     label: "En ligne",   sub: "Connecté",   color: "#1F8A5B" },
  sms:     { icon: "sms",      label: "SMS",         sub: "Mode SMS",   color: "#D68000" },
  offline: { icon: "wifi_off", label: "Hors-ligne",  sub: "Mode local", color: "#C0392B" },
};

export default function TopNav() {
  const { activeView, setActiveView, networkMode, setNetworkMode, userRole, userName, userInitials, logout } = useAppStore();
  const router = useRouter();
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [showNetMenu, setShowNetMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const net = NET[networkMode];
  const roleInfo = ROLE_LABELS[userRole];

  // Nav items visible for this role (always show site + role-specific)
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const navigate = (item: (typeof NAV_ITEMS)[0]) => {
    setActiveView(item.view);
    router.push(item.href);
  };

  return (
    <header style={{ background: "#0C1A1E", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 17, color: "#fff" }}>calendar_add_on</span>
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, lineHeight: 1 }}>SangoCare</div>
          <div style={{ color: "#8AA4A8", fontSize: 10, marginTop: 1 }}>Rendez-vous santé · Centrafrique</div>
        </div>
      </div>

      {/* Nav tabs — filtered by role */}
      <div style={{ display: "flex", gap: 4 }}>
        {visibleItems.map(item => {
          const isActive = activeView === item.view;
          const isHov = hovBtn === item.view;
          return (
            <button key={item.view}
              onClick={() => navigate(item)}
              onMouseEnter={() => setHovBtn(item.view)}
              onMouseLeave={() => setHovBtn(null)}
              style={{
                background: isActive ? "#0E7C7B" : isHov ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                color: isActive ? "#fff" : "#8AA4A8", fontWeight: isActive ? 700 : 500,
                fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
              }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Right side: Network + User */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Network badge */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setShowNetMenu(!showNetMenu); setShowUserMenu(false); }}
            style={{ background: `${net.color}22`, border: `1px solid ${net.color}44`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 15, color: net.color }}>{net.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: net.color, lineHeight: 1 }}>{net.label}</div>
              <div style={{ fontSize: 10, color: "#8AA4A8", lineHeight: 1, marginTop: 1 }}>{net.sub}</div>
            </div>
          </button>
          {showNetMenu && <div onClick={() => setShowNetMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
          {showNetMenu && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#0F2227", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 8, minWidth: 160, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              {(["online", "sms", "offline"] as NetworkMode[]).map(m => {
                const nl = NET[m];
                return (
                  <button key={m} onClick={() => { setNetworkMode(m); setShowNetMenu(false); }}
                    style={{ width: "100%", background: networkMode === m ? "rgba(14,124,123,0.2)" : "transparent", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 15, color: nl.color }}>{nl.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{nl.label}</div>
                      <div style={{ fontSize: 11, color: "#8AA4A8" }}>{nl.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User badge + menu */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNetMenu(false); }}
            style={{ background: `${roleInfo.color}22`, border: `1px solid ${roleInfo.color}44`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: roleInfo.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 10 }}>{userInitials}</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{userName.split(" ")[0]}</div>
              <div style={{ fontSize: 10, color: roleInfo.color, lineHeight: 1, marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 11 }}>{roleInfo.icon}</span>
                {roleInfo.label}
              </div>
            </div>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#8AA4A8" }}>expand_more</span>
          </button>

          {showUserMenu && <div onClick={() => setShowUserMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />}
          {showUserMenu && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#0F2227", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 8, minWidth: 200, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              {/* Profile info */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: roleInfo.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{userInitials}</span>
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{userName}</div>
                    <div style={{ color: roleInfo.color, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 12 }}>{roleInfo.icon}</span>
                      {roleInfo.label}
                    </div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              <button onClick={() => { setShowUserMenu(false); }}
                style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>settings</span>
                Paramètres du compte
              </button>
              <button onClick={() => { logout(); router.push("/connexion"); setShowUserMenu(false); }}
                style={{ width: "100%", background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#FCA5A5", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#FCA5A5" }}>logout</span>
                Se déconnecter
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
