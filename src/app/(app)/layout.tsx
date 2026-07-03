"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, setIsMobile, toast } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoggedIn) router.push("/");
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
      <TopNav />
      {children}
      {toast.visible && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0F2227", border: "1px solid rgba(14,124,123,0.5)", borderRadius: 12, padding: "12px 20px", color: "#fff", fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
