import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClearDisplayComponent } from './clear-display.component';

describe('ClearDisplayComponent', () => {
  let component: ClearDisplayComponent;
  let fixture: ComponentFixture<ClearDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClearDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClearDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
