import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class KeypairService {
  generate() {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
        hash: 'SHA-512',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  decrypt(privateKey: CryptoKey, data: ArrayBuffer) {
    return window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      data
    );
  }
}
