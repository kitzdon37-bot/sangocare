"use client";
import { useState, useEffect } from "react";
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

const STEPS = [
  { icon: "search", title: "Cherchez", desc: "Médecin, spécialité ou symptôme" },
  { icon: "event_available", title: "Choisissez", desc: "Un créneau disponible en ligne ou SMS" },
  { icon: "notifications", title: "Rappel", desc: "SMS en Sango et Français" },
  { icon: "medical_services", title: "Consultez", desc: "En présentiel ou téléconsultation" },
];

const MODES = [
  { icon: "language", title: "Application web", desc: "Internet requis, fonctionnalités complètes", color: "#0E7C7B" },
  { icon: "smartphone", title: "App mobile", desc: "Android 5+, synchronisation hors-ligne", color: "#2563EB" },
  { icon: "signal_cellular_alt", title: "USSD *123#", desc: "Sans smartphone, sans internet, en Sango", color: "#D97706" },
];

export default function SitePage() {
  const { doctors, modal, setModal, selectedDoctorId, setSelectedDoctor, setSelectedSpecialty, addAppointment, userName, showToast } = useAppStore();

  const [hovCard, setHovCard] = useState<string | null>(null);
  const [hovSpec, setHovSpec] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("2026-07-03");
  const [motif, setMotif] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [siteScreen, setSiteScreen] = useState<"landing" | "search">("landing");
  const [filterDispo, setFilterDispo] = useState("semaine");
  const [filterType, setFilterType] = useState("presentiel");

  useEffect(() => {
    const h = () => setIsMobileView(window.innerWidth < 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  const genId = () => {
    const max = doctors.reduce((m, _, i) => Math.max(m, i + 5), 4);
    return `RDV-2026-${String(max + 1).padStart(3, "0")}`;
  };

  const confirmBooking = () => {
    if (!selectedDoc || !selectedSlot) { showToast("Choisissez un créneau"); return; }
    const rdv: Appointment = {
      id: genId(),
      patientName: userName,
      patientPhone: "",
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      specialty: selectedDoc.specialty,
      date: bookingDate,
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
    border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "11px 14px", fontSize: 14,
    outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", boxSizing: "border-box",
  };

  // ── Search results view ──────────────────────────────────────────────────
  if (siteScreen === "search") {
    const filteredDocs = doctors.filter(d => {
      if (filterType === "teleconsult" && !d.teleconsult) return false;
      if (!searchVal) return true;
      return d.name.toLowerCase().includes(searchVal.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchVal.toLowerCase());
    });

    return (
      <div style={{ background: "#F4F7F6", minHeight: "calc(100vh - 52px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          {/* Back button */}
          <div style={{ padding: "18px 0 10px" }}>
            <button onClick={() => setSiteScreen("landing")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0E7C7B", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
              Accueil
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* Left sidebar — filters */}
            {!isMobileView && (
              <div style={{ width: 220, flexShrink: 0, background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #E2EAE8" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0F1F24", marginBottom: 16 }}>Filtres</div>

                <div style={{ fontWeight: 700, fontSize: 12, color: "#6B7B80", marginBottom: 10 }}>Disponibilité</div>
                {[
                  ["aujourd", "Aujourd'hui"],
                  ["semaine", "Cette semaine"],
                  ["teleconsult", "Téléconsultation"],
                  ["gratuit", "Gratuités (CPN, ASC)"],
                ].map(([id, label]) => (
                  <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                    <div onClick={() => setFilterDispo(filterDispo === id ? "" : id)}
                      style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${filterDispo === id ? "#0E7C7B" : "#E2EAE8"}`, background: filterDispo === id ? "#0E7C7B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {filterDispo === id && <span className="material-symbols-rounded" style={{ fontSize: 13, color: "#fff" }}>check</span>}
                    </div>
                    <span style={{ fontSize: 12, color: "#46565B" }}>{label}</span>
                  </label>
                ))}

                <div style={{ fontWeight: 700, fontSize: 12, color: "#6B7B80", marginBottom: 10, marginTop: 16 }}>Type</div>
                {[
                  ["presentiel", "Présentiel"],
                  ["teleconsult2", "Téléconsult"],
                ].map(([id, label]) => (
                  <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                    <div onClick={() => setFilterType(filterType === id ? "" : id)}
                      style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${filterType === id ? "#0E7C7B" : "#E2EAE8"}`, background: filterType === id ? "#0E7C7B" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {filterType === id && <span className="material-symbols-rounded" style={{ fontSize: 13, color: "#fff" }}>check</span>}
                    </div>
                    <span style={{ fontSize: 12, color: "#46565B" }}>{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Right — doctor list */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 16 }}>
                {filteredDocs.length} praticiens · Bangui
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredDocs.map(d => (
                  <div key={d.id}
                    onMouseEnter={() => setHovCard(d.id)} onMouseLeave={() => setHovCard(null)}
                    style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: hovCard === d.id ? "0 8px 24px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #E2EAE8", display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{d.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>{d.name}</span>
                        {d.verified && <span className="material-symbols-rounded" style={{ fontSize: 15, color: "#0E7C7B" }}>verified</span>}
                        {d.teleconsult && <span style={{ background: "#EEF4FF", color: "#2563EB", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px" }}>Téléconsult</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>{d.specialty} · {d.location}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#D97706" }}>★ {d.rating} <span style={{ color: "#8AA4A8" }}>({d.reviews})</span></span>
                        <span style={{ fontSize: 12, color: "#8AA4A8" }}>{d.distance}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: "#6B7B80", textAlign: "right" }}>
                        Prochain créneau<br />
                        <strong style={{ color: "#0E7C7B" }}>{d.dispo || "Auj."}</strong>
                      </div>
                      <button onClick={() => { setSelectedDoctor(d.id); setModal("bookingModal"); }}
                        onMouseEnter={() => setHovBtn(d.id)} onMouseLeave={() => setHovBtn(null)}
                        style={{ background: hovBtn === d.id ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        Prendre RDV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Booking modal */}
        {modal === "bookingModal" && selectedDoc && (
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ background: "#0C1A1E", padding: "20px", borderRadius: "20px 20px 0 0", position: "sticky", top: 0 }}>
                <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>close</span>
                </button>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{selectedDoc.initials}</div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.name}</div>
                    <div style={{ color: "#8AA4A8", fontSize: 12 }}>{selectedDoc.specialty} · {selectedDoc.location}</div>
                    <div style={{ color: "#D97706", fontSize: 12, marginTop: 2 }}>★ {selectedDoc.rating} · <span style={{ color: selectedDoc.price.startsWith("Gratuit") ? "#1F8A5B" : "#fff", fontWeight: 700 }}>{selectedDoc.price}</span></div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 8 }}>Créneau disponible</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(selectedDoc.availableSlots || []).map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)}
                        style={{ background: selectedSlot === slot ? "#0E7C7B" : "#F6F8F7", border: `1.5px solid ${selectedSlot === slot ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: selectedSlot === slot ? "#fff" : "#0F1F24", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 6 }}>Motif (optionnel)</label>
                  <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : fièvre, contrôle annuel..."
                    style={{ border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2EAE8", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7B80", fontFamily: "inherit" }}>Annuler</button>
                  <button onClick={confirmBooking} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "#0E7C7B", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Confirmer le RDV</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "#F4F7F6", minHeight: "calc(100vh - 52px)" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #0C1A1E 0%, #0E2D2C 100%)", padding: isMobileView ? "48px 20px 56px" : "72px 40px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(14,124,123,0.18)", border: "1px solid rgba(14,124,123,0.35)", borderRadius: 20, padding: "5px 14px", marginBottom: 22 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 15, color: "#0E7C7B" }}>location_on</span>
            <span style={{ color: "#0E7C7B", fontSize: 12, fontWeight: 700 }}>Prenez rendez-vous partout en Centrafrique</span>
          </div>
          <h1 style={{ color: "#fff", fontWeight: 800, fontSize: isMobileView ? 28 : 48, lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.02em", maxWidth: 700 }}>
            Trouvez un praticien et réservez en ligne — même sans internet.
          </h1>
          <p style={{ color: "#8AA4A8", fontSize: 16, lineHeight: 1.6, margin: "0 0 32px", maxWidth: 580 }}>
            Médecins vérifiés par l'Ordre National, téléconsultation, paiement Mobile Money, rappels SMS en Français et en Sango.
          </p>

          {/* Search bar */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 640 }}>
            <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
              <span className="material-symbols-rounded" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#8AA4A8" }}>search</span>
              <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Médecin, spécialité, symptôme..." style={{ ...inp, width: "100%", paddingLeft: 38 }} />
            </div>
            <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
              <span className="material-symbols-rounded" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#8AA4A8" }}>location_on</span>
              <input value={locationVal} onChange={e => setLocationVal(e.target.value)} placeholder="Bangui, Bambari..." style={{ ...inp, width: "100%", paddingLeft: 38 }} />
            </div>
            <button onClick={() => setSiteScreen("search")}
              onMouseEnter={() => setHovBtn("search")} onMouseLeave={() => setHovBtn(null)}
              style={{ background: hovBtn === "search" ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "11px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              Rechercher
            </button>
          </div>

          {/* Stats badges */}
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            {[
              { icon: "check_circle", label: "48 Praticiens en ligne", color: "#1F8A5B" },
              { icon: "signal_cellular_alt", label: "Disponibles hors ligne SMS", color: "#D97706" },
              { icon: "payments", label: "Paiement Mobile Money", color: "#0E7C7B" },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "6px 14px" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: b.color }}>{b.icon}</span>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Specialties ──────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0F1F24", marginBottom: 24 }}>Consulter par spécialité</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "repeat(4, 1fr)" : "repeat(8, 1fr)", gap: 12 }}>
            {SPECIALTIES.map(s => (
              <button key={s.label}
                onClick={() => { setSelectedSpecialty(s.label); setSiteScreen("search"); }}
                onMouseEnter={() => setHovSpec(s.label)} onMouseLeave={() => setHovSpec(null)}
                style={{ background: "#fff", border: "1.5px solid #E2EAE8", borderRadius: 14, padding: "16px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transform: hovSpec === s.label ? "translateY(-3px)" : "none", boxShadow: hovSpec === s.label ? "0 8px 24px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.15s", fontFamily: "inherit" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: s.color }}>{s.icon}</span>
                </div>
                <span style={{ fontSize: 11, color: "#46565B", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctors ──────────────────────────────────────────────────────────── */}
      <section style={{ background: "#F4F7F6", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#0F1F24" }}>Praticiens recommandés près de vous</div>
            <button style={{ background: "none", border: "none", color: "#0E7C7B", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
              Voir tout <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {doctors.map(d => (
              <div key={d.id}
                onMouseEnter={() => setHovCard(d.id)} onMouseLeave={() => setHovCard(null)}
                style={{ background: "#fff", borderRadius: 16, padding: "20px", boxShadow: hovCard === d.id ? "0 10px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.15s", border: "1px solid #E2EAE8" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>{d.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0F1F24" }}>{d.name}</span>
                      {d.verified && <span className="material-symbols-rounded" style={{ fontSize: 15, color: "#0E7C7B" }}>verified</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>{d.specialty}</div>
                    <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 1, display: "flex", alignItems: "center", gap: 3 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>location_on</span>
                      {d.location} · {d.distance}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#D97706", fontWeight: 600 }}>★ {d.rating} <span style={{ color: "#8AA4A8", fontWeight: 400 }}>({d.reviews})</span></span>
                    {d.teleconsult && <span style={{ background: "#EEF4FF", color: "#2563EB", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px" }}>Téléconsult</span>}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                </div>
                <button
                  onClick={() => { setSelectedDoctor(d.id); setModal("bookingModal"); }}
                  onMouseEnter={() => setHovBtn(d.id)} onMouseLeave={() => setHovBtn(null)}
                  style={{ width: "100%", background: hovBtn === d.id ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "11px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Prendre RDV
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0F1F24", textAlign: "center", marginBottom: 36 }}>Comment ça marche ?</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(4, 1fr)", gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} style={{ textAlign: "center", padding: "20px 12px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E5F2F1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 28, color: "#0E7C7B" }}>{s.icon}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B", marginBottom: 4 }}>Étape {i + 1}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#6B7B80", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access modes ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#0C1A1E", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", textAlign: "center", marginBottom: 8 }}>Accessible à tous, partout en RCA</div>
          <div style={{ color: "#8AA4A8", textAlign: "center", fontSize: 14, marginBottom: 36 }}>Trois façons de prendre rendez-vous, selon votre connexion</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {MODES.map(m => (
              <div key={m.title} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 20px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${m.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 26, color: m.color }}>{m.icon}</span>
                </div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{m.title}</div>
                <div style={{ color: "#8AA4A8", fontSize: 13, lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#081215", padding: isMobileView ? "28px 20px" : "40px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>calendar_add_on</span>
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>SangoCare</div>
              <div style={{ color: "#8AA4A8", fontSize: 11 }}>© 2026 · Bangui, République Centrafricaine</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["À propos", "Praticiens", "Contact", "CGU"].map(l => (
              <span key={l} style={{ color: "#8AA4A8", fontSize: 13, cursor: "pointer" }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Booking modal ─────────────────────────────────────────────────────── */}
      {modal === "bookingModal" && selectedDoc && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ background: "#0C1A1E", padding: "20px", borderRadius: "20px 20px 0 0", position: "sticky", top: 0 }}>
              <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>close</span>
              </button>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{selectedDoc.initials}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.name}</div>
                  <div style={{ color: "#8AA4A8", fontSize: 12 }}>{selectedDoc.specialty} · {selectedDoc.location}</div>
                  <div style={{ color: "#D97706", fontSize: 12, marginTop: 2 }}>★ {selectedDoc.rating} · <span style={{ color: selectedDoc.price.startsWith("Gratuit") ? "#1F8A5B" : "#fff", fontWeight: 700 }}>{selectedDoc.price}</span></div>
                </div>
              </div>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 6 }}>Date souhaitée</label>
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 8 }}>Créneau disponible</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(selectedDoc.availableSlots || []).map(slot => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                      style={{ background: selectedSlot === slot ? "#0E7C7B" : "#F6F8F7", border: `1.5px solid ${selectedSlot === slot ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: selectedSlot === slot ? "#fff" : "#0F1F24", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 6 }}>Motif (optionnel)</label>
                <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : fièvre, contrôle annuel..." style={{ ...inp, width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2EAE8", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7B80", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={confirmBooking} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "#0E7C7B", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Confirmer le RDV</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
