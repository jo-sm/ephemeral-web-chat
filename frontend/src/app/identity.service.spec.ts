import { TestBed } from '@angular/core/testing';

import { IdentityService } from './identity.service';
import { KeypairService } from './keypair.service';

const mockPublicKey = 'mock-public-key';
const mockPrivateKey = 'mock-private-key';

describe('IdentityService', () => {
  let keypairService: KeypairService;
  let generateSpy: jest.SpyInstance;
  let decryptSpy: jest.SpyInstance;
  let exportKeySpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  beforeEach(() => {
    keypairService = TestBed.inject(KeypairService);

    exportKeySpy = jest
      .spyOn(window.crypto.subtle, 'exportKey')
      .mockResolvedValue({});
    generateSpy = jest.spyOn(keypairService, 'generate').mockResolvedValue({
      publicKey: mockPublicKey as any,
      privateKey: mockPrivateKey as any,
    });
    decryptSpy = jest
      .spyOn(keypairService, 'decrypt')
      .mockResolvedValue(new ArrayBuffer(0));
  });

  afterEach(() => {
    generateSpy.mockRestore();
    decryptSpy.mockRestore();
    exportKeySpy.mockRestore();
  });

  async function injectService() {
    return TestBed.inject(IdentityService);
  }

  describe('instantiation', () => {
    it('should set an ID and generate a keypair when instantiating', async () => {
      const service = await injectService();

      expect(generateSpy).toBeCalled();
      expect(service.id).toBeDefined();
    });
  });

  describe('setName', () => {
    it('should update the public name property', async () => {
      const service = await injectService();

      expect(service.name).not.toBeDefined();

      service.setName('John Smith');

      expect(service.name).toBe('John Smith');
    });
  });

  describe('decrypt', () => {
    it('should attempt to decrypt and then decode the provided buffer', async () => {
      const service = await injectService();

      const expected = 'my test data';
      const encoded = new TextEncoder().encode(expected);
      const encrypted = new Uint8Array([1, 2, 3, 4]);

      decryptSpy.mockResolvedValue(encoded);

      const decoded = await service.decrypt(encrypted);

      expect(decoded).toBe(expected);
      expect(decryptSpy).toBeCalledWith(mockPrivateKey, encrypted);
    });
  });

  describe('getPublicKey', () => {
    it('should return the exported public key', async () => {
      const service = await injectService();

      const exportedKey = {
        k: 'v',
      };

      exportKeySpy.mockResolvedValue(exportedKey);

      expect(await service.getPublicKey()).toBe(exportedKey);
      expect(exportKeySpy).toBeCalledWith('jwk', mockPublicKey);
    });
  });
});
