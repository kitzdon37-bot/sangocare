"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import type { CalendarEvent, AppointmentStatut } from "@/store/appStore";
import ChatWindow from "@/components/ChatWindow";
import type { Conversation } from "@/lib/supabase";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0C1A1E",
  sidebar: "#0C1A1E",
  teal: "#0E7C7B",
  tealHov: "#0a5f5e",
  content: "#F4F7F6",
  card: "#FFFFFF",
  text: "#0F1F24",
  muted: "#46565B",
  green: "#059669",
  blue: "#2563EB",
  blueHov: "#1D4ED8",
  orange: "#EA580C",
  red: "#DC2626",
  redHov: "#B91C1C",
  border: "#E2E8EE",
  rowHov: "#EAF5F5",
} as const;

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type SidebarTab = "agenda" | "patients" | "teleconsult" | "messages" | "stats" | "attente" | "tarifs" | "equipe" | "avis" | "aide";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function eventsForDay(events: CalendarEvent[], year: number, month: number, day: number): CalendarEvent[] {
  const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return events.filter((e) => e.date === dateStr);
}

function statusColor(statut: AppointmentStatut): { bg: string; color: string } {
  switch (statut) {
    case "Confirmé":   return { bg: "#D1FAE5", color: "#065F46" };
    case "En attente": return { bg: "#FEF3C7", color: "#92400E" };
    case "Terminé":    return { bg: "#E0E7FF", color: "#3730A3" };
    case "Annulé":     return { bg: "#FEE2E2", color: "#991B1B" };
  }
}

function StatusBadge({ statut }: { statut: AppointmentStatut }) {
  const s = statusColor(statut);
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {statut}
    </span>
  );
}

