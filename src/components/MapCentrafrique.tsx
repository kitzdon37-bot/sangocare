"use client";
import { useEffect, useRef } from "react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  location: string;
  lat?: number;
  lng?: number;
  price: string;
  rating: number;
  teleconsult?: boolean;
}

interface Props {
  doctors: Doctor[];
  onSelect: (id: string) => void;
}

// Coordonnées approximatives des quartiers de Bangui
const LOCATION_COORDS: Record<string, [number, number]> = {
  "Bangui Centre":    [4.3612, 18.5550],
  "Bangui, km5":      [4.3800, 18.5350],
  "PK5":              [4.3800, 18.5350],
  "Bangui, Bimbo":    [4.2558, 18.4136],
  "Bimbo":            [4.2558, 18.4136],
  "Bangui, PK12":     [4.4300, 18.5100],
  "PK12":             [4.4300, 18.5100],
  "Bangui, Begoua":   [4.5000, 18.5000],
  "Begoua":           [4.5000, 18.5000],
  "Bangui":           [4.3612, 18.5550],
};

function getCoords(location: string): [number, number] {
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return coords;
  }
  // Position aléatoire autour de Bangui si non trouvé
  return [4.3612 + (Math.random() - 0.5) * 0.08, 18.5550 + (Math.random() - 0.5) * 0.08];
}

export default function MapCentrafrique({ doctors, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    import("leaflet").then(L => {
      // Fix icônes Leaflet avec Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [4.3612, 18.5550],
        zoom: 12,
        zoomControl: true,
      });

      mapInstance.current = map;

      // Fond de carte OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Icône personnalisée teal
      const docIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#0E7C7B;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;color:#fff;font-family:sans-serif;font-weight:700;
        ">+</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      // Placer les médecins sur la carte
      doctors.forEach(doc => {
        const [lat, lng] = getCoords(doc.location);
        const marker = L.marker([lat, lng], { icon: docIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:800;font-size:14px;color:#0F1F24;margin-bottom:4px">${doc.name}</div>
            <div style="font-size:12px;color:#6B7B80;margin-bottom:6px">${doc.specialty} · ${doc.location}</div>
            <div style="font-size:12px;color:#0E7C7B;font-weight:700;margin-bottom:8px">${doc.price}</div>
            <button onclick="window.__sangocareSelectDoc('${doc.id}')"
              style="background:#0E7C7B;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;width:100%">
              Prendre RDV
            </button>
          </div>
        `);
      });

      // Callback global pour le bouton dans le popup
      (window as Window & typeof globalThis & { __sangocareSelectDoc: (id: string) => void }).__sangocareSelectDoc = onSelect;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [doctors, onSelect]);

  return (
    <>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: 16 }} />
    </>
  );
}
