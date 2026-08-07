import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Scissors, Calendar, Clock, User, Phone, Check, X, Settings,
  LogOut, MessageCircle, ChevronLeft, ChevronRight, Plus, Trash2,
  Pencil, Lock, ArrowLeft, CalendarDays, Ban, CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DISEÑO: identidad de "Como Nuevos Barbería" — negro profundo con   */
/*  acentos neón cian/magenta (estilo "circuito"), y una guiñada       */
/*  clásica a la barbería en la franja/spinner tipo poste giratorio.  */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#0A0A0D",
  bg2: "#111116",
  card: "#16161D",
  cardBorder: "#26262F",
  cyan: "#3EEDEB",
  cyanDim: "#1BAFAE",
  magenta: "#E93DE0",
  magentaDim: "#A62CA1",
  white: "#F5F6FA",
  muted: "#8B92A6",
  mutedDim: "#565C6E",
  green: "#33D17E",
  red: "#F1555C",
  poleRed: "#D93A3A",
  poleBlue: "#274B9C",
};

const FONT_LINK_ID = "barberia-fonts";

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const displayFont = { fontFamily: "'Rajdhani', sans-serif" };
const bodyFont = { fontFamily: "'Inter', sans-serif" };

/* ------------------------------------------------------------------ */
/*  Utilidades de fecha / hora                                        */
/* ------------------------------------------------------------------ */
const pad = (n) => n.toString().padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeToMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/*  Configuración por defecto                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_CONFIG = {
  shopName: "Como Nuevos Barbería",
  tagline: "",
  whatsapp: "",
  address: "",
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

const CONFIG_KEY = "barberia_config_v1";
const APPTS_KEY = "barberia_appointments_v1";

/* ------------------------------------------------------------------ */
/*  Spinner "poste de barbería" en clave neón — firma visual           */
/* ------------------------------------------------------------------ */
function BarberSpinner({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        overflow: "hidden",
        border: `2px solid ${C.cyan}`,
        boxShadow: `0 0 12px 0 ${C.cyan}55`,
      }}
    >
      <div
        style={{
          width: "200%",
          height: "200%",
          backgroundImage: `repeating-linear-gradient(45deg, ${C.magenta} 0 10px, ${C.bg} 10px 20px, ${C.cyan} 20px 30px, ${C.bg} 30px 40px)`,
          animation: "barberspin 1.1s linear infinite",
        }}
      />
      <style>{`@keyframes barberspin { from { transform: translate(-25%,-25%) rotate(0deg);} to { transform: translate(-25%,-25%) rotate(360deg);} }`}</style>
    </div>
  );
}

