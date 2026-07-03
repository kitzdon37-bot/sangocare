import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActiveView = "patient" | "site" | "agent" | "clinique";
export type NetworkMode = "online" | "sms" | "offline";
export type UserRole = "patient" | "medecin" | "agent" | "etablissement";
export type AppointmentStatut = "Confirmé" | "En attente" | "Annulé" | "Terminé";
export type AppointmentType = "Présentiel" | "Téléconsultation";
export type PatientStatut = "Actif" | "Suivi" | "Référé";
export type SyncType = "RDV" | "Dossier" | "Résultat";

export interface Doctor {
  id: string;
  initials: string;
  name: string;
  specialty: string;
  location: string;
  city: string;
  rating: number;
  reviews: number;
  distance: string;
  price: string;
  verified: boolean;
  teleconsult: boolean;
  phone?: string;
  bio?: string;
  availableSlots?: string[];
  dispo?: string;
  languages?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  heure: string;
  type: AppointmentType;
  statut: AppointmentStatut;
  motif?: string;
}

export interface PatientRecord {
  id: string;
  nom: string;
  telephone: string;
  age: number;
  village?: string;
  lastVisit: string;
  statut: PatientStatut;
}

export interface SyncQueueItem {
  id: string;
  type: SyncType;
  patientName: string;
  pending: boolean;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  patientName: string;
  motif: string;
  heure: string;
  date: string;
  duree: number;
  type: AppointmentType;
  statut: AppointmentStatut;
}

const initialDoctors: Doctor[] = [
  {
    id: "D001", initials: "BN", name: "Dr. Béatrice Nzapa", specialty: "Généraliste",
    location: "Clinique SICA", city: "Bangui", rating: 4.8, reviews: 142,
    distance: "1,2 km", price: "2 500 FCFA", verified: true, teleconsult: false,
    phone: "+236 75 00 01 01",
    bio: "Médecin généraliste avec 12 ans d'expérience à Bangui. Spécialisée en médecine tropicale et pédiatrie.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Auj. 14:30", languages: "FR · Sango",
  },
  {
    id: "D002", initials: "JK", name: "Dr. Jean-Paul Koyt", specialty: "Pédiatre",
    location: "Hôpital Communautaire", city: "Bangui", rating: 4.6, reviews: 167,
    distance: "3,4 km", price: "3 000 FCFA", verified: true, teleconsult: true,
    phone: "+236 75 00 02 02",
    bio: "Pédiatre expérimenté, suivi de l'enfant de 0 à 15 ans. Consultation présentielle et téléconsultation.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Demain 09:00", languages: "FR",
  },
  {
    id: "D003", initials: "PS", name: "Pauline Sérémadé", specialty: "Sage-femme",
    location: "Maternité Castors", city: "Bangui", rating: 4.9, reviews: 302,
    distance: "0,8 km", price: "Gratuit (CPN)", verified: true, teleconsult: false,
    phone: "+236 75 00 03 03",
    bio: "Sage-femme certifiée. Consultations prénatales, accouchements, suivi post-natal et planification familiale.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Auj. 11:00", languages: "FR · Sango",
  },
  {
    id: "D004", initials: "AG", name: "Dr. Alphonse Gbékou", specialty: "Cardiologue",
    location: "CHU de Bangui", city: "Bangui", rating: 4.7, reviews: 98,
    distance: "Téléconsultation", price: "5 000 FCFA", verified: true, teleconsult: true,
    phone: "+236 75 00 04 04",
    bio: "Cardiologue au CHU de Bangui. Spécialisé en HTA et insuffisance cardiaque.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Jeu. 16:00", languages: "FR",
  },
  {
    id: "D005", initials: "PY", name: "Pierre Yangba", specialty: "Agent (ASC)",
    location: "Village Boyali", city: "Boyali", rating: 4.5, reviews: 41,
    distance: "Sur place", price: "Gratuit", verified: true, teleconsult: false,
    phone: "+236 75 00 05 05",
    bio: "Agent de santé communautaire formé par le Ministère de la Santé. Dépistage paludisme, vaccination.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Aujourd'hui", languages: "Sango · FR",
  },
  {
    id: "D006", initials: "MS", name: "Dr. Marie Sata", specialty: "Dermatologue",
    location: "Téléconsultation", city: "Bangui", rating: 4.4, reviews: 23,
    distance: "Téléconsultation", price: "4 000 FCFA", verified: false, teleconsult: true,
    phone: "+236 75 00 06 06",
    bio: "Dermatologue disponible en téléconsultation. Dermatoses tropicales, mycoses, eczéma.",
    availableSlots: ["08:00", "08:30", "09:00", "11:00", "14:30", "16:00"],
    dispo: "Ven. 10:30", languages: "FR",
  },
];

