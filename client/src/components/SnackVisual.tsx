/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface SnackVisualProps {
  name: string;
  category?: string;
  imageUrl?: string;
  className?: string;
}

export const SnackVisual: React.FC<SnackVisualProps> = ({
  name,
  category,
  imageUrl,
  className = 'w-full h-44',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // If external or custom image URL is valid and hasn't errored
  if (imageUrl && !imageFailed) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
        <img
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  const lowerName = name.toLowerCase();
  const lowerCat = (category || '').toLowerCase();

  // Determine appropriate thematic visual illustration based on snack name
  if (lowerName.includes('chip') || lowerName.includes('crisp') || lowerName.includes('wafer')) {
    return (
      <div className={`relative overflow-hidden bg-amber-50/70 border-b border-slate-100 flex items-center justify-center p-6 ${className}`}>
        <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" fill="none">
          {/* Snack Bag */}
          <rect x="28" y="24" width="64" height="74" rx="8" fill="#F59E0B" fillOpacity="0.9" />
          <path d="M28 32 C40 36, 80 36, 92 32" stroke="#D97706" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M28 86 C40 82, 80 82, 92 86" stroke="#D97706" strokeWidth="2" strokeDasharray="3 3" />
          {/* Bag Foil Fold & Badge */}
          <circle cx="60" cy="58" r="16" fill="#FEF3C7" />
          <path d="M52 56 Q60 50 68 56 Q64 66 52 56" fill="#F59E0B" />
          {/* Individual Chip */}
          <path d="M78 82 C88 78, 96 86, 92 94 C86 98, 76 90, 78 82 Z" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  if (lowerName.includes('peanut') || lowerName.includes('nut') || lowerName.includes('almond') || lowerName.includes('cashew')) {
    return (
      <div className={`relative overflow-hidden bg-orange-50/70 border-b border-slate-100 flex items-center justify-center p-6 ${className}`}>
        <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" fill="none">
          {/* Snack Bowl */}
          <ellipse cx="60" cy="80" rx="38" ry="18" fill="#E2E8F0" />
          <ellipse cx="60" cy="74" rx="38" ry="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          {/* Spiced Peanuts in Bowl */}
          <ellipse cx="48" cy="70" rx="9" ry="6" transform="rotate(-15 48 70)" fill="#EA580C" />
          <ellipse cx="62" cy="68" rx="8" ry="6" transform="rotate(20 62 68)" fill="#C2410C" />
          <ellipse cx="72" cy="72" rx="9" ry="5" transform="rotate(-10 72 72)" fill="#9A3412" />
          <ellipse cx="55" cy="75" rx="7" ry="5" transform="rotate(5 55 75)" fill="#EA580C" />
          {/* Floating Spiced Nut */}
          <ellipse cx="60" cy="42" rx="14" ry="10" transform="rotate(-15 60 42)" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
          <path d="M53 42 Q60 45 67 42" stroke="#7C2D12" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    );
  }

  if (lowerName.includes('choco') || lowerName.includes('bar') || lowerName.includes('candy') || lowerName.includes('sweet')) {
    return (
      <div className={`relative overflow-hidden bg-stone-100/80 border-b border-slate-100 flex items-center justify-center p-6 ${className}`}>
        <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" fill="none">
          {/* Chocolate Bar Wrapper */}
          <rect x="36" y="24" width="48" height="72" rx="4" fill="#3B2F2F" />
          {/* Chocolate segments */}
          <rect x="42" y="30" width="16" height="18" rx="2" fill="#543D2B" stroke="#291E13" strokeWidth="1" />
          <rect x="62" y="30" width="16" height="18" rx="2" fill="#543D2B" stroke="#291E13" strokeWidth="1" />
          <rect x="42" y="52" width="16" height="18" rx="2" fill="#543D2B" stroke="#291E13" strokeWidth="1" />
          <rect x="62" y="52" width="16" height="18" rx="2" fill="#543D2B" stroke="#291E13" strokeWidth="1" />
          {/* Gold foil peel */}
          <path d="M36 74 L84 74 L84 96 L36 96 Z" fill="#E2E8F0" />
          <path d="M36 74 L60 62 L84 74 Z" fill="#F59E0B" fillOpacity="0.8" />
        </svg>
      </div>
    );
  }

  if (lowerName.includes('soda') || lowerName.includes('drink') || lowerName.includes('juice') || lowerName.includes('cola') || lowerCat.includes('beverage')) {
    return (
      <div className={`relative overflow-hidden bg-emerald-50/70 border-b border-slate-100 flex items-center justify-center p-6 ${className}`}>
        <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" fill="none">
          {/* Chilled Beverage Can */}
          <rect x="42" y="26" width="36" height="68" rx="6" fill="#059669" />
          <ellipse cx="60" cy="28" rx="18" ry="5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
          <ellipse cx="60" cy="92" rx="18" ry="4" fill="#047857" />
          {/* Can stripe */}
          <path d="M42 48 Q60 56 78 48 L78 68 Q60 76 42 68 Z" fill="#10B981" />
          {/* Pull tab */}
          <ellipse cx="60" cy="27" rx="6" ry="2.5" fill="#64748B" />
          {/* Condensation droplets */}
          <circle cx="50" cy="40" r="1.5" fill="#FFFFFF" fillOpacity="0.6" />
          <circle cx="70" cy="60" r="1.5" fill="#FFFFFF" fillOpacity="0.6" />
          <circle cx="52" cy="74" r="1.5" fill="#FFFFFF" fillOpacity="0.6" />
        </svg>
      </div>
    );
  }

  // Nachos / Popcorn / Savory generic
  return (
    <div className={`relative overflow-hidden bg-slate-100/80 border-b border-slate-100 flex items-center justify-center p-6 ${className}`}>
      <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" fill="none">
        {/* Snack Box */}
        <polygon points="34,44 86,44 78,94 42,94" fill="#DC2626" />
        <polygon points="34,44 86,44 82,38 38,38" fill="#EF4444" />
        {/* Box stripes */}
        <line x1="48" y1="44" x2="52" y2="94" stroke="#FFFFFF" strokeWidth="4" />
        <line x1="68" y1="44" x2="64" y2="94" stroke="#FFFFFF" strokeWidth="4" />
        {/* Crispy pieces popping out */}
        <polygon points="48,34 56,22 62,32" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
        <circle cx="68" cy="28" r="7" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
        <polygon points="62,38 74,26 80,36" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      </svg>
    </div>
  );
};
