"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Appointment } from "@/store/appStore";

const SPECIALTIES = [
  { label: "Généraliste", icon: "stethoscope", color: "#0E7C7B" },
  { label: "Pédiatre", icon: "vaccines", color: "#7C3AED" },
  { label: "Sage-femme", icon: "pregnant_woman", color: "#DB2777" },
  { label: "Cardiologue", icon: "cardiology", color: "#DC2626" },
  { label: "Dermato", icon: "dermatology", color: "#D97706" },
  { label: "Dentiste", icon: "dentistry", color: "#2563EB" },
  { label: "Palu / Fièvre", icon: "coronavirus", color: "#DC2626" },
  { label: "Agent (ASC)", icon: "person_pin_circle", color: "#059669" },
];

const QUICK = [
  { label: "Médecin GPS", icon: "near_me", color: "#0E7C7B" },
  { label: "Téléconsultation", icon: "videocam", color: "#1D69E5" },
  { label: "Pharmacie garde", icon: "local_pharmacy", color: "#7C3AED" },
  { label: "Urgences SAMU", icon: "emergency", color: "#DC2626" },
  { label: "Mon carnet", icon: "menu_book", color: "#D97706" },
  { label: "Mes RDV", icon: "event_note", color: "#0E7C7B" },
  { label: "Ma famille", icon: "family_restroom", color: "#DB2777" },
  { label: "Don de sang", icon: "bloodtype", color: "#DC2626" },
  { label: "Mobile Money", icon: "account_balance_wallet", color: "#059669" },
  { label: "Paramètres", icon: "settings", color: "#6B7B80" },
];