const initialAppointments: Appointment[] = [
  {
    id: "RDV-2026-001", patientName: "Nadège Yakité", patientPhone: "+236 72 00 00 00",
    doctorId: "D001", doctorName: "Dr. Béatrice Nzapa", specialty: "Généraliste",
    date: "2026-07-03", heure: "14:30", type: "Présentiel", statut: "Confirmé",
    motif: "Consultation générale — contrôle paludisme",
  },
  {
    id: "RDV-2026-002", patientName: "Marcel Ngombé", patientPhone: "+236 72 11 22 33",
    doctorId: "D002", doctorName: "Dr. Jean-Paul Koyt", specialty: "Pédiatre",
    date: "2026-07-04", heure: "09:30", type: "Téléconsultation", statut: "En attente",
    motif: "Fièvre persistante enfant 3 ans",
  },
  {
    id: "RDV-2026-003", patientName: "Aïcha Doumbaya", patientPhone: "+236 75 33 44 55",
    doctorId: "D003", doctorName: "Pauline Sérémadé", specialty: "Sage-femme",
    date: "2026-07-05", heure: "08:00", type: "Présentiel", statut: "Confirmé",
    motif: "CPN 4e trimestre",
  },
  {
    id: "RDV-2026-004", patientName: "Sylvie Banga", patientPhone: "+236 75 66 77 88",
    doctorId: "D004", doctorName: "Dr. Alphonse Gbékou", specialty: "Cardiologue",
    date: "2026-07-07", heure: "15:00", type: "Téléconsultation", statut: "En attente",
    motif: "Suivi hypertension artérielle",
  },
];

const initialPatients: PatientRecord[] = [
  { id: "P001", nom: "Innocent Gbéboyan", telephone: "+236 75 10 20 30", age: 34, village: "Bimbo", lastVisit: "2026-06-28", statut: "Actif" },
  { id: "P002", nom: "Aïcha Doumbaya", telephone: "+236 75 33 44 55", age: 27, village: "Bangui", lastVisit: "2026-06-30", statut: "Suivi" },
  { id: "P003", nom: "Casper Zoumara", telephone: "+236 75 55 66 77", age: 45, village: "Damara", lastVisit: "2026-07-01", statut: "Référé" },
  { id: "P004", nom: "Prosper Ngakola", telephone: "+236 75 88 99 00", age: 19, village: "Boyali", lastVisit: "2026-07-02", statut: "Actif" },
];

const initialSyncQueue: SyncQueueItem[] = [
  { id: "S001", type: "RDV", patientName: "A. Doumbaya", pending: true, timestamp: "08:43" },
  { id: "S002", type: "Dossier", patientName: "I. Gbéboyan", pending: true, timestamp: "09:12" },
  { id: "S003", type: "RDV", patientName: "C. Zoumara", pending: false, timestamp: "10:05" },
];

const initialCalendarEvents: CalendarEvent[] = [
  { id: "CAL-001", patientName: "Prosper Ngakola", motif: "Contrôle glycémie", heure: "08:30", date: "2026-07-03", duree: 30, type: "Présentiel", statut: "Confirmé" },
  { id: "CAL-002", patientName: "Félicité Oumar", motif: "Suivi paludisme", heure: "09:00", date: "2026-07-03", duree: 45, type: "Présentiel", statut: "Confirmé" },
  { id: "CAL-003", patientName: "Marcel Ngombé", motif: "Fièvre enfant", heure: "10:30", date: "2026-07-03", duree: 30, type: "Téléconsultation", statut: "En attente" },
  { id: "CAL-004", patientName: "Rosine Lobé", motif: "CPN 3e trimestre", heure: "14:00", date: "2026-07-03", duree: 60, type: "Présentiel", statut: "Confirmé" },
  { id: "CAL-005", patientName: "Jean-Baptiste K.", motif: "HTA contrôle", heure: "15:30", date: "2026-07-03", duree: 30, type: "Téléconsultation", statut: "Confirmé" },
  { id: "CAL-006", patientName: "Nadège Yakité", motif: "Consultation générale", heure: "14:30", date: "2026-07-03", duree: 30, type: "Présentiel", statut: "Confirmé" },
  { id: "CAL-007", patientName: "Didier Samba", motif: "Renouvellement ordonnance", heure: "09:00", date: "2026-07-04", duree: 20, type: "Présentiel", statut: "En attente" },
  { id: "CAL-008", patientName: "Aïcha Doumbaya", motif: "CPN 4e trimestre", heure: "08:00", date: "2026-07-05", duree: 60, type: "Présentiel", statut: "Confirmé" },
];

