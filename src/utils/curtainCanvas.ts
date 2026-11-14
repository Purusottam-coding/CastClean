/**
 * Creates an animated Privacy Curtain canvas and returns a MediaStreamTrack
 * that can seamlessly replace the real screen video track in WebRTC senders.
 */
export class PrivacyCurtainStream {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private stream: MediaStream | null = null;
  public track: MediaStreamTrack | null = null;
  private startTime: number = Date.now();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;

    // Start rendering loop
    this.startRendering();

    // Capture media stream at 30 fps
    this.stream = this.canvas.captureStream(30);
    this.track = this.stream.getVideoTracks()[0] || null;
    if (this.track) {
      this.track.contentHint = 'detail';
    }
  }

  private startRendering() {
    const render = () => {
      this.drawFrame();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  private drawFrame() {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Deep dark cyber background with moving gradient
    const grad = ctx.createLinearGradient(
      0,
      0,
      width * Math.cos(elapsed * 0.2),
      height * Math.sin(elapsed * 0.2)
    );
    grad.addColorStop(0, '#0a0d17');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.07)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center coordinates
    const cx = width / 2;
    const cy = height / 2 - 40;

    // Pulsing radar circles
    const pulse = (elapsed * 2) % 3;
    for (let i = 0; i < 3; i++) {
      const radius = 100 + ((pulse + i) % 3) * 60;
      const alpha = Math.max(0, 1 - radius / 280) * 0.25;
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing shield badge
    ctx.save();
    ctx.translate(cx, cy);

    // Outer glow
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 35 + Math.sin(elapsed * 3) * 10;

    // Shield background
    ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.quadraticCurveTo(55, -60, 55, 0);
    ctx.quadraticCurveTo(55, 60, 0, 85);
    ctx.quadraticCurveTo(-55, 60, -55, 0);
    ctx.quadraticCurveTo(-55, -60, 0, -60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lock/Shield icon inside
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', 0, 5);

    ctx.restore();

    // Primary Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PRIVACY CURTAIN ACTIVE', cx, cy + 130);

    // Subtitle
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      'The host has paused the screen stream for privacy.',
      cx,
      cy + 180
    );
    ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      'Audio & video will instantly resume once the host unpauses.',
      cx,
      cy + 215
    );

    // Live status badge at bottom
    const badgeY = height - 100;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 200, badgeY - 24, 400, 48, 24);
    ctx.fill();
    ctx.stroke();

    // Pulsing green/amber live dot
    const dotAlpha = 0.5 + Math.sin(elapsed * 4) * 0.5;
    ctx.fillStyle = `rgba(234, 179, 8, ${dotAlpha})`;
    ctx.beginPath();
    ctx.arc(cx - 150, badgeY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CastClean Zero-Delay P2P Stream', cx - 130, badgeY + 1);

    // Time ticker
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 15px monospace';
    ctx.fillText(timeStr, cx + 180, badgeY + 1);
  }

  public destroy() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
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