export default function PatientPage() {
  const {
    userName, userInitials, doctors, appointments,
    modal, setModal, selectedDoctorId, setSelectedDoctor,
    setSelectedSpecialty, addAppointment, showToast,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("accueil");
  const [hovSpec, setHovSpec] = useState<string | null>(null);
  const [hovQuick, setHovQuick] = useState<string | null>(null);
  const [hovDoc, setHovDoc] = useState<string | null>(null);
  const [hovSlot, setHovSlot] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [motif, setMotif] = useState("");

  const nextRdv = appointments.find(a => a.statut === "Confirmé" || a.statut === "En attente");
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  const filteredDocs = doctors.filter(d =>
    !searchInput ||
    d.name.toLowerCase().includes(searchInput.toLowerCase()) ||
    d.specialty.toLowerCase().includes(searchInput.toLowerCase())
  );

  const genId = () => {
    const max = appointments.reduce((m, a) => {
      const n = parseInt(a.id.split("-")[2] || "0");
      return n > m ? n : m;
    }, 0);
    return `RDV-2026-${String(max + 1).padStart(3, "0")}`;
  };

  const confirmRdv = () => {
    if (!selectedDoc || !selectedSlot) { showToast("Choisissez un créneau"); return; }
    const rdv: Appointment = {
      id: genId(),
      patientName: userName,
      patientPhone: "",
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      specialty: selectedDoc.specialty,
      date: "2026-07-03",
      heure: selectedSlot,
      type: selectedDoc.teleconsult ? "Téléconsultation" : "Présentiel",
      statut: "En attente",
      motif,
    };
    addAppointment(rdv);
    showToast("Rendez-vous enregistré !");
    setModal(null);
    setSelectedSlot(null);
    setMotif("");
  };

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, outline: "none", background: "#fff", color: "#0F1F24", boxSizing: "border-box", fontFamily: "inherit",
  };

  // ── phone content depending on bottom tab ────────────────────────────────────
  const renderContent = () => {
    if (activeTab === "rdv") {
      return (
        <div style={{ padding: "16px 14px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#0F1F24", marginBottom: 14 }}>Mes rendez-vous</div>
          {appointments.length === 0 ? (
            <div style={{ textAlign: "center", color: "#8AA4A8", marginTop: 40, fontSize: 13 }}>Aucun rendez-vous</div>
          ) : appointments.map(a => (
            <div key={a.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24" }}>{a.doctorName}</div>
              <div style={{ fontSize: 11, color: "#6B7B80", marginTop: 2 }}>{a.specialty}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#0E7C7B", fontWeight: 600 }}>{a.date} · {a.heure}</div>
                <div style={{ fontSize: 11, background: a.statut === "Confirmé" ? "#E5F2F1" : "#FFF7E0", color: a.statut === "Confirmé" ? "#0E7C7B" : "#D68000", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{a.statut}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "carnet") {
      return (
        <div style={{ padding: "16px 14px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#0F1F24", marginBottom: 14 }}>Mon carnet de santé</div>
          {[
            { label: "Groupe sanguin", val: "O+" },
            { label: "Allergies", val: "Aucune connue" },
            { label: "Maladies chroniques", val: "Paludisme récidivant" },
            { label: "Dernière consultation", val: "28 juin 2026" },
            { label: "Vaccins à jour", val: "Fièvre jaune, Polio" },
          ].map(r => (
            <div key={r.label} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 12, color: "#6B7B80" }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{r.val}</span>
            </div>
          ))}
        </div>
      );
    }

    // Accueil (default)
    return (
      <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#8AA4A8" }}>Bonjour,</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F1F24" }}>{userName}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{userInitials}</div>
        </div>

        {/* Search */}
        <button onClick={() => { setSearchInput(""); setModal("search"); }}
          style={{ background: "#F6F8F7", border: "none", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>search</span>
          <span style={{ fontSize: 13, color: "#8AA4A8" }}>Médecin, spécialité, symptôme…</span>
        </button>

        {/* Specialties */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Besoin d'un soin ?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {SPECIALTIES.map(s => (
              <button key={s.label}
                onClick={() => { setSelectedSpecialty(s.label); setModal("search"); }}
                onMouseEnter={() => setHovSpec(s.label)} onMouseLeave={() => setHovSpec(null)}
                style={{ background: "#fff", border: "none", borderRadius: 12, padding: "10px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: hovSpec === s.label ? "0 3px 12px rgba(0,0,0,0.12)" : "0 1px 5px rgba(0,0,0,0.07)", fontFamily: "inherit" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                </div>
                <span style={{ fontSize: 9, color: "#46565B", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Next RDV */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 8 }}>Mon prochain rendez-vous</div>
          {nextRdv ? (
            <div style={{ background: "#0E7C7B", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>
                  {nextRdv.doctorName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{nextRdv.doctorName}</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{nextRdv.specialty}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>DATE</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>
                    {nextRdv.date === "2026-07-03" ? "Auj." : nextRdv.date} · {nextRdv.heure}
                  </div>
                </div>
                <button style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "7px 12px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 15 }}>{nextRdv.type === "Téléconsultation" ? "videocam" : "location_on"}</span>
                  {nextRdv.type === "Téléconsultation" ? "Rejoindre" : "Voir"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ color: "#8AA4A8", fontSize: 12, marginBottom: 8 }}>Aucun rendez-vous à venir</div>
              <button onClick={() => setModal("search")} style={{ background: "#0E7C7B", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Prendre RDV</button>
            </div>
          )}
        </div>

        {/* Quick access */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Accès rapide</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
            {QUICK.map(q => (
              <button key={q.label}
                onClick={() => showToast(q.label)}
                onMouseEnter={() => setHovQuick(q.label)} onMouseLeave={() => setHovQuick(null)}
                style={{ background: "#fff", border: "none", borderRadius: 10, padding: "8px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: hovQuick === q.label ? "0 3px 12px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.06)", fontFamily: "inherit" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${q.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 15, color: q.color }}>{q.icon}</span>
                </div>
                <span style={{ fontSize: 8, color: "#46565B", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "#0C1A1E", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      {/* Phone frame */}
      <div style={{ width: 375, background: "#F4F7F6", borderRadius: 40, boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        {/* Status bar */}
        <div style={{ background: "#fff", padding: "10px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24" }}>08:24</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>signal_cellular_alt</span>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>wifi</span>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>battery_5_bar</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", background: "#F4F7F6", maxHeight: 580 }}>
          {renderContent()}
        </div>

        {/* Bottom nav */}
        <div style={{ background: "#fff", borderTop: "1px solid #E2EAE8", display: "flex", padding: "8px 0 12px" }}>
          {[
            { id: "accueil", icon: "home", label: "Accueil" },
            { id: "search", icon: "search", label: "Rechercher" },
            { id: "carnet", icon: "menu_book", label: "Carnet" },
            { id: "rdv", icon: "event_note", label: "Mes RDV" },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => tab.id === "search" ? setModal("search") : setActiveTab(tab.id)}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: activeTab === tab.id ? "#0E7C7B" : "#8AA4A8" }}>{tab.icon}</span>
              <span style={{ fontSize: 10, color: activeTab === tab.id ? "#0E7C7B" : "#8AA4A8", fontWeight: activeTab === tab.id ? 700 : 500 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", color: "#8AA4A8", fontSize: 11, textAlign: "center", whiteSpace: "nowrap" }}>
        Astuce démo : changez le réseau (en haut) pour simuler les modes hors-ligne et SMS.
      </div>

      {/* ── Modal: Search / Doctor list ─────────────────────────────────────── */}
      {modal === "search" && (
        <div onClick={() => { setModal(null); setSelectedSpecialty(null); }} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #E2EAE8", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0F1F24", marginBottom: 10 }}>Trouver un médecin</div>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Nom, spécialité, symptôme…" style={inp} autoFocus />
            </div>
            <div style={{ padding: "12px 20px" }}>
              {filteredDocs.map(d => (
                <button key={d.id}
                  onClick={() => { setSelectedDoctor(d.id); setModal("doctorDetail"); }}
                  onMouseEnter={() => setHovDoc(d.id)} onMouseLeave={() => setHovDoc(null)}
                  style={{ width: "100%", background: hovDoc === d.id ? "#F6F8F7" : "transparent", border: "none", borderRadius: 12, padding: "12px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", marginBottom: 4, fontFamily: "inherit" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{d.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0F1F24" }}>{d.name}</span>
                      {d.verified && <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0E7C7B" }}>verified</span>}
                      {d.teleconsult && <span style={{ background: "#EEF4FF", color: "#2563EB", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 6px" }}>Téléconsult</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 1 }}>{d.specialty} · {d.location}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#D97706" }}>★ {d.rating} ({d.reviews})</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Doctor detail + booking ──────────────────────────────────── */}
      {modal === "doctorDetail" && selectedDoc && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ background: "#0C1A1E", padding: "20px", borderRadius: "20px 20px 0 0", position: "sticky", top: 0 }}>
              <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>close</span>
              </button>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20 }}>{selectedDoc.initials}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{selectedDoc.name}</div>
                    {selectedDoc.verified && <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B" }}>verified</span>}
                  </div>
                  <div style={{ color: "#8AA4A8", fontSize: 13 }}>{selectedDoc.specialty} · {selectedDoc.location}</div>
                  <div style={{ color: "#D97706", fontSize: 13, marginTop: 3 }}>★ {selectedDoc.rating} · {selectedDoc.distance} · <span style={{ color: selectedDoc.price.startsWith("Gratuit") ? "#1F8A5B" : "#fff", fontWeight: 700 }}>{selectedDoc.price}</span></div>
                </div>
              </div>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {selectedDoc.bio && (
                <p style={{ fontSize: 13, color: "#46565B", lineHeight: 1.6, margin: 0 }}>{selectedDoc.bio}</p>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24", marginBottom: 8 }}>Créneaux disponibles</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(selectedDoc.availableSlots || []).map(slot => (
                    <button key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      onMouseEnter={() => setHovSlot(slot)} onMouseLeave={() => setHovSlot(null)}
                      style={{ background: selectedSlot === slot ? "#0E7C7B" : hovSlot === slot ? "#E5F2F1" : "#F6F8F7", border: `1.5px solid ${selectedSlot === slot ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: selectedSlot === slot ? "#fff" : "#0F1F24", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 6 }}>Motif de consultation (optionnel)</label>
                <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : fièvre, contrôle, renouvellement..." style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2EAE8", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7B80", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={confirmRdv} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "#0E7C7B", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Confirmer le RDV</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
