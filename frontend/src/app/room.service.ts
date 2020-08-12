import { Injectable } from '@angular/core';
import { KeypairService } from './keypair.service';
import { IdentityService } from './identity.service';
import { RTCPeer, ConnectionState, MessageType } from './rtcpeer';
import randomcolor from 'randomcolor';

enum RelayMessageType {
  PEERS_REQUEST = 'peersRequest',
  PEERS_RESPONSE = 'peersResponse',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'iceCandidate',
  IDENTIFY = 'identify',
}

interface RelayMessage {
  type: RelayMessageType;
  from: string;
  to?: string;
  payload?: any;
}

interface PeerDetails {
  id: string;
  name: string;
  status: 'joining' | 'active' | 'left';
  color: string;
}

interface RoomEventBase {
  createdBy: PeerDetails;
  type: 'message' | 'join' | 'identify';
  self?: boolean;
}

interface RoomEventMessage extends RoomEventBase {
  type: 'message';
  message: string;
}

interface RoomEventJoin extends RoomEventBase {
  type: 'join';
}

interface RoomEventIdentify extends RoomEventBase {
  type: 'identify';
  to: string;
}

type RoomEvent = RoomEventMessage | RoomEventJoin | RoomEventIdentify;

@Injectable({
  providedIn: 'any',
})
export class RoomService {
  private roomId: string;
  private relayConnection: WebSocket;
  private rtcConnections: Map<PeerDetails, RTCPeer> = new Map();

  peers: Map<string, PeerDetails> = new Map();
  events: RoomEvent[] = [];

  constructor(
    private keypairService: KeypairService,
    private identityService: IdentityService
  ) {}

  setup(roomId: string) {
    this.roomId = roomId;

    this.relayConnection = new WebSocket(
      `ws://localhost:9000/ws/room/${this.roomId}`
    );
    this.relayConnection.addEventListener('open', this.handleOpen.bind(this));
    this.relayConnection.addEventListener(
      'message',
      this.handleMessage.bind(this)
    );
  }

  broadcast(message: string) {
    this.events.push({
      type: 'message',
      message,
      createdBy: this.peers.get(this.identityService.id),
      self: true,
    });

    for (const conn of this.rtcConnections.values()) {
      conn.send({
        type: 'message',
        payload: message,
      });
    }
  }

  private handleOpen() {
    const selfPeer: PeerDetails = {
      id: this.identityService.id,
      name: this.identityService.name,
      status: 'active',
      color: randomcolor({ luminosity: 'dark' }),
    };

    this.peers.set(this.identityService.id, selfPeer);

    this.send({
      type: RelayMessageType.PEERS_REQUEST,
      from: selfPeer.id,
    });
  }

  private handleMessage({ data }: MessageEvent) {
    let parsed: RelayMessage;

    try {
      parsed = JSON.parse(data as string);
    } catch (e) {
      console.error(e);
      return;
    }

    const { type, from, to, payload } = parsed;

    // peersRequest doesn't require the `to` attribute, since it's broadcast to anyone in the room
    if (type === RelayMessageType.PEERS_REQUEST) {
      // TODO: this will fail if the same UUID somehow joins twice
      if (this.peers.get(from)) {
        return;
      }

      this.handlePeersRequest(from);
      return;
    }

    if (to !== this.identityService.id) {
      return;
    }

    switch (type) {
      case RelayMessageType.PEERS_RESPONSE:
        this.handlePeersResponse(from);
        break;
      case RelayMessageType.OFFER:
        this.handleOffer(from, payload);
        break;
      case RelayMessageType.ANSWER:
        this.handleAnswer(from, payload);
        break;
      case RelayMessageType.ICE_CANDIDATE:
        this.handleIceCandidate(from, payload);
        break;
      default: {
        console.log(`Invalid message type ${type}`);
      }
    }
  }

  private send(message: RelayMessage) {
    this.relayConnection.send(JSON.stringify(message));
  }

  private handlePeersRequest(from: string) {
    this.send({
      type: RelayMessageType.PEERS_RESPONSE,
      from: this.identityService.id,
      to: from,
    });
  }

  private async handlePeersResponse(from: string) {
    const peer = this.createPeer(from, true);
    const offer = await this.rtcConnections.get(peer).generateOffer();

    this.send({
      from: this.identityService.id,
      to: from,
      type: RelayMessageType.OFFER,
      payload: offer,
    });
  }

  private async handleOffer(from: string, offer: RTCSessionDescription) {
    const peer = this.createPeer(from);
    const answer = await this.rtcConnections.get(peer).generateAnswer(offer);

    this.send({
      from: this.identityService.id,
      to: from,
      type: RelayMessageType.ANSWER,
      payload: answer,
    });
  }

  private async handleAnswer(from: string, answer: RTCSessionDescription) {
    const peer = this.peers.get(from);

    this.rtcConnections.get(peer).addRemoteSessionDescription(answer);
  }

  private handleIceCandidate(from: string, payload: RTCIceCandidateInit) {
    const peer = this.peers.get(from);

    this.rtcConnections.get(peer).addRemoteIceCandidate(payload);
  }

  private createPeer(from: string, initiator: boolean = false): PeerDetails {
    const rtcConn = new RTCPeer(this.identityService, initiator);

    // Peers don't identify until later, so we just set their name to generic "someone"
    const peerObj: PeerDetails = {
      id: from,
      name: 'Someone',
      status: 'joining',
      color: randomcolor({ luminosity: 'dark' }),
    };

    this.peers.set(from, peerObj);
    this.rtcConnections.set(peerObj, rtcConn);

    rtcConn.iceCandidates.subscribe(({ candidate }) => {
      if (!candidate) {
        return;
      }

      this.send({
        type: RelayMessageType.ICE_CANDIDATE,
        from: this.identityService.id,
        to: from,
        payload: candidate,
      });
    });

    rtcConn.connectionState.subscribe((state) => {
      if (state === ConnectionState.Established) {
        peerObj.status = 'active';

        // TODO: add a join event and show it on the UI

        if (rtcConn.initiator) {
          rtcConn.send({
            type: 'identify',
            payload: this.identityService.name,
          });
        }
      } else if (state === ConnectionState.Closed) {
        peerObj.status = 'left';
      }
    });

    rtcConn.messages.subscribe((message) => {
      switch (message.type) {
        case MessageType.MESSAGE:
          this.events.push({
            type: 'message',
            createdBy: peerObj,
            message: message.payload,
          });
          break;
        case MessageType.IDENTIFY:
          peerObj.name = message.payload;

          // Initiators already sent their identity above
          if (rtcConn.initiator) {
            break;
          }

          this.rtcConnections.get(peerObj).send({
            type: 'identify',
            payload: this.identityService.name,
          });
          break;
      }
    });

    return peerObj;
  }
}
