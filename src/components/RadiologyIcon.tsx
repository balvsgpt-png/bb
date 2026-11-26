import React from 'react';

interface RadiologyIconProps {
  className?: string;
  size?: number;
}

export const RadiologyIcon: React.FC<RadiologyIconProps> = ({ className = 'w-6 h-6', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Film Cassette Outline */}
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      {/* Thoracic Spine / Vertebral Column */}
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Ribs (Costelas) Bilateral */}
      <path d="M12 7C9 7 6 8.5 5 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M12 7C15 7 18 8.5 19 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M12 11C8 11 5.5 13 5 15.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M12 11C16 11 18.5 13 19 15.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      {/* Clavicles */}
      <path d="M6 5.5C9 7 11 7 12 6C13 7 15 7 18 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Film clip top */}
      <line x1="9" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
