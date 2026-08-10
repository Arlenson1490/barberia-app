import React from "react";
import { Scissors } from "lucide-react";

export function Header({ config }) {
  return (
    <header className="pt-8 pb-6 px-6 md:px-10 text-center md:text-left border-b border-[#242429]">
      <div className="flex items-center justify-center md:justify-start gap-3">
        <div className="barber-gradient w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md">
          <Scissors size={18} className="text-[#0B0B0E]" />
        </div>
        <div>
          <h1 className="font-display text-xl md:text-2xl tracking-wide font-semibold leading-none text-[#F2F3F7]">
            {config.shopName}
          </h1>
          {config.tagline && (
            <p className="text-[#8B8FA3] text-[11px] tracking-[0.18em] uppercase mt-1">
              {config.tagline}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

export function BarberSpinner({ size = 36 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border-3 border-[#34343C] border-t-[#4EE9E3] border-r-[#D946CE] animate-barber-spin"
    />
  );
}