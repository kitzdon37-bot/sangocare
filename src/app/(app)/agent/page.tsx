"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Patient, SyncQueueItem } from "@/store/appStore";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0C1A1E",
  sidebar: "#081215",
  teal: "#0E7C7B",
  tealHov: "#0a5f5e",
  content: "#F4F7F6",
  card: "#FFFFFF",
  text: "#0F1F24",
  muted: "#46565B",
  green: "#059669",
  blue: "#2563EB",
  orange: "#EA580C",
  red: "#DC2626",
  border: "#E2E8EE",
  rowHov: "#EAF5F5",
} as const;

// ─── Heures disponibles ───────────────────────────────────────────────────────
const TIME_SLOTS = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30",
];

// ─── Badge statut patient ─────────────────────────────────────────────────────
function PatientBadge({ statut }: { statut: Patient["statut"] }) {
  const map: Record<Patient["statut"], { bg: string; color: string }> = {
    "Actif":   { bg: "#D1FAE5", color: "#065F46" },
    "Suivi":   { bg: "#DBEAFE", color: "#1E3A8A" },
    "Référé":  { bg: "#FFEDD5", color: "#9A3412" },
  };
  const s = map[statut];
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600,
    }}>
      {statut}
    </span>
  );
}

// ─── Badge sync ───────────────────────────────────────────────────────────────
function SyncBadge({ status }: { status: SyncQueueItem["status"] }) {
  return (
    <span style={{
      background: status === "pending" ? "#FFEDD5" : "#D1FAE5",
      color: status === "pending" ? "#9A3412" : "#065F46",
      padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600,
    }}>
      {status === "pending" ? "En attente" : "Synchronisé"}
    </span>
  );
}

