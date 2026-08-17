import React, { useState, useEffect } from "react";
import "./index.css";
import { subscribeToCitas, subscribeToConfig, addCitaAsync } from "./firestoreService";
import { ClientBooking } from "./ClientBooking";
import { AdminLogin, AdminPanel } from "./AdminPanel";
import { BarberSpinner } from "./Header";

const DEFAULT_CONFIG = {
  shopName: "Como Nuevos Barbería",
  tagline: "Estilo & Estructura",
  whatsapp: "573000000000",
  adminPassword: "1234",
  slotInterval: 60,
  hours: {
    0: { closed: true, open: "10:00", close: "19:00" },
    1: { closed: false, open: "10:00", close: "19:00" },
    2: { closed: false, open: "10:00", close: "19:00" },
    3: { closed: false, open: "10:00", close: "19:00" },
    4: { closed: false, open: "10:00", close: "19:00" },
    5: { closed: false, open: "10:00", close: "19:00" },
    6: { closed: false, open: "10:00", close: "19:00" },
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

  // 1. Escuchar Citas y Configuración en Tiempo Real desde Cloud Firestore
  useEffect(() => {
    const unsubscribeCitas = subscribeToCitas((data) => {
      setAppointments(data);
      setLoading(false);
    });

    const unsubscribeConfig = subscribeToConfig((remoteConfig) => {
      if (remoteConfig) {
        setConfig((prev) => ({
          ...prev,
          ...remoteConfig,
        }));
      }
    });

    return () => {
      unsubscribeCitas();
      unsubscribeConfig();
    };
  }, []);

  // Proceso Optimista Corregido: inserción inmediata en UI y sincronización asíncrona con Firestore
  const handleBookOptimistic = async (newCitaData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticCita = { id: tempId, ...newCitaData };

    // 1. Actualización optimista inmediata en UI
    setAppointments((prev) => [optimisticCita, ...prev]);

    try {
      // 2. Guardado en la base de datos en tiempo real
      const res = await addCitaAsync(newCitaData);

      if (!res.ok) {
        throw new Error(res.error || "No se pudo guardar la cita en Firestore");
      }
    } catch (err) {
      console.error("Error al guardar cita en tiempo real:", err);
      // Rollback: Elimina la cita temporal si falla la conexión
      setAppointments((prev) => prev.filter((a) => a.id !== tempId));
      alert("No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.");
    }
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
    <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Contenedor Adaptativo */}
      <div
        className={`w-full ${
          view === "admin"
            ? "max-w-2xl lg:max-w-4xl"
            : "max-w-md md:max-w-3xl lg:max-w-5xl"
        } bg-[#15151B] border border-[#242429] rounded-[24px] sm:rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300`}
      >
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