export type UserRole = 'host' | 'viewer';

export type ParticipantStatus = 'knocking' | 'approved' | 'rejected' | 'connected';

export interface ViewerParticipant {
  id: string;
  displayName: string;
  status: ParticipantStatus;
  joinedAt: number;
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
      type: 'PRIVACY_CURTAIN';
      active: boolean;
    }
  | {
      type: 'STREAM_STATUS';
      isSharing: boolean;
      isAudioMuted: boolean;
    }
  | {
      type: 'KICK';
      viewerId: string;
    }
  | {
      type: 'LEAVE';
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
    };

export interface WebRTCStats {
  rttMs: number;
  fps: number;
  width: number;
  height: number;
  bitrateKbps: number;
  packetLossPercent: number;
  bytesReceived?: number;
  candidateType?: string;
}