function StripeDivider() {
  return (
    <div
      style={{
        height: 5,
        backgroundImage: `repeating-linear-gradient(-45deg, ${C.poleRed} 0 8px, ${C.white} 8px 11px, ${C.poleBlue} 11px 19px, ${C.white} 19px 22px)`,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Storage helpers (con manejo de errores)                            */
/* ------------------------------------------------------------------ */
async function loadJSON(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    if (res && res.value) return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value, retries = 2) {
  const serialized = JSON.stringify(value);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await window.storage.set(key, serialized, true);
      if (res) return { ok: true };
    } catch (e) {
      lastError = e;
      console.error("storage.set falló", key, e);
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  // Última red de seguridad: puede que el guardado sí haya ocurrido en el
  // servidor aunque la respuesta al cliente haya fallado. Verificamos antes
  // de reportar un error falso.
  try {
    const check = await window.storage.get(key, true);
    if (check && check.value === serialized) return { ok: true };
  } catch (e) {
    lastError = lastError || e;
  }
  return { ok: false, error: lastError ? String(lastError.message || lastError) : "Error desconocido" };
}

/* ------------------------------------------------------------------ */
/*  App principal                                                      */
/* ------------------------------------------------------------------ */
export default function BarberiaApp() {
  useGoogleFonts();
  const [config, setConfig] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("client"); // client | adminLogin | admin
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      const [cfg, appts] = await Promise.all([
        loadJSON(CONFIG_KEY, null),
        loadJSON(APPTS_KEY, []),
      ]);
      let finalCfg = cfg;
      if (!finalCfg) {
        finalCfg = DEFAULT_CONFIG;
        await saveJSON(CONFIG_KEY, DEFAULT_CONFIG);
      }
      setConfig(finalCfg);
      setAppointments(appts || []);
      setReady(true);
    })();
  }, []);

  const persistConfig = useCallback(async (next) => {
    setConfig(next);
    const result = await saveJSON(CONFIG_KEY, next);
    setSaveError(result.ok ? "" : `No se pudo guardar (${result.error}). Se seguirá viendo en esta sesión, pero puede no persistir.`);
  }, []);

  const persistAppointments = useCallback(async (next) => {
    setAppointments(next);
    const result = await saveJSON(APPTS_KEY, next);
    setSaveError(result.ok ? "" : `No se pudo guardar la cita (${result.error}). Se seguirá viendo en esta sesión, pero puede no persistir.`);
    return result.ok;
  }, []);

  if (!ready) {
    return (
      <div
        style={{ backgroundColor: C.bg, minHeight: "500px", ...bodyFont }}
        className="w-full flex flex-col items-center justify-center gap-4 p-10"
      >
        <BarberSpinner size={56} />
        <p style={{ color: C.muted }} className="text-sm tracking-wide">Cargando…</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "600px", ...bodyFont }} className="w-full">
      {saveError && (
        <div style={{ backgroundColor: C.red, color: C.white }} className="text-xs text-center py-2 px-4">
          {saveError}
        </div>
      )}
      {view === "client" && (
        <ClientBooking
          config={config}
          appointments={appointments}
          onBook={persistAppointments}
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
          setConfig={persistConfig}
          setAppointments={persistAppointments}
          onExit={() => setView("client")}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Encabezado compartido (cliente) — nombre con resplandor neón       */
/* ------------------------------------------------------------------ */
function Header({ config }) {
  return (
    <div style={{ backgroundColor: C.bg, position: "relative", overflow: "hidden" }} className="pt-8 pb-6 px-6 text-center">
      <div
        style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 260,
          height: 140,
          background: `radial-gradient(closest-side, ${C.magenta}33, transparent 70%)`,
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 100,
          background: `radial-gradient(closest-side, ${C.cyan}2e, transparent 70%)`,
          filter: "blur(6px)",
        }}
      />
      <div className="flex items-center justify-center gap-2 mb-1 relative">
        <Scissors size={20} style={{ color: C.cyan }} />
        <h1 style={{ ...displayFont, color: C.white, textShadow: `0 0 14px ${C.cyan}66, 0 0 22px ${C.magenta}44` }} className="text-2xl tracking-wide uppercase font-semibold">
          {config.shopName}
        </h1>
      </div>
      {config.tagline && (
        <p style={{ color: C.cyan }} className="text-xs tracking-widest uppercase relative">
          {config.tagline}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flujo de reserva del cliente                                       */
/* ------------------------------------------------------------------ */
function ClientBooking({ config, appointments, onBook, onGoAdmin }) {
  const [step, setStep] = useState(1); // 1 servicio, 2 fecha, 3 hora, 4 datos, 5 confirmado
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null); // Date object
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastAppt, setLastAppt] = useState(null);

  const days = useMemo(() => {
    const arr = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const slots = useMemo(() => {
    if (!service || !date) return [];
    const dow = date.getDay();
    const dayHours = config.hours[dow];
    if (!dayHours || dayHours.closed) return [];
    const openMin = timeToMin(dayHours.open);
    const closeMin = timeToMin(dayHours.close);
    const interval = config.slotInterval || 30;
    const dur = service.duration;
    const dKey = dateKey(date);
    const dayAppts = appointments.filter((a) => a.date === dKey && a.status !== "cancelled");
    const now = new Date();
    const isToday = dateKey(now) === dKey;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const out = [];
    for (let t = openMin; t + dur <= closeMin; t += interval) {
      if (isToday && t <= nowMin) continue;
      const overlap = dayAppts.some((a) => {
        const aStart = timeToMin(a.time);
        const aEnd = aStart + a.duration;
        return t < aEnd && aStart < t + dur;
      });
      if (!overlap) out.push(minToTime(t));
    }
    return out;
  }, [service, date, config, appointments]);

  const resetAll = () => {
    setStep(1);
    setService(null);
    setDate(null);
    setTime(null);
    setName("");
    setPhone("");
    setLastAppt(null);
    setErrorMsg("");
  };

  const confirmBooking = async () => {
    setSubmitting(true);
    setErrorMsg("");
    // re-chequeo rápido de choque antes de guardar
    const dKey = dateKey(date);
    const stillFree = !appointments.some((a) => {
      if (a.date !== dKey || a.status === "cancelled") return false;
      const aStart = timeToMin(a.time);
      const aEnd = aStart + a.duration;
      const tStart = timeToMin(time);
      return tStart < aEnd && aStart < tStart + service.duration;
    });
    if (!stillFree) {
      setErrorMsg("Ese horario se acaba de ocupar. Elige otra hora.");
      setSubmitting(false);
      setStep(3);
      return;
    }
    const appt = {
      id: genId(),
      date: dKey,
      time,
      duration: service.duration,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      clientName: name.trim(),
      clientPhone: phone.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const ok = await onBook([...appointments, appt]);
    setSubmitting(false);
    if (ok) {
      setLastAppt(appt);
      setStep(5);
    } else {
      setErrorMsg("No se pudo guardar la cita. Intenta de nuevo.");
    }
  };

  const waLink = (appt) => {
    if (!config.whatsapp) return null;
    const digits = config.whatsapp.replace(/\D/g, "");
    const d = new Date(appt.date + "T00:00:00");
    const msg = `Hola, soy ${appt.clientName}. Quiero confirmar mi cita en ${config.shopName}:\n• Servicio: ${appt.serviceName}\n• Fecha: ${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}\n• Hora: ${appt.time}\n• Valor: ${formatCOP(appt.price)}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "600px" }} className="flex flex-col">
      <Header config={config} />
      <StripeDivider />

      <div className="flex-1 px-5 py-6 max-w-md w-full mx-auto">
        {/* Paso 1: servicio */}
        {step === 1 && (
          <div>
            <StepTitle icon={<Scissors size={18} />} text="Elige tu servicio" />
            <div className="flex flex-col gap-3 mt-4">
              {config.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setService(s);
                    setStep(2);
                  }}
                  style={{ backgroundColor: C.card, borderColor: C.cardBorder }}
                  className="text-left border rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <p style={{ ...displayFont, color: C.white }} className="text-base uppercase tracking-wide font-semibold">
                      {s.name}
                    </p>
                    <p style={{ color: C.muted }} className="text-xs mt-1">
                      {s.duration} min
                    </p>
                  </div>
                  <span style={{ color: C.cyan, ...displayFont }} className="text-lg font-semibold">
                    {formatCOP(s.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: fecha */}
        {step === 2 && (
          <div>
            <BackBar onBack={() => setStep(1)} label={service?.name} />
            <StepTitle icon={<Calendar size={18} />} text="Elige el día" />
            <div className="grid grid-cols-4 gap-2 mt-4">
              {days.map((d) => {
                const dow = d.getDay();
                const closed = !config.hours[dow] || config.hours[dow].closed;
                const selected = date && dateKey(date) === dateKey(d);
                return (
                  <button
                    key={dateKey(d)}
                    disabled={closed}
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                      setStep(3);
                    }}
                    style={{
                      backgroundColor: selected ? C.magenta : C.card,
                      color: selected ? C.bg : closed ? C.mutedDim : C.white,
                      borderColor: selected ? C.magenta : C.cardBorder,
                      opacity: closed ? 0.5 : 1,
                    }}
                    className="border rounded-lg py-2 flex flex-col items-center"
                  >
                    <span className="text-[10px] uppercase tracking-wide">{DAY_SHORT[dow]}</span>
                    <span style={displayFont} className="text-lg leading-tight font-semibold">{d.getDate()}</span>
                    <span className="text-[9px]">{MONTHS[d.getMonth()]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Paso 3: hora */}
        {step === 3 && (
          <div>
            <BackBar
              onBack={() => setStep(2)}
              label={date ? `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}` : ""}
            />
            <StepTitle icon={<Clock size={18} />} text="Elige la hora" />
            {errorMsg && (
              <p style={{ color: C.red }} className="text-xs mt-2">{errorMsg}</p>
            )}
            {slots.length === 0 ? (
              <p style={{ color: C.muted }} className="text-sm mt-4">
                No hay horarios disponibles ese día. Prueba con otra fecha.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {slots.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTime(t);
                      setStep(4);
                    }}
                    style={{
                      backgroundColor: time === t ? C.cyan : C.card,
                      color: time === t ? C.bg : C.white,
                      borderColor: time === t ? C.cyan : C.cardBorder,
                    }}
                    className="border rounded-lg py-2 text-sm font-medium"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paso 4: datos del cliente */}
        {step === 4 && (
          <div>
            <BackBar onBack={() => setStep(3)} label={time} />
            <StepTitle icon={<User size={18} />} text="Tus datos" />
            <div className="flex flex-col gap-3 mt-4">
              <input
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ backgroundColor: C.card, borderColor: C.cardBorder, color: C.white }}
                className="border rounded-lg px-4 py-3 text-sm outline-none"
              />
              <input
                type="tel"
                placeholder="Número de celular"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ backgroundColor: C.card, borderColor: C.cardBorder, color: C.white }}
                className="border rounded-lg px-4 py-3 text-sm outline-none"
              />

              <div style={{ backgroundColor: C.card, borderColor: C.cardBorder }} className="border rounded-lg p-4 mt-2">
                <p style={{ ...displayFont, color: C.cyan }} className="text-sm uppercase tracking-wide mb-2 font-semibold">Resumen</p>
                <SummaryRow label="Servicio" value={service?.name} />
                <SummaryRow label="Fecha" value={date ? `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}` : ""} />
                <SummaryRow label="Hora" value={time} />
                <SummaryRow label="Valor" value={formatCOP(service?.price)} bold />
              </div>

              {errorMsg && <p style={{ color: C.red }} className="text-xs">{errorMsg}</p>}

              <button
                disabled={!name.trim() || !phone.trim() || submitting}
                onClick={confirmBooking}
                style={{ backgroundColor: C.magenta, color: C.bg, opacity: !name.trim() || !phone.trim() ? 0.5 : 1 }}
                className="rounded-lg py-3 mt-2 flex items-center justify-center gap-2 font-semibold"
              >
                {submitting ? <BarberSpinner size={20} /> : <Check size={18} />}
                {submitting ? "Guardando…" : "Confirmar cita"}
              </button>
            </div>
          </div>
        )}

        {/* Paso 5: confirmación */}
        {step === 5 && lastAppt && (
          <div className="flex flex-col items-center text-center gap-4 pt-6">
            <div style={{ backgroundColor: C.green }} className="rounded-full p-4">
              <Check size={32} color={C.bg} />
            </div>
            <h2 style={{ ...displayFont, color: C.white }} className="text-xl uppercase font-semibold">¡Cita confirmada!</h2>
            <div style={{ backgroundColor: C.card, borderColor: C.cardBorder }} className="border rounded-lg p-4 w-full text-left">
              <SummaryRow label="Servicio" value={lastAppt.serviceName} />
              <SummaryRow label="Fecha" value={(() => { const d = new Date(lastAppt.date + "T00:00:00"); return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; })()} />
              <SummaryRow label="Hora" value={lastAppt.time} />
              <SummaryRow label="Valor" value={formatCOP(lastAppt.price)} bold />
            </div>
            {waLink(lastAppt) ? (
              <a
                href={waLink(lastAppt)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: "#25D366", color: "#08240F" }}
                className="w-full rounded-lg py-3 flex items-center justify-center gap-2 font-semibold"
              >
                <MessageCircle size={18} /> Avisar por WhatsApp
              </a>
            ) : (
              <p style={{ color: C.muted }} className="text-xs">
                Guarda la fecha y hora. El barbero verá tu cita en su panel.
              </p>
            )}
            <button onClick={resetAll} style={{ color: C.cyan }} className="text-sm underline mt-2">
              Reservar otra cita
            </button>
          </div>
        )}
      </div>

      <button onClick={onGoAdmin} style={{ color: C.mutedDim }} className="text-[11px] py-4 text-center">
        Panel del barbero
      </button>
    </div>
  );
}

function StepTitle({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: C.magenta }}>{icon}</span>
      <h2 style={{ ...displayFont, color: C.white }} className="text-lg uppercase tracking-wide font-semibold">{text}</h2>
    </div>
  );
}

function BackBar({ onBack, label }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 mb-3" style={{ color: C.muted }}>
      <ArrowLeft size={14} />
      <span className="text-xs">{label || "Atrás"}</span>
    </button>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span style={{ color: C.muted }} className="text-xs">{label}</span>
      <span style={{ color: bold ? C.cyan : C.white, ...(bold ? displayFont : {}) }} className={`text-sm ${bold ? "text-base font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login del admin (barbero)                                          */
/* ------------------------------------------------------------------ */
function AdminLogin({ config, onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "600px" }} className="flex flex-col items-center justify-center px-6 gap-4">
      <button onClick={onBack} className="self-start flex items-center gap-1" style={{ color: C.cyan }}>
        <ArrowLeft size={14} /> <span className="text-xs">Volver</span>
      </button>
      <Lock size={28} style={{ color: C.magenta }} />
      <h2 style={{ ...displayFont, color: C.white }} className="text-lg uppercase font-semibold">Panel del barbero</h2>
      <input
        type="password"
        placeholder="Contraseña"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }}
        className="border rounded-lg px-4 py-3 text-sm outline-none w-full max-w-xs text-center"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (pw === config.adminPassword) onSuccess();
            else setError("Contraseña incorrecta");
          }
        }}
      />
      {error && <p style={{ color: C.red }} className="text-xs">{error}</p>}
      <button
        onClick={() => {
          if (pw === config.adminPassword) onSuccess();
          else setError("Contraseña incorrecta");
        }}
        style={{ backgroundColor: C.magenta, color: C.bg }}
        className="rounded-lg py-3 w-full max-w-xs font-semibold"
      >
        Entrar
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel del barbero                                                   */
/* ------------------------------------------------------------------ */
function AdminPanel({ config, appointments, setConfig, setAppointments, onExit }) {
  const [tab, setTab] = useState("agenda"); // agenda | settings
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "600px" }} className="flex flex-col">
      <div style={{ backgroundColor: C.bg }} className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={18} style={{ color: C.cyan }} />
          <span style={{ ...displayFont, color: C.white }} className="uppercase tracking-wide font-semibold">Panel</span>
        </div>
        <button onClick={onExit} className="flex items-center gap-1" style={{ color: C.cyan }}>
          <LogOut size={16} /> <span className="text-xs">Salir</span>
        </button>
      </div>
      <StripeDivider />
      <div className="flex" style={{ backgroundColor: C.bg2 }}>
        <TabButton active={tab === "agenda"} onClick={() => setTab("agenda")} icon={<CalendarDays size={16} />} label="Agenda" />
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings size={16} />} label="Ajustes" />
      </div>
      <div className="flex-1 px-5 py-5 max-w-lg w-full mx-auto">
        {tab === "agenda" && (
          <AgendaTab config={config} appointments={appointments} setAppointments={setAppointments} />
        )}
        {tab === "settings" && (
          <SettingsTab config={config} setConfig={setConfig} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{ borderBottomColor: active ? C.magenta : "transparent", color: active ? C.magenta : C.muted }}
      className="flex-1 flex items-center justify-center gap-1 py-3 border-b-2 text-sm font-medium"
    >
      {icon} {label}
    </button>
  );
}

