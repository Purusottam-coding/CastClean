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
 * Sanitize user input room code or extract room code from pasted invite URL
 */
export function sanitizeRoomCode(input: string): string {
  if (!input) return '';
  const str = input.trim();

  // If the user pasted a URL or query string containing ?room= or &room=
  const roomParamMatch = str.match(/[?&]room=([A-Za-z0-9_-]+)/i);
  if (roomParamMatch && roomParamMatch[1]) {
    let code = roomParamMatch[1].toUpperCase();
    if (code.startsWith('CASTCLEAN-')) {
      code = code.replace('CASTCLEAN-', '');
    }
    return code.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  // If a URL was pasted without query param (e.g. https://.../K7M9P2 or localhost:5173/K7M9P2)
  if (str.includes('http://') || str.includes('https://') || str.includes('localhost') || str.includes('/')) {
    try {
      const url = new URL(str.startsWith('http') ? str : `http://${str}`);
      const param = url.searchParams.get('room');
      if (param) {
        let code = param.trim().toUpperCase();
        if (code.startsWith('CASTCLEAN-')) code = code.replace('CASTCLEAN-', '');
        return code.replace(/[^A-Z0-9]/g, '').slice(0, 8);
      }
      const parts = url.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) {
        let code = last.trim().toUpperCase();
        if (code.startsWith('CASTCLEAN-')) code = code.replace('CASTCLEAN-', '');
        const clean = code.replace(/[^A-Z0-9]/g, '');
        if (clean.length >= 4 && clean.length <= 8) {
          return clean;
        }
      }
    } catch {
      // Fallback
    }
  }

  let code = str.toUpperCase();
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
