/**
 * Host audio mixer using Web Audio API to mix:
 * 1. Screen system audio (from getDisplayMedia)
 * 2. Host microphone audio (from getUserMedia)
 * 3. Incoming viewers' microphones
 *
 * Produces a single clean outgoing MediaStreamTrack for WebRTC broadcast.
 */
export class HostAudioMixer {
  private ctx: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sources: Map<string, MediaStreamAudioSourceNode> = new Map();

  constructor() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.destination = this.ctx.createMediaStreamDestination();
    } catch (err) {
      console.warn('AudioContext not supported:', err);
    }
  }

  public getMixedTrack(): MediaStreamTrack | null {
    if (!this.destination) return null;
    return this.destination.stream.getAudioTracks()[0] || null;
  }

  public addSource(id: string, stream: MediaStream) {
    if (!this.ctx || !this.destination) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.removeSource(id);

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      try {
        const source = this.ctx.createMediaStreamSource(stream);
        source.connect(this.destination);
        this.sources.set(id, source);
      } catch (e) {
        console.warn(`Failed to connect audio source ${id}:`, e);
      }
    }
  }

  public removeSource(id: string) {
    const existing = this.sources.get(id);
    if (existing) {
      try {
        existing.disconnect();
      } catch {
        // Ignore
      }
      this.sources.delete(id);
    }
  }

  public destroy() {
    this.sources.forEach((src) => {
      try {
        src.disconnect();
      } catch {
        // Ignore
      }
    });
    this.sources.clear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.destination = null;
  }
}
