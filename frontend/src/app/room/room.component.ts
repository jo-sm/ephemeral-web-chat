import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RoomService } from '../room.service';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css'],
})
export class RoomComponent implements OnInit, AfterViewChecked {
  form: FormGroup;

  roomId: string;

  @ViewChild('scrollToBottom') private eventsContainer: ElementRef<Element>;

  constructor(
    public roomService: RoomService,
    private route: ActivatedRoute,
    fb: FormBuilder
  ) {
    this.roomId = this.route.snapshot.paramMap.get('id');

    this.form = fb.group({
      message: [''],
    });
  }

  ngOnInit(): void {
    this.roomService.setup(this.roomId);
  }

  ngAfterViewChecked(): void {
    const liEle = this.eventsContainer.nativeElement.querySelector(
      'li:last-child'
    );

    if (!liEle) {
      return;
    }

    liEle.scrollIntoView();
  }

  sendMessage(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    this.roomService.broadcast(this.form.value.message);

    this.form.patchValue({ message: '' });
  }
}
