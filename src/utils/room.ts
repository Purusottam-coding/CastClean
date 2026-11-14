const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a clean 6-character room code (e.g. K7M9P2)
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return code;
}

/**
 * Prefix a 6-character room code with castclean- for PeerJS broker lookup
 */
export function getHostPeerId(roomCode: string): string {
  const cleanCode = sanitizeRoomCode(roomCode);
  return `castclean-${cleanCode}`;
}

/**
 * Generate a unique viewer peer ID
 */
export function generateViewerPeerId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `castclean-v-${rand}`;
}

/**
 * Sanitize user input room code
 */
export function sanitizeRoomCode(input: string): string {
  let code = input.trim().toUpperCase();
  if (code.startsWith('CASTCLEAN-')) {
    code = code.replace('CASTCLEAN-', '');
  }
  return code.replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * Build shareable room URL
 */
export function getRoomShareUrl(roomCode: string): string {
  const clean = sanitizeRoomCode(roomCode);
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?room=${clean}`;
}
