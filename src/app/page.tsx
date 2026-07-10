"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import type { Appointment } from "@/store/appStore";

const MapCentrafrique = dynamic(() => import("@/components/MapCentrafrique"), { ssr: false });

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

const QUICK_ACCESS = [
  { label: "Médecin GPS", icon: "near_me", color: "#0E7C7B", screen: "gps" as const },
  { label: "Téléconsultation", icon: "videocam", color: "#1D69E5", screen: "teleconsult" as const },
  { label: "Pharmacie garde", icon: "local_pharmacy", color: "#7C3AED", screen: "pharmacie" as const },
  { label: "Urgences SAMU", icon: "emergency", color: "#DC2626", screen: "urgences" as const },
  { label: "Mon carnet", icon: "menu_book", color: "#D97706", screen: "carnet" as const },
  { label: "Mes RDV", icon: "event_note", color: "#0E7C7B", screen: "rdv" as const },
  { label: "Ma famille", icon: "family_restroom", color: "#DB2777", screen: "famille" as const },
  { label: "Don de sang", icon: "bloodtype", color: "#DC2626", screen: "don" as const },
  { label: "Mobile Money", icon: "account_balance_wallet", color: "#059669", screen: null, toast: "Mobile Money — bientôt disponible" },
  { label: "Paramètres", icon: "settings", color: "#6B7B80", screen: null, toast: "" },
] as const;

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

const DAYS = [
  { label: "Mar", num: "2" },
  { label: "Mer", num: "3" },
  { label: "Jeu", num: "4" },
  { label: "Ven", num: "5" },
  { label: "Sam", num: "6" },
];
const SLOTS = ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"];

const PHARMACIES = [
  { name: "Pharmacie Centrale", address: "Av. Boganda, Bangui", phone: "+236 75 10 10 10", status: "Ouverte jusqu'à 22h", open: true },
  { name: "Pharmacie de la Paix", address: "Km5, Bangui", phone: "+236 75 20 20 20", status: "Ouverte jusqu'à 23h", open: true },
  { name: "Pharmacie Sainte-Marie", address: "Bimbo", phone: "+236 75 30 30 30", status: "Fermée — ouvre à 8h", open: false },
  { name: "Pharmacie Centrale II", address: "PK12", phone: "+236 75 40 40 40", status: "Ouverte 24h/24", open: true },
];

const BLOOD_COMPAT = [
  { group: "O-", canGiveTo: "Tous groupes" },
  { group: "O+", canGiveTo: "O+, A+, B+, AB+" },
  { group: "A-", canGiveTo: "A-, A+, AB-, AB+" },
  { group: "A+", canGiveTo: "A+, AB+" },
  { group: "B-", canGiveTo: "B-, B+, AB-, AB+" },
  { group: "B+", canGiveTo: "B+, AB+" },
  { group: "AB-", canGiveTo: "AB-, AB+" },
  { group: "AB+", canGiveTo: "AB+" },
];

type PayMethod = "orange" | "moov" | "place";
type BookingStep = "doctor" | "payment" | "done";
type SiteScreen =
  | "landing"
  | "search"
  | "gps"
  | "urgences"
  | "pharmacie"
  | "carnet"
  | "rdv"
  | "teleconsult"
  | "famille"
  | "don";

