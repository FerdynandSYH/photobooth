import React from 'react';

/**
 * GoPhotobooth Brand Logo Component
 * Renders the clean transparent editorial logo.
 * Supports Tailwind colors via currentColor (e.g. text-stone-900, text-white).
 */
export default function Logo({ className = 'h-8 w-auto', variant = 'default', ...props }) {
  if (variant === 'white') {
    return (
      <img
        src="/logo-white.png"
        alt="GoPhotobooth"
        className={`object-contain ${className}`}
        {...props}
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="GoPhotobooth"
      className={`object-contain ${className}`}
      {...props}
    />
  );
}
