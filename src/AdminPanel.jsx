import React, { useState, useMemo } from "react";
import { CalendarDays, Settings, LogOut, CheckCircle2, Ban, Trash2, Lock, ArrowLeft, Save } from "lucide-react";
import { updateCitaStatus, deleteCita, updateConfigAsync } from "./firestoreService";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function AdminLogin({ config, onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (pw === config.adminPassword) onSuccess();
    else setError("Contraseña incorrecta");
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 max-w-xs mx-auto gap-4">
      <button onClick={onBack} className="self-start flex items-center gap-1 text-[#4EE9E3] text-xs">
        <ArrowLeft size={14} /> Volver
      </button>
      <div className="barber-gradient p-3 rounded-2xl text-[#0B0B0E]">
        <Lock size={22} />
      </div>
      <h2 className="font-display text-lg font-semibold text-[#F2F3F7]">Panel del Barbero</h2>
      <input
        type="password"
        placeholder="Contraseña"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        className="bg-[#101015] border border-[#242429] text-[#F2F3F7] rounded-xl px-4 py-3 text-sm outline-none w-full text-center"
      />
      {error && <p className="text-[#F16565] text-xs">{error}</p>}
      <button onClick={handleLogin} className="barber-gradient text-[#0B0B0E] font-semibold rounded-xl py-3 w-full">
        Ingresar
      </button>
    </div>
  );
}

export function AdminPanel({ config, appointments, setConfig, onExit }) {
  const [tab, setTab] = useState("agenda");

  return (
    <div className="md:grid md:grid-cols-[200px_1fr] md:min-h-[550px]">
      <aside className="border-r border-[#242429] bg-[#101015] p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-display font-bold text-[#F2F3F7] px-2 py-2">Administración</span>
          <button
            onClick={() => setTab("agenda")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              tab === "agenda" ? "bg-[#15151B] text-[#F2F3F7] border border-[#242429]" : "text-[#8B8FA3]"
            }`}
          >
            <CalendarDays size={16} /> Agenda
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
              tab === "settings" ? "bg-[#15151B] text-[#F2F3F7] border border-[#242429]" : "text-[#8B8FA3]"
            }`}
          >
            <Settings size={16} /> Ajustes
          </button>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 px-3 py-2 text-[#F16565] text-sm mt-4">
          <LogOut size={16} /> Salir
        </button>
      </aside>

      <main className="p-6">
        {tab === "agenda" ? (
          <AgendaTab appointments={appointments} />
        ) : (
          <SettingsTab config={config} setConfig={setConfig} />
        )}
      </main>
    </div>
  );
}

