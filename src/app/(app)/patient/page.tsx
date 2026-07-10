"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import type { Appointment, EmergencyAlert } from "@/store/appStore";

type PScreen =
  | "home" | "search" | "doctor" | "payment" | "done"
  | "rdv" | "urgences" | "pharmacie" | "gps" | "teleconsult" | "famille" | "don"
  | "mobile-money" | "parametres";
type SearchFilter = "tous" | "teleconsult" | "2km" | "dispo";
type PayMethod    = "orange" | "moov" | "place";

const SPECIALTIES = [
  { label: "Généraliste",  icon: "stethoscope",       color: "#0E7C7B" },
  { label: "Pédiatre",     icon: "vaccines",           color: "#7C3AED" },
  { label: "Sage-femme",   icon: "pregnant_woman",     color: "#DB2777" },
  { label: "Cardiologue",  icon: "cardiology",         color: "#DC2626" },
  { label: "Dermato",      icon: "dermatology",        color: "#D97706" },
  { label: "Dentiste",     icon: "dentistry",          color: "#2563EB" },
  { label: "Palu / Fièvre",icon: "coronavirus",        color: "#DC2626" },
  { label: "Agent (ASC)",  icon: "person_pin_circle",  color: "#059669" },
];

const QUICK = [
  { label: "Médecin GPS",      icon: "near_me",                color: "#0E7C7B", screen: "gps"          },
  { label: "Téléconsultation", icon: "videocam",               color: "#1D69E5", screen: "teleconsult"   },
  { label: "Pharmacie garde",  icon: "local_pharmacy",         color: "#7C3AED", screen: "pharmacie"    },
  { label: "Urgences SAMU",    icon: "emergency",              color: "#DC2626", screen: "urgences"     },
  { label: "Mon carnet",       icon: "menu_book",              color: "#D97706", screen: "carnet"       },
  { label: "Mes RDV",          icon: "event_note",             color: "#0E7C7B", screen: "rdv"          },
  { label: "Ma famille",       icon: "family_restroom",        color: "#DB2777", screen: "famille"      },
  { label: "Don de sang",      icon: "bloodtype",              color: "#DC2626", screen: "don"          },
  { label: "Mobile Money",     icon: "account_balance_wallet", color: "#059669", screen: "mobile-money" },
  { label: "Paramètres",       icon: "settings",               color: "#6B7B80", screen: "parametres"   },
];

const SLOTS = ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"];
const MONTHS_FR_RDV = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAY_LABELS_RDV = ["L","M","M","J","V","S","D"];
const TODAY_RDV = { year: 2026, month: 6, day: 5 }; // Juillet 5 2026

function rdvDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function rdvStartDOW(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function rdvDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function rdvDayName(y: number, m: number, d: number) {
  return new Date(y, m, d).toLocaleDateString("fr-FR", { weekday: "short" });
}
function rdvIsPast(y: number, m: number, d: number) {
  const t = TODAY_RDV;
  if (y < t.year) return true;
  if (y === t.year && m < t.month) return true;
  if (y === t.year && m === t.month && d < t.day) return true;
  return false;
}

const PHARMACIES = [
  { name: "Pharmacie Centrale",    address: "0,9 km · Av. Boganda",  phone: "+236 75 10 10 10", status: "Ouverte 24h/24",  badge: "Ouverte",   open: true  },
  { name: "Pharmacie du Fleuve",   address: "2,1 km · Rue du Fleuve",phone: "+236 75 20 20 20", status: "Jusqu'à 22h",     badge: "De garde",  open: true  },
  { name: "Pharmacie SICA",        address: "1,5 km · Av. Boganda",  phone: "+236 75 30 30 30", status: "Ouvre à 7h",      badge: "Fermée",    open: false },
  { name: "Pharmacie Ouango",      address: "3,7 km · PK12",         phone: "+236 75 40 40 40", status: "Ouverte 24h/24",  badge: "Ouverte",   open: true  },
];

const BLOOD_COMPAT = [
  { group: "O-",  to: "Tous groupes"     },
  { group: "O+",  to: "O+, A+, B+, AB+" },
  { group: "A+",  to: "A+, AB+"         },
  { group: "B+",  to: "B+, AB+"         },
  { group: "AB+", to: "AB+ seulement"   },
];

const HOSPITALS_NEARBY = [
  { icon: "local_hospital",  color: "#DC2626", name: "Hôpital de l'Amitié",     type: "Hôpital général · Urgences 24h",   distance: "1,2 km" },
  { icon: "local_hospital",  color: "#1D69E5", name: "Hôpital Communautaire",   type: "Bloc opératoire · Maternité",       distance: "3,4 km" },
  { icon: "child_care",      color: "#7C3AED", name: "Complexe Pédiatrique",    type: "Urgences enfants",                  distance: "2,8 km" },
  { icon: "local_hospital",  color: "#059669", name: "Clinique SICA",           type: "Consultations · Chirurgie",         distance: "1,8 km" },
  { icon: "pregnant_woman",  color: "#DB2777", name: "Maternité Castors",       type: "Accouchements · CPN",               distance: "0,8 km" },
  { icon: "local_pharmacy",  color: "#D97706", name: "Pharmacie Centrale",      type: "Pharmacie de garde 24h/24",         distance: "0,9 km" },
];

const BLOOD_DRIVES = [
  { name: "Collecte Croix-Rouge", place: "Hôpital de l'Amitié", date: "Samedi 6 juillet",  hours: "8h–14h",  distance: "1,2 km" },
  { name: "Collecte mobile",      place: "Marché Km5",           date: "Mardi 9 juillet",   hours: "9h–13h",  distance: "2,8 km" },
];

const TRANSACTIONS = [
  { label: "Consultation — Dr. Nzapa", date: "30 juin 2026",  amount: -2500, color: "#DC2626" },
  { label: "Recharge Orange Money",    date: "28 juin 2026",  amount: 5000,  color: "#059669" },
  { label: "CPN — Gratuit",            date: "2 juin 2026",   amount: 0,     color: "#6B7B80" },
];

const ORDONNANCES = [
  { name: "Artéméther-Luméfantrine", doctor: "Dr. Nzapa", date: "12 mai 2026"  },
  { name: "Amoxicilline 500mg",       doctor: "Dr. Koyt",  date: "3 mars 2026" },
];

const CONSULTATIONS_PASSEES = [
  { initials: "BN", color: "#0E7C7B", motif: "Paludisme simple",        doctor: "Dr. Nzapa",    date: "12 mai 2026"  },
  { initials: "PS", color: "#DB2777", motif: "Consultation prénatale",  doctor: "P. Sérémadé", date: "2 avr. 2026"  },
  { initials: "JK", color: "#7C3AED", motif: "Rhinopharyngite",         doctor: "Dr. Koyt",    date: "18 jan. 2026" },
];

const FAMILLE_MEMBRES = [
  { initials: "JY", color: "#1D69E5", name: "Junior Yakité", relation: "Fils",   detail: "3 ans", alert: "Rougeole (VAR) — en retard",    alertColor: "#DC2626" },
  { initials: "GY", color: "#7C3AED", name: "Grace Yakité",  relation: "Fille",  detail: "7 ans", alert: "Rappel DTC — dans 2 mois",       alertColor: "#D97706" },
];

export default function PatientPage() {
  const {
    userName, userInitials, userPhone, doctors, appointments,
    selectedDoctorId, setSelectedDoctor,
    addAppointment, updateAppointmentStatut, showToast, logout,
    sendEmergency,
  } = useAppStore();

  const [pScreen,        setPScreen]        = useState<PScreen>("home");
  const [filter,         setFilter]         = useState<SearchFilter>("tous");
  const [searchInput,    setSearchInput]    = useState("");
  const [showSugg,       setShowSugg]       = useState(false);
  const [specialtyFilter,setSpecialtyFilter] = useState<string | null>(null);
  const [selectedDay,    setSelectedDay]    = useState<number | null>(null);
  const [selectedSlot,   setSelectedSlot]   = useState<string | null>(null);
  const [payMethod,      setPayMethod]      = useState<PayMethod>("orange");
  const [bookingYear,    setBookingYear]    = useState(TODAY_RDV.year);
  const [bookingMonth,   setBookingMonth]   = useState(TODAY_RDV.month);
  const [carnetOpen,     setCarnetOpen]     = useState(false);
  const [rdvTab,         setRdvTab]         = useState<"avenir"|"passes">("avenir");
  const [motif,          setMotif]          = useState("");
  const [voiceConfirm,   setVoiceConfirm]   = useState(true);
  const [walletBalance]                     = useState(4500);
  // GPS / SOS state
  const [geoLoc,   setGeoLoc]   = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [sosOpen,  setSosOpen]  = useState(false);
  const [sosLat,   setSosLat]   = useState<number | null>(null);
  const [sosLng,   setSosLng]   = useState<number | null>(null);
  const [sosSent,  setSosSent]  = useState(false);

  const nextRdv    = appointments.find(a => a.statut === "Confirmé" || a.statut === "En attente");
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  // ── GPS helpers ─────────────────────────────────────────────────────────────
  function getGeolocation(onSuccess: (lat: number, lng: number) => void, onFail?: () => void) {
    if (!navigator.geolocation) { showToast("GPS non disponible sur cet appareil"); onFail?.(); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoLoading(false); setGeoLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); onSuccess(pos.coords.latitude, pos.coords.longitude); },
      ()    => { setGeoLoading(false); showToast("Impossible d'obtenir la localisation — vérifiez les autorisations GPS"); onFail?.(); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function openMaps(address: string) {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank");
  }

  function openMapsCoords(lat: number, lng: number) {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank");
  }

  function handleSOS() {
    setSosOpen(true); setSosSent(false); setSosLat(null); setSosLng(null);
    getGeolocation(
      (lat, lng) => { setSosLat(lat); setSosLng(lng); },
      () => { setSosLat(4.3947); setSosLng(18.5582); } // fallback: centre de Bangui
    );
  }

  function confirmSOS() {
    const lat = sosLat ?? 4.3947; const lng = sosLng ?? 18.5582;
    sendEmergency(lat, lng, userName, userPhone, "Localisation GPS temps réel");
    setSosSent(true);
    showToast("Votre position a été envoyée aux secours !");
  }

  const filteredDocs = doctors.filter(d => {
    if (filter === "teleconsult" && !d.teleconsult) return false;
    if (filter === "2km") { const km = parseFloat((d.distance || "").replace(",", ".")); if (isNaN(km) || km > 2) return false; }
    if (filter === "dispo") { const dispo = (d.dispo || "Auj.").toLowerCase(); if (!dispo.startsWith("auj")) return false; }
    if (specialtyFilter && !d.specialty.toLowerCase().includes(specialtyFilter.toLowerCase())) return false;
    if (!searchInput) return true;
    return d.name.toLowerCase().includes(searchInput.toLowerCase()) || d.specialty.toLowerCase().includes(searchInput.toLowerCase());
  });

  const genId = () => {
    const max = appointments.reduce((m, a) => { const n = parseInt(a.id.split("-")[2] || "0"); return n > m ? n : m; }, 0);
    return `RDV-2026-${String(max + 1).padStart(3, "0")}`;
  };

  const confirmRdv = () => {
    if (!selectedDoc || !selectedSlot || !selectedDay) { showToast("Choisissez un créneau"); return; }
    addAppointment({
      id: genId(), patientName: userName, patientPhone: "",
      doctorId: selectedDoc.id, doctorName: selectedDoc.name, specialty: selectedDoc.specialty,
      date: rdvDateStr(bookingYear, bookingMonth, selectedDay), heure: selectedSlot,
      type: selectedDoc.teleconsult ? "Téléconsultation" : "Présentiel",
      statut: "Confirmé", motif,
    });
    setPScreen("done");
  };

  const goHome = () => { setPScreen("home"); setCarnetOpen(false); };

  // ── Status bar ─────────────────────────────────────────────────────────────
  const StatusBar = () => (
    <div style={{ background: "#fff", padding: "10px 20px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24" }}>08:24</span>
      <div style={{ display: "flex", gap: 4 }}>
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
        { id: "accueil", icon: "home",      label: "Accueil" },
        { id: "search",  icon: "search",    label: "Rechercher" },
        { id: "carnet",  icon: "menu_book", label: "Carnet" },
        { id: "plus",    icon: "grid_view", label: "Plus" },
      ].map(tab => (
        <button key={tab.id}
          onClick={() => {
            if      (tab.id === "search")  { setSpecialtyFilter(null); setFilter("tous"); setPScreen("search"); setCarnetOpen(false); }
            else if (tab.id === "accueil") goHome();
            else if (tab.id === "carnet")  { setCarnetOpen(true); setPScreen("home"); }
            else showToast("Menu — bientôt disponible");
          }}
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: active === tab.id ? "#0E7C7B" : "#8AA4A8" }}>{tab.icon}</span>
          <span style={{ fontSize: 10, color: active === tab.id ? "#0E7C7B" : "#8AA4A8", fontWeight: active === tab.id ? 700 : 500 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  // ── Back header (sub-screens) ──────────────────────────────────────────────
  const BackHeader = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div style={{ background: "#fff", borderBottom: "1px solid #E2EAE8", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <button onClick={onBack || goHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#0F1F24" }}>arrow_back</span>
      </button>
      <span style={{ fontWeight: 800, fontSize: 15, color: "#0F1F24" }}>{title}</span>
    </div>
  );

  const statutColor = (s: string) =>
    s === "Confirmé" ? "#059669" : s === "En attente" ? "#D97706" : s === "Annulé" ? "#DC2626" : "#6B7B80";

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HOME ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHome = () => (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#8AA4A8" }}>Bonjour,</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0F1F24" }}>{userName}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{userInitials}</div>
      </div>

      <button onClick={() => { setSpecialtyFilter(null); setFilter("tous"); setPScreen("search"); setCarnetOpen(false); }}
        style={{ background: "#F6F8F7", border: "none", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>search</span>
        <span style={{ fontSize: 13, color: "#8AA4A8" }}>Médecin, spécialité, symptôme…</span>
      </button>

      {/* Spécialités */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Besoin d'un soin ?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {SPECIALTIES.map(s => (
            <button key={s.label} onClick={() => { setSpecialtyFilter(s.label); setFilter("tous"); setPScreen("search"); setCarnetOpen(false); }}
              style={{ background: "#fff", border: "none", borderRadius: 12, padding: "10px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, boxShadow: "0 1px 5px rgba(0,0,0,0.07)", fontFamily: "inherit" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <span style={{ fontSize: 9, color: "#46565B", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prochain RDV */}
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
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>{nextRdv.date} · {nextRdv.heure}</div>
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

      {/* Accès rapide */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Accès rapide</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
          {QUICK.map(q => (
            <button key={q.label}
              onClick={() => {
                if (q.screen === "carnet") { setCarnetOpen(true); setPScreen("home"); }
                else if (q.screen)        setPScreen(q.screen as PScreen);
                else                      showToast(q.label + " — bientôt disponible");
              }}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CARNET ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderCarnet = () => (
    <>
      <BackHeader title="Mon carnet de santé" onBack={() => { setCarnetOpen(false); setPScreen("home"); }} />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Health info */}
        {[
          { label: "Groupe sanguin",       val: "O+" },
          { label: "Allergies",            val: "Aucune connue" },
          { label: "Maladies chroniques",  val: "Paludisme récidivant" },
          { label: "Médecin traitant",     val: "Dr. Béatrice Nzapa" },
        ].map(r => (
          <div key={r.label} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 12, color: "#6B7B80" }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{r.val}</span>
          </div>
        ))}

        {/* Ordonnances */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80", marginTop: 6 }}>Ordonnances</div>
        {ORDONNANCES.map(o => (
          <div key={o.name} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#1D69E5" }}>description</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{o.name}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{o.doctor} · {o.date}</div>
            </div>
            <button onClick={() => showToast("Téléchargement…")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#0E7C7B" }}>download</span>
            </button>
          </div>
        ))}

        {/* Consultations passées */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80", marginTop: 6 }}>Consultations passées</div>
        {CONSULTATIONS_PASSEES.map(c => (
          <div key={c.motif} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{c.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{c.motif}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{c.doctor} · {c.date}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MES RDV ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRdv = () => {
    const upcoming = appointments.filter(a => ["Confirmé","En attente"].includes(a.statut));
    const past = appointments.filter(a => ["Terminé","Annulé"].includes(a.statut));
    const filtered = rdvTab === "avenir" ? upcoming : past;
    return (
      <>
        <BackHeader title="Mes rendez-vous" />
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 10, padding: 3, gap: 3, border: "1px solid #E2EAE8" }}>
            {(["avenir","passes"] as const).map(tab => (
              <button key={tab} onClick={() => setRdvTab(tab)}
                style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: rdvTab === tab ? "#0E7C7B" : "transparent", color: rdvTab === tab ? "#fff" : "#6B7B80" }}>
                {tab === "avenir" ? "À venir" : "Passés"}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#E2EAE8", display: "block", marginBottom: 8 }}>event_note</span>
              <div style={{ color: "#8AA4A8", fontSize: 12, marginBottom: 12 }}>Aucun rendez-vous</div>
              <button onClick={() => setPScreen("search")} style={{ background: "#0E7C7B", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Prendre RDV</button>
            </div>
          ) : filtered.map(a => {
            const col = a.statut === "Confirmé" ? "#059669" : a.statut === "En attente" ? "#D97706" : a.statut === "Annulé" ? "#DC2626" : "#6B7B80";
            const initials = a.doctorName.split(" ").filter(w => w.length > 1).map(w => w[0]).join("").slice(0, 2);
            return (
              <div key={a.id} style={{ background: "#fff", borderRadius: 12, padding: "12px", boxShadow: "0 1px 5px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{a.doctorName}</div>
                    <div style={{ fontSize: 10, color: "#6B7B80" }}>{a.specialty} · {a.type}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B", marginTop: 2 }}>{a.date} · {a.heure}</div>
                  </div>
                  <span style={{ background: `${col}15`, color: col, fontSize: 9, fontWeight: 700, borderRadius: 12, padding: "2px 8px" }}>{a.statut}</span>
                </div>
                {a.statut === "En attente" && (
                  <div style={{ background: "#F6F8F7", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 13, color: "#D97706" }}>group</span>
                    <span style={{ fontSize: 10, color: "#6B7B80" }}>File d'attente : <strong style={{ color: "#D97706" }}>position 3 sur 8</strong></span>
                  </div>
                )}
                {rdvTab === "avenir" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => showToast("Reporter — bientôt disponible")} style={{ flex: 1, background: "#F6F8F7", border: "1px solid #E2EAE8", borderRadius: 8, padding: "6px", fontSize: 11, fontWeight: 700, color: "#46565B", cursor: "pointer", fontFamily: "inherit" }}>Reporter</button>
                    <button onClick={() => { updateAppointmentStatut(a.id, "Annulé"); showToast("RDV annulé"); }} style={{ flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "6px", fontSize: 11, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                  </div>
                )}
              </div>
            );
          })}
          {rdvTab === "avenir" && (
            <button onClick={() => setPScreen("search")} style={{ background: "#0E7C7B", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
              + Prendre un nouveau RDV
            </button>
          )}
        </div>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── URGENCES ──────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderUrgences = () => (
    <>
      <BackHeader title="Urgences" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, color: "#6B7B80", fontWeight: 600 }}>Appel gratuit · 24h/24</div>
        {/* SOS Ma position */}
        <button onClick={handleSOS}
          style={{ background: "linear-gradient(135deg,#DC2626,#991B1B)", border: "none", borderRadius: 14, padding: "16px", width: "100%", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 28, color: "#fff" }}>sos</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>SOS — Envoyer ma position</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Votre GPS sera partagé avec les secours · Sapeurs-Pompiers · SAMU</span>
        </button>

        {/* Numéros d'urgence */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Numéros d'urgence — Gratuit 24h/24</div>
        {[
          { label: "SAMU National",        num: "1220", color: "#DC2626", icon: "emergency" },
          { label: "Sapeurs-Pompiers RCA", num: "117",  color: "#D97706", icon: "local_fire_department" },
          { label: "Police Nationale",     num: "117",  color: "#1D69E5", icon: "local_police" },
          { label: "Croix-Rouge RCA",      num: "76 05 02 02", color: "#DC2626", icon: "health_and_safety" },
        ].map(n => (
          <a key={n.label} href={`tel:${n.num.replace(/\s/g,"")}`}
            style={{ textDecoration: "none", background: "#fff", borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${n.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 19, color: n.color }}>{n.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{n.label}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: n.color }}>{n.num}</div>
            </div>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: n.color }}>call</span>
          </a>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Urgences les plus proches</div>
        {[
          { icon: "local_hospital", color: "#DC2626", name: "Hôpital de l'Amitié",    type: "Urgences ouvertes",  distance: "1,2 km" },
          { icon: "local_hospital", color: "#1D69E5", name: "Hôpital Communautaire",  type: "Bloc opératoire",    distance: "3,4 km" },
          { icon: "child_care",     color: "#7C3AED", name: "Complexe Pédiatrique",   type: "Urgences enfants",   distance: "2,8 km" },
        ].map(h => (
          <div key={h.name} style={{ background: "#fff", borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${h.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 19, color: h.color }}>{h.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{h.name}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{h.type}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B" }}>{h.distance}</span>
              <button onClick={() => openMaps(`${h.name}, Bangui, RCA`)}
                style={{ background: "#E5F2F1", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B" }}>directions</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PHARMACIE ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPharmacie = () => (
    <>
      <BackHeader title="Pharmacies de garde" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {PHARMACIES.map(p => {
          const badgeColor = p.badge === "Ouverte" ? "#059669" : p.badge === "De garde" ? "#D97706" : "#DC2626";
          return (
            <div key={p.name} style={{ background: "#fff", borderRadius: 12, padding: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${badgeColor}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 19, color: badgeColor }}>local_pharmacy</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{p.name}</span>
                  <span style={{ background: `${badgeColor}18`, color: badgeColor, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px" }}>{p.badge}</span>
                </div>
                <div style={{ fontSize: 10, color: "#6B7B80" }}>{p.address} · {p.status}</div>
              </div>
              <a href={`tel:${p.phone}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "#E5F2F1" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 17, color: "#0E7C7B" }}>call</span>
              </a>
            </div>
          );
        })}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MÉDECIN GPS ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderGps = () => (
    <>
      <BackHeader title="Autour de moi" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Me localiser button */}
        <button onClick={() => getGeolocation((lat, lng) => showToast(`Position : ${lat.toFixed(4)}, ${lng.toFixed(4)}`))}
          style={{ background: geoLoc ? "#E5F2F1" : "#F6F8F7", border: `1px solid ${geoLoc ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: geoLoc ? "#0E7C7B" : "#8AA4A8" }}>{geoLoading ? "hourglass_empty" : "my_location"}</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: geoLoc ? "#0E7C7B" : "#0F1F24" }}>
              {geoLoading ? "Localisation en cours…" : geoLoc ? `${geoLoc.lat.toFixed(4)}, ${geoLoc.lng.toFixed(4)}` : "Me localiser"}
            </div>
            <div style={{ fontSize: 10, color: "#6B7B80" }}>{geoLoc ? "Tapez pour ouvrir dans Google Maps" : "Activez le GPS pour trier par distance réelle"}</div>
          </div>
          {geoLoc && <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B" }}>open_in_new</span>}
        </button>
        {geoLoc && (
          <button onClick={() => openMapsCoords(geoLoc.lat, geoLoc.lng)}
            style={{ background: "#0E7C7B", border: "none", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit", width: "100%", color: "#fff" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>navigation</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Ouvrir ma position dans Google Maps</span>
          </button>
        )}

        {/* Map placeholder */}
        <div style={{ background: "#1A2E35", borderRadius: 14, height: 140, position: "relative", overflow: "hidden" }}>
          {/* Map dots for hospitals */}
          {[
            { top: "30%", left: "25%", icon: "local_hospital",  color: "#DC2626" },
            { top: "20%", left: "65%", icon: "local_hospital",  color: "#1D69E5" },
            { top: "55%", left: "45%", icon: "local_hospital",  color: "#7C3AED" },
            { top: "65%", left: "20%", icon: "medical_services",color: "#059669" },
            { top: "35%", left: "75%", icon: "pregnant_woman",  color: "#DB2777" },
            { top: "70%", left: "60%", icon: "local_pharmacy",  color: "#D97706" },
          ].map((dot, i) => (
            <div key={i} style={{ position: "absolute", top: dot.top, left: dot.left, width: 28, height: 28, borderRadius: 6, background: dot.color, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#fff" }}>{dot.icon}</span>
            </div>
          ))}
          {/* Doctor pins */}
          {doctors.slice(0, 4).map((d, i) => (
            <div key={d.id} style={{ position: "absolute", top: `${[48, 55, 40, 62][i]}%`, left: `${[38, 52, 68, 32][i]}%`, width: 24, height: 24, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", fontSize: 8, color: "#fff", fontWeight: 800 }}>{d.initials}</div>
          ))}
          {/* Center user pin */}
          <div style={{ position: "absolute", top: "50%", left: "45%", transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", background: "#1D69E5", border: "3px solid #fff", boxShadow: "0 0 0 4px rgba(29,105,229,0.3)" }} />
        </div>

        {/* Hôpitaux */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Hôpitaux & structures proches</div>
        {HOSPITALS_NEARBY.map(h => (
          <div key={h.name} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${h.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 17, color: h.color }}>{h.icon}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{h.name}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{h.type}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B" }}>{h.distance}</div>
            <button onClick={() => openMaps(`${h.name}, Bangui, République Centrafricaine`)}
              style={{ background: "#E5F2F1", border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B" }}>directions</span>
            </button>
          </div>
        ))}

        {/* Médecins */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Médecins les plus proches</div>
        {[...doctors].sort((a, b) => parseFloat((a.distance||"99").replace(",",".")) - parseFloat((b.distance||"99").replace(",","."))).map(d => (
          <button key={d.id}
            onClick={() => { setSelectedDoctor(d.id); setSelectedSlot(null); setSelectedDay(null); setPScreen("doctor"); }}
            style={{ width: "100%", background: "#fff", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontFamily: "inherit" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{d.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{d.name}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{d.specialty}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B" }}>{d.distance}</div>
              <div style={{ fontSize: 10, color: "#8AA4A8" }}>{d.dispo}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── TÉLÉCONSULTATION ──────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTeleconsult = () => (
    <>
      <BackHeader title="Téléconsultation" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: "#EEF4FF", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#1D69E5" }}>videocam</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1D69E5" }}>Consultez depuis chez vous</span>
        </div>
        {doctors.filter(d => d.teleconsult).map(d => (
          <div key={d.id} style={{ background: "#fff", borderRadius: 12, padding: "11px 12px", boxShadow: "0 1px 5px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{d.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0F1F24" }}>{d.name}</span>
                  <span style={{ background: "#ECFDF5", color: "#059669", fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 5px" }}>Disponible</span>
                </div>
                <div style={{ fontSize: 11, color: "#6B7B80" }}>{d.specialty}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 1 }}>
                  <span style={{ fontSize: 10, color: "#D97706" }}>★ {d.rating}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: d.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" }}>{d.price}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => showToast("Connexion en cours…")}
                style={{ flex: 1, background: "#1D69E5", border: "none", borderRadius: 8, padding: "9px", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                Rejoindre
              </button>
              <button onClick={() => { setSelectedDoctor(d.id); setSelectedSlot(null); setSelectedDay(null); setPScreen("doctor"); }}
                style={{ flex: 1, background: "#0E7C7B", border: "none", borderRadius: 8, padding: "9px", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                Prendre RDV
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MA FAMILLE ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderFamille = () => (
    <>
      <BackHeader title="Ma famille" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {FAMILLE_MEMBRES.map(m => (
          <div key={m.name} style={{ background: "#fff", borderRadius: 12, padding: "12px", boxShadow: "0 1px 5px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{m.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: "#6B7B80" }}>{m.relation} · {m.detail}</div>
              </div>
            </div>
            <div style={{ background: `${m.alertColor}10`, border: `1px solid ${m.alertColor}30`, borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14, color: m.alertColor }}>vaccines</span>
                <span style={{ fontSize: 10, color: m.alertColor, fontWeight: 600 }}>{m.alert}</span>
              </div>
              <button onClick={() => showToast("Rappel SMS envoyé")} style={{ background: m.alertColor, border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Rappel</button>
            </div>
          </div>
        ))}
        <button onClick={() => showToast("Bientôt disponible")} style={{ background: "#fff", border: "2px dashed #E2EAE8", borderRadius: 12, padding: "12px", color: "#8AA4A8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>add</span>
          Ajouter un membre
        </button>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── DON DE SANG ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDon = () => (
    <>
      <BackHeader title="Don de sang" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Hero */}
        <div style={{ background: "#DC2626", borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: "#fff" }}>bloodtype</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Donnez du sang, sauvez des vies</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>Soyez là en cas de besoin urgent</div>
          </div>
        </div>

        {/* Critères */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80", marginBottom: 10 }}>Conditions requises</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ icon: "cake", val: "18–65 ans" }, { icon: "fitness_center", val: "> 50 kg" }, { icon: "favorite", val: "Bonne santé" }].map(c => (
              <div key={c.val} style={{ flex: 1, background: "#F6F8F7", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#DC2626", display: "block", marginBottom: 4 }}>{c.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#46565B" }}>{c.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collectes à venir */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Collectes à venir</div>
        {BLOOD_DRIVES.map(d => (
          <div key={d.name} style={{ background: "#fff", borderRadius: 12, padding: "12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 19, color: "#DC2626" }}>bloodtype</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{d.name}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{d.place}</div>
              <div style={{ fontSize: 10, color: "#0E7C7B", fontWeight: 600, marginTop: 2 }}>{d.date} · {d.hours}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C7B" }}>{d.distance}</div>
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>chevron_right</span>
            </div>
          </div>
        ))}

        <button onClick={() => showToast("Inscription envoyée !")} style={{ background: "#DC2626", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>volunteer_activism</span>
          Je souhaite donner
        </button>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MOBILE MONEY ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMobileMoney = () => (
    <>
      <BackHeader title="Portefeuille" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Balance card */}
        <div style={{ background: "#0E7C7B", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Solde disponible</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 32 }}>{walletBalance.toLocaleString("fr-FR")} <span style={{ fontSize: 16 }}>FCFA</span></div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
            {[500, 2000, 5000].map(amt => (
              <button key={amt} onClick={() => showToast(`+${amt.toLocaleString("fr-FR")} FCFA ajouté`)}
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                +{amt.toLocaleString("fr-FR")}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {[{ icon: "send", label: "Payer" }, { icon: "download", label: "Retirer" }, { icon: "history", label: "Historique" }].map(a => (
            <button key={a.label} onClick={() => showToast(`${a.label} — bientôt disponible`)}
              style={{ flex: 1, background: "#fff", border: "1px solid #E2EAE8", borderRadius: 10, padding: "10px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#0E7C7B" }}>{a.icon}</span>
              <span style={{ fontSize: 10, color: "#46565B", fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* History */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7B80" }}>Historique</div>
        {TRANSACTIONS.map((t, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: t.color }}>{t.amount < 0 ? "remove" : t.amount > 0 ? "add" : "horizontal_rule"}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{t.label}</div>
              <div style={{ fontSize: 10, color: "#8AA4A8" }}>{t.date}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, color: t.color }}>
              {t.amount > 0 ? "+" : ""}{t.amount !== 0 ? t.amount.toLocaleString("fr-FR") + " FCFA" : "0 FCFA"}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PARAMÈTRES ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderParametres = () => (
    <>
      <BackHeader title="Paramètres" />
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Toggle */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#0E7C7B" }}>record_voice_over</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>Confirmation vocale (Sango)</div>
            <div style={{ fontSize: 10, color: "#6B7B80" }}>Lit les rendez-vous à voix haute</div>
          </div>
          <button onClick={() => setVoiceConfirm(!voiceConfirm)}
            style={{ width: 44, height: 24, borderRadius: 12, background: voiceConfirm ? "#0E7C7B" : "#E2EAE8", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: voiceConfirm ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        </div>

        {/* Écouter RDV */}
        <button onClick={() => showToast("Lecture vocale activée")}
          style={{ background: "#fff", border: "none", borderRadius: 12, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", width: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "left" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#0E7C7B" }}>volume_up</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>Écouter mon prochain RDV</div>
            <div style={{ fontSize: 10, color: "#6B7B80" }}>Lecture audio de votre prochaine consultation</div>
          </div>
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>chevron_right</span>
        </button>

        {/* Other settings */}
        {[
          { icon: "sms",           label: "Rappels SMS",      sub: "Activer les rappels par SMS" },
          { icon: "language",      label: "Langue",           sub: "Français · Sango" },
          { icon: "notifications", label: "Notifications",    sub: "Gérer les alertes" },
          { icon: "security",      label: "Sécurité & PIN",   sub: "Modifier votre code PIN" },
        ].map(s => (
          <button key={s.label} onClick={() => showToast(`${s.label} — bientôt disponible`)}
            style={{ background: "#fff", border: "none", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", width: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "left" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#6B7B80" }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1F24" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "#6B7B80" }}>{s.sub}</div>
            </div>
            <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#8AA4A8" }}>chevron_right</span>
          </button>
        ))}

        <button onClick={() => { logout(); }} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontFamily: "inherit", width: "100%", marginTop: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#DC2626" }}>logout</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>Se déconnecter</span>
        </button>
      </div>
    </>
  );

  // ── Suggestions autocomplete ─────────────────────────────────────────────
  const PATIENT_SUGGESTIONS = [
    { label: "Généraliste",            icon: "stethoscope",       type: "Spécialité" },
    { label: "Pédiatre",               icon: "child_care",        type: "Spécialité" },
    { label: "Sage-femme",             icon: "pregnant_woman",    type: "Spécialité" },
    { label: "Cardiologue",            icon: "favorite",          type: "Spécialité" },
    { label: "Dermatologue",           icon: "dermatology",       type: "Spécialité" },
    { label: "Agent de santé (ASC)",   icon: "health_and_safety", type: "Spécialité" },
    { label: "Paludisme",              icon: "bug_report",        type: "Symptôme" },
    { label: "Fièvre",                 icon: "thermostat",        type: "Symptôme" },
    { label: "Hypertension",           icon: "monitor_heart",     type: "Symptôme" },
    { label: "Grossesse / CPN",        icon: "pregnant_woman",    type: "Symptôme" },
    { label: "Vaccination",            icon: "vaccines",          type: "Symptôme" },
    { label: "Diabète",                icon: "water_drop",        type: "Symptôme" },
    { label: "Diarrhée",               icon: "sick",              type: "Symptôme" },
    { label: "Consultation générale",  icon: "medical_services",  type: "Symptôme" },
    ...doctors.map(d => ({ label: d.name, icon: "person", type: "Praticien" })),
  ];
  const filteredSugg = searchInput.trim().length === 0
    ? PATIENT_SUGGESTIONS.slice(0, 5)
    : PATIENT_SUGGESTIONS.filter(s => s.label.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 7);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SEARCH ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSearch = () => (
    <>
      <div style={{ background: "#fff", borderBottom: "1px solid #E2EAE8", padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <button onClick={() => { setPScreen("home"); setSpecialtyFilter(null); setShowSugg(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#0F1F24" }}>arrow_back</span>
          </button>
          <div style={{ flex: 1, background: "#F6F8F7", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>search</span>
            <input value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Médecin, spécialité…" autoFocus
              style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#0F1F24", width: "100%", fontFamily: "inherit" }} />
            {searchInput.length > 0 && (
              <button onMouseDown={() => { setSearchInput(""); setShowSugg(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#8AA4A8" }}>close</span>
              </button>
            )}
          </div>
        </div>
        {/* Suggestions dropdown */}
        {showSugg && filteredSugg.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% - 2px)", left: 12, right: 12, background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", border: "1px solid #E2EAE8", zIndex: 30, overflow: "hidden" }}>
            {filteredSugg.map((s, i) => (
              <div key={i}
                onMouseDown={() => { setSearchInput(s.label); setShowSugg(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: i < filteredSugg.length - 1 ? "1px solid #F4F7F6" : "none", background: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F4F7F6")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#0E7C7B", flexShrink: 0 }}>{s.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0F1F24" }}>{s.label}</span>
                <span style={{ fontSize: 10, color: "#8AA4A8", background: "#F4F7F6", borderRadius: 5, padding: "2px 7px", fontWeight: 600, whiteSpace: "nowrap" }}>{s.type}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {specialtyFilter && (
            <button onClick={() => setSpecialtyFilter(null)}
              style={{ background: "#0E7C7B", border: "none", borderRadius: 20, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              {specialtyFilter} <span className="material-symbols-rounded" style={{ fontSize: 13 }}>close</span>
            </button>
          )}
          {([["tous","Tous"],["teleconsult","Téléconsult"],["2km","< 2 km"],["dispo","Dispo auj."]] as [SearchFilter, string][]).map(([id, label]) => (
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
            onClick={() => { setSelectedDoctor(d.id); setSelectedSlot(null); setSelectedDay(null); setPScreen("doctor"); }}
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
                <span style={{ fontSize: 11, color: "#6B7B80" }}>Dispo : <strong style={{ color: "#0E7C7B" }}>{d.dispo || "Auj."}</strong></span>
              </div>
              <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}>
                Prendre RDV <span className="material-symbols-rounded" style={{ fontSize: 13 }}>chevron_right</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── DOCTOR PROFILE ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDoctor = () => {
    if (!selectedDoc) return null;
    return (
      <>
        {/* ── Header barre retour ── */}
        <div style={{ background: "#0C1A1E", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setPScreen("search")} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, display: "flex" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: "#fff" }}>arrow_back</span>
          </button>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Profil du praticien</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* ── Bannière profil ── */}
          <div style={{ background: "linear-gradient(160deg, #0C1A1E 0%, #0E2D2C 100%)", padding: "20px 14px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {/* Photo ou initiales */}
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#0E7C7B", border: "3px solid rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {selectedDoc.photoUrl
                ? <img src={selectedDoc.photoUrl} alt={selectedDoc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ color: "#fff", fontWeight: 800, fontSize: 28 }}>{selectedDoc.initials}</span>
              }
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{selectedDoc.name}</span>
                {selectedDoc.verified && <span className="material-symbols-rounded" style={{ fontSize: 16, color: "#4ADE80" }}>verified</span>}
              </div>
              <div style={{ fontSize: 12, color: "#8AA4A8", marginTop: 2 }}>{selectedDoc.specialty} · {selectedDoc.location}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "#FCD34D", fontWeight: 700 }}>★ {selectedDoc.rating}</span>
                <span style={{ fontSize: 12, color: "#8AA4A8" }}>({selectedDoc.reviews} avis)</span>
                <span style={{ fontSize: 12, color: "#8AA4A8" }}>· {selectedDoc.distance}</span>
              </div>
            </div>
            {/* Badges téléconsult / vérifié */}
            <div style={{ display: "flex", gap: 6 }}>
              {selectedDoc.verified && (
                <span style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#4ADE80", display: "flex", alignItems: "center", gap: 3 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>verified_user</span>
                  Vérifié ONM-RCA
                </span>
              )}
              {selectedDoc.teleconsult && (
                <span style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#60A5FA", display: "flex", alignItems: "center", gap: 3 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>videocam</span>
                  Téléconsult
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tarif + Langues + Expérience + Durée */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "payments",      label: "TARIF",        val: selectedDoc.price,                              color: selectedDoc.price.startsWith("Gratuit") ? "#059669" : "#0F1F24" },
                { icon: "translate",     label: "LANGUES",      val: selectedDoc.languages || "FR",                   color: "#0F1F24" },
                { icon: "workspace_premium", label: "EXPÉRIENCE", val: selectedDoc.experience ? `${selectedDoc.experience} ans` : "—", color: "#0F1F24" },
                { icon: "timer",         label: "DURÉE CONSULT", val: selectedDoc.consultDuration ? `${selectedDoc.consultDuration} min` : "30 min", color: "#0F1F24" },
              ].map(c => (
                <div key={c.label} style={{ background: "#F6F8F7", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "#8AA4A8", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 12 }}>{c.icon}</span>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c.color }}>{c.val}</div>
                </div>
              ))}
            </div>

            {/* Adresse — cliquable GPS */}
            {selectedDoc.address && (
              <button onClick={() => openMaps(selectedDoc.address!)}
                style={{ background: "#F6F8F7", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start", border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B", flexShrink: 0, marginTop: 1 }}>location_on</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#8AA4A8", fontWeight: 700, marginBottom: 2 }}>ADRESSE</div>
                  <div style={{ fontSize: 12, color: "#0F1F24", fontWeight: 600 }}>{selectedDoc.address}</div>
                </div>
                <span className="material-symbols-rounded" style={{ fontSize: 17, color: "#0E7C7B", alignSelf: "center" }}>directions</span>
              </button>
            )}

            {/* Horaires */}
            {selectedDoc.horaires && (
              <div style={{ background: "#F6F8F7", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B", flexShrink: 0, marginTop: 1 }}>schedule</span>
                <div>
                  <div style={{ fontSize: 10, color: "#8AA4A8", fontWeight: 700, marginBottom: 2 }}>HORAIRES</div>
                  <div style={{ fontSize: 12, color: "#0F1F24", fontWeight: 600 }}>{selectedDoc.horaires}</div>
                </div>
              </div>
            )}

            {/* Diplôme */}
            {selectedDoc.diploma && (
              <div style={{ background: "#F6F8F7", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B", flexShrink: 0, marginTop: 1 }}>school</span>
                <div>
                  <div style={{ fontSize: 10, color: "#8AA4A8", fontWeight: 700, marginBottom: 2 }}>DIPLÔME</div>
                  <div style={{ fontSize: 12, color: "#0F1F24", fontWeight: 600 }}>{selectedDoc.diploma}</div>
                </div>
              </div>
            )}

            {/* Bio */}
            {selectedDoc.bio && (
              <div style={{ background: "#F6F8F7", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#8AA4A8", fontWeight: 700, marginBottom: 4 }}>À PROPOS</div>
                <div style={{ fontSize: 12, color: "#46565B", lineHeight: 1.6 }}>{selectedDoc.bio}</div>
              </div>
            )}

            {/* Contact */}
            <div style={{ display: "flex", gap: 8 }}>
              {selectedDoc.phone && (
                <a href={`tel:${selectedDoc.phone}`} style={{ flex: 1, background: "#E5F2F1", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#0E7C7B" }}>call</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0E7C7B" }}>Appeler</span>
                </a>
              )}
              {selectedDoc.teleconsult && (
                <button style={{ flex: 1, background: "#DBEAFE", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#2563EB" }}>videocam</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>Vidéo</span>
                </button>
              )}
            </div>

            {/* Séparateur */}
            <div style={{ borderTop: "1px solid #E2EAE8", paddingTop: 4 }} />
          {/* ── Mini-calendrier RDV ── */}
          <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24", marginBottom: 10 }}>Choisir une date</div>

            {/* Navigation mois */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button
                onClick={() => {
                  if (bookingMonth === 0) { setBookingYear(y => y - 1); setBookingMonth(11); }
                  else setBookingMonth(m => m - 1);
                  setSelectedDay(null); setSelectedSlot(null);
                }}
                style={{ background: "#fff", border: "1px solid #E2EAE8", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#46565B" }}>chevron_left</span>
              </button>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0F1F24" }}>{MONTHS_FR_RDV[bookingMonth]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#8AA4A8" }}>{bookingYear}</span>
              </div>

              <button
                onClick={() => {
                  if (bookingMonth === 11) { setBookingYear(y => y + 1); setBookingMonth(0); }
                  else setBookingMonth(m => m + 1);
                  setSelectedDay(null); setSelectedSlot(null);
                }}
                style={{ background: "#fff", border: "1px solid #E2EAE8", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#46565B" }}>chevron_right</span>
              </button>
            </div>

            {/* Grille jours */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {/* Entêtes L M M J V S D */}
              {DAY_LABELS_RDV.map((l, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#8AA4A8", paddingBottom: 4 }}>{l}</div>
              ))}
              {/* Cellules vides */}
              {Array.from({ length: rdvStartDOW(bookingYear, bookingMonth) }).map((_, i) => <div key={`e${i}`} />)}
              {/* Jours du mois */}
              {Array.from({ length: rdvDaysInMonth(bookingYear, bookingMonth) }, (_, i) => i + 1).map(d => {
                const isPast = rdvIsPast(bookingYear, bookingMonth, d);
                const isToday = bookingYear === TODAY_RDV.year && bookingMonth === TODAY_RDV.month && d === TODAY_RDV.day;
                const isSel = selectedDay === d;
                return (
                  <button key={d}
                    disabled={isPast}
                    onClick={() => { setSelectedDay(d); setSelectedSlot(null); }}
                    style={{
                      width: "100%", aspectRatio: "1", borderRadius: 8, border: isSel ? "2px solid #0E7C7B" : isToday ? "1.5px solid #A7F3D0" : "1px solid transparent",
                      background: isSel ? "#0E7C7B" : isToday ? "#E0F5F4" : isPast ? "transparent" : "#fff",
                      color: isSel ? "#fff" : isPast ? "#C8D8DC" : isToday ? "#0E7C7B" : "#0F1F24",
                      fontSize: 12, fontWeight: isSel ? 800 : isToday ? 700 : 500,
                      cursor: isPast ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "inherit", padding: 0,
                      boxSizing: "border-box",
                    }}>
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Confirmation date sélectionnée */}
            {selectedDay !== null && (
              <div style={{ marginTop: 10, background: "#0E7C7B", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#fff" }}>event</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                  {rdvDayName(bookingYear, bookingMonth, selectedDay)} {selectedDay} {MONTHS_FR_RDV[bookingMonth]} {bookingYear}
                </span>
              </div>
            )}
          </div>

          {/* ── Créneaux horaires ── */}
          {selectedDay !== null && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1F24", marginBottom: 8 }}>Choisir un créneau</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(selectedDoc?.availableSlots || SLOTS).map(slot => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    style={{ background: selectedSlot === slot ? "#0E7C7B" : "#F6F8F7", border: `1.5px solid ${selectedSlot === slot ? "#0E7C7B" : "#E2EAE8"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: selectedSlot === slot ? "#fff" : "#0F1F24", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#46565B", marginBottom: 6 }}>Motif (optionnel)</div>
            <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : fièvre, contrôle…"
              style={{ width: "100%", border: "1.5px solid #E2EAE8", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", background: "#fff", color: "#0F1F24", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <button onClick={() => { if (!selectedSlot) { showToast("Choisissez un créneau"); return; } setPScreen("payment"); }}
            style={{ width: "100%", background: "#0E7C7B", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Continuer
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
        </div>
        </div>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
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
              { label: "Date", val: selectedDay ? `${rdvDayName(bookingYear, bookingMonth, selectedDay)} ${selectedDay} ${MONTHS_FR_RDV[bookingMonth].slice(0,3)}. ${bookingYear} · ${selectedSlot}` : `${selectedSlot}` },
              { label: "Lieu",         val: selectedDoc.teleconsult ? "Téléconsultation" : `${selectedDoc.location}` },
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
            {([["orange","smartphone","Orange Money"],["moov","smartphone","Moov Money"],["place","payments","Payer sur place"]] as [PayMethod,string,string][]).map(([id, icon, label]) => (
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
            <span style={{ fontSize: 11, color: "#8AA4A8" }}>Rappel SMS en Sango 15 min avant</span>
          </div>
        </div>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── DONE ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDone = () => (
    <div style={{ padding: "30px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", flex: 1, overflowY: "auto" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E5F2F1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: "#0E7C7B" }}>check_circle</span>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#0F1F24", marginBottom: 6 }}>Rendez-vous confirmé !</div>
        <div style={{ fontSize: 12, color: "#6B7B80", lineHeight: 1.6 }}>Votre rendez-vous avec<br />{selectedDoc?.name} a été enregistré.</div>
      </div>
      {selectedDoc && (
        <div style={{ background: "#F6F8F7", borderRadius: 14, padding: "12px", width: "100%" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0E7C7B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>{selectedDoc.initials}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#0F1F24" }}>{selectedDoc.name}</div>
              <div style={{ fontSize: 11, color: "#6B7B80" }}>{selectedDay ? `${rdvDayName(bookingYear, bookingMonth, selectedDay)} ${selectedDay} ${MONTHS_FR_RDV[bookingMonth].slice(0,3)}. · ${selectedSlot}` : selectedSlot}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E5F2F1", borderRadius: 8, padding: "6px 10px" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "#0E7C7B" }}>sms</span>
            <span style={{ fontSize: 11, color: "#0E7C7B", fontWeight: 600 }}>Rappel SMS programmé · 15 min avant</span>
          </div>
        </div>
      )}
      <button onClick={() => { setPScreen("home"); setSelectedSlot(null); setMotif(""); setCarnetOpen(false); }}
        style={{ background: "#0E7C7B", border: "none", borderRadius: 12, padding: "12px 28px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
        Retour à l'accueil
      </button>
    </div>
  );

  // ── Router ─────────────────────────────────────────────────────────────────
  const navActive =
    pScreen === "search" || pScreen === "gps" || pScreen === "teleconsult" ? "search" :
    carnetOpen || pScreen === "rdv" ? "carnet" :
    "accueil";

  const renderContent = () => {
    if (carnetOpen && pScreen === "home") return renderCarnet();
    switch (pScreen) {
      case "search":       return renderSearch();
      case "doctor":       return renderDoctor();
      case "payment":      return renderPayment();
      case "done":         return renderDone();
      case "rdv":          return renderRdv();
      case "urgences":     return renderUrgences();
      case "pharmacie":    return renderPharmacie();
      case "gps":          return renderGps();
      case "teleconsult":  return renderTeleconsult();
      case "famille":      return renderFamille();
      case "don":          return renderDon();
      case "mobile-money": return renderMobileMoney();
      case "parametres":   return renderParametres();
      default:             return renderHome();
    }
  };

  // ── Phone shell ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "#0C1A1E", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: 375, background: "#F4F7F6", borderRadius: 40, boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 80px)" }}>
        <StatusBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {renderContent()}

          {/* ── SOS Floating button (visible on all screens sauf urgences) ── */}
          {pScreen !== "urgences" && !sosOpen && (
            <button onClick={handleSOS}
              style={{ position: "absolute", bottom: 14, right: 14, width: 46, height: 46, borderRadius: "50%", background: "#DC2626", border: "3px solid #fff", boxShadow: "0 4px 16px rgba(220,38,38,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: "inherit" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#fff" }}>sos</span>
            </button>
          )}

          {/* ── SOS Modal ── */}
          {sosOpen && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(12,26,30,0.92)", zIndex: 200, display: "flex", flexDirection: "column", padding: "24px 18px", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 28, color: "#DC2626" }}>sos</span>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Situation d'urgence</span>
                </div>
                {!sosSent && (
                  <button onClick={() => setSosOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#8AA4A8", fontSize: 12, fontFamily: "inherit" }}>Annuler</button>
                )}
              </div>

              {/* Coordonnées GPS */}
              <div style={{ background: "#0F2227", borderRadius: 12, padding: "14px", border: "1px solid rgba(220,38,38,0.3)" }}>
                <div style={{ fontSize: 10, color: "#8AA4A8", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>gps_fixed</span>
                  VOTRE POSITION GPS
                </div>
                {sosLat !== null ? (
                  <>
                    <div style={{ fontFamily: "monospace", fontSize: 14, color: "#4ADE80", fontWeight: 700, letterSpacing: 0.5 }}>
                      {sosLat.toFixed(6)}, {sosLng!.toFixed(6)}
                    </div>
                    <div style={{ fontSize: 10, color: "#8AA4A8", marginTop: 4 }}>Bangui, République Centrafricaine</div>
                    <button onClick={() => openMapsCoords(sosLat!, sosLng!)}
                      style={{ marginTop: 10, background: "#0E7C7B", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 15 }}>open_in_new</span>
                      Ouvrir dans Google Maps
                    </button>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8AA4A8", fontSize: 12 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: "#D97706" }}>hourglass_empty</span>
                    Localisation GPS en cours…
                  </div>
                )}
              </div>

              {/* Numéros urgence */}
              {[
                { label: "SAMU", num: "1220", color: "#DC2626", icon: "emergency" },
                { label: "Pompiers", num: "117", color: "#D97706", icon: "local_fire_department" },
              ].map(n => (
                <a key={n.label} href={`tel:${n.num}`}
                  style={{ textDecoration: "none", background: n.color, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#fff" }}>{n.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 700 }}>{n.label}</div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{n.num}</div>
                  </div>
                  <span className="material-symbols-rounded" style={{ fontSize: 24, color: "#fff" }}>call</span>
                </a>
              ))}

              {/* Confirmer l'envoi */}
              {!sosSent ? (
                <button onClick={confirmSOS}
                  style={{ background: "#DC2626", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 20 }}>send_to_mobile</span>
                  Envoyer ma position aux secours
                </button>
              ) : (
                <>
                  <div style={{ background: "#064E3B", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#4ADE80" }}>check_circle</span>
                    <div>
                      <div style={{ color: "#4ADE80", fontWeight: 700, fontSize: 13 }}>Position envoyée aux secours</div>
                      <div style={{ color: "#6EE7B7", fontSize: 11, marginTop: 2 }}>Les équipes sont en route · Restez en ligne</div>
                    </div>
                  </div>
                  <button onClick={() => { setSosOpen(false); setSosSent(false); }}
                    style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "12px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                    Fermer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <BottomNav active={navActive} />
      </div>
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", color: "#8AA4A8", fontSize: 11, textAlign: "center", whiteSpace: "nowrap", pointerEvents: "none" }}>
        Astuce démo : changez l'état réseau (en haut) pour voir les modes hors-ligne et SMS/USSD.
      </div>
    </div>
  );
}
