import { TestBed } from '@angular/core/testing';
import { KeypairService } from './keypair.service';

describe('KeypairService', () => {
  let service: KeypairService;
  let generateKey: jest.SpyInstance;
  let decrypt: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeypairService);
  });

  beforeEach(() => {
    generateKey = jest
      .spyOn(window.crypto.subtle, 'generateKey')
      .mockImplementation();
    decrypt = jest.spyOn(window.crypto.subtle, 'decrypt').mockImplementation();
  });

  afterEach(() => {
    generateKey.mockRestore();
    decrypt.mockRestore();
  });

  describe('generate', () => {
    it('should generate a new RSA keypair', async () => {
      const result = 'keypair';
      generateKey.mockResolvedValue(result);

      expect(await service.generate()).toBe(result);
      expect(generateKey).toBeCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: Uint8Array.from([0x01, 0x00, 0x01]),
          hash: 'SHA-512',
        },
        true,
        ['encrypt', 'decrypt']
      );
    });
  });

  describe('decrypt', () => {
    it('should attempt to decrypt the buffer with the provided private key and return the result', async () => {
      const result = 'decrypted-value';
      const privateKey: any = 'a private key';
      const buffer = new Uint8Array();

      decrypt.mockResolvedValue(result);

      expect(await service.decrypt(privateKey, buffer)).toBe(result);

      expect(decrypt).toBeCalledWith(
        {
          name: 'RSA-OAEP',
        },
        privateKey,
        buffer
      );
    });
  });
});
