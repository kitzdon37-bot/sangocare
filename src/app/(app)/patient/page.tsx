"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Appointment } from "@/store/appStore";

type PScreen = "home" | "search" | "doctor" | "payment" | "done";
type SearchFilter = "tous" | "teleconsult" | "2km" | "dispo";
type PayMethod = "orange" | "moov" | "place";

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

const DAYS = [
  { label: "Mar", num: "2" },
  { label: "Mer", num: "3" },
  { label: "Jeu", num: "4" },
  { label: "Ven", num: "5" },
  { label: "Sam", num: "6" },
];

const SLOTS = ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"];

export default function PatientPage() {
  const {
    userName, userInitials, doctors, appointments,
    selectedDoctorId, setSelectedDoctor,
    addAppointment, showToast,
  } = useAppStore();

  const [pScreen, setPScreen] = useState<PScreen>("home");
  const [filter, setFilter] = useState<SearchFilter>("tous");
  const [searchInput, setSearchInput] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("orange");
  const [carnetOpen, setCarnetOpen] = useState(false);

  const nextRdv = appointments.find(a => a.statut === "Confirmé" || a.statut === "En attente");
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  const filteredDocs = doctors.filter(d => {
    if (filter === "teleconsult" && !d.teleconsult) return false;
    if (filter === "2km") {
      const km = parseFloat((d.distance || "").replace(",", "."));
      if (isNaN(km) || km > 2) return false;
    }
    if (!searchInput) return true;
    return (
      d.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchInput.toLowerCase())
    );
  });

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
      date: `2026-07-0${DAYS[selectedDay].num}`,
      heure: selectedSlot,
      type: selectedDoc.teleconsult ? "Téléconsultation" : "Présentiel",
      statut: "Confirmé",
    };
    addAppointment(rdv);
    setPScreen("done");
  };

  // ── Status bar ─────────────────────────────────────────────────────────────
  const StatusBar = () => (
    <div style={{ background: "#fff", padding: "10px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24" }}>08:24</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>signal_cellular_alt</span>
        <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>wifi</span>
        <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0F1F24" }}>battery_5_bar</span>
      </div>
    </div>
  );

  // ── Bottom nav ─────────────────────────────────────────────────────────────
  const BottomNav = ({ active }: { active: string }) => (
    <div style={{ background: "#fff", borderTop: "1px solid #E2EAE8", display: "flex", padding: "8px 0 12px", flexShrink: 0 }}>
      {[
        { id: "accueil", icon: "home", label: "Accueil" },
        { id: "search", icon: "search", label: "Rechercher" },
        { id: "carnet", icon: "menu_book", label: "Carnet" },
        { id: "plus", icon: "grid_view", label: "Plus" },
      ].map(tab => (
        <button key={tab.id}
          onClick={() => {
            if (tab.id === "search") { setPScreen("search"); setCarnetOpen(false); }
            else if (tab.id === "accueil") { setPScreen("home"); setCarnetOpen(false); }
            else if (tab.id === "carnet") { setCarnetOpen(true); setPScreen("home"); }
            else { showToast("Menu — bientôt disponible"); }
          }}
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: active === tab.id ? "#0E7C7B" : "#8AA4A8" }}>{tab.icon}</span>
          <span style={{ fontSize: 10, color: active === tab.id ? "#0E7C7B" : "#8AA4A8", fontWeight: active === tab.id ? 700 : 500 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  // ── HOME ───────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#8AA4A8" }}>Bonjour,</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0F1F24" }}>{userName}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{userInitials}</div>
      </div>

      <button onClick={() => setPScreen("search")}
        style={{ background: "#F6F8F7", border: "none", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>search</span>
        <span style={{ fontSize: 13, color: "#8AA4A8" }}>Médecin, spécialité, symptôme…</span>
      </button>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Besoin d'un soin ?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {SPECIALTIES.map(s => (
            <button key={s.label} onClick={() => setPScreen("search")}
              style={{ background: "#fff", border: "none", borderRadius: 12, padding: "10px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: "0 1px 5px rgba(0,0,0,0.07)", fontFamily: "inherit" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <span style={{ fontSize: 9, color: "#46565B", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

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
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{nextRdv.specialty} · {nextRdv.heure}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>DATE</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>Auj. · {nextRdv.heure}</div>
              </div>
              <button onClick={() => showToast("Connexion en cours…")}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "7px 12px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>videocam</span>
                Rejoindre
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ color: "#8AA4A8", fontSize: 12, marginBottom: 8 }}>Aucun rendez-vous à venir</div>
            <button onClick={() => setPScreen("search")} style={{ background: "#0E7C7B", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Prendre RDV</button>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Accès rapide</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
          {QUICK.map(q => (
            <button key={q.label} onClick={() => showToast(q.label)}
              style={{ background: "#fff", border: "none", borderRadius: 10, padding: "8px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontFamily: "inherit" }}>
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

  // ── CARNET ─────────────────────────────────────────────────────────────────
  const renderCarnet = () => (
    <div style={{ padding: "16px 14px", overflowY: "auto", flex: 1 }}>
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

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  const renderSearch = () => (
    <>
      <div style={{ background: "#fff", borderBottom: "1px solid #E2EAE8", padding: "10px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setPScreen("home")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#0F1F24" }}>arrow_back</span>
          </button>
          <div style={{ flex: 1, background: "#F6F8F7", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>search</span>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Médecin, spécialité…" autoFocus
              style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#0F1F24", width: "100%", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {([
            ["tous", "Tous"],
            ["teleconsult", "Téléconsult"],
            ["2km", "< 2 km"],
            ["dispo", "Dispo auj."],
          ] as [SearchFilter, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ background: filter === id ? "#0E7C7B" : "#F6F8F7", border: filter === id ? "none" : "1px solid #E2EAE8", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: filter === id ? "#fff" : "#46565B", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: "#8AA4A8", marginBottom: 8, fontWeight: 600 }}>{filteredDocs.length} praticiens près de vous</div>
        {filteredDocs.map(d => (
          <button key={d.id}
            onClick={() => { setSelectedDoctor(d.id); setSelectedSlot(null); setSelectedDay(0); setPScreen("doctor"); }}
            style={{ width: "100%", background: "#fff", border: "none", borderRadius: 14, padding: "12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 8, boxShadow: "0 1px 5px rgba(0,0,0,0.07)", fontFamily: "inherit" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{d.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24" }}>{d.name}</span>
                  {d.verified && <span className="material-symbols-rounded" style={{ fontSize: 13, color: "#0E7C7B" }}>verified</span>}
                </div>
                <div style={{ fontSize: 11, color: "#6B7B80", marginTop: 1 }}>{d.specialty} · {d.location}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "#D97706" }}>★ {d.rating}</span>
                  <span style={{ fontSize: 11, color: "#8AA4A8" }}>{d.distance}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {d.teleconsult && (
                  <span style={{ background: "#EEF4FF", color: "#2563EB", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 11 }}>videocam</span>Téléconsult
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#6B7B80" }}>
                  Dispo : <strong style={{ color: "#0E7C7B" }}>{d.dispo || "Auj."}</strong>
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}>
                Prendre RDV<span className="material-symbols-rounded" style={{ fontSize: 13 }}>chevron_right</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  // ── DOCTOR PROFILE ─────────────────────────────────────────────────────────
  const renderDoctor = () => {
    if (!selectedDoc) return null;
    return (
      <>
        <div style={{ background: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #E2EAE8", flexShrink: 0 }}>
          <button onClick={() => setPScreen("search")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#0F1F24" }}>arrow_back</span>
          </button>
          <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.initials}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: "#0F1F24" }}>{selectedDoc.name}</span>
                {selectedDoc.verified && <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0E7C7B" }}>verified</span>}
              </div>
              <div style={{ fontSize: 11, color: "#6B7B80" }}>{selectedDoc.specialty}</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 12, color: "#D97706" }}>star</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0F1F24" }}>{selectedDoc.rating}</span>
                <span style={{ fontSize: 11, color: "#8AA4A8" }}>({selectedDoc.reviews})</span>
                <span style={{ fontSize: 11, color: "#8AA4A8" }}>· {selectedDoc.distance}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E5F2F1", borderRadius: 8, padding: "7px 10px" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 15, color: "#0E7C7B" }}>verified_user</span>
            <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 600 }}>Praticien vérifié · Ordre National des Médecins de RCA</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "#F6F8F7", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#8AA4A8", fontWeight: 700, marginBottom: 2 }}>TARIF</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: selectedDoc.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{selectedDoc.price}</div>
            </div>
            <div style={{ flex: 1, background: "#F6F8F7", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "#8AA4A8", fontWeight: 700, marginBottom: 2 }}>LANGUES</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1F24" }}>{selectedDoc.languages || "FR · Sango"}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24", marginBottom: 10 }}>Choisir un créneau</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {DAYS.map((d, i) => (
                <button key={d.num} onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                  style={{ flex: 1, background: selectedDay === i ? "#0E7C7B" : "#F6F8F7", border: "none", borderRadius: 10, padding: "7px 4px", cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                  <div style={{ fontSize: 9, color: selectedDay === i ? "rgba(255,255,255,0.7)" : "#8AA4A8", fontWeight: 600 }}>{d.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: selectedDay === i ? "#fff" : "#0F1F24", marginTop: 2 }}>{d.num}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SLOTS.map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)}
                  style={{ background: selectedSlot === slot ? "#0E7C7B" : "#F6F8F7", border: `1.5px solid ${selectedSlot === slot ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: selectedSlot === slot ? "#fff" : "#0F1F24", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { if (!selectedSlot) { showToast("Choisissez un créneau"); return; } setPScreen("payment"); }}
            style={{ width: "100%", background: "#0E7C7B", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
            Confirmer le rendez-vous
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
        </div>
      </>
    );
  };

  // ── PAYMENT ────────────────────────────────────────────────────────────────
  const renderPayment = () => {
    if (!selectedDoc) return null;
    return (
      <>
        <div style={{ background: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #E2EAE8", flexShrink: 0 }}>
          <button onClick={() => setPScreen("doctor")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#0F1F24" }}>arrow_back</span>
          </button>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>Confirmer & payer</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24" }}>{selectedDoc.name}</div>
                <div style={{ fontSize: 11, color: "#6B7B80" }}>{selectedDoc.specialty}</div>
              </div>
            </div>
            {[
              { label: "Date", val: `Auj. 2 juil. · ${selectedSlot}` },
              { label: "Lieu", val: selectedDoc.teleconsult ? "Téléconsultation" : `${selectedDoc.location} · ${selectedDoc.city}` },
              { label: "Consultation", val: selectedDoc.price },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #E2EAE8" }}>
                <span style={{ fontSize: 11, color: "#8AA4A8" }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{r.val}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24", marginBottom: 8 }}>Mode de paiement</div>
            {([
              ["orange", "smartphone", "Orange Money"],
              ["moov", "smartphone", "Moov Money"],
              ["place", "payments", "Payer sur place"],
            ] as [PayMethod, string, string][]).map(([id, icon, label]) => (
              <button key={id} onClick={() => setPayMethod(id)}
                style={{ width: "100%", background: payMethod === id ? "#E5F2F1" : "#F6F8F7", border: `1.5px solid ${payMethod === id ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontFamily: "inherit" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: payMethod === id ? "#0E7C7B" : "#6B7B80" }}>{icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0F1F24", textAlign: "left" }}>{label}</span>
                {payMethod === id && <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B" }}>check_circle</span>}
              </button>
            ))}
          </div>

          <button onClick={confirmRdv}
            style={{ width: "100%", background: "#0E7C7B", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Payer {selectedDoc.price}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#8AA4A8" }}>sms</span>
            <span style={{ fontSize: 11, color: "#8AA4A8" }}>Un rappel SMS vous sera envoyé en Sango</span>
          </div>
        </div>
      </>
    );
  };

  // ── DONE ───────────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div style={{ padding: "30px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", flex: 1, overflowY: "auto" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E5F2F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#0E7C7B" }}>check_circle</span>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 6 }}>Rendez-vous confirmé</div>
        <div style={{ fontSize: 12, color: "#6B7B80", lineHeight: 1.6 }}>
          Votre rendez-vous avec<br />{selectedDoc?.name} a été enregistré.
        </div>
      </div>
      {selectedDoc && (
        <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px", width: "100%" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{selectedDoc.initials}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#0F1F24" }}>{selectedDoc.name}</div>
              <div style={{ fontSize: 11, color: "#6B7B80" }}>Auj. · {selectedSlot}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E5F2F1", borderRadius: 8, padding: "6px 10px" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0E7C7B" }}>sms</span>
            <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 600 }}>Rappel SMS programmé · 15 min avant</span>
          </div>
        </div>
      )}
      <button onClick={() => { setPScreen("home"); setSelectedSlot(null); setCarnetOpen(false); }}
        style={{ background: "#0E7C7B", border: "none", borderRadius: 12, padding: "12px 28px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
        Retour à l'accueil
      </button>
    </div>
  );

  // ── Router ─────────────────────────────────────────────────────────────────
  const navActive =
    pScreen === "search" ? "search" :
    carnetOpen ? "carnet" :
    "accueil";

  const renderContent = () => {
    if (carnetOpen && pScreen === "home") return renderCarnet();
    switch (pScreen) {
      case "search": return renderSearch();
      case "doctor": return renderDoctor();
      case "payment": return renderPayment();
      case "done": return renderDone();
      default: return renderHome();
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "#0C1A1E", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: 375, background: "#F4F7F6", borderRadius: 40, boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 80px)" }}>
        <StatusBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {renderContent()}
        </div>
        <BottomNav active={navActive} />
      </div>
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", color: "#8AA4A8", fontSize: 11, textAlign: "center", whiteSpace: "nowrap" }}>
        Astuce démo : changez l'état réseau (en haut) pour voir les modes hors-ligne et SMS/USSD.
      </div>
    </div>
  );
}