function AgendaTab({ config, appointments, setAppointments }) {
  const [showManual, setShowManual] = useState(false);
  const todayKey = dateKey(new Date());

  const upcoming = useMemo(() => {
    return [...appointments]
      .filter((a) => a.date >= todayKey)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [appointments, todayKey]);

  const grouped = useMemo(() => {
    const map = {};
    upcoming.forEach((a) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [upcoming]);

  const updateStatus = (id, status) => {
    setAppointments(appointments.map((a) => (a.id === id ? { ...a, status } : a)));
  };
  const removeAppt = (id) => {
    setAppointments(appointments.filter((a) => a.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ ...displayFont, color: C.white }} className="text-lg uppercase font-semibold">Próximas citas</h3>
        <button
          onClick={() => setShowManual(true)}
          style={{ backgroundColor: C.magenta, color: C.bg }}
          className="rounded-lg px-3 py-2 text-xs flex items-center gap-1 font-semibold"
        >
          <Plus size={14} /> Manual
        </button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <p style={{ color: C.muted }} className="text-sm">No hay citas próximas.</p>
      )}

      {Object.entries(grouped).map(([d, list]) => {
        const dObj = new Date(d + "T00:00:00");
        return (
          <div key={d} className="mb-5">
            <p style={{ color: C.cyan, ...displayFont }} className="text-sm uppercase tracking-wide mb-2 font-semibold">
              {DAY_NAMES[dObj.getDay()]} {dObj.getDate()} {MONTHS[dObj.getMonth()]}
            </p>
            <div className="flex flex-col gap-2">
              {list.map((a) => (
                <div
                  key={a.id}
                  style={{
                    backgroundColor: C.card,
                    borderColor: C.cardBorder,
                    opacity: a.status === "cancelled" ? 0.5 : 1,
                  }}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <span style={{ ...displayFont, color: C.white }} className="text-base font-semibold">{a.time}</span>
                    <span
                      style={{
                        color:
                          a.status === "done" ? C.green : a.status === "cancelled" ? C.red : C.magenta,
                      }}
                      className="text-[10px] uppercase tracking-wide font-semibold"
                    >
                      {a.status === "done" ? "Realizada" : a.status === "cancelled" ? "Cancelada" : "Confirmada"}
                    </span>
                  </div>
                  <p style={{ color: C.white }} className="text-sm mt-1">{a.serviceName} · {formatCOP(a.price)}</p>
                  <p style={{ color: C.muted }} className="text-xs">{a.clientName} · {a.clientPhone}</p>
                  <div className="flex gap-2 mt-2">
                    {a.status !== "done" && (
                      <IconBtn onClick={() => updateStatus(a.id, "done")} icon={<CheckCircle2 size={14} />} label="Hecha" color={C.green} />
                    )}
                    {a.status !== "cancelled" && (
                      <IconBtn onClick={() => updateStatus(a.id, "cancelled")} icon={<Ban size={14} />} label="Cancelar" color={C.red} />
                    )}
                    <IconBtn onClick={() => removeAppt(a.id)} icon={<Trash2 size={14} />} label="Borrar" color={C.muted} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showManual && (
        <ManualApptModal
          config={config}
          appointments={appointments}
          onClose={() => setShowManual(false)}
          onSave={(appt) => {
            setAppointments([...appointments, appt]);
            setShowManual(false);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({ onClick, icon, label, color }) {
  return (
    <button onClick={onClick} style={{ color, borderColor: C.cardBorder }} className="flex items-center gap-1 text-xs border rounded px-2 py-1" >
      {icon} {label}
    </button>
  );
}

function ManualApptModal({ config, appointments, onClose, onSave }) {
  const [serviceId, setServiceId] = useState(config.services[0]?.id || "");
  const [date, setDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const service = config.services.find((s) => s.id === serviceId);

  const save = () => {
    if (!name.trim() || !service) return;
    onSave({
      id: genId(),
      date,
      time,
      duration: service.duration,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      clientName: name.trim(),
      clientPhone: phone.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50 }}>
      <div style={{ backgroundColor: C.bg2, borderColor: C.cardBorder }} className="border rounded-lg p-5 w-full max-w-sm">
        <h4 style={{ ...displayFont, color: C.white }} className="text-lg uppercase mb-3 font-semibold">Cita manual</h4>
        <div className="flex flex-col gap-2">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm">
            {config.services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
          <input type="text" placeholder="Nombre del cliente" value={name} onChange={(e) => setName(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
          <input type="tel" placeholder="Celular (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} style={{ color: C.white, borderColor: C.cardBorder }} className="flex-1 rounded py-2 text-sm border">Cancelar</button>
          <button onClick={save} style={{ backgroundColor: C.magenta, color: C.bg }} className="flex-1 rounded py-2 text-sm font-semibold">Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ajustes (negocio, horarios, servicios, contraseña)                  */
/* ------------------------------------------------------------------ */
function SettingsTab({ config, setConfig }) {
  const [local, setLocal] = useState(config);
  const [savedFlash, setSavedFlash] = useState(false);
  const [editingService, setEditingService] = useState(null); // {id?, name, duration, price}

  const save = async () => {
    await setConfig(local);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const updateHour = (dow, field, value) => {
    setLocal({
      ...local,
      hours: { ...local.hours, [dow]: { ...local.hours[dow], [field]: value } },
    });
  };

  const saveService = (svc) => {
    let services;
    if (svc.id) {
      services = local.services.map((s) => (s.id === svc.id ? svc : s));
    } else {
      services = [...local.services, { ...svc, id: genId() }];
    }
    setLocal({ ...local, services });
    setEditingService(null);
  };

  const deleteService = (id) => {
    setLocal({ ...local, services: local.services.filter((s) => s.id !== id) });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <section>
        <h3 style={{ ...displayFont, color: C.white }} className="text-base uppercase mb-2 font-semibold">Negocio</h3>
        <div className="flex flex-col gap-2">
          <Labeled label="Nombre">
            <input value={local.shopName} onChange={(e) => setLocal({ ...local, shopName: e.target.value })} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm w-full" />
          </Labeled>
          <Labeled label="Eslogan (opcional)">
            <input value={local.tagline} onChange={(e) => setLocal({ ...local, tagline: e.target.value })} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm w-full" />
          </Labeled>
          <Labeled label="WhatsApp (con indicativo, ej: 573001234567)">
            <input value={local.whatsapp} onChange={(e) => setLocal({ ...local, whatsapp: e.target.value })} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm w-full" />
          </Labeled>
        </div>
      </section>

      <section>
        <h3 style={{ ...displayFont, color: C.white }} className="text-base uppercase mb-2 font-semibold">Horarios</h3>
        <div className="flex flex-col gap-2">
          {DAY_NAMES.map((name, dow) => {
            const h = local.hours[dow];
            return (
              <div key={dow} style={{ backgroundColor: C.card, borderColor: C.cardBorder }} className="border rounded-lg p-3 flex items-center gap-2 flex-wrap">
                <span style={{ color: C.white }} className="text-sm w-20">{name}</span>
                <label className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                  <input type="checkbox" checked={!h.closed} onChange={(e) => updateHour(dow, "closed", !e.target.checked)} />
                  Abierto
                </label>
                {!h.closed && (
                  <>
                    <input type="time" value={h.open} onChange={(e) => updateHour(dow, "open", e.target.value)} style={{ backgroundColor: C.bg2, color: C.white, borderColor: C.cardBorder }} className="border rounded px-2 py-1 text-xs" />
                    <span className="text-xs" style={{ color: C.muted }}>a</span>
                    <input type="time" value={h.close} onChange={(e) => updateHour(dow, "close", e.target.value)} style={{ backgroundColor: C.bg2, color: C.white, borderColor: C.cardBorder }} className="border rounded px-2 py-1 text-xs" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ ...displayFont, color: C.white }} className="text-base uppercase font-semibold">Servicios</h3>
          <button onClick={() => setEditingService({ name: "", duration: 30, price: 0 })} style={{ backgroundColor: C.magenta, color: C.bg }} className="rounded px-3 py-1 text-xs flex items-center gap-1 font-semibold">
            <Plus size={14} /> Añadir
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {local.services.map((s) => (
            <div key={s.id} style={{ backgroundColor: C.card, borderColor: C.cardBorder }} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p style={{ color: C.white }} className="text-sm font-medium">{s.name}</p>
                <p style={{ color: C.muted }} className="text-xs">{s.duration} min · {formatCOP(s.price)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingService(s)} style={{ color: C.cyan }}><Pencil size={16} /></button>
                <button onClick={() => deleteService(s.id)} style={{ color: C.red }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {local.services.length === 0 && <p style={{ color: C.muted }} className="text-xs">Añade al menos un servicio.</p>}
        </div>
      </section>

      <section>
        <h3 style={{ ...displayFont, color: C.white }} className="text-base uppercase mb-2 font-semibold">Seguridad</h3>
        <Labeled label="Contraseña del panel">
          <input value={local.adminPassword} onChange={(e) => setLocal({ ...local, adminPassword: e.target.value })} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm w-full" />
        </Labeled>
        <p style={{ color: C.mutedDim }} className="text-[11px] mt-1">
          Esta contraseña es solo un filtro básico para que clientes casuales no entren al panel — no la uses para datos sensibles.
        </p>
      </section>

      <button onClick={save} style={{ backgroundColor: C.magenta, color: C.bg }} className="rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
        {savedFlash ? <Check size={18} /> : null} {savedFlash ? "Guardado" : "Guardar cambios"}
      </button>

      {editingService && (
        <ServiceModal service={editingService} onClose={() => setEditingService(null)} onSave={saveService} />
      )}
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ color: C.muted }} className="text-xs">{label}</span>
      {children}
    </div>
  );
}

function ServiceModal({ service, onClose, onSave }) {
  const [name, setName] = useState(service.name);
  const [duration, setDuration] = useState(service.duration);
  const [price, setPrice] = useState(service.price);
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50 }}>
      <div style={{ backgroundColor: C.bg2, borderColor: C.cardBorder }} className="border rounded-lg p-5 w-full max-w-sm">
        <h4 style={{ ...displayFont, color: C.white }} className="text-lg uppercase mb-3 font-semibold">
          {service.id ? "Editar servicio" : "Nuevo servicio"}
        </h4>
        <div className="flex flex-col gap-2">
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
          <input type="number" placeholder="Duración (min)" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
          <input type="number" placeholder="Precio (COP)" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ backgroundColor: C.card, color: C.white, borderColor: C.cardBorder }} className="border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} style={{ color: C.white, borderColor: C.cardBorder }} className="flex-1 rounded py-2 text-sm border">Cancelar</button>
          <button
            onClick={() => onSave({ ...service, name, duration, price })}
            style={{ backgroundColor: C.magenta, color: C.bg }}
            className="flex-1 rounded py-2 text-sm font-semibold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}