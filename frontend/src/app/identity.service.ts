import { Injectable } from '@angular/core';
import { KeypairService } from './keypair.service';
import { v4 as generateUUID } from 'uuid';

export interface PublicIdentity {
  name: string;
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class IdentityService {
  private keypairPromise: PromiseLike<CryptoKeyPair>;
  private privateKey: CryptoKey;
  private publicKey: CryptoKey;

  id: string;
  name: string;

  constructor(private keypairService: KeypairService) {
    this.createKeyPair();
    this.generateId();
  }

  setName(name: string): void {
    this.name = name;
  }

  async decrypt(encryptedData: ArrayBuffer): Promise<string> {
    // TODO: Move this into the keypairService
    await this.keypairPromise;

    const decrypted = await this.keypairService.decrypt(
      this.privateKey,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  }

  async getPublicKey(): Promise<JsonWebKey> {
    await this.keypairPromise;

    return window.crypto.subtle.exportKey('jwk', this.publicKey);
  }

  private generateId() {
    this.id = generateUUID();
  }

  private async createKeyPair() {
    this.keypairPromise = this.keypairService.generate();

    const keypair = await this.keypairPromise;

    this.publicKey = keypair.publicKey;
    this.privateKey = keypair.privateKey;
  }
}