// ─── Icône type sync ──────────────────────────────────────────────────────────
function SyncIcon({ type }: { type: SyncQueueItem["type"] }) {
  const map: Record<SyncQueueItem["type"], string> = {
    rdv: "calendar_month",
    dossier: "folder",
    resultat: "science",
  };
  return (
    <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 20 }}>
      {map[type]}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, removeToast } = useAppStore();
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            background: C.text, color: "#fff",
            padding: "10px 18px", borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            cursor: "pointer", fontSize: 14, fontWeight: 500,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Modal overlay ────────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(8,18,21,0.7)",
        zIndex: 1000, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 12, padding: 32, minWidth: 440, maxWidth: 520, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Input field helper ───────────────────────────────────────────────────────
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
  boxSizing: "border-box",
  outline: "none",
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AgentPage() {
  const {
    networkMode, modal, setModal, showToast,
    patients, addPatient, removePatient,
    doctors, addAppointment,
    syncQueue, toggleSyncItem, syncAll,
  } = useAppStore();

  const [hovRow, setHovRow] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [newRdvForm, setNewRdvForm] = useState({
    patientName: "", phone: "", doctorId: "D001",
    date: "2026-07-03", heure: "09:00", motif: "",
  });
  const [newPatientForm, setNewPatientForm] = useState({
    nom: "", telephone: "", age: "", village: "",
  });

  const pendingCount = syncQueue.filter((i) => i.status === "pending").length;

  // ── Sidebar menu items ──────────────────────────────────────────────────────
  const menuItems = [
    { id: "dashboard", icon: "dashboard", label: "Tableau de bord", active: true },
    { id: "rdv", icon: "event_available", label: "Prendre un RDV", active: false },
    { id: "patients", icon: "people", label: "Mes patients", active: false },
    { id: "sync", icon: "sync", label: "Synchronisation", active: false },
    { id: "aide", icon: "help", label: "Aide", active: false },
  ];

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleAddRdv() {
    if (!newRdvForm.patientName.trim()) return;
    addAppointment({
      patientName: newRdvForm.patientName,
      phone: newRdvForm.phone,
      doctorId: newRdvForm.doctorId,
      date: newRdvForm.date,
      heure: newRdvForm.heure,
      motif: newRdvForm.motif,
      statut: "En attente",
      type: "Présentiel",
    });
    showToast("RDV en file de sync");
    setModal(null);
    setNewRdvForm({ patientName: "", phone: "", doctorId: "D001", date: "2026-07-03", heure: "09:00", motif: "" });
  }

  function handleAddPatient() {
    if (!newPatientForm.nom.trim()) return;
    addPatient({
      nom: newPatientForm.nom,
      telephone: newPatientForm.telephone,
      age: parseInt(newPatientForm.age) || 0,
      village: newPatientForm.village,
      derniereVisite: "2026-07-03",
      statut: "Actif",
    });
    showToast("Patient enregistré");
    setModal(null);
    setNewPatientForm({ nom: "", telephone: "", age: "", village: "" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>
      <ToastContainer />

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, minWidth: 220, background: C.sidebar,
        display: "flex", flexDirection: "column",
        padding: "0 0 16px 0", position: "relative",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: C.green, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10,
          }}>
            AG
          </div>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>Agent communautaire</div>
          <div style={{ color: "#7A9BA0", fontSize: 12, marginTop: 2 }}>Boyali — Zone Nord</div>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {menuItems.map((item) => {
            const isHov = hovBtn === `menu-${item.id}`;
            const bg = item.active
              ? "rgba(14,124,123,0.25)"
              : isHov ? "rgba(255,255,255,0.06)" : "transparent";
            const color = item.active ? "#5ECEC5" : isHov ? "#C8D8DC" : "#7A9BA0";
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHovBtn(`menu-${item.id}`)}
                onMouseLeave={() => setHovBtn(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  cursor: "pointer", background: bg,
                  marginBottom: 2, transition: "background 0.15s",
                  borderLeft: item.active ? `3px solid ${C.teal}` : "3px solid transparent",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20, color }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: item.active ? 600 : 400, color }}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Badge SMS */}
        {networkMode !== "online" && (
          <div style={{
            margin: "0 12px",
            background: "rgba(234,88,12,0.15)",
            border: "1px solid rgba(234,88,12,0.4)",
            borderRadius: 8, padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: C.orange }}>sms</span>
            <span style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Mode SMS actif</span>
          </div>
        )}
      </div>

      {/* ── Contenu principal ── */}
      <div style={{
        flex: 1, background: C.content,
        overflowY: "auto", padding: 24,
        display: "flex", flexDirection: "column", gap: 32,
      }}>

        {/* Section Patients */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 22 }}>people</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>
                Mes patients
              </h2>
              <span style={{
                background: C.teal, color: "#fff",
                borderRadius: 12, padding: "1px 10px",
                fontSize: 12, fontWeight: 700,
              }}>
                {patients.length}
              </span>
            </div>
            <button
              onMouseEnter={() => setHovBtn("newPatientTop")}
              onMouseLeave={() => setHovBtn(null)}
              onClick={() => setModal("newPatient")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: hovBtn === "newPatientTop" ? C.tealHov : C.teal,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                transition: "background 0.15s",
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>person_add</span>
              Nouveau patient
            </button>
          </div>

          {/* Table */}
          <div style={{ background: C.card, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F0F5F4", borderBottom: `1px solid ${C.border}` }}>
                  {["Nom", "Téléphone", "Âge", "Village", "Dernière visite", "Statut", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
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
                    <td style={{ padding: "11px 14px", color: C.muted }}>{p.derniereVisite}</td>
                    <td style={{ padding: "11px 14px" }}><PatientBadge statut={p.statut} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onMouseEnter={() => setHovBtn(`rdv-${p.id}`)}
                          onMouseLeave={() => setHovBtn(null)}
                          onClick={() => {
                            setNewRdvForm((f) => ({ ...f, patientName: p.nom, phone: p.telephone }));
                            setModal("newRdv");
                          }}
                          style={{
                            background: hovBtn === `rdv-${p.id}` ? "#0a5f5e" : C.teal,
                            color: "#fff", border: "none", borderRadius: 6,
                            padding: "5px 10px", cursor: "pointer",
                            fontSize: 12, fontWeight: 600,
                            transition: "background 0.15s",
                          }}
                        >
                          RDV
                        </button>
                        <button
                          onMouseEnter={() => setHovBtn(`del-${p.id}`)}
                          onMouseLeave={() => setHovBtn(null)}
                          onClick={() => { removePatient(p.id); showToast("Patient supprimé"); }}
                          style={{
                            background: hovBtn === `del-${p.id}` ? "#B91C1C" : "#FEE2E2",
                            color: hovBtn === `del-${p.id}` ? "#fff" : C.red,
                            border: "none", borderRadius: 6,
                            padding: "5px 8px", cursor: "pointer",
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Synchronisation */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 22 }}>sync</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>File de synchronisation</h2>
              {pendingCount > 0 && (
                <span style={{
                  background: C.orange, color: "#fff",
                  borderRadius: 12, padding: "1px 10px",
                  fontSize: 12, fontWeight: 700,
                }}>
                  {pendingCount} en attente
                </span>
              )}
            </div>
            {pendingCount > 0 && (
              <button
                onMouseEnter={() => setHovBtn("syncAll")}
                onMouseLeave={() => setHovBtn(null)}
                onClick={() => { syncAll(); showToast("Tout synchronisé !"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: hovBtn === "syncAll" ? "#C2410C" : C.orange,
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 16px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                  transition: "background 0.15s",
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>sync</span>
                Tout synchroniser
              </button>
            )}
          </div>

          <div style={{ background: C.card, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            {syncQueue.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px",
                  borderBottom: i < syncQueue.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <SyncIcon type={item.type} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{item.patientName}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {new Date(item.timestamp).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    {" · "}
                    <span style={{ textTransform: "capitalize" }}>{item.type === "rdv" ? "Rendez-vous" : item.type === "dossier" ? "Dossier" : "Résultat"}</span>
                  </div>
                </div>
                <SyncBadge status={item.status} />
                {item.status === "pending" && (
                  <button
                    onMouseEnter={() => setHovBtn(`sync-${item.id}`)}
                    onMouseLeave={() => setHovBtn(null)}
                    onClick={() => { toggleSyncItem(item.id); showToast("Synchronisé !"); }}
                    style={{
                      background: hovBtn === `sync-${item.id}` ? "#0a5f5e" : C.teal,
                      color: "#fff", border: "none", borderRadius: 6,
                      padding: "6px 12px", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                  >
                    Synchroniser
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section Actions rapides */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span className="material-symbols-rounded" style={{ color: C.teal, fontSize: 22 }}>bolt</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Actions rapides</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { id: "qa-rdv", icon: "add_circle", label: "Prendre un RDV", desc: "Enregistrer un nouveau rendez-vous", action: () => setModal("newRdv"), color: C.teal },
              { id: "qa-patient", icon: "person_add", label: "Enregistrer un patient", desc: "Créer un nouveau dossier patient", action: () => setModal("newPatient"), color: C.blue },
              { id: "qa-scan", icon: "qr_code", label: "Scanner une carte", desc: "Identifier un patient par QR code", action: () => showToast("Scanner non disponible hors-ligne"), color: C.muted },
            ].map((card) => (
              <div
                key={card.id}
                onMouseEnter={() => setHovBtn(card.id)}
                onMouseLeave={() => setHovBtn(null)}
                onClick={card.action}
                style={{
                  background: C.card, borderRadius: 10,
                  padding: 20, cursor: "pointer",
                  boxShadow: hovBtn === card.id
                    ? "0 4px 16px rgba(14,124,123,0.15)"
                    : "0 1px 4px rgba(0,0,0,0.08)",
                  border: `1px solid ${hovBtn === card.id ? C.teal : C.border}`,
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 32, color: card.color }}>
                  {card.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Modal Nouveau RDV ── */}
      {modal === "newRdv" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-rounded" style={{ color: C.teal }}>event_available</span>
              Nouveau rendez-vous
            </h3>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <Field label="Nom du patient">
            <input
              style={inputStyle}
              value={newRdvForm.patientName}
              onChange={(e) => setNewRdvForm((f) => ({ ...f, patientName: e.target.value }))}
              placeholder="Nom complet du patient"
            />
          </Field>
          <Field label="Téléphone">
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ ...inputStyle, width: "auto", padding: "9px 12px", background: "#E8EEEF", color: C.muted, fontWeight: 600, flexShrink: 0 }}>+236</span>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newRdvForm.phone}
                onChange={(e) => setNewRdvForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="75 12 34 56"
              />
            </div>
          </Field>
          <Field label="Médecin">
            <select
              style={inputStyle}
              value={newRdvForm.doctorId}
              onChange={(e) => setNewRdvForm((f) => ({ ...f, doctorId: e.target.value }))}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.nom} — {d.specialite}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date">
              <input
                type="date"
                style={inputStyle}
                value={newRdvForm.date}
                onChange={(e) => setNewRdvForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Heure">
              <select
                style={inputStyle}
                value={newRdvForm.heure}
                onChange={(e) => setNewRdvForm((f) => ({ ...f, heure: e.target.value }))}
              >
                {TIME_SLOTS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Motif de la consultation">
            <input
              style={inputStyle}
              value={newRdvForm.motif}
              onChange={(e) => setNewRdvForm((f) => ({ ...f, motif: e.target.value }))}
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
              onMouseEnter={() => setHovBtn("submitRdv")}
              onMouseLeave={() => setHovBtn(null)}
              onClick={handleAddRdv}
              style={{
                background: hovBtn === "submitRdv" ? C.tealHov : C.teal,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "9px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                transition: "background 0.15s",
              }}
            >
              Enregistrer en file
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Modal Nouveau patient ── */}
      {modal === "newPatient" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-rounded" style={{ color: C.teal }}>person_add</span>
              Nouveau patient
            </h3>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <Field label="Nom complet">
            <input
              style={inputStyle}
              value={newPatientForm.nom}
              onChange={(e) => setNewPatientForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Prénom et nom"
            />
          </Field>
          <Field label="Téléphone">
            <input
              style={inputStyle}
              value={newPatientForm.telephone}
              onChange={(e) => setNewPatientForm((f) => ({ ...f, telephone: e.target.value }))}
              placeholder="+236 75 xx xx xx"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Âge">
              <input
                type="number"
                style={inputStyle}
                value={newPatientForm.age}
                onChange={(e) => setNewPatientForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="Ex: 34"
                min={0}
                max={120}
              />
            </Field>
            <Field label="Village">
              <input
                style={inputStyle}
                value={newPatientForm.village}
                onChange={(e) => setNewPatientForm((f) => ({ ...f, village: e.target.value }))}
                placeholder="Ex: Boyali"
              />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setModal(null)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 }}
            >
              Annuler
            </button>
            <button
              onMouseEnter={() => setHovBtn("submitPatient")}
              onMouseLeave={() => setHovBtn(null)}
              onClick={handleAddPatient}
              style={{
                background: hovBtn === "submitPatient" ? C.tealHov : C.teal,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "9px 20px", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                transition: "background 0.15s",
              }}
            >
              Enregistrer
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