export default function SitePage() {
  const { doctors, appointments, modal, setModal, selectedDoctorId, setSelectedDoctor, setSelectedSpecialty, addAppointment, userName, showToast } = useAppStore();

  const [hovCard, setHovCard] = useState<string | null>(null);
  const [hovSpec, setHovSpec] = useState<string | null>(null);
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [siteScreen, setSiteScreen] = useState<SiteScreen>("landing");
  const [filterDispo, setFilterDispo] = useState("semaine");
  const [filterType, setFilterType] = useState("presentiel");

  // Booking flow state
  const [bookingStep, setBookingStep] = useState<BookingStep>("doctor");
  const [payMethod, setPayMethod] = useState<PayMethod>("orange");
  const [selectedDay, setSelectedDay] = useState(0);
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null);

  // RDV tabs + calendrier
  const [rdvTab, setRdvTab] = useState<"avenir" | "passes">("avenir");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelectedDay, setCalSelectedDay] = useState<string | null>(null);

  // Modals
  const [showParamModal, setShowParamModal] = useState(false);
  const [showAddMembre, setShowAddMembre] = useState(false);
  const [showDonForm, setShowDonForm] = useState(false);
  const [newMembreName, setNewMembreName] = useState("");
  const [newMembreRelation, setNewMembreRelation] = useState("");
  const [newMembreAge, setNewMembreAge] = useState("");
  const [newMembreSang, setNewMembreSang] = useState("O+");
  const [famMembers, setFamMembers] = useState([
    { initials: "NY", name: "Nadège Yakité", relation: "Vous", detail: "Adulte", blood: "O+", color: "#0E7C7B" },
    { initials: "TY", name: "Théodore Yakité", relation: "Enfant", detail: "8 ans", blood: "A+", color: "#7C3AED" },
    { initials: "MY", name: "Marie Yakité", relation: "Parent", detail: "54 ans", blood: "B+", color: "#D97706" },
  ]);
  const [donPhone, setDonPhone] = useState("");
  const [donBlood, setDonBlood] = useState("O+");
  const [donCity, setDonCity] = useState("Bangui");

  // Scroll restoration
  const savedScroll = useRef(0);
  const navigateTo = useCallback((screen: SiteScreen) => {
    if (screen !== "landing") savedScroll.current = window.scrollY;
    setSiteScreen(screen);
  }, []);
  useEffect(() => {
    if (siteScreen === "landing") {
      const y = savedScroll.current;
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [siteScreen]);

  // Search suggestions
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = searchVal.trim().length >= 1 ? (() => {
    const q = searchVal.toLowerCase();
    const results: { type: "doc" | "spec"; label: string; sub: string; id?: string }[] = [];
    SPECIALTIES.forEach(s => {
      if (s.label.toLowerCase().includes(q)) results.push({ type: "spec", label: s.label, sub: "Spécialité" });
    });
    doctors.forEach(d => {
      if (d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
        results.push({ type: "doc", label: d.name, sub: d.specialty + " · " + d.location, id: d.id });
    });
    return results.slice(0, 6);
  })() : [];

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
      date: `2026-07-0${DAYS[selectedDay].num}`,
      heure: selectedSlot,
      type: selectedDoc.teleconsult ? "Téléconsultation" : "Présentiel",
      statut: "En attente",
      motif,
    };
    addAppointment(rdv);
    showToast("Rendez-vous enregistré !");
    setBookingStep("done");
  };

  const openBooking = (docId: string) => {
    setSelectedDoctor(docId);
    setBookingStep("doctor");
    setSelectedSlot(null);
    setSelectedDay(0);
    setModal("bookingModal");
  };

  const inp: React.CSSProperties = {
    border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "11px 14px", fontSize: 14,
    outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", boxSizing: "border-box",
  };

  // ── Multi-step booking modal ────────────────────────────────────────────────
  const renderBookingModal = () => {
    if (modal !== "bookingModal" || !selectedDoc) return null;

    const DarkHeader = ({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) => (
      <div style={{ background: "#0C1A1E", padding: "20px", borderRadius: "20px 20px 0 0", position: "sticky", top: 0 }}>
        {onClose && (
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>close</span>
          </button>
        )}
        {onBack && (
          <button onClick={onBack} style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>arrow_back</span>
          </button>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "center", paddingLeft: onBack ? 36 : 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{selectedDoc.initials}</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.name}</div>
            <div style={{ color: "#8AA4A8", fontSize: 12 }}>{selectedDoc.specialty} · {selectedDoc.location}</div>
            <div style={{ color: "#D97706", fontSize: 12, marginTop: 2 }}>★ {selectedDoc.rating} · <span style={{ color: selectedDoc.price.startsWith("Gratuit") ? "#1F8A5B" : "#fff", fontWeight: 700 }}>{selectedDoc.price}</span></div>
          </div>
        </div>
      </div>
    );

    if (bookingStep === "doctor") {
      return (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <DarkHeader onClose={() => setModal(null)} />
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 8 }}>Choisir un jour</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {DAYS.map((d, i) => (
                    <button key={d.num} onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                      style={{ flex: 1, background: selectedDay === i ? "#0E7C7B" : "#F6F8F7", border: "none", borderRadius: 10, padding: "7px 4px", cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 9, color: selectedDay === i ? "rgba(255,255,255,0.7)" : "#8AA4A8", fontWeight: 600 }}>{d.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: selectedDay === i ? "#fff" : "#0F1F24", marginTop: 2 }}>{d.num}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#46565B", display: "block", marginBottom: 8 }}>Créneau disponible</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SLOTS.map(slot => (
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
                  style={{ ...inp, width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #E2EAE8", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6B7B80", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={() => { if (!selectedSlot) { showToast("Choisissez un créneau"); return; } setBookingStep("payment"); }}
                  style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "#0E7C7B", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>
                  Continuer →
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (bookingStep === "payment") {
      return (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <DarkHeader onBack={() => setBookingStep("doctor")} />
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{selectedDoc.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24" }}>{selectedDoc.name}</div>
                    <div style={{ fontSize: 11, color: "#6B7B80" }}>{selectedDoc.specialty}</div>
                  </div>
                </div>
                {[
                  { label: "Date", val: `${DAYS[selectedDay].label} ${DAYS[selectedDay].num} juil. · ${selectedSlot}` },
                  { label: "Lieu", val: selectedDoc.teleconsult ? "Téléconsultation" : `${selectedDoc.location} · Bangui` },
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
                  ["orange", "smartphone", "Orange Money", "#F97316"],
                  ["moov", "smartphone", "Moov Money", "#2563EB"],
                  ["place", "payments", "Payer sur place", "#059669"],
                ] as [PayMethod, string, string, string][]).map(([id, icon, label]) => (
                  <button key={id} onClick={() => setPayMethod(id)}
                    style={{ width: "100%", background: payMethod === id ? "#E5F2F1" : "#F6F8F7", border: `1.5px solid ${payMethod === id ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontFamily: "inherit" }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: payMethod === id ? "#0E7C7B" : "#6B7B80" }}>{icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0F1F24", textAlign: "left" }}>{label}</span>
                    {payMethod === id && <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B" }}>check_circle</span>}
                  </button>
                ))}
              </div>

              <button onClick={() => confirmBooking()}
                style={{ width: "100%", background: "#0E7C7B", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Payer {selectedDoc.price}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (bookingStep === "done") {
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", padding: "30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E5F2F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#0E7C7B" }}>check_circle</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 6 }}>Rendez-vous confirmé</div>
              <div style={{ fontSize: 12, color: "#6B7B80", lineHeight: 1.6 }}>
                Votre rendez-vous avec<br />{selectedDoc.name} a été enregistré.
              </div>
            </div>
            <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px", width: "100%" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{selectedDoc.initials}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#0F1F24" }}>{selectedDoc.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7B80" }}>{DAYS[selectedDay].label} {DAYS[selectedDay].num} juil. · {selectedSlot}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E5F2F1", borderRadius: 8, padding: "6px 10px" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0E7C7B" }}>sms</span>
                <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 600 }}>Rappel SMS programmé · 15 min avant</span>
              </div>
            </div>
            <button onClick={() => { setModal(null); setBookingStep("doctor"); setSelectedSlot(null); }}
              style={{ background: "#0E7C7B", border: "none", borderRadius: 12, padding: "12px 28px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Fermer
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Shared screen layout wrapper ────────────────────────────────────────────
  const renderScreenLayout = (title: string, children: React.ReactNode) => (
    <div style={{ background: "#F4F7F6", minHeight: "calc(100vh - 52px)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
        <button
          onClick={() => navigateTo("landing")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0E7C7B", fontWeight: 700, fontSize: 14, fontFamily: "inherit", marginBottom: 20 }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
          Accueil
        </button>
        <h2 style={{ fontWeight: 800, fontSize: 24, color: "#0F1F24", margin: "0 0 24px" }}>{title}</h2>
        {children}
      </div>
      {renderBookingModal()}
    </div>
  );

  // ── Doctor card (shared between GPS and Téléconsult) ───────────────────────
  const renderDoctorCard = (d: typeof doctors[number], extra?: React.ReactNode) => (
    <div key={d.id}
      onMouseEnter={() => setHovCard(d.id)} onMouseLeave={() => setHovCard(null)}
      style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: hovCard === d.id ? "0 8px 24px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #E2EAE8", display: "flex", gap: 14, alignItems: "center", transition: "all 0.15s" }}>
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
        {extra}
        <button
          onClick={() => openBooking(d.id)}
          onMouseEnter={() => setHovBtn(d.id)} onMouseLeave={() => setHovBtn(null)}
          style={{ background: hovBtn === d.id ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          Prendre RDV
        </button>
      </div>
    </div>
  );

  // ── Screen: GPS ─────────────────────────────────────────────────────────────
  if (siteScreen === "gps") {
    const parseKm = (dist: string) => {
      const m = dist.match(/([\d,\.]+)\s*km/i);
      if (!m) return 999;
      return parseFloat(m[1].replace(",", "."));
    };
    const sorted = [...doctors].sort((a, b) => parseKm(a.distance) - parseKm(b.distance));

    return renderScreenLayout("Médecin GPS", (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* GPS badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#E5F2F1", border: "1px solid #0E7C7B", borderRadius: 20, padding: "8px 16px", alignSelf: "flex-start" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B" }}>location_on</span>
          <span style={{ color: "#0E7C7B", fontSize: 13, fontWeight: 700 }}>GPS activé · Bangui, Centrafrique</span>
        </div>

        {/* Carte Leaflet Centrafrique */}
        <div style={{ borderRadius: 16, height: 360, overflow: "hidden", border: "1px solid #E2EAE8", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          <MapCentrafrique
            doctors={doctors}
            onSelect={(id) => { openBooking(id); }}
          />
        </div>

        {/* Doctors sorted by proximity */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Praticiens à proximité</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map(d => renderDoctorCard(d))}
          </div>
        </div>
      </div>
    ));
  }

  // ── Screen: Urgences ────────────────────────────────────────────────────────
  if (siteScreen === "urgences") {
    const callCards = [
      { icon: "emergency", color: "#DC2626", bg: "#FEF2F2", name: "SAMU", phone: "117", address: "Urgences nationales, Bangui" },
      { icon: "local_hospital", color: "#1D69E5", bg: "#EEF4FF", name: "Hôpital Communautaire", phone: "+236 75 00 02 02", address: "Avenue des Martyrs, Bangui" },
      { icon: "local_hospital", color: "#7C3AED", bg: "#F5F3FF", name: "CHU de Bangui", phone: "+236 75 00 04 04", address: "Boulevard de l'Indépendance, Bangui" },
    ];

    const urgenceSteps = [
      { num: "1", title: "Appelez le 117", desc: "Le SAMU répond 24h/24, 7j/7" },
      { num: "2", title: "Restez calme", desc: "Parlez clairement, donnez votre position" },
      { num: "3", title: "Ne déplacez pas", desc: "Ne déplacez pas le blessé sauf danger immédiat" },
      { num: "4", title: "Attendez les secours", desc: "Restez en ligne jusqu'à l'arrivée" },
    ];

    return renderScreenLayout("Urgences SAMU", (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Red warning banner */}
        <div style={{ background: "#DC2626", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 28, color: "#fff" }}>emergency</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Appelez le 117 en cas d'urgence vitale</span>
        </div>

        {/* Call cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {callCards.map(c => (
            <div key={c.name} style={{ background: "#fff", borderRadius: 16, padding: "20px", border: `1.5px solid ${c.color}30`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 26, color: c.color }}>{c.icon}</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24", marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.phone}</div>
              <div style={{ fontSize: 12, color: "#6B7B80", marginBottom: 14 }}>{c.address}</div>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`}
                style={{ display: "block", background: c.color, borderRadius: 10, padding: "10px", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                Appeler
              </a>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Que faire en urgence ?</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
            {urgenceSteps.map(s => (
              <div key={s.num} style={{ background: "#fff", borderRadius: 14, padding: "16px", border: "1px solid #E2EAE8" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#DC2626" }}>{s.num}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0F1F24", marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#6B7B80", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ));
  }

  // ── Screen: Pharmacie ───────────────────────────────────────────────────────
  if (siteScreen === "pharmacie") {
    return renderScreenLayout("Pharmacies de garde", (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid #E2EAE8" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#7C3AED" }}>schedule</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0F1F24" }}>Pharmacies ouvertes ce soir</span>
        </div>

        {/* Pharmacy cards */}
        {PHARMACIES.map(p => (
          <div key={p.name} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #E2EAE8", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24", marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#6B7B80", marginBottom: 4 }}>{p.address}</div>
              <div style={{ fontSize: 12, color: "#46565B", marginBottom: 8 }}>{p.phone}</div>
              <span style={{ background: p.open ? "#ECFDF5" : "#FEF2F2", color: p.open ? "#059669" : "#DC2626", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
                {p.status}
              </span>
            </div>
            <a href={`tel:${p.phone.replace(/\s/g, "")}`}
              style={{ background: "#7C3AED", borderRadius: 10, padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
              Appeler
            </a>
          </div>
        ))}
      </div>
    ));
  }

  // ── Screen: Carnet ──────────────────────────────────────────────────────────
  if (siteScreen === "carnet") {
    const carnetItems = [
      { label: "Groupe sanguin", value: "O+" },
      { label: "Allergies", value: "Aucune connue" },
      { label: "Maladies chroniques", value: "Paludisme récidivant" },
      { label: "Dernière consultation", value: "28 juin 2026" },
      { label: "Vaccins à jour", value: "Fièvre jaune, Polio" },
      { label: "Médecin traitant", value: "Dr. Béatrice Nzapa" },
    ];

    const statutColor = (s: string) => {
      if (s === "Confirmé") return "#059669";
      if (s === "En attente") return "#D97706";
      if (s === "Annulé") return "#DC2626";
      return "#6B7B80";
    };

    const last3 = appointments.slice(0, 3);

    return renderScreenLayout("Mon carnet de santé", (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Health data grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {carnetItems.map(item => (
            <div key={item.label} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #E2EAE8", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, color: "#8AA4A8", fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* History */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Historique des consultations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {last3.map(a => (
              <div key={a.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid #E2EAE8", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F1F24" }}>{a.doctorName}</div>
                  <div style={{ fontSize: 12, color: "#6B7B80" }}>{a.specialty} · {a.date} à {a.heure}</div>
                </div>
                <span style={{ background: `${statutColor(a.statut)}18`, color: statutColor(a.statut), fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 10px" }}>
                  {a.statut}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ));
  }

  // ── Screen: RDV ─────────────────────────────────────────────────────────────
  if (siteScreen === "rdv") {
    const avenirStatuts = ["Confirmé", "En attente"];
    const passesStatuts = ["Terminé", "Annulé"];

    const filtered = appointments.filter(a =>
      rdvTab === "avenir" ? avenirStatuts.includes(a.statut) : passesStatuts.includes(a.statut)
    );

    const statutColor = (s: string) => {
      if (s === "Confirmé") return "#059669";
      if (s === "En attente") return "#D97706";
      if (s === "Annulé") return "#DC2626";
      return "#6B7B80";
    };

    const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDow = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // 0=Lun
    const rdvByDay: Record<string, typeof appointments> = {};
    appointments.forEach(a => { (rdvByDay[a.date] = rdvByDay[a.date] || []).push(a); });
    const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
    const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

    const displayedRdv = calSelectedDay
      ? (rdvByDay[calSelectedDay] || [])
      : filtered;

    return renderScreenLayout("Mes rendez-vous", (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Calendrier ── */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #E2EAE8", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {/* Entête navigation mois/année */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "#F4F7F6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#46565B" }}>chevron_left</span>
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0F1F24" }}>{MONTHS_FR[calMonth]}</div>
              <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 1 }}>{calYear}</div>
            </div>
            <button onClick={nextMonth} style={{ background: "#F4F7F6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#46565B" }}>chevron_right</span>
            </button>
          </div>
          {/* Labels jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS_FR.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#8AA4A8", padding: "4px 0" }}>{d}</div>)}
          </div>
          {/* Grille jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const hasRdv = !!rdvByDay[dateStr];
              const isSelected = calSelectedDay === dateStr;
              const isToday = dateStr === new Date().toISOString().slice(0,10);
              return (
                <button key={day} onClick={() => setCalSelectedDay(isSelected ? null : dateStr)}
                  style={{ background: isSelected ? "#0E7C7B" : isToday ? "#E5F2F1" : "transparent", border: isToday && !isSelected ? "1.5px solid #0E7C7B" : "1.5px solid transparent", borderRadius: 8, padding: "6px 2px", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: hasRdv || isToday ? 800 : 500, color: isSelected ? "#fff" : isToday ? "#0E7C7B" : "#0F1F24" }}>{day}</span>
                  {hasRdv && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "#0E7C7B" }} />}
                </button>
              );
            })}
          </div>
          {calSelectedDay && (
            <button onClick={() => setCalSelectedDay(null)} style={{ marginTop: 10, background: "none", border: "none", color: "#6B7B80", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Effacer sélection
            </button>
          )}
        </div>

        {/* Tabs */}
        {!calSelectedDay && (
          <div style={{ display: "flex", background: "#fff", borderRadius: 12, padding: 4, border: "1px solid #E2EAE8", alignSelf: "flex-start", gap: 4 }}>
            {(["avenir", "passes"] as const).map(tab => (
              <button key={tab} onClick={() => setRdvTab(tab)}
                style={{ padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: rdvTab === tab ? "#0E7C7B" : "transparent", color: rdvTab === tab ? "#fff" : "#6B7B80" }}>
                {tab === "avenir" ? "À venir" : "Passés"}
              </button>
            ))}
          </div>
        )}

        {calSelectedDay && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#46565B" }}>
            RDV du {new Date(calSelectedDay + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}

        {displayedRdv.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: "40px 24px", textAlign: "center", border: "1px solid #E2EAE8" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#E2EAE8", display: "block", marginBottom: 12 }}>event_note</span>
            <div style={{ color: "#6B7B80", fontSize: 14, marginBottom: 16 }}>{calSelectedDay ? "Aucun rendez-vous ce jour" : "Aucun rendez-vous"}</div>
            <button onClick={() => navigateTo("search")}
              style={{ background: "#0E7C7B", border: "none", borderRadius: 10, padding: "10px 22px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Prendre RDV
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayedRdv.map(a => {
              const initials = a.doctorName.split(" ").filter((w: string) => w.length > 1).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={a.id} style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", border: "1px solid #E2EAE8", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F1F24" }}>{a.doctorName}</div>
                    <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>{a.specialty}</div>
                    <div style={{ fontSize: 12, color: "#46565B", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>calendar_today</span>
                      {new Date(a.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      <span className="material-symbols-rounded" style={{ fontSize: 13 }}>schedule</span>
                      {a.heure}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <span style={{ background: `${statutColor(a.statut)}18`, color: statutColor(a.statut), fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>{a.statut}</span>
                    <span style={{ background: "#F4F7F6", color: "#46565B", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px" }}>{a.type}</span>
                    {a.statut === "En attente" && (
                      <button onClick={() => showToast("Rendez-vous annulé")}
                        style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "4px 10px", color: "#DC2626", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ));
  }

  // ── Screen: Téléconsultation ────────────────────────────────────────────────
  if (siteScreen === "teleconsult") {
    const teleDocs = doctors.filter(d => d.teleconsult === true);

    return renderScreenLayout("Téléconsultation", (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Info banner */}
        <div style={{ background: "#EEF4FF", border: "1px solid #2563EB30", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#1D69E5" }}>videocam</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1D69E5" }}>Consultez depuis chez vous · Médecins disponibles maintenant</span>
        </div>

        {/* Doctor cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {teleDocs.map(d => (
            <div key={d.id}
              onMouseEnter={() => setHovCard(d.id)} onMouseLeave={() => setHovCard(null)}
              style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: hovCard === d.id ? "0 8px 24px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #E2EAE8", display: "flex", gap: 14, alignItems: "center", transition: "all 0.15s" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{d.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>{d.name}</span>
                  {d.verified && <span className="material-symbols-rounded" style={{ fontSize: 15, color: "#0E7C7B" }}>verified</span>}
                  <span style={{ background: "#ECFDF5", color: "#059669", fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px" }}>Disponible</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>{d.specialty}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#D97706" }}>★ {d.rating} <span style={{ color: "#8AA4A8" }}>({d.reviews})</span></span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => {
                    const room = "sangocare-" + d.id.replace(/[^a-z0-9]/gi, "");
                    window.open("https://meet.jit.si/" + room, "_blank");
                  }}
                  style={{ background: "#1D69E5", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>videocam</span>
                  Rejoindre
                </button>
                <button
                  onClick={() => openBooking(d.id)}
                  onMouseEnter={() => setHovBtn(d.id)} onMouseLeave={() => setHovBtn(null)}
                  style={{ background: hovBtn === d.id ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Prendre RDV
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ background: "#F6F8F7", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>info</span>
          <span style={{ fontSize: 12, color: "#6B7B80" }}>La téléconsultation nécessite une connexion internet stable</span>
        </div>
      </div>
    ));
  }

  // ── Screen: Famille ─────────────────────────────────────────────────────────
  if (siteScreen === "famille") {
    const COLORS_FAM = ["#0E7C7B","#7C3AED","#D97706","#DC2626","#059669","#2563EB","#DB2777"];
    const addMembre = () => {
      if (!newMembreName.trim()) return;
      const initials = newMembreName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
      setFamMembers(prev => [...prev, { initials, name: newMembreName, relation: newMembreRelation || "Famille", detail: newMembreAge ? newMembreAge + " ans" : "", blood: newMembreSang, color: COLORS_FAM[prev.length % COLORS_FAM.length] }]);
      setNewMembreName(""); setNewMembreRelation(""); setNewMembreAge(""); setNewMembreSang("O+");
      setShowAddMembre(false);
      showToast("Membre ajouté !");
    };
    const inpFam: React.CSSProperties = { border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

    return renderScreenLayout("Ma famille", (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#6B7B80" }}>Gérez les rendez-vous de toute votre famille</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {famMembers.map(m => (
            <div key={m.name} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #E2EAE8", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{m.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>{m.relation}{m.detail ? " · " + m.detail : ""}</div>
                <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 2 }}>Groupe sanguin : <strong style={{ color: "#DC2626" }}>{m.blood}</strong></div>
              </div>
              <button onClick={() => navigateTo("search")}
                style={{ background: "#0E7C7B", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                Prendre RDV
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => setShowAddMembre(true)}
          style={{ background: "#fff", border: "2px dashed #0E7C7B66", borderRadius: 16, padding: "16px", color: "#0E7C7B", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>person_add</span>
          Ajouter un membre
        </button>

        {/* Modal ajout membre */}
        {showAddMembre && (
          <div onClick={() => setShowAddMembre(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0F1F24", marginBottom: 4 }}>Ajouter un membre</div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Nom complet *</label>
                <input value={newMembreName} onChange={e => setNewMembreName(e.target.value)} placeholder="Prénom Nom" style={inpFam} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Relation</label>
                <select value={newMembreRelation} onChange={e => setNewMembreRelation(e.target.value)} style={inpFam}>
                  <option value="">-- Choisir --</option>
                  {["Enfant","Parent","Conjoint(e)","Frère/Sœur","Grand-parent","Autre"].map(r => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Âge</label>
                  <input type="number" value={newMembreAge} onChange={e => setNewMembreAge(e.target.value)} placeholder="Ex: 12" style={inpFam} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Groupe sanguin</label>
                  <select value={newMembreSang} onChange={e => setNewMembreSang(e.target.value)} style={inpFam}>
                    {["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select></div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAddMembre(false)} style={{ flex: 1, background: "#F4F7F6", border: "none", borderRadius: 12, padding: "13px", color: "#46565B", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                <button onClick={addMembre} style={{ flex: 1, background: "#0E7C7B", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
              </div>
            </div>
          </div>
        )}
      </div>
    ));
  }

  // ── Screen: Don de sang ─────────────────────────────────────────────────────
  if (siteScreen === "don") {
    const criteria = [
      { icon: "cake", label: "18 – 65 ans", desc: "Tranche d'âge requise" },
      { icon: "fitness_center", label: "> 50 kg", desc: "Poids minimum requis" },
      { icon: "favorite", label: "Bonne santé", desc: "Pas de maladie en cours" },
    ];

    const collectPoints = [
      { name: "CHU de Bangui", address: "Boulevard de l'Indépendance", hours: "Lun–Ven · 7h00 – 15h00" },
      { name: "Hôpital Communautaire", address: "Avenue des Martyrs", hours: "Mar & Jeu · 8h00 – 13h00" },
    ];

    return renderScreenLayout("Don de sang", (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero */}
        <div style={{ background: "#DC2626", borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 52, color: "#fff", display: "block", marginBottom: 10 }}>bloodtype</span>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 6 }}>Donnez du sang, sauvez des vies</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Chaque don peut sauver jusqu'à 3 vies</div>
        </div>

        {/* Criteria */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Qui peut donner ?</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
            {criteria.map(c => (
              <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: "18px", border: "1px solid #E2EAE8", textAlign: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 30, color: "#DC2626", display: "block", marginBottom: 8 }}>{c.icon}</span>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "#6B7B80" }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compatibility table */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Tableau de compatibilité</div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2EAE8", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", background: "#F4F7F6", padding: "10px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#6B7B80" }}>Groupe</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#6B7B80" }}>Peut donner à</div>
            </div>
            {BLOOD_COMPAT.map((row, i) => (
              <div key={row.group} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", padding: "10px 16px", borderTop: i > 0 ? "1px solid #F4F7F6" : "none" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#DC2626" }}>{row.group}</div>
                <div style={{ fontSize: 13, color: "#46565B" }}>{row.canGiveTo}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collection points */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 14 }}>Points de collecte</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
            {collectPoints.map(p => (
              <div key={p.name} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #E2EAE8" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0F1F24", marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#6B7B80", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>location_on</span>
                  {p.address}
                </div>
                <div style={{ fontSize: 12, color: "#6B7B80", display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>schedule</span>
                  {p.hours}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => setShowDonForm(true)}
          style={{ background: "#DC2626", border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>bloodtype</span>
          Je souhaite donner
        </button>

        {/* Modal don de sang */}
        {showDonForm && (
          <div onClick={() => setShowDonForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#DC2626" }}>bloodtype</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#0F1F24" }}>Inscription au don</div>
              </div>
              {(() => {
                const inpD: React.CSSProperties = { border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
                return (<>
                  <div><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Numéro de téléphone</label>
                    <input value={donPhone} onChange={e => setDonPhone(e.target.value)} placeholder="+236 72 00 00 00" style={inpD} /></div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Groupe sanguin</label>
                      <select value={donBlood} onChange={e => setDonBlood(e.target.value)} style={inpD}>
                        {["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g => <option key={g} value={g}>{g}</option>)}
                      </select></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", display: "block", marginBottom: 6 }}>Ville</label>
                      <select value={donCity} onChange={e => setDonCity(e.target.value)} style={inpD}>
                        {["Bangui","Bimbo","Begoua","Bambari","Berberati","Bouar"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select></div>
                  </div>
                  <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#991B1B" }}>
                    Un agent SangoCare vous contactera dans les 24h pour fixer la date du don.
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowDonForm(false)} style={{ flex: 1, background: "#F4F7F6", border: "none", borderRadius: 12, padding: "13px", color: "#46565B", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                    <button onClick={() => { setShowDonForm(false); showToast("Inscription enregistrée — nous vous contacterons !"); }}
                      style={{ flex: 1, background: "#DC2626", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Confirmer</button>
                  </div>
                </>);
              })()}
            </div>
          </div>
        )}
      </div>
    ));
  }

  // ── Screen: Search results ──────────────────────────────────────────────────
  if (siteScreen === "search") {
    const filteredDocs = doctors.filter(d => {
      if (filterType === "teleconsult" && !d.teleconsult) return false;
      if (filterDispo === "aujourd") {
        const dispo = (d.dispo || "Auj.").toLowerCase();
        if (!dispo.startsWith("auj") && !dispo.startsWith("aujourd")) return false;
      }
      if (filterDispo === "gratuit" && !d.price.startsWith("Gratuit")) return false;
      if (specialtyFilter && !d.specialty.toLowerCase().includes(specialtyFilter.toLowerCase())) return false;
      if (filterType === "teleconsult2" && !d.teleconsult) return false;
      if (!searchVal) return true;
      return d.name.toLowerCase().includes(searchVal.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchVal.toLowerCase());
    });

    return (
      <div style={{ background: "#F4F7F6", minHeight: "calc(100vh - 52px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ padding: "18px 0 10px" }}>
            <button onClick={() => navigateTo("landing")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0E7C7B", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
              Accueil
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
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

                <div style={{ fontWeight: 700, fontSize: 12, color: "#6B7B80", marginBottom: 10, marginTop: 16 }}>Spécialité</div>
                {SPECIALTIES.map(s => (
                  <button key={s.label} onClick={() => { setSelectedSpecialty(s.label); setSpecialtyFilter(s.label); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: specialtyFilter === s.label ? "#E5F2F1" : "none", border: specialtyFilter === s.label ? "1px solid #0E7C7B" : "1px solid transparent", borderRadius: 8, padding: "5px 8px", marginBottom: 4, cursor: "pointer", fontSize: 12, color: specialtyFilter === s.label ? "#0E7C7B" : "#46565B", fontFamily: "inherit" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 12 }}>
                {filteredDocs.length} praticiens · Bangui
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {specialtyFilter && (
                  <button onClick={() => setSpecialtyFilter(null)}
                    style={{ background: "#0E7C7B", border: "none", borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                    {specialtyFilter}
                    <span className="material-symbols-rounded" style={{ fontSize: 13 }}>close</span>
                  </button>
                )}
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
                      <button onClick={() => openBooking(d.id)}
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

        {renderBookingModal()}
      </div>
    );
  }

  // ── Landing page ─────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#F4F7F6", minHeight: "100vh" }}>

      {/* ── Barre de navigation publique ─────────────────────────────────────── */}
      <nav style={{ background: "#0C1A1E", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#fff" }}>calendar_add_on</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>SangoCare</span>
        </div>
        <Link href="/connexion" style={{ background: "#0E7C7B", border: "none", borderRadius: 10, padding: "8px 18px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>login</span>
          Espace personnel
        </Link>
      </nav>

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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 640 }}>
            <div ref={searchRef} style={{ flex: 1, minWidth: 180, position: "relative" }}>
              <span className="material-symbols-rounded" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#8AA4A8", zIndex: 1 }}>search</span>
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Médecin, spécialité, symptôme..."
                style={{ ...inp, width: "100%", paddingLeft: 38 }}
              />
              {/* Suggestions dropdown */}
              {searchFocused && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #E2EAE8", zIndex: 200, overflow: "hidden" }}>
                  {suggestions.map((s, i) => (
                    <button key={i}
                      onMouseDown={e => {
                        e.preventDefault();
                        if (s.type === "doc" && s.id) { setSelectedSpecialty(""); setSpecialtyFilter(null); setSearchVal(s.label); }
                        else { setSpecialtyFilter(s.label); setSelectedSpecialty(s.label); setSearchVal(s.label); }
                        setSearchFocused(false);
                        navigateTo("search");
                      }}
                      style={{ width: "100%", background: "transparent", border: "none", borderTop: i > 0 ? "1px solid #F4F7F6" : "none", padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F4F7F6")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 17, color: s.type === "doc" ? "#0E7C7B" : "#7C3AED", flexShrink: 0 }}>{s.type === "doc" ? "person" : "medical_services"}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24" }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: "#6B7B80" }}>{s.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
              <span className="material-symbols-rounded" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#8AA4A8" }}>location_on</span>
              <input value={locationVal} onChange={e => setLocationVal(e.target.value)} placeholder="Bangui, Bambari..." style={{ ...inp, width: "100%", paddingLeft: 38 }} />
            </div>
            <button onClick={() => navigateTo("search")}
              onMouseEnter={() => setHovBtn("search")} onMouseLeave={() => setHovBtn(null)}
              style={{ background: hovBtn === "search" ? "#0A6060" : "#0E7C7B", border: "none", borderRadius: 10, padding: "11px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              Rechercher
            </button>
          </div>

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
                onClick={() => { setSelectedSpecialty(s.label); setSpecialtyFilter(s.label); navigateTo("search"); }}
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

      {/* ── Accès rapide ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#F4F7F6", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0F1F24", marginBottom: 24 }}>Accès rapide</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobileView ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: 14 }}>
            {QUICK_ACCESS.map(item => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.screen) {
                    navigateTo(item.screen);
                  } else if (item.label === "Paramètres") {
                    setShowParamModal(true);
                  } else if ("toast" in item && item.toast) {
                    showToast(item.toast);
                  }
                }}
                onMouseEnter={() => setHovSpec(item.label)} onMouseLeave={() => setHovSpec(null)}
                style={{
                  background: "#fff",
                  border: "1px solid #E2EAE8",
                  borderRadius: 14,
                  padding: "20px 12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: hovSpec === item.label ? "0 10px 28px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)",
                  transform: hovSpec === item.label ? "translateY(-4px)" : "none",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 24, color: item.color }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: 12, color: "#0F1F24", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctors ──────────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#0F1F24" }}>Praticiens recommandés près de vous</div>
            <button onClick={() => navigateTo("search")} style={{ background: "none", border: "none", color: "#0E7C7B", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
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
                  onClick={() => openBooking(d.id)}
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
      <section style={{ background: "#F4F7F6", padding: isMobileView ? "40px 20px" : "60px 40px" }}>
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

      {renderBookingModal()}

      {/* ── Modal Paramètres ─────────────────────────────────────────────────── */}
      {showParamModal && (
        <div onClick={() => setShowParamModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,26,30,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24" }}>Paramètres</div>
              <button onClick={() => setShowParamModal(false)} style={{ background: "#F4F7F6", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#46565B" }}>close</span>
              </button>
            </div>
            {[
              { icon: "notifications", label: "Notifications SMS", sub: "Rappels de rendez-vous par SMS", toggle: true },
              { icon: "language", label: "Langue", sub: "Français · Sango disponible bientôt", toggle: false },
              { icon: "signal_cellular_alt", label: "Mode USSD", sub: "Accès via *123# sans internet", toggle: true },
              { icon: "dark_mode", label: "Mode sombre", sub: "Interface sombre (bientôt)", toggle: false },
              { icon: "privacy_tip", label: "Confidentialité", sub: "Gérer vos données personnelles", toggle: false },
              { icon: "help", label: "Aide & Support", sub: "FAQ, contacter SangoCare", toggle: false },
            ].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < 5 ? "1px solid #F4F7F6" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#E5F2F1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#0E7C7B" }}>{s.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F1F24" }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "#6B7B80", marginTop: 1 }}>{s.sub}</div>
                </div>
                {s.toggle
                  ? <div style={{ width: 44, height: 24, borderRadius: 12, background: "#0E7C7B", cursor: "pointer", position: "relative" }}><div style={{ position: "absolute", right: 3, top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} /></div>
                  : <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>chevron_right</span>}
              </div>
            ))}
            <button onClick={() => { setShowParamModal(false); showToast("Déconnecté"); }}
              style={{ marginTop: 16, background: "#FEE2E2", border: "none", borderRadius: 12, padding: "13px", color: "#DC2626", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>logout</span>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
