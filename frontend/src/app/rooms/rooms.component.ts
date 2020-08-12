import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { IdentityService } from '../identity.service';
import { Router } from '@angular/router';
import { generateRandomHex } from '../utils';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css'],
})
export class RoomsComponent implements OnInit {
  form: FormGroup;

  constructor(
    private identityService: IdentityService,
    private router: Router,
    fb: FormBuilder
  ) {
    this.form = fb.group({
      name: [''],
    });
  }

  ngOnInit(): void {}

  submit(e) {
    e.preventDefault();
    e.stopPropagation();

    this.identityService.setName(this.form.value.name);

    this.router.navigate(['rooms', generateRandomHex()]);
  }
}
