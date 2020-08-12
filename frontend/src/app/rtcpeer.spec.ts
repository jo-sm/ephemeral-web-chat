import { RTCPeer } from './rtcpeer';

describe('RTCPeer', () => {
  it('should create an instance', () => {
    expect(new RTCPeer()).toBeTruthy();
  });
});
