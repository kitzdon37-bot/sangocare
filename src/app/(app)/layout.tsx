"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, setIsMobile, toast, navHidden, setNavHidden, userRole } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) router.push("/connexion");
  }, [mounted, isLoggedIn, router]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [setIsMobile]);

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0C1A1E" }}>

      {/* Barre de navigation avec transition de masquage */}
      <div style={{
        transform: navHidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.25s ease",
        position: "sticky", top: 0, zIndex: 100,
        marginBottom: navHidden ? -52 : 0,
      }}>
        <TopNav />
      </div>

      {/* Onglet flottant pour restaurer la barre (personnel uniquement) */}
      {navHidden && userRole === "personnel" && (
        <button
          onClick={() => setNavHidden(false)}
          style={{
            position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
            zIndex: 200, background: "#0E7C7B",
            border: "none", borderRadius: "0 0 12px 12px",
            padding: "4px 18px 7px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            boxShadow: "0 4px 16px rgba(14,124,123,0.4)",
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#fff" }}>keyboard_arrow_down</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Afficher la barre</span>
        </button>
      )}

      {children}

      {toast.visible && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0F2227", border: "1px solid rgba(14,124,123,0.5)", borderRadius: 12, padding: "12px 20px", color: "#fff", fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