function AgendaTab({ appointments }) {
  const grouped = useMemo(() => {
    const map = {};
    const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    sorted.forEach((a) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appointments]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-xl font-bold text-[#F2F3F7]">Próximas Citas</h2>
      {Object.keys(grouped).length === 0 ? (
        <p className="text-[#8B8FA3] text-sm">No hay citas agendadas.</p>
      ) : (
        Object.entries(grouped).map(([date, list]) => (
          <div key={date} className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#4EE9E3]">{date}</span>
            {list.map((item) => (
              <div
                key={item.id}
                className="bg-[#101015] border border-[#242429] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F2F3F7] text-sm">{item.time}</span>
                    <span className="text-xs text-[#8B8FA3]">({item.serviceName})</span>
                  </div>
                  <p className="text-xs text-[#54566A]">{item.clientName} • {item.clientPhone}</p>
                </div>

                <div className="flex items-center gap-1">
                  {item.status !== "done" && (
                    <button
                      onClick={() => updateCitaStatus(item.id, "done")}
                      title="Marcar Realizada"
                      className="p-1.5 text-[#34D399] hover:bg-[#15151B] rounded-lg"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  {item.status !== "cancelled" && (
                    <button
                      onClick={() => updateCitaStatus(item.id, "cancelled")}
                      title="Cancelar Cita"
                      className="p-1.5 text-[#F16565] hover:bg-[#15151B] rounded-lg"
                    >
                      <Ban size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteCita(item.id)}
                    title="Eliminar Registro"
                    className="p-1.5 text-[#8B8FA3] hover:text-[#F16565] hover:bg-[#15151B] rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function SettingsTab({ config, setConfig }) {
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggleClosed = (index) => {
    setForm((prev) => {
      const currentHours = prev.hours || {};
      const dayHours = currentHours[index] || { open: "08:00", close: "19:00", closed: false };
      return {
        ...prev,
        hours: {
          ...currentHours,
          [index]: {
            ...dayHours,
            closed: !dayHours.closed
          }
        }
      };
    });
  };

  const handleTimeChange = (index, field, value) => {
    setForm((prev) => {
      const currentHours = prev.hours || {};
      const dayHours = currentHours[index] || { open: "08:00", close: "19:00", closed: false };
      return {
        ...prev,
        hours: {
          ...currentHours,
          [index]: {
            ...dayHours,
            [field]: value
          }
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    if (typeof setConfig === "function") {
      setConfig(form);
    }
    await updateConfigAsync(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl pb-10">
      <h2 className="font-display text-xl font-bold text-[#F2F3F7]">Ajustes del Negocio</h2>

      {/* Información General */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-[#4EE9E3] uppercase tracking-wider">Información General</span>
        
        <label className="text-xs text-[#8B8FA3]">Nombre del negocio
          <input
            type="text"
            value={form.shopName || ""}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className="bg-[#101015] border border-[#242429] text-[#F2F3F7] rounded-xl px-3 py-2 text-sm w-full mt-1 outline-none focus:border-[#4EE9E3]"
          />
        </label>

        <label className="text-xs text-[#8B8FA3]">Eslogan
          <input
            type="text"
            value={form.tagline || ""}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="bg-[#101015] border border-[#242429] text-[#F2F3F7] rounded-xl px-3 py-2 text-sm w-full mt-1 outline-none focus:border-[#4EE9E3]"
          />
        </label>

        <label className="text-xs text-[#8B8FA3]">WhatsApp (Ej: 573001234567)
          <input
            type="text"
            value={form.whatsapp || ""}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            className="bg-[#101015] border border-[#242429] text-[#F2F3F7] rounded-xl px-3 py-2 text-sm w-full mt-1 outline-none focus:border-[#4EE9E3]"
          />
        </label>

        <label className="text-xs text-[#8B8FA3]">Contraseña Admin
          <input
            type="password"
            value={form.adminPassword || ""}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
            className="bg-[#101015] border border-[#242429] text-[#F2F3F7] rounded-xl px-3 py-2 text-sm w-full mt-1 outline-none focus:border-[#4EE9E3]"
          />
        </label>
      </div>

      {/* Horarios de Atención */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-[#4EE9E3] uppercase tracking-wider">Días y Horarios de Atención</span>
        
        <div className="flex flex-col gap-2">
          {DAY_NAMES.map((dayName, index) => {
            const dayConfig = (form.hours && form.hours[index]) || { open: "08:00", close: "19:00", closed: false };
            
            return (
              <div
                key={dayName}
                className="bg-[#101015] border border-[#242429] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day-${index}`}
                    checked={!dayConfig.closed}
                    onChange={() => handleToggleClosed(index)}
                    className="accent-[#4EE9E3] w-4 h-4 rounded cursor-pointer"
                  />
                  <label htmlFor={`day-${index}`} className="text-sm font-semibold text-[#F2F3F7] cursor-pointer select-none">
                    {dayName}
                  </label>
                </div>

                {!dayConfig.closed ? (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={dayConfig.open || "08:00"}
                      onChange={(e) => handleTimeChange(index, "open", e.target.value)}
                      className="bg-[#15151B] border border-[#242429] text-[#F2F3F7] px-2 py-1.5 rounded-lg outline-none focus:border-[#4EE9E3]"
                    />
                    <span className="text-[#8B8FA3]">a</span>
                    <input
                      type="time"
                      value={dayConfig.close || "19:00"}
                      onChange={(e) => handleTimeChange(index, "close", e.target.value)}
                      className="bg-[#15151B] border border-[#242429] text-[#F2F3F7] px-2 py-1.5 rounded-lg outline-none focus:border-[#4EE9E3]"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-[#F16565] font-medium italic px-2">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="barber-gradient text-[#0B0B0E] font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
      >
        <Save size={16} />
        {saving ? "Guardando cambios..." : saved ? "¡Ajustes Guardados!" : "Guardar Cambios"}
      </button>
    </div>
  );
}