import React from 'react';

interface XRayLogoProps {
  className?: string;
  size?: number;
}

export const XRayLogo: React.FC<XRayLogoProps> = ({ className = 'w-9 h-9', size = 36 }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-xl overflow-hidden shadow-lg border border-cyan-400/50 bg-[#040d1a] flex items-center justify-center shrink-0 group ${className}`}
      title="Laudo.wav - Transcrição Radiológica de Raio-X e Tomografia"
    >
      {/* Deep blue radiograph illumination gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c2e59] via-[#041326] to-[#020813] opacity-90" />
      
      {/* Backlight halo glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35)_0%,transparent_75%)]" />

      {/* SVG Skeletal Ribcage & Vertebrae Radiograph */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full p-1 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
      >
        {/* Soft Lung field radiolucency (darker blue) */}
        <path
          d="M10 14C10 9 17 8 20 12C20 19 19 28 12 30C9 30 10 21 10 14Z"
          fill="#061f3d"
          fillOpacity="0.8"
        />
        <path
          d="M38 14C38 9 31 8 28 12C28 19 29 28 36 30C39 30 38 21 38 14Z"
          fill="#061f3d"
          fillOpacity="0.8"
        />

        {/* Central Vertebral Column (Thoracic Spine) - radiopaque bone density */}
        <line x1="24" y1="6" x2="24" y2="40" stroke="#f0f9ff" strokeWidth="2.4" strokeLinecap="round" />
        {/* Vertebral bodies */}
        <circle cx="24" cy="10" r="1.5" fill="#e0f2fe" />
        <circle cx="24" cy="15" r="1.6" fill="#e0f2fe" />
        <circle cx="24" cy="20" r="1.7" fill="#e0f2fe" />
        <circle cx="24" cy="25" r="1.8" fill="#e0f2fe" />
        <circle cx="24" cy="30" r="1.9" fill="#e0f2fe" />
        <circle cx="24" cy="35" r="2" fill="#e0f2fe" />

        {/* Clavicles (collar bones) */}
        <path
          d="M12 9C16 11 20 12 24 10C28 12 32 11 36 9"
          stroke="#f8fafc"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Ribs (Costelas bilaterais) */}
        {/* Pair 1 */}
        <path d="M23 13C18 13 13 15 11 18" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M25 13C30 13 35 15 37 18" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />

        {/* Pair 2 */}
        <path d="M23 18C16 18 11 21 9 25" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M25 18C32 18 37 21 39 25" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" />

        {/* Pair 3 */}
        <path d="M23 23C15 24 11 28 8 32" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M25 23C33 24 37 28 40 32" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" />

        {/* Pair 4 */}
        <path d="M23 28C17 30 12 34 10 38" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M25 28C31 30 36 34 38 38" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />

        {/* Cardiac Silhouette / Coração */}
        <ellipse
          cx="22"
          cy="27"
          rx="5"
          ry="6"
          fill="#bae6fd"
          fillOpacity="0.35"
        />

        {/* Radiographic X-Ray Beam crosshair markers */}
        <line x1="2" y1="24" x2="5" y2="24" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="43" y1="24" x2="46" y2="24" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="24" y1="2" x2="24" y2="5" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="24" y1="43" x2="24" y2="46" stroke="#38bdf8" strokeWidth="1.2" />

        {/* Film Marker: R (Right / Direita) in top corner */}
        <text
          x="38"
          y="11"
          fill="#38bdf8"
          fontSize="5.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          R
        </text>
      </svg>

      {/* Top film holder clip */}
      <div className="absolute top-0 inset-x-3 h-1 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-b shadow-sm z-20" />
    </div>
  );
};
