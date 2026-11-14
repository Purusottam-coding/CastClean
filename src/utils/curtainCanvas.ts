/**
 * Produces a clean 1080p standby video track for Privacy Curtain mode.
 * Runs at 1-2 fps to eliminate unnecessary host CPU/GPU overhead while
 * keeping the WebRTC RTP video pipeline alive without decoder stall.
 */
export class PrivacyCurtainStream {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timer: number | null = null;
  private stream: MediaStream | null = null;
  public track: MediaStreamTrack | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;

    this.render();
    // 2 fps is optimal for a static privacy slate - zero CPU waste
    this.stream = this.canvas.captureStream(2);
    this.track = this.stream.getVideoTracks()[0] || null;
    if (this.track) {
      this.track.contentHint = 'detail';
    }

    // Refresh every 1 second to update the clock
    this.timer = window.setInterval(() => {
      this.render();
    }, 1000);
  }

  private render() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Solid dark neutral background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, w, h);

    // Subtle border
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    const cx = w / 2;
    const cy = h / 2 - 30;

    // Shield outline
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 60);
    ctx.quadraticCurveTo(cx + 50, cy - 60, cx + 50, cy);
    ctx.quadraticCurveTo(cx + 50, cy + 50, cx, cy + 80);
    ctx.quadraticCurveTo(cx - 50, cy + 50, cx - 50, cy);
    ctx.quadraticCurveTo(cx - 50, cy - 60, cx, cy - 60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lock bar
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 14, cy - 10, 28, 22);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 10, Math.PI, 0, false);
    ctx.stroke();

    // Main text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Privacy Curtain Active', cx, cy + 130);

    // Secondary text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('The host has temporarily paused screen transmission.', cx, cy + 175);
    ctx.fillText('The stream will automatically resume when unpaused.', cx, cy + 205);

    // Bottom status bar
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    ctx.font = '500 16px ui-monospace, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`CastClean P2P — ${timeStr}`, cx, h - 70);
  }

  public destroy() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.track) {
      this.track.stop();
      this.track = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
