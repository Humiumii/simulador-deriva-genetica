import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
export const generationInterval = 360;
export const exchangeDuration = 290;

function subscribe(listener: () => void) {
  const preference = window.matchMedia(query);
  preference.addEventListener('change', listener);
  return () => preference.removeEventListener('change', listener);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export function supportsWebGL() {
  try {
    const context = document.createElement('canvas').getContext('webgl2', { powerPreference: 'low-power' });
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}
