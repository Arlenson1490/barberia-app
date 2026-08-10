import React, { useState, useEffect } from "react";
import "./index.css";
import { subscribeToCitas, addCitaAsync } from "./firestoreService";
import { ClientBooking } from "./ClientBooking";
import { AdminLogin, AdminPanel } from "./AdminPanel";
import { BarberSpinner } from "./Header";

const DEFAULT_CONFIG = {
  shopName: "Como Nuevos Barbería",
  tagline: "Estilo & Estructura",
  whatsapp: "573000000000",
  adminPassword: "1234",
  slotInterval: 30,
  hours: {
    0: { closed: true, open: "09:00", close: "18:00" },
    1: { closed: false, open: "09:00", close: "19:00" },
    2: { closed: false, open: "09:00", close: "19:00" },
    3: { closed: false, open: "09:00", close: "19:00" },
    4: { closed: false, open: "09:00", close: "19:00" },
    5: { closed: false, open: "09:00", close: "20:00" },
    6: { closed: false, open: "09:00", close: "17:00" },
  },
  services: [
    { id: "s1", name: "Corte clásico", duration: 30, price: 20000 },
    { id: "s2", name: "Corte + Barba", duration: 45, price: 35000 },
    { id: "s3", name: "Barba", duration: 20, price: 15000 },
  ],
};

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("client"); // "client" | "adminLogin" | "admin"

  // Escuchador en Tiempo Real desde Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeToCitas((data) => {
      setAppointments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Proceso Optimista: renderiza la cita inmediatamente en cliente y guarda asíncronamente
  const handleBookOptimistic = (newCitaData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticCita = { id: tempId, ...newCitaData };

    // Actualiza el estado local de inmediato
    setAppointments((prev) => [optimisticCita, ...prev]);

    // Ejecuta inserción en segundo plano en Firestore
    addCitaAsync(newCitaData).catch((err) => {
      console.error("Fallo la sincronización en segundo plano:", err);
      // Rollback si la base de datos falla
      setAppointments((prev) => prev.filter((a) => a.id !== tempId));
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#0B0B0E]">
        <BarberSpinner size={40} />
        <p className="text-[#8B8FA3] text-sm">Cargando la barbería…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-4">
      <div className={`w-full ${view === "admin" ? "max-w-lg" : "max-w-md md:max-w-3xl"} bg-[#15151B] border border-[#242429] rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300`}>
        {view === "client" && (
          <ClientBooking
            config={config}
            appointments={appointments}
            onBookOptimistic={handleBookOptimistic}
            onGoAdmin={() => setView("adminLogin")}
          />
        )}

        {view === "adminLogin" && (
          <AdminLogin
            config={config}
            onSuccess={() => setView("admin")}
            onBack={() => setView("client")}
          />
        )}

        {view === "admin" && (
          <AdminPanel
            config={config}
            appointments={appointments}
            setConfig={setConfig}
            onExit={() => setView("client")}
          />
        )}
      </div>
    </div>
  );
}