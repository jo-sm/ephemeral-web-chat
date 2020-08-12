import { TestBed } from '@angular/core/testing';

import { RtcPeersService } from './room.service';

describe('RtcPeersService', () => {
  let service: RtcPeersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RtcPeersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
