import React, { useState, useMemo } from "react";
import { Scissors, Calendar, Clock, User, Check, MessageCircle, ArrowLeft } from "lucide-react";
import { Header } from "./Header";

const pad = (n) => n.toString().padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeToMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const formatCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function ClientBooking({ config, appointments, onBookOptimistic, onGoAdmin }) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lastAppt, setLastAppt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

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

  // Filtro de slots disponibles
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
    setStep(1); setService(null); setDate(null); setTime(null);
    setName(""); setPhone(""); setLastAppt(null); setErrorMsg("");
  };

  const handleConfirm = () => {
    setErrorMsg("");
    const dKey = dateKey(date);

    const isOccupied = appointments.some((a) => {
      if (a.date !== dKey || a.status === "cancelled") return false;
      const aStart = timeToMin(a.time);
      const aEnd = aStart + a.duration;
      const tStart = timeToMin(time);
      return tStart < aEnd && aStart < tStart + service.duration;
    });

    if (isOccupied) {
      setErrorMsg("Ese horario ya fue reservado. Por favor, selecciona otro.");
      setStep(3);
      return;
    }

    const newAppt = {
      date: dKey,
      time,
      duration: service.duration,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      clientName: name.trim(),
      clientPhone: phone.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    setLastAppt(newAppt);
    setStep(5);
    onBookOptimistic(newAppt);
  };

  const getWaLink = (appt) => {
    if (!config.whatsapp) return null;
    const digits = config.whatsapp.replace(/\D/g, "");
    const d = new Date(appt.date + "T00:00:00");
    const msg = `Hola, mi nombre es *${appt.clientName}*. Confirmo mi reserva en *${config.shopName}*:\n\n` +
      `✂️ *Servicio:* ${appt.serviceName}\n` +
      `📅 *Fecha:* ${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}\n` +
      `⏰ *Hora:* ${appt.time}\n` +
      `💰 *Valor:* ${formatCOP(appt.price)}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="flex flex-col">
      <Header config={config} />

      <div className="md:grid md:grid-cols-[1fr_280px]">
        <div className="px-6 md:px-8 py-6">
          {step <= 4 && (
            <div className="flex items-center gap-1.5 mb-6">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? "w-6 barber-gradient" : s < step ? "w-2 bg-[#4EE9E3]" : "w-2 bg-[#242429]"
                  }`}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <StepHeader icon={<Scissors size={18} />} title="Elige tu servicio" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {config.services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setService(s); setStep(2); }}
                    className="text-left bg-[#101015] border border-[#242429] hover:border-[#34343C] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[#F2F3F7] font-semibold text-base">{s.name}</span>
                      <span className="text-[#8B8FA3] text-xs">{s.duration} min</span>
                    </div>
                    <span className="font-display text-[#4EE9E3] font-semibold text-lg">{formatCOP(s.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <BackButton onBack={() => setStep(1)} label={service?.name} />
              <StepHeader icon={<Calendar size={18} />} title="Elige la fecha" />
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-4 notranslate">
                {days.map((d) => {
                  const dow = d.getDay();
                  const closed = !config.hours[dow] || config.hours[dow].closed;
                  const selected = date && dateKey(date) === dateKey(d);
                  return (
                    <button
                      key={dateKey(d)}
                      disabled={closed}
                      onClick={() => { setDate(d); setTime(null); setStep(3); }}
                      className={`border rounded-xl py-2.5 flex flex-col items-center transition-all ${
                        selected ? "barber-gradient text-[#0B0B0E] font-bold border-transparent" : "bg-[#101015] border-[#242429] text-[#F2F3F7]"
                      } ${closed ? "opacity-30 cursor-not-allowed" : "hover:border-[#34343C]"}`}
                    >
                      <span className="text-[10px] uppercase opacity-80 font-bold">{DAY_SHORT[dow]}</span>
                      <span className="font-display text-lg font-semibold leading-tight">{d.getDate()}</span>
                      <span className="text-[9px] opacity-80">{MONTHS[d.getMonth()]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <BackButton onBack={() => setStep(2)} label={date ? `${DAY_SHORT[date.getDay()]} ${date.getDate()}` : ""} />
              <StepHeader icon={<Clock size={18} />} title="Elige el horario" />
              {errorMsg && <p className="text-[#F16565] text-xs mt-2">{errorMsg}</p>}
              {slots.length === 0 ? (
                <p className="text-[#8B8FA3] text-sm mt-4">No hay horarios disponibles para esta fecha.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                  {slots.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTime(t); setStep(4); }}
                      className={`border rounded-xl py-2.5 text-sm font-medium transition-all ${
                        time === t ? "barber-gradient text-[#0B0B0E] font-bold border-transparent" : "bg-[#101015] border-[#242429] text-[#F2F3F7] hover:border-[#34343C]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <BackButton onBack={() => setStep(3)} label={time} />
              <StepHeader icon={<User size={18} />} title="Tus Datos" />
              <div className="flex flex-col gap-3 mt-4 max-w-sm">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#101015] border border-[#242429] focus:border-[#4EE9E3] text-[#F2F3F7] rounded-xl px-4 py-3 text-sm outline-none"
                />
                <input
                  type="tel"
                  placeholder="Número de celular"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[#101015] border border-[#242429] focus:border-[#4EE9E3] text-[#F2F3F7] rounded-xl px-4 py-3 text-sm outline-none"
                />

                <button
                  disabled={!name.trim() || !phone.trim()}
                  onClick={handleConfirm}
                  className="barber-gradient text-[#0B0B0E] font-semibold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Check size={18} /> Confirmar Cita
                </button>
              </div>
            </div>
          )}

          {step === 5 && lastAppt && (
            <div className="flex flex-col items-start gap-4">
              <div className="barber-gradient rounded-full p-3 text-[#0B0B0E]">
                <Check size={28} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#F2F3F7]">¡Cita Registrada!</h2>
                <p className="text-[#8B8FA3] text-sm">Tu espacio ha sido asegurado con éxito.</p>
              </div>

              <div className="bg-[#101015] border border-[#242429] rounded-2xl p-4 w-full max-w-sm flex flex-col gap-2">
                <SummaryRow label="Servicio" value={lastAppt.serviceName} />
                <SummaryRow label="Fecha" value={lastAppt.date} />
                <SummaryRow label="Hora" value={lastAppt.time} />
                <SummaryRow label="Cliente" value={lastAppt.clientName} />
                <SummaryRow label="Valor" value={formatCOP(lastAppt.price)} highlight />
              </div>

              {getWaLink(lastAppt) && (
                <a
                  href={getWaLink(lastAppt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-sm bg-[#25D366] text-[#08240F] rounded-xl py-3 flex items-center justify-center gap-2 font-semibold shadow-md"
                >
                  <MessageCircle size={18} /> Confirmar por WhatsApp
                </a>
              )}

              <button onClick={resetAll} className="text-[#4EE9E3] text-sm underline mt-2">
                Realizar otra reserva
              </button>
            </div>
          )}
        </div>

        {/* Panel lateral de resumen (Desktop) */}
        {step <= 4 && (
          <aside className="hidden md:flex md:flex-col border-l border-[#242429] bg-[#101015] px-6 py-8">
            <span className="text-[11px] uppercase tracking-wider text-[#54566A] font-semibold mb-4">Resumen</span>
            <div className="flex flex-col gap-2">
              <SummaryRow label="Servicio" value={service?.name || "—"} />
              <SummaryRow label="Fecha" value={date ? `${date.getDate()} ${MONTHS[date.getMonth()]}` : "—"} />
              <SummaryRow label="Hora" value={time || "—"} />
              {service?.price != null && <SummaryRow label="Valor" value={formatCOP(service.price)} highlight />}
            </div>
          </aside>
        )}
      </div>

      <button onClick={onGoAdmin} className="text-[#54566A] hover:text-[#8B8FA3] text-xs py-4 text-center border-t border-[#242429]">
        Acceso Administrador
      </button>
    </div>
  );
}

function StepHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 text-[#D946CE]">
      {icon}
      <h2 className="font-display text-[#F2F3F7] text-lg font-semibold">{title}</h2>
    </div>
  );
}

function BackButton({ onBack, label }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-[#8B8FA3] hover:text-[#F2F3F7] text-xs mb-3 notranslate">
      <ArrowLeft size={14} /> <span>{label || "Volver"}</span>
    </button>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-[#8B8FA3]">{label}</span>
      <span className={highlight ? "font-display text-[#4EE9E3] font-bold text-sm" : "text-[#F2F3F7] font-medium"}>
        {value}
      </span>
    </div>
  );
}
