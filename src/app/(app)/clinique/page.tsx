"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { CalendarEvent, AppointmentStatut } from "@/store/appStore";

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

// ─── July 2026 calendar data ──────────────────────────────────────────────────
// July 1, 2026 is a Wednesday (index 2 in Mon-Sun)
const JULY_START_DOW = 2; // 0=Mon, 1=Tue, 2=Wed...
const JULY_DAYS = 31;
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type SidebarTab = "agenda" | "patients" | "teleconsult" | "messages" | "aide";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function eventsForDay(events: CalendarEvent[], day: number): CalendarEvent[] {
  const dateStr = `2026-07-${String(day).padStart(2, "0")}`;
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
    patients,
    calendarEvents, addCalendarEvent, updateCalendarEvent,
  } = useAppStore();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("agenda");
  const [selectedDay, setSelectedDay] = useState<number | null>(3);
  const [hovDay, setHovDay] = useState<number | null>(null);
  const [hovRow, setHovRow] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [newConsultForm, setNewConsultForm] = useState({
    patientName: "",
    date: "2026-07-03",
    heure: "09:00",
    duree: 30,
    motif: "",
    type: "Présentiel" as "Présentiel" | "Téléconsultation",
  });

  // KPIs
  const today = "2026-07-03";
  const tomorrow = "2026-07-04";
  const todayEvents = calendarEvents.filter((e) => e.date === today);
  const kpiTotal = todayEvents.length;
  const kpiConfirmed = todayEvents.filter((e) => e.statut === "Confirmé").length;
  const kpiTele = todayEvents.filter((e) => e.type === "Téléconsultation").length;
  const kpiTomorrow = calendarEvents.filter((e) => e.date === tomorrow).length;

  // Sidebar menu
  const menuItems: { id: SidebarTab; icon: string; label: string }[] = [
    { id: "agenda", icon: "calendar_month", label: "Agenda" },
    { id: "patients", icon: "people", label: "Patients & dossiers" },
    { id: "teleconsult", icon: "videocam", label: "Téléconsultation" },
    { id: "messages", icon: "chat", label: "Messages" },
    { id: "aide", icon: "help_center", label: "Aide & Cartes" },
  ];

  // Selected day events
  const selectedDayEvents = selectedDay ? eventsForDay(calendarEvents, selectedDay) : [];
  const selectedDateLabel = selectedDay
    ? new Date(`2026-07-${String(selectedDay).padStart(2, "0")}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  // Patients filtered
  const filteredPatients = patients.filter((p) =>
    patientSearch === "" ||
    p.nom.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.village || "").toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Téléconsult events
  const teleEvents = calendarEvents.filter((e) => e.type === "Téléconsultation");

  function handleAddConsult() {
    if (!newConsultForm.patientName.trim()) return;
    const maxId = calendarEvents.reduce((m, e) => { const n = parseInt(e.id.split("-")[1] || "0"); return n > m ? n : m; }, 0);
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
    showToast("Consultation ajoutée");
    setModal(null);
    setNewConsultForm({ patientName: "", date: "2026-07-03", heure: "09:00", duree: 30, motif: "", type: "Présentiel" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, minWidth: 220, background: C.sidebar,
        display: "flex", flexDirection: "column",
        padding: "0 0 16px 0", flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
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

        {/* Menu */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
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
                onClick={() => setSidebarTab(item.id)}
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
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color }}>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Contenu principal ── */}
      <div style={{
        flex: 1, background: C.content,
        overflowY: "auto", padding: 24,
        display: "flex", flexDirection: "column", gap: 24,
      }}>

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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <button style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: C.muted, fontSize: 14 }}>
                    ‹
                  </button>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Juillet 2026</h3>
                  <button style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: C.muted, fontSize: 14 }}>
                    ›
                  </button>
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
                  {Array.from({ length: JULY_START_DOW }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Jours */}
                  {Array.from({ length: JULY_DAYS }, (_, i) => i + 1).map((day) => {
                    const dayEvents = eventsForDay(calendarEvents, day);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDay === day;
                    const isHov = hovDay === day;
                    const isToday = day === 3;

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
                    {["Nom", "Téléphone", "Âge", "Village", "Dernière visite", "Statut"].map((h) => (
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
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "32px 14px", textAlign: "center", color: C.muted, fontSize: 13 }}>
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
                    {ev.statut === "Confirmé" && (
                      <button
                        onMouseEnter={() => setHovBtn(`join-${ev.id}`)}
                        onMouseLeave={() => setHovBtn(null)}
                        onClick={() => showToast("Téléconsultation en cours de connexion...")}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: hovBtn === `join-${ev.id}` ? C.blueHov : C.blue,
                          color: "#fff", border: "none", borderRadius: 8,
                          padding: "8px 14px", cursor: "pointer",
                          fontSize: 13, fontWeight: 600,
                          transition: "background 0.15s",
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>videocam</span>
                        Rejoindre
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ ONGLET MESSAGES ══ */}
        {sidebarTab === "messages" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: C.muted }}>
            <span className="material-symbols-rounded" style={{ fontSize: 56, opacity: 0.25 }}>chat</span>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Messagerie à venir</div>
            <div style={{ fontSize: 13 }}>Cette fonctionnalité sera disponible prochainement.</div>
          </div>
        )}

        {/* ══ ONGLET AIDE ══ */}
        {sidebarTab === "aide" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: C.muted }}>
            <span className="material-symbols-rounded" style={{ fontSize: 56, opacity: 0.25 }}>help_center</span>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Aide & Cartes de santé</div>
            <div style={{ fontSize: 13 }}>Documentation et guides disponibles hors-ligne.</div>
          </div>
        )}
      </div>

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