interface AppState {
  isLoggedIn: boolean;
  userName: string;
  userInitials: string;
  userPhone: string;
  userRole: UserRole;
  activeView: ActiveView;
  networkMode: NetworkMode;
  doctors: Doctor[];
  appointments: Appointment[];
  patients: PatientRecord[];
  syncQueue: SyncQueueItem[];
  calendarEvents: CalendarEvent[];
  modal: string | null;
  selectedDoctorId: string | null;
  searchQuery: string;
  selectedSpecialty: string | null;
  isMobile: boolean;
  toast: { message: string; visible: boolean };
  login: (phone: string, name?: string, role?: UserRole) => void;
  logout: () => void;
  setActiveView: (v: ActiveView) => void;
  setNetworkMode: (m: NetworkMode) => void;
  setModal: (m: string | null) => void;
  setSelectedDoctor: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedSpecialty: (s: string | null) => void;
  setIsMobile: (v: boolean) => void;
  showToast: (msg: string) => void;
  addAppointment: (a: Appointment) => void;
  updateAppointmentStatut: (id: string, statut: AppointmentStatut) => void;
  removeAppointment: (id: string) => void;
  addPatient: (p: PatientRecord) => void;
  removePatient: (id: string) => void;
  toggleSyncItem: (id: string) => void;
  addCalendarEvent: (e: CalendarEvent) => void;
  updateCalendarEvent: (id: string, statut: AppointmentStatut) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userName: "Nadège Yakité",
      userInitials: "NY",
      userPhone: "+236 72 00 00 00",
      userRole: "patient",
      activeView: "patient",
      networkMode: "online",
      doctors: initialDoctors,
      appointments: initialAppointments,
      patients: initialPatients,
      syncQueue: initialSyncQueue,
      calendarEvents: initialCalendarEvents,
      modal: null,
      selectedDoctorId: null,
      searchQuery: "",
      selectedSpecialty: null,
      isMobile: false,
      toast: { message: "", visible: false },
      login: (phone, name, role) => {
        const n = name || "Utilisateur";
        const initials = n.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        set({ isLoggedIn: true, userName: n, userInitials: initials, userPhone: phone, userRole: role || "patient" });
      },
      logout: () => set({ isLoggedIn: false }),
      setActiveView: (v) => set({ activeView: v }),
      setNetworkMode: (m) => set({ networkMode: m }),
      setModal: (m) => set({ modal: m }),
      setSelectedDoctor: (id) => set({ selectedDoctorId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setSelectedSpecialty: (s) => set({ selectedSpecialty: s }),
      setIsMobile: (v) => set({ isMobile: v }),
      showToast: (msg) => {
        set({ toast: { message: msg, visible: true } });
        setTimeout(() => set({ toast: { message: "", visible: false } }), 3000);
      },
      addAppointment: (a) => set((s) => ({ appointments: [a, ...s.appointments] })),
      updateAppointmentStatut: (id, statut) => set((s) => ({
        appointments: s.appointments.map((a) => a.id === id ? { ...a, statut } : a),
      })),
      removeAppointment: (id) => set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
      addPatient: (p) => set((s) => ({ patients: [p, ...s.patients] })),
      removePatient: (id) => set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),
      toggleSyncItem: (id) => set((s) => ({
        syncQueue: s.syncQueue.map((i) => i.id === id ? { ...i, pending: !i.pending } : i),
      })),
      addCalendarEvent: (e) => set((s) => ({ calendarEvents: [e, ...s.calendarEvents] })),
      updateCalendarEvent: (id, statut) => set((s) => ({
        calendarEvents: s.calendarEvents.map((e) => e.id === id ? { ...e, statut } : e),
      })),
    }),
    { name: "sangocare-store" }
  )
);