function TypeBadge({ type }: { type: "Présentiel" | "Téléconsultation" }) {
  return (
    <span style={{
      background: type === "Téléconsultation" ? "#DBEAFE" : "#F0FDF4",
      color: type === "Téléconsultation" ? "#1E3A8A" : "#166534",
      padding: "2px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>
        {type === "Téléconsultation" ? "videocam" : "local_hospital"}
      </span>
      {type}
    </span>
  );
}

// Toast is handled by the parent layout

// ─── Modal overlay ────────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(8,18,21,0.7)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.card, borderRadius: 12, padding: 32,
        minWidth: 460, maxWidth: 540, width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${C.border}`, borderRadius: 7,
  fontSize: 14, color: C.text, background: C.content,
  boxSizing: "border-box", outline: "none",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      display: "flex", alignItems: "center", gap: 14,
      flex: 1,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span className="material-symbols-rounded" style={{ fontSize: 22, color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CliniquePage() {
  const {
    modal, setModal, showToast,
    patients, updatePatient,
    appointments,
    calendarEvents, addCalendarEvent, updateCalendarEvent, updateCalendarEventFull,
    isMobile,
  } = useAppStore();

  /** Trouve le téléphone d'un patient par son nom (cherche dans appointments puis patients) */
  function findPatientPhone(name: string): string | undefined {
    const rdv = appointments.find(a => a.patientName === name);
    if (rdv?.patientPhone) return rdv.patientPhone;
    const p = patients.find(p => p.nom === name);
    return p?.telephone;
  }

  /** Formate un numéro pour WhatsApp */
  function toWhatsApp(phone: string, msg?: string): string {
    const digits = phone.replace(/\D/g, "");
    return msg ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : `https://wa.me/${digits}`;
  }

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("agenda");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<typeof patients[0] | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [hovDay, setHovDay] = useState<number | null>(null);
  const [hovRow, setHovRow] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,"0")}-${String(todayDate.getDate()).padStart(2,"0")}`;
  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,"0")}-${String(tomorrowDate.getDate()).padStart(2,"0")}`;

  const [newConsultForm, setNewConsultForm] = useState({
    patientName: "",
    date: todayStr,
    heure: "09:00",
    duree: 30,
    motif: "",
    type: "Présentiel" as "Présentiel" | "Téléconsultation",
  });

  // KPIs
  const today = todayStr;
  const tomorrow = tomorrowStr;
  const todayEvents = calendarEvents.filter((e) => e.date === today);
  const kpiTotal = todayEvents.length;
  const kpiConfirmed = todayEvents.filter((e) => e.statut === "Confirmé").length;
  const kpiTele = todayEvents.filter((e) => e.type === "Téléconsultation").length;
  const kpiTomorrow = calendarEvents.filter((e) => e.date === tomorrow).length;

  // ── Stats dashboard computations ──────────────────────────────────────────
  const statsTeleCount = calendarEvents.filter(e => e.type === "Téléconsultation").length;
  const statsTotalEvents = calendarEvents.length;
  const statsPctTele = statsTotalEvents > 0 ? Math.max(5, Math.min(95, Math.round(statsTeleCount / statsTotalEvents * 100))) : 28;
  const statsPctPres = 100 - statsPctTele;
  const statsTotalPatients = Math.max(patients.length, 214);
  const statsWeeklyData = [12, 18, 15, 22, 19, 26].map((v, i) => ({
    week: `S${i + 1}`,
    val: i === 5 ? v + statsTotalEvents : v + Math.floor(statsTotalEvents * 0.15),
  }));
  const statsMaxWeek = Math.max(...statsWeeklyData.map(d => d.val));
  const STATS_CIRC = 238.76;
  const statsRingPct = 87;
  const statsRingDash = `${(statsRingPct / 100) * STATS_CIRC} ${STATS_CIRC}`;

  const [calView, setCalView] = useState<"mois" | "semaine" | "jour">("mois");

  // Messagerie personnel
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Sidebar menu
  const menuItems: { id: SidebarTab; icon: string; label: string; badge?: number }[] = [
    { id: "agenda",    icon: "calendar_month",  label: "Agenda" },
    { id: "patients",  icon: "folder_shared",   label: "Patients & dossiers" },
    { id: "messages",  icon: "chat",            label: "Messagerie" },
    { id: "teleconsult", icon: "videocam",      label: "Téléconsultations", badge: kpiTele },
    { id: "stats",     icon: "monitoring",      label: "Statistiques" },
    { id: "attente",   icon: "pending_actions", label: "Liste d'attente" },
    { id: "tarifs",    icon: "payments",        label: "Tarifs & horaires" },
    { id: "equipe",    icon: "groups",          label: "Équipe" },
    { id: "avis",      icon: "reviews",         label: "Avis" },
  ];

  // Selected day events
  const selectedDayEvents = selectedDay ? eventsForDay(calendarEvents, calYear, calMonth, selectedDay) : [];
  const selectedDateLabel = selectedDay
    ? new Date(`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  // Calendar helpers
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDowCalMonth = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const goToPrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDay(null); };
  const goToNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDay(null); };
  const goToToday = () => { setCalMonth(todayDate.getMonth()); setCalYear(todayDate.getFullYear()); setSelectedDay(todayDate.getDate()); };

  // Charger les conversations quand l'onglet messagerie est actif
  useEffect(() => {
    if (sidebarTab !== "messages") return;
    const load = () =>
      fetch("/api/conv")
        .then((r) => r.json())
        .then((data: Conversation[]) => setConversations(data))
        .catch(() => {});
    load();
    // Polling toutes les 3 secondes pour les nouvelles conversations
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [sidebarTab]);

  // Patients filtered
  const filteredPatients = patients.filter((p) =>
    patientSearch === "" ||
    p.nom.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.village || "").toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Téléconsult events
  const teleEvents = calendarEvents.filter((e) => e.type === "Téléconsultation");

  function handleAddConsult() {
    if (!newConsultForm.patientName.trim()) { showToast("Entrez le nom du patient"); return; }
    if (!newConsultForm.date) { showToast("Choisissez une date"); return; }
    const maxId = calendarEvents.reduce((m, e) => {
      const parts = e.id.replace(/[^0-9]/g, "");
      const n = parseInt(parts || "0");
      return n > m ? n : m;
    }, 0);
    addCalendarEvent({
      id: `CAL-${String(maxId + 1).padStart(3, "0")}`,
      patientName: newConsultForm.patientName,
      date: newConsultForm.date,
      heure: newConsultForm.heure,
      motif: newConsultForm.motif,
      statut: "En attente",
      type: newConsultForm.type,
      duree: newConsultForm.duree,
    });
    // Navigate the calendar to the date of the new event
    const [y, m, d] = newConsultForm.date.split("-").map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
    setSelectedDay(d);
    showToast(`Consultation ajoutée — ${newConsultForm.patientName}`);
    setModal(null);
    setNewConsultForm({ patientName: "", date: todayStr, heure: "09:00", duree: 30, motif: "", type: "Présentiel" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>

      {/* ── Backdrop mobile ── */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
        }} />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, minWidth: 220, background: C.sidebar,
        display: "flex", flexDirection: "column",
        padding: "0 0 16px 0", flexShrink: 0,
        ...(isMobile ? {
          position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 200,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: drawerOpen ? "4px 0 32px rgba(0,0,0,0.5)" : "none",
        } : {}),
      }}>
        {/* Header */}
        <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "rgba(14,124,123,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 10,
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 24, color: "#5ECEC5" }}>local_hospital</span>
            </div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Dr. B. Nzapa</div>
            <div style={{ color: "#7A9BA0", fontSize: 12, marginTop: 2 }}>Médecin généraliste</div>
          </div>
          {isMobile && (
            <button onClick={() => setDrawerOpen(false)} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#7A9BA0" }}>close</span>
            </button>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {menuItems.map((item) => {
            const isActive = sidebarTab === item.id;
            const isHov = hovBtn === `menu-${item.id}`;
            const bg = isActive
              ? "rgba(14,124,123,0.25)"
              : isHov ? "rgba(255,255,255,0.06)" : "transparent";
            const color = isActive ? "#5ECEC5" : isHov ? "#C8D8DC" : "#7A9BA0";
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHovBtn(`menu-${item.id}`)}
                onMouseLeave={() => setHovBtn(null)}
                onClick={() => { setSidebarTab(item.id); if (isMobile) setDrawerOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  cursor: "pointer", background: bg,
                  marginBottom: 2,
                  borderLeft: isActive ? `3px solid ${C.teal}` : "3px solid transparent",
                  transition: "background 0.15s",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20, color }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color, flex: 1 }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{ background: C.blue, color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Contenu principal ── */}
      <div style={{
        flex: 1, background: C.content,
        overflowY: "auto", padding: isMobile ? "14px 14px" : 24,
        display: "flex", flexDirection: "column", gap: isMobile ? 14 : 24,
      }}>
        {/* Hamburger mobile */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <button onClick={() => setDrawerOpen(true)} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, width: 40, height: 40, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)", flexShrink: 0,
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: C.teal }}>menu</span>
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
              {menuItems.find(m => m.id === sidebarTab)?.label ?? "Menu"}
            </span>
          </div>
        )}

        {/* ══ ONGLET AGENDA ══ */}
        {sidebarTab === "agenda" && (
          <>
            {/* KPIs */}
            <div style={{ display: "flex", gap: 14 }}>
              <KpiCard icon="today" label="Consultations aujourd'hui" value={kpiTotal} color={C.teal} />
              <KpiCard icon="check_circle" label="Confirmées" value={kpiConfirmed} color={C.green} />
              <KpiCard icon="videocam" label="Téléconsultations" value={kpiTele} color={C.blue} />
              <KpiCard icon="calendar_month" label="Demain" value={kpiTomorrow} color={C.orange} />
            </div>

            {/* Calendrier + Panel */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

              {/* Calendrier */}
              <div style={{
                flex: 1, background: C.card, borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                padding: 20,
              }}>
                {/* Header calendrier */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", background: C.content, borderRadius: 8, padding: 3, gap: 2 }}>
                      {(["mois", "semaine", "jour"] as const).map(v => (
                        <button key={v} onClick={() => setCalView(v)}
                          style={{ background: calView === v ? "#fff" : "transparent", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: calView === v ? 700 : 500, color: calView === v ? C.teal : C.muted, fontFamily: "inherit", boxShadow: calView === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={goToPrevMonth} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: C.muted, fontSize: 14 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_left</span>
                      </button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 120, textAlign: "center" }}>{MONTHS_FR[calMonth]} {calYear}</span>
                      <button onClick={goToNextMonth} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: C.muted, fontSize: 14 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_right</span>
                      </button>
                      <button onClick={goToToday} style={{ background: C.content, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "inherit" }}>Aujourd{"'"}hui</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.teal }} />Présentiel
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue }} />Téléconsult
                      </div>
                    </div>
                    <button onClick={() => showToast("Créneau bloqué")}
                      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 15 }}>block</span>
                      Bloquer un créneau
                    </button>
                  </div>
                </div>

                {/* Grille */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {/* Entêtes jours */}
                  {DAY_LABELS.map((d) => (
                    <div key={d} style={{
                      textAlign: "center", fontSize: 11, fontWeight: 700,
                      color: C.muted, padding: "6px 0", letterSpacing: "0.05em",
                    }}>
                      {d}
                    </div>
                  ))}

                  {/* Cellules vides avant le 1er */}
                  {Array.from({ length: firstDowCalMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Jours */}
                  {Array.from({ length: daysInCalMonth }, (_, i) => i + 1).map((day) => {
                    const dayEvents = eventsForDay(calendarEvents, calYear, calMonth, day);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDay === day;
                    const isHov = hovDay === day;
                    const dayStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const isToday = dayStr === todayStr;

                    return (
                      <div
                        key={day}
                        onMouseEnter={() => setHovDay(day)}
                        onMouseLeave={() => setHovDay(null)}
                        onClick={() => setSelectedDay(day)}
                        style={{
                          minHeight: 68, borderRadius: 8,
                          border: isSelected
                            ? `2px solid ${C.teal}`
                            : isToday ? `2px solid #A7F3D0` : `1px solid ${C.border}`,
                          background: isSelected
                            ? "rgba(14,124,123,0.07)"
                            : isHov ? "#F7FAFA" : C.card,
                          cursor: "pointer",
                          padding: "6px 6px 4px",
                          transition: "background 0.12s, border-color 0.12s",
                          display: "flex", flexDirection: "column",
                        }}
                      >
                        <div style={{
                          fontSize: 13, fontWeight: isToday ? 800 : isSelected ? 700 : 500,
                          color: isSelected ? C.teal : isToday ? C.green : C.text,
                          marginBottom: 4,
                        }}>
                          {day}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                          {hasEvents && dayEvents.slice(0, 2).map((ev) => (
                            <div key={ev.id} style={{
                              fontSize: 9, background: ev.type === "Téléconsultation" ? "#DBEAFE" : "#D1FAE5",
                              color: ev.type === "Téléconsultation" ? "#1E3A8A" : "#065F46",
                              borderRadius: 3, padding: "1px 4px",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              fontWeight: 600,
                            }}>
                              {ev.heure} {ev.patientName.split(" ")[0]}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, paddingLeft: 2 }}>
                              +{dayEvents.length - 2} autres
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel détail du jour */}
              {selectedDay !== null && (
                <div style={{
                  width: 320, flexShrink: 0,
                  background: C.card, borderRadius: 12,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  padding: 20,
                  maxHeight: "calc(100vh - 180px)",
                  overflowY: "auto",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: "capitalize" }}>
                        {selectedDateLabel}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>
                        {selectedDayEvents.length} consultation{selectedDayEvents.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onMouseEnter={() => setHovBtn("addConsult")}
                      onMouseLeave={() => setHovBtn(null)}
                      onClick={() => setModal("newConsult")}
                      style={{
                        background: hovBtn === "addConsult" ? C.tealHov : C.teal,
                        color: "#fff", border: "none", borderRadius: 7,
                        padding: "6px 12px", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        transition: "background 0.15s",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span>
                      Ajouter
                    </button>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 40, opacity: 0.3 }}>event_busy</span>
                      <div style={{ marginTop: 8, fontSize: 13 }}>Aucune consultation ce jour</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {selectedDayEvents.map((ev) => (
                        <div key={ev.id} style={{
                          background: "#F8FAFB", borderRadius: 9,
                          padding: 14, border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{ev.patientName}</div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: "middle", marginRight: 2 }}>schedule</span>
                                {ev.heure} · {ev.duree} min
                              </div>
                            </div>
                            <TypeBadge type={ev.type} />
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{ev.motif}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <StatusBadge statut={ev.statut} />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onMouseEnter={() => setHovBtn(`term-${ev.id}`)}
                                onMouseLeave={() => setHovBtn(null)}
                                onClick={() => { updateCalendarEvent(ev.id, "Terminé"); showToast("Consultation terminée"); }}
                                style={{
                                  background: hovBtn === `term-${ev.id}` ? "#047857" : "#D1FAE5",
                                  color: hovBtn === `term-${ev.id}` ? "#fff" : "#065F46",
                                  border: "none", borderRadius: 6,
                                  padding: "4px 10px", cursor: "pointer",
                                  fontSize: 11, fontWeight: 600,
                                  transition: "background 0.15s, color 0.15s",
                                }}
                              >
                                Terminer
                              </button>
                              <button
                                onMouseEnter={() => setHovBtn(`cancel-${ev.id}`)}
                                onMouseLeave={() => setHovBtn(null)}
                                onClick={() => { updateCalendarEvent(ev.id, "Annulé"); showToast("Consultation annulée"); }}
                                style={{
                                  background: hovBtn === `cancel-${ev.id}` ? C.redHov : "#FEE2E2",
                                  color: hovBtn === `cancel-${ev.id}` ? "#fff" : C.red,
                                  border: "none", borderRadius: 6,
                                  padding: "4px 10px", cursor: "pointer",
                                  fontSize: 11, fontWeight: 600,
                                  transition: "background 0.15s, color 0.15s",
                                }}
                              >
                                Annuler
                              </button>
                              <button
                                onMouseEnter={() => setHovBtn(`edit-${ev.id}`)}
                                onMouseLeave={() => setHovBtn(null)}
                                onClick={() => setEditEvent(ev)}
                                style={{
                                  background: hovBtn === `edit-${ev.id}` ? "#E0F2FE" : "#F0F9FF",
                                  color: "#0369A1",
                                  border: "none", borderRadius: 6,
                                  padding: "4px 10px", cursor: "pointer",
                                  fontSize: 11, fontWeight: 600,
                                  transition: "background 0.15s",
                                }}
                              >
                                Modifier
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ONGLET PATIENTS ══ */}
        {sidebarTab === "patients" && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 22 }}>people</span>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Patients & dossiers</h2>
                <span style={{ background: C.teal, color: "#fff", borderRadius: 12, padding: "1px 10px", fontSize: 12, fontWeight: 700 }}>
                  {filteredPatients.length}
                </span>
              </div>
              {/* Barre de recherche */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: C.muted }}>search</span>
                <input
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: C.text, width: 200 }}
                  placeholder="Rechercher un patient..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F0F5F4", borderBottom: `1px solid ${C.border}` }}>
                    {["Nom", "Téléphone", "Âge", "Village", "Dernière visite", "Statut", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      onMouseEnter={() => setHovRow(p.id)}
                      onMouseLeave={() => setHovRow(null)}
                      style={{
                        background: hovRow === p.id ? C.rowHov : C.card,
                        borderBottom: `1px solid ${C.border}`,
                        transition: "background 0.12s",
                      }}
                    >
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: C.text }}>{p.nom}</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{p.telephone}</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{p.age} ans</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{p.village}</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{p.lastVisit}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          background: p.statut === "Actif" ? "#D1FAE5" : p.statut === "Suivi" ? "#DBEAFE" : "#FFEDD5",
                          color: p.statut === "Actif" ? "#065F46" : p.statut === "Suivi" ? "#1E3A8A" : "#9A3412",
                          padding: "2px 10px", borderRadius: 12,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {p.statut}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button
                          onClick={() => setEditPatient(p)}
                          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.teal, fontFamily: "inherit" }}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px 14px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                        Aucun patient trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ══ ONGLET TÉLÉCONSULTATION ══ */}
        {sidebarTab === "teleconsult" && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span className="material-symbols-rounded" style={{ color: C.blue, fontSize: 22 }}>videocam</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Téléconsultations</h2>
              <span style={{ background: C.blue, color: "#fff", borderRadius: 12, padding: "1px 10px", fontSize: 12, fontWeight: 700 }}>
                {teleEvents.length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {teleEvents.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 48, opacity: 0.3 }}>videocam_off</span>
                  <div style={{ marginTop: 8 }}>Aucune téléconsultation planifiée</div>
                </div>
              )}
              {teleEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: C.card, borderRadius: 10,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 16,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#DBEAFE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 22, color: C.blue }}>videocam</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{ev.patientName}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                      {ev.date} · {ev.heure} · {ev.duree} min
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ev.motif}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge statut={ev.statut} />
                    {(() => {
                      const phone = findPatientPhone(ev.patientName);
                      const msg = `Bonjour ${ev.patientName}, c'est le Dr. B. Nzapa. Votre téléconsultation SangoCare est prévue le ${ev.date} à ${ev.heure}. Je vous appelle maintenant via WhatsApp.`;
                      return phone ? (
                        <a
                          href={toWhatsApp(phone, msg)}
                          target="_blank" rel="noreferrer"
                          onMouseEnter={() => setHovBtn(`wa-${ev.id}`)}
                          onMouseLeave={() => setHovBtn(null)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: hovBtn === `wa-${ev.id}` ? "#1DA851" : "#25D366",
                            color: "#fff", border: "none", borderRadius: 8,
                            padding: "8px 14px", cursor: "pointer",
                            fontSize: 13, fontWeight: 600,
                            textDecoration: "none", transition: "background 0.15s",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </a>
                      ) : (
                        <button
                          onClick={() => showToast("Numéro du patient introuvable")}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#E5E7EB", color: "#6B7280", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#6B7280"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ ONGLET MESSAGES ══ */}
        {sidebarTab === "messages" && (
          <div style={{ display: "flex", gap: 0, height: "calc(100vh - 120px)", background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>

            {/* ── Colonne gauche : liste des conversations ── */}
            <div style={{ width: 260, minWidth: 260, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "#FAFBFC" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 20 }}>chat</span>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Conversations</div>
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                  <span style={{ background: C.teal, color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                    {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {conversations.length === 0 && (
                  <div style={{ padding: "48px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 40, opacity: 0.25, display: "block", marginBottom: 8 }}>chat_bubble</span>
                    Aucune conversation
                  </div>
                )}
                {conversations.map((conv) => {
                  const unread = unreadCounts[conv.id] || 0;
                  const isSelected = selectedConv?.id === conv.id;
                  return (
                    <button key={conv.id} onClick={() => { setSelectedConv(conv); setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 })); }}
                      style={{ width: "100%", background: isSelected ? "#E5F2F1" : "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "12px 14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                        {conv.patient_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.patient_name}</span>
                          {unread > 0 && (
                            <span style={{ background: C.teal, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>{unread}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{conv.patient_phone}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Colonne droite : fenêtre de chat ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!selectedConv ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: C.muted }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 52, opacity: 0.2 }}>forum</span>
                  <div style={{ fontSize: 14 }}>Sélectionnez une conversation</div>
                </div>
              ) : (
                <ChatWindow
                  key={selectedConv.id}
                  conversationId={selectedConv.id}
                  myRole="personnel"
                  myName="Dr. B. Nzapa"
                  peerName={selectedConv.patient_name}
                  onBack={() => setSelectedConv(null)}
                />
              )}
            </div>
          </div>
        )}

        {/* ══ ONGLET STATISTIQUES ══ */}
        {sidebarTab === "stats" && (
          <div>
            <style>{`
              @keyframes kpiFade { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
              .kpi-g { animation: kpiFade 0.45s ease both; }
              .kpi-g:nth-child(1){animation-delay:0ms} .kpi-g:nth-child(2){animation-delay:70ms}
              .kpi-g:nth-child(3){animation-delay:140ms} .kpi-g:nth-child(4){animation-delay:210ms}
            `}</style>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <div>
                <h2 style={{ fontSize:20, fontWeight:800, color:C.text, margin:0 }}>Tableau de bord</h2>
                <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>Juillet 2026 · Données en temps réel</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"#D1FAE5", color:"#065F46", borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:700 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#059669", display:"inline-block", boxShadow:"0 0 0 3px #A7F3D0" }}/>
                En direct
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
              {([
                { icon:"medical_services", label:"Consultations", sub:"ce mois",     value:47+statsTotalEvents, delta:"+12%", grad:"linear-gradient(135deg,#0E7C7B 0%,#059669 100%)" },
                { icon:"groups",           label:"Patients actifs", sub:"inscrits",  value:statsTotalPatients,  delta:"+5",   grad:"linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)" },
                { icon:"check_circle",     label:"Taux de présence", sub:"ce mois", value:"87%",               delta:"+3%",  grad:"linear-gradient(135deg,#0891B2 0%,#0E7C7B 100%)" },
                { icon:"star",             label:"Satisfaction",   sub:"214 avis",   value:"4,8/5",            delta:"★",    grad:"linear-gradient(135deg,#D97706 0%,#DC2626 100%)" },
              ] as {icon:string;label:string;sub:string;value:string|number;delta:string;grad:string}[]).map((k, i) => (
                <div key={i} className="kpi-g" style={{
                  background:k.grad, borderRadius:14, padding:"18px 16px",
                  boxShadow:"0 6px 24px rgba(0,0,0,0.14)",
                  position:"relative", overflow:"hidden",
                }}>
                  <div style={{ position:"absolute", right:-18, top:-18, width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.12)" }}/>
                  <div style={{ position:"absolute", right:10, bottom:-26, width:58, height:58, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, position:"relative" }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span className="material-symbols-rounded" style={{ fontSize:18, color:"#fff" }}>{k.icon}</span>
                    </div>
                    <span style={{ background:"rgba(255,255,255,0.22)", color:"#fff", fontSize:10, fontWeight:700, borderRadius:12, padding:"2px 8px" }}>{k.delta}</span>
                  </div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#fff", lineHeight:1, position:"relative" }}>{k.value}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)", marginTop:4, position:"relative" }}>{k.label}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", position:"relative" }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display:"grid", gridTemplateColumns:"1.9fr 1fr", gap:12, marginBottom:12 }}>

              {/* Bar chart */}
              <div style={{ background:C.card, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:C.text }}>Activité hebdomadaire</div>
                    <div style={{ fontSize:11, color:C.muted }}>Consultations · 6 dernières semaines</div>
                  </div>
                  <div style={{ display:"flex", gap:12 }}>
                    {([{color:"#0E7C7B",label:"Présentiel"},{color:"#2563EB",label:"Téléconsult"}] as {color:string;label:string}[]).map(l => (
                      <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:l.color }}/>
                        <span style={{ fontSize:10, color:C.muted }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130 }}>
                  {statsWeeklyData.map((d, i) => {
                    const totalH = Math.round((d.val / statsMaxWeek) * 100);
                    const teleH  = Math.round(totalH * (statsPctTele / 100));
                    const presH  = totalH - teleH;
                    return (
                      <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:C.muted }}>{d.val}</span>
                        <div style={{ width:"68%", display:"flex", flexDirection:"column", borderRadius:"5px 5px 0 0", overflow:"hidden" }}>
                          <div style={{ height:teleH, background:"#2563EB", opacity:0.85 }}/>
                          <div style={{ height:presH, background:"linear-gradient(180deg,#0E7C7B,#0a6160)" }}/>
                        </div>
                        <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{d.week}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ring + type breakdown */}
              <div style={{ background:C.card, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column" }}>
                <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Types de consultation</div>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                  <div style={{ position:"relative", width:120, height:120 }}>
                    <svg width="120" height="120" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#F4F7F6" strokeWidth="13"/>
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#0E7C7B" strokeWidth="13"
                        strokeDasharray={statsRingDash}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:22, fontWeight:900, color:C.text }}>{statsRingPct}%</span>
                      <span style={{ fontSize:9, color:C.muted }}>présence</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {([
                    { label:"Présentiel",      pct:statsPctPres, color:"#0E7C7B", icon:"local_hospital" },
                    { label:"Téléconsultation", pct:statsPctTele, color:"#2563EB", icon:"videocam" },
                  ] as {label:string;pct:number;color:string;icon:string}[]).map((t, i) => (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span className="material-symbols-rounded" style={{ fontSize:13, color:t.color }}>{t.icon}</span>
                          <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{t.label}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, color:C.text }}>{t.pct}%</span>
                      </div>
                      <div style={{ height:7, borderRadius:4, background:"#F4F7F6", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${t.pct}%`, background:t.color, borderRadius:4 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

              {/* Top motifs */}
              <div style={{ background:C.card, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:16 }}>Top motifs de consultation</div>
                {([
                  { label:"Consultation générale", pct:38, color:"#0E7C7B" },
                  { label:"Pédiatrie",             pct:22, color:"#2563EB" },
                  { label:"Suivi CPN",              pct:18, color:"#7C3AED" },
                  { label:"Urgences",               pct:12, color:"#DC2626" },
                  { label:"Autres",                 pct:10, color:"#D97706" },
                ] as {label:string;pct:number;color:string}[]).map((m, i) => (
                  <div key={i} style={{ marginBottom:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:m.color, flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:800, color:C.text }}>{m.pct}%</span>
                    </div>
                    <div style={{ height:8, borderRadius:4, background:"#F4F7F6", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${m.pct}%`, background:`linear-gradient(90deg,${m.color},${m.color}bb)`, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Satisfaction */}
              <div style={{ background:C.card, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Satisfaction patients</div>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:44, fontWeight:900, color:C.text, lineHeight:1 }}>4,8</div>
                    <div style={{ color:"#FBBF24", fontSize:16, marginTop:4, letterSpacing:3 }}>★★★★★</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>214 avis vérifiés</div>
                  </div>
                  <div style={{ flex:1 }}>
                    {([
                      { star:5, pct:68, count:146 },
                      { star:4, pct:20, count:43  },
                      { star:3, pct:8,  count:17  },
                      { star:2, pct:3,  count:6   },
                      { star:1, pct:1,  count:2   },
                    ] as {star:number;pct:number;count:number}[]).map(s => (
                      <div key={s.star} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                        <span style={{ fontSize:10, color:C.muted, fontWeight:700, minWidth:10, textAlign:"right" }}>{s.star}</span>
                        <span style={{ color:"#FBBF24", fontSize:10 }}>★</span>
                        <div style={{ flex:1, height:7, borderRadius:3, background:"#F4F7F6", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${s.pct}%`, background:"linear-gradient(90deg,#FBBF24,#F59E0B)", borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:10, color:C.muted, minWidth:22 }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {([
                    { icon:"thumb_up",  label:"Recommandent", val:"97%" },
                    { icon:"schedule",  label:"Délai moyen",  val:"23 min" },
                    { icon:"repeat",    label:"Fidélité",     val:"78%" },
                  ] as {icon:string;label:string;val:string}[]).map((s, i) => (
                    <div key={i} style={{ textAlign:"center", padding:"10px 4px", borderRadius:10, background:C.content }}>
                      <span className="material-symbols-rounded" style={{ fontSize:20, color:C.teal }}>{s.icon}</span>
                      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginTop:3 }}>{s.val}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ONGLET LISTE D'ATTENTE ══ */}
        {sidebarTab === "attente" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 20px" }}>Liste d'attente</h2>
            {calendarEvents.filter(e => e.statut === "En attente").map(e => (
              <div key={e.id} style={{ background: C.card, borderRadius: 10, padding: "12px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{e.patientName}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{e.motif} · {e.heure}</div>
                </div>
                <button onClick={() => { updateCalendarEvent(e.id, "Confirmé"); showToast("Confirmé !"); }}
                  style={{ background: C.teal, border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Confirmer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ══ ONGLET TARIFS ══ */}
        {sidebarTab === "tarifs" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 20px" }}>Tarifs & Horaires</h2>
            {[
              { label: "Consultation générale", prix: "2 500 FCFA" },
              { label: "Consultation spécialisée", prix: "5 000 FCFA" },
              { label: "Téléconsultation", prix: "3 500 FCFA" },
              { label: "CPN (gratuit)", prix: "Gratuit" },
            ].map(t => (
              <div key={t.label} style={{ background: C.card, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <span style={{ fontSize: 13, color: C.text }}>{t.label}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: t.prix === "Gratuit" ? C.green : C.text }}>{t.prix}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══ ONGLET ÉQUIPE ══ */}
        {sidebarTab === "equipe" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 20px" }}>Équipe</h2>
            {[
              { initials: "BN", name: "Dr. Béatrice Nzapa", role: "Médecin généraliste", statut: "En ligne" },
              { initials: "JK", name: "Dr. Jean-Paul Koyt", role: "Pédiatre", statut: "En consultation" },
              { initials: "IF", name: "Infirmière Félicité", role: "Infirmière en chef", statut: "En ligne" },
            ].map(m => (
              <div key={m.name} style={{ background: C.card, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{m.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{m.role}</div>
                </div>
                <span style={{ background: m.statut === "En ligne" ? "#D1FAE5" : "#DBEAFE", color: m.statut === "En ligne" ? "#065F46" : "#1E3A8A", fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "3px 10px" }}>{m.statut}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══ ONGLET AVIS ══ */}
        {sidebarTab === "avis" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Avis patients</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: C.text }}>4,8</span>
              <div>
                <div style={{ color: "#D97706", fontSize: 18 }}>★★★★★</div>
                <div style={{ fontSize: 12, color: C.muted }}>214 avis vérifiés</div>
              </div>
            </div>
            {[
              { name: "Marcel N.", note: 5, msg: "Excellente consultation, médecin très attentionnée.", date: "28 juin" },
              { name: "Aïcha D.", note: 5, msg: "Suivi prénatal impeccable. Je recommande vivement.", date: "25 juin" },
              { name: "Prosper K.", note: 4, msg: "Attente raisonnable, diagnostic précis.", date: "22 juin" },
            ].map(a => (
              <div key={a.name} style={{ background: C.card, borderRadius: 10, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{a.date}</span>
                </div>
                <div style={{ color: "#D97706", fontSize: 14, marginBottom: 6 }}>{"★".repeat(a.note)}{"☆".repeat(5 - a.note)}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{a.msg}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Édition patient ── */}
      {editPatient && (
        <ModalOverlay onClose={() => setEditPatient(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Modifier le patient</h3>
            <button onClick={() => setEditPatient(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <Field label="Nom complet">
            <input style={inputStyle} value={editPatient.nom} onChange={e => setEditPatient(p => p ? { ...p, nom: e.target.value } : p)} />
          </Field>
          <Field label="Téléphone">
            <input style={inputStyle} value={editPatient.telephone} onChange={e => setEditPatient(p => p ? { ...p, telephone: e.target.value } : p)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Âge">
              <input type="number" style={inputStyle} value={editPatient.age || ""} onChange={e => setEditPatient(p => p ? { ...p, age: Number(e.target.value) } : p)} />
            </Field>
            <Field label="Village / Ville">
              <input style={inputStyle} value={editPatient.village || ""} onChange={e => setEditPatient(p => p ? { ...p, village: e.target.value } : p)} />
            </Field>
          </div>
          <Field label="Statut">
            <select style={inputStyle} value={editPatient.statut} onChange={e => setEditPatient(p => p ? { ...p, statut: e.target.value as typeof p.statut } : p)}>
              <option value="Actif">Actif</option>
              <option value="Suivi">Suivi</option>
              <option value="Référé">Référé</option>
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button onClick={() => setEditPatient(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}>Annuler</button>
            <button
              onClick={() => { updatePatient(editPatient.id, { nom: editPatient.nom, telephone: editPatient.telephone, age: editPatient.age, village: editPatient.village, statut: editPatient.statut }); showToast("Patient mis à jour"); setEditPatient(null); }}
              style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Enregistrer
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal Édition événement agenda ── */}
      {editEvent && (
        <ModalOverlay onClose={() => setEditEvent(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Modifier la consultation</h3>
            <button onClick={() => setEditEvent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
          <Field label="Patient">
            <input style={inputStyle} value={editEvent.patientName} onChange={e => setEditEvent(ev => ev ? { ...ev, patientName: e.target.value } : ev)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date">
              <input type="date" style={inputStyle} value={editEvent.date} onChange={e => setEditEvent(ev => ev ? { ...ev, date: e.target.value } : ev)} />
            </Field>
            <Field label="Heure">
              <input type="time" style={inputStyle} value={editEvent.heure} onChange={e => setEditEvent(ev => ev ? { ...ev, heure: e.target.value } : ev)} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Durée (min)">
              <select style={inputStyle} value={editEvent.duree} onChange={e => setEditEvent(ev => ev ? { ...ev, duree: Number(e.target.value) } : ev)}>
                {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select style={inputStyle} value={editEvent.type} onChange={e => setEditEvent(ev => ev ? { ...ev, type: e.target.value as typeof ev.type } : ev)}>
                <option value="Présentiel">Présentiel</option>
                <option value="Téléconsultation">Téléconsultation</option>
              </select>
            </Field>
          </div>
          <Field label="Motif">
            <input style={inputStyle} value={editEvent.motif} onChange={e => setEditEvent(ev => ev ? { ...ev, motif: e.target.value } : ev)} />
          </Field>
          <Field label="Statut">
            <select style={inputStyle} value={editEvent.statut} onChange={e => setEditEvent(ev => ev ? { ...ev, statut: e.target.value as AppointmentStatut } : ev)}>
              <option value="En attente">En attente</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Terminé">Terminé</option>
              <option value="Annulé">Annulé</option>
            </select>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button onClick={() => setEditEvent(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}>Annuler</button>
            <button
              onClick={() => {
                updateCalendarEventFull(editEvent.id, { patientName: editEvent.patientName, date: editEvent.date, heure: editEvent.heure, duree: editEvent.duree, motif: editEvent.motif, type: editEvent.type, statut: editEvent.statut });
                const [y, m, d] = editEvent.date.split("-").map(Number);
                setCalYear(y); setCalMonth(m - 1); setSelectedDay(d);
                showToast("Consultation mise à jour");
                setEditEvent(null);
              }}
              style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Enregistrer
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal Nouvelle consultation ── */}
      {modal === "newConsult" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-rounded" style={{ color: C.teal }}>event_available</span>
              Nouvelle consultation
            </h3>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <Field label="Nom du patient">
            <input
              style={inputStyle}
              value={newConsultForm.patientName}
              onChange={(e) => setNewConsultForm((f) => ({ ...f, patientName: e.target.value }))}
              placeholder="Nom complet du patient"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date">
              <input
                type="date"
                style={inputStyle}
                value={newConsultForm.date}
                onChange={(e) => setNewConsultForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Heure">
              <input
                type="time"
                style={inputStyle}
                value={newConsultForm.heure}
                onChange={(e) => setNewConsultForm((f) => ({ ...f, heure: e.target.value }))}
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Durée (minutes)">
              <select
                style={inputStyle}
                value={newConsultForm.duree}
                onChange={(e) => setNewConsultForm((f) => ({ ...f, duree: Number(e.target.value) }))}
              >
                {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select
                style={inputStyle}
                value={newConsultForm.type}
                onChange={(e) => setNewConsultForm((f) => ({ ...f, type: e.target.value as "Présentiel" | "Téléconsultation" }))}
              >
                <option value="Présentiel">Présentiel</option>
                <option value="Téléconsultation">Téléconsultation</option>
              </select>
            </Field>
          </div>
          <Field label="Motif">
            <input
              style={inputStyle}
              value={newConsultForm.motif}
              onChange={(e) => setNewConsultForm((f) => ({ ...f, motif: e.target.value }))}
              placeholder="Ex: Consultation générale, suivi..."
            />
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setModal(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}
            >
              Annuler
            </button>
            <button
              onMouseEnter={() => setHovBtn("submitConsult")}
              onMouseLeave={() => setHovBtn(null)}
              onClick={handleAddConsult}
              style={{
                background: hovBtn === "submitConsult" ? C.tealHov : C.teal,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "9px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                transition: "background 0.15s",
              }}
            >
              Ajouter
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
