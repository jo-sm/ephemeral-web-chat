import { fromEvent, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { IdentityService } from './identity.service';
import { generateRandomHex } from './utils';

const RTC_CONFIG: RTCConfiguration = {};

export enum MessageType {
  MESSAGE = 'message',
  IDENTIFY = 'identify',
}

interface PublicKeyMessage {
  type: 'publicKey';
  payload: JsonWebKey;
}

interface MaybeEncryptedMessage {
  data: ArrayBuffer;
}

interface MessageMessage {
  type: 'message';
  payload: string;
}

interface IdentifyMessage {
  type: 'identify';
  payload: string;
}

type Message = MessageMessage | IdentifyMessage;

export enum ConnectionState {
  Initial,
  PublicKeySent,
  PublicKeyReceived,
  VerificationHashSent,
  Established,
  Closed,
}

export class RTCPeer {
  private identity: IdentityService;
  private rtcConnection: RTCPeerConnection;
  private channel: RTCDataChannel;
  private peerPublicKey: CryptoKey;
  private verificationHash: string;

  messages: ReplaySubject<Message>;
  iceCandidates: Observable<RTCPeerConnectionIceEvent>;
  connectionState: BehaviorSubject<ConnectionState>;
  initiator: boolean;

  constructor(identity: IdentityService, initiator = false) {
    this.rtcConnection = new RTCPeerConnection(RTC_CONFIG);
    this.identity = identity;
    this.initiator = initiator;

    this.iceCandidates = fromEvent<RTCPeerConnectionIceEvent>(
      this.rtcConnection,
      'icecandidate'
    );
    this.messages = new ReplaySubject<Message>(0);
    this.connectionState = new BehaviorSubject<ConnectionState>(
      ConnectionState.Initial
    );

    this.rtcConnection.addEventListener(
      'datachannel',
      this.handleDataChannel.bind(this)
    );

    this.rtcConnection.addEventListener(
      'connectionstatechange',
      this.handleConnectionStateChange.bind(this)
    );
  }

  async generateOffer() {
    this.channel = this.rtcConnection.createDataChannel('message');
    this.channel.binaryType = 'arraybuffer';

    this.channel.addEventListener('open', this.sendInitialPublicKey.bind(this));
    this.channel.addEventListener('message', this.handleMessage.bind(this));

    const offer = await this.rtcConnection.createOffer();

    await this.rtcConnection.setLocalDescription(offer);

    return this.rtcConnection.localDescription;
  }

  async generateAnswer(offer: RTCSessionDescription) {
    const remoteDesc = new RTCSessionDescription(offer);

    await this.rtcConnection.setRemoteDescription(remoteDesc);

    const answer = await this.rtcConnection.createAnswer();
    await this.rtcConnection.setLocalDescription(answer);

    return this.rtcConnection.localDescription;
  }

  async send(message: Message) {
    // TODO: queueing
    if (this.connectionState.getValue() !== ConnectionState.Established) {
      return;
    }

    if (this.channel.readyState !== 'open') {
      return;
    }

    const stringified = JSON.stringify(message);
    const encrypted = await this.encodeAndEncryptMessage(stringified);

    this.channel.send(encrypted);
  }

  addRemoteSessionDescription(remoteDesc: RTCSessionDescription) {
    this.rtcConnection.setRemoteDescription(remoteDesc);
  }

  addRemoteIceCandidate(init: RTCIceCandidateInit) {
    this.rtcConnection.addIceCandidate(new RTCIceCandidate(init));
  }

  private handleDataChannel({ channel }: RTCDataChannelEvent) {
    this.channel = channel;

    this.channel.addEventListener('message', this.handleMessage.bind(this));
  }

  private async sendInitialPublicKey() {
    await this.sendPublicKey();

    this.connectionState.next(ConnectionState.PublicKeySent);
  }

  private async sendPublicKey() {
    const ownPublicKey = await this.identity.getPublicKey();

    const message = {
      type: 'publicKey',
      payload: ownPublicKey,
    };

    const encoded = new TextEncoder().encode(JSON.stringify(message));

    this.channel.send(encoded);
  }

  private async handleMessage({ data }: MaybeEncryptedMessage) {
    switch (this.connectionState.getValue()) {
      case ConnectionState.Initial:
        this.handlePublicKeyMessage(data);
        break;
      case ConnectionState.PublicKeySent:
        this.handleSendVerificationMessage(data);
        break;
      case ConnectionState.PublicKeyReceived:
      case ConnectionState.VerificationHashSent:
        this.handleVerificationMessage(data);
        break;
      case ConnectionState.Established:
        const decrypted = await this.identity.decrypt(data);
        const parsed = JSON.parse(decrypted) as Message;

        this.messages.next(parsed);
        break;
    }
  }

  private async handlePublicKeyMessage(data: ArrayBuffer) {
    this.connectionState.next(ConnectionState.PublicKeyReceived);

    // The only message we should get is the public key. If it isn't, close the connection
    let message: PublicKeyMessage;

    try {
      message = JSON.parse(new TextDecoder().decode(data));
    } catch {
      this.rtcConnection.close();

      return;
    }

    if (message?.type !== 'publicKey') {
      this.rtcConnection.close();

      return;
    }

    try {
      await this.setPeerPublicKey(message.payload);
    } catch {
      this.rtcConnection.close();
      return;
    }

    this.sendPublicKey();
  }

  private async handleSendVerificationMessage(data) {
    const message = JSON.parse(new TextDecoder().decode(data));

    await this.setPeerPublicKey(message.payload);

    this.verificationHash = generateRandomHex();

    const encryptedHash = await this.encodeAndEncryptMessage(
      this.verificationHash
    );

    this.channel.send(encryptedHash);

    this.connectionState.next(ConnectionState.VerificationHashSent);
  }

  private async handleVerificationMessage(data: ArrayBuffer) {
    if (this.verificationHash) {
      const hash = await this.identity.decrypt(data);

      if (hash === this.verificationHash) {
        this.connectionState.next(ConnectionState.Established);
      } else {
        this.rtcConnection.close();
      }

      return;
    }

    const verificationHash = await this.identity.decrypt(data);
    const encryptedVerificationHash = await this.encodeAndEncryptMessage(
      verificationHash
    );

    this.channel.send(encryptedVerificationHash);

    this.connectionState.next(ConnectionState.Established);
  }

  private async handleConnectionStateChange(event: Event) {
    const closedEvents = ['closed', 'disconnected', 'failed'];

    if (closedEvents.includes(this.rtcConnection.connectionState)) {
      this.connectionState.next(ConnectionState.Closed);
    }
  }

  private async encodeAndEncryptMessage(message: string) {
    const encoded = new TextEncoder().encode(message);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      this.peerPublicKey,
      encoded
    );

    return encrypted;
  }

  private async setPeerPublicKey(data) {
    this.peerPublicKey = await window.crypto.subtle.importKey(
      'jwk',
      data,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-512',
      },
      true,
      ['encrypt']
    );
  }
}
