export type UserRole = 'host' | 'viewer';

export interface ViewerParticipant {
  id: string;
  displayName: string;
  joinedAt: number;
  status: 'knocking' | 'approved' | 'rejected' | 'connected';
  audioMuted?: boolean;
}

export type DataChannelMessage =
  | {
      type: 'REQUEST_ACCESS';
      viewerId: string;
      displayName: string;
      timestamp: number;
    }
  | {
      type: 'ACCESS_GRANTED';
      hostName: string;
      streamActive: boolean;
    }
  | {
      type: 'ACCESS_DENIED';
      reason?: string;
    }
  | {
      type: 'PRIVACY_CURTAIN_STATE';
      active: boolean;
    }
  | {
      type: 'STREAM_ENDED';
      reason?: string;
    }
  | {
      type: 'KICK_VIEWER';
      viewerId: string;
    }
  | {
      type: 'CHAT_MESSAGE';
      id: string;
      senderId: string;
      senderName: string;
      text: string;
      timestamp: number;
      isHost?: boolean;
    }
  | {
      type: 'REACTION';
      id: string;
      senderName: string;
      emoji: string;
      timestamp: number;
    };

export interface StreamQualityPreset {
  id: 'smooth-60' | 'crisp-text' | 'balanced';
  label: string;
  description: string;
  frameRate: number;
  width?: number;
  height?: number;
}

export interface PeerStats {
  rttMs: number;
  fps: number;
  width: number;
  height: number;
  bitrateKbps: number;
  packetLossPercent: number;
  connectionType: string;
}
