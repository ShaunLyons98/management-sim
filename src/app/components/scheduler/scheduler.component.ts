import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GameStateService, GameState, ScheduleSlot, AIRPORTS, Airport, Route, Aircraft
} from '../../services/game-state.service';

interface NewSlotForm {
  routeId: string;
  aircraftId: string;
  dayOfWeek: number;
  departureHour: number;
  departureMinute: number;
}

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Map</button>
        <h2>📅 Weekly Flight Scheduler</h2>
        <div class="summary">
          <span class="badge badge-primary">{{ state?.schedule?.length || 0 }} Flights/week</span>
        </div>
      </div>

      <div class="content">
        <!-- Weekly grid -->
        <div class="section">
          <h3 class="section-title">Weekly Schedule</h3>
          <p class="section-desc">Scheduled flights are operated automatically each in-game week.</p>

          <div class="week-grid">
            <div class="day-col" *ngFor="let day of days; let di = index">
              <div class="day-header">{{ day }}</div>
              <div class="day-slots">
                <div class="slot-card" *ngFor="let slot of getSlotsForDay(di)">
                  <div class="slot-time">{{ padTime(slot.departureHour, slot.departureMinute) }}</div>
                  <div class="slot-route">{{ getRouteLabel(slot.routeId) }}</div>
                  <div class="slot-aircraft">{{ getAircraftName(slot.aircraftId) }}</div>
                  <button class="slot-remove" (click)="removeSlot(slot.id)" title="Remove">✕</button>
                </div>
                <div class="day-empty" *ngIf="getSlotsForDay(di).length === 0">
                  <span>—</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add new slot -->
        <div class="section">
          <h3 class="section-title">Add Flight</h3>

          <div *ngIf="!state?.routes?.length" class="sub-empty card">
            No routes available. Open routes from the Route Management screen first.
          </div>

          <div class="add-form card" *ngIf="state?.routes?.length">
            <div class="form-grid-5">
              <div class="form-group">
                <label>Route</label>
                <select [(ngModel)]="form.routeId" class="form-select" (change)="onRouteChange()">
                  <option value="">Select route...</option>
                  <option *ngFor="let r of state?.routes" [value]="r.id">
                    {{ getRouteLabel(r.id) }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Aircraft</label>
                <select [(ngModel)]="form.aircraftId" class="form-select">
                  <option value="">Select aircraft...</option>
                  <option *ngFor="let ac of state?.aircraft" [value]="ac.id">
                    {{ ac.name }} — {{ ac.model }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Day</label>
                <select [(ngModel)]="form.dayOfWeek" class="form-select">
                  <option *ngFor="let d of days; let i = index" [value]="i">{{ d }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Departure</label>
                <div class="time-inputs">
                  <select [(ngModel)]="form.departureHour" class="form-select-sm">
                    <option *ngFor="let h of hours" [value]="h">{{ padHour(h) }}</option>
                  </select>
                  <span class="time-sep">:</span>
                  <select [(ngModel)]="form.departureMinute" class="form-select-sm">
                    <option [value]="0">00</option>
                    <option [value]="30">30</option>
                  </select>
                </div>
              </div>

              <div class="form-group form-action">
                <button class="btn btn-primary"
                        [disabled]="!form.routeId || !form.aircraftId"
                        (click)="addSlot()">
                  Add Flight
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Schedule summary table -->
        <div class="section" *ngIf="state?.schedule?.length">
          <h3 class="section-title">All Scheduled Flights</h3>
          <div class="schedule-table">
            <div class="table-header">
              <span>Day</span>
              <span>Time</span>
              <span>Route</span>
              <span>Aircraft</span>
              <span>Distance</span>
              <span></span>
            </div>
            <div class="table-row" *ngFor="let slot of sortedSchedule">
              <span class="day-badge">{{ days[slot.dayOfWeek] }}</span>
              <span class="time-cell">{{ padTime(slot.departureHour, slot.departureMinute) }}</span>
              <span class="route-cell">{{ getRouteLabel(slot.routeId) }}</span>
              <span class="ac-cell">{{ getAircraftName(slot.aircraftId) }}</span>
              <span class="dist-cell">{{ getRouteDistance(slot.routeId) | number }} km</span>
              <button class="del-btn" (click)="removeSlot(slot.id)">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .screen {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    .screen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 8px var(--shadow);
    }

    .back-btn {
      padding: 8px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--primary-light);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .back-btn:hover { background: var(--primary-light); color: white; }

    h2 { font-size: 22px; font-weight: 700; color: var(--primary-dark); }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 6px;
    }

    .section-desc {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 14px;
    }

    .sub-empty {
      color: var(--text-secondary);
      font-size: 14px;
      padding: 16px;
      font-style: italic;
    }

    /* Week grid */
    .week-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
    }

    .day-col {
      background: var(--surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .day-header {
      background: linear-gradient(135deg, #1565c0, #1976d2);
      color: white;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      padding: 6px 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .day-slots {
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 80px;
    }

    .slot-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      position: relative;
      font-size: 11px;
    }

    .slot-time {
      font-weight: 800;
      color: var(--primary-dark);
      font-size: 12px;
    }

    .slot-route {
      font-weight: 600;
      color: var(--text);
    }

    .slot-aircraft {
      color: var(--text-secondary);
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slot-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 10px;
      padding: 1px 3px;
      border-radius: 3px;
    }
    .slot-remove:hover { background: var(--danger); color: white; }

    .day-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--border);
      font-size: 18px;
      padding: 12px 0;
    }

    /* Add form */
    .add-form { padding: 20px; }

    .form-grid-5 {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }

    .form-select, .form-select-sm {
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-select:focus, .form-select-sm:focus { border-color: var(--primary-light); }
    .form-select-sm { padding: 8px 6px; }

    .time-inputs {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .time-sep { font-weight: 700; color: var(--text-secondary); }

    .form-action { justify-content: flex-end; }

    /* Summary table */
    .schedule-table {
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 80px 70px 1fr 1fr 90px 80px;
      gap: 0;
      padding: 10px 16px;
      align-items: center;
    }

    .table-header {
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .table-row {
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      transition: background 0.15s;
    }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: var(--surface-2); }

    .day-badge {
      font-weight: 700;
      color: var(--primary-dark);
    }

    .time-cell {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .route-cell { font-weight: 600; color: var(--text); }
    .ac-cell { color: var(--text-secondary); font-size: 12px; }
    .dist-cell { color: var(--text-secondary); }

    .del-btn {
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 5px;
      background: var(--surface);
      color: var(--danger);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .del-btn:hover { background: var(--danger); color: white; border-color: var(--danger); }
  `]
})
export class SchedulerComponent implements OnInit {
  state?: GameState;

  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  hours = Array.from({ length: 24 }, (_, i) => i);

  form: NewSlotForm = {
    routeId: '',
    aircraftId: '',
    dayOfWeek: 0,
    departureHour: 8,
    departureMinute: 0
  };

  constructor(public router: Router, private gameState: GameStateService) {}

  ngOnInit(): void {
    this.gameState.state$.subscribe(s => this.state = s);
  }

  getSlotsForDay(day: number): ScheduleSlot[] {
    return (this.state?.schedule ?? [])
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.departureHour * 60 + a.departureMinute - (b.departureHour * 60 + b.departureMinute));
  }

  get sortedSchedule(): ScheduleSlot[] {
    return [...(this.state?.schedule ?? [])].sort((a, b) =>
      a.dayOfWeek !== b.dayOfWeek
        ? a.dayOfWeek - b.dayOfWeek
        : (a.departureHour * 60 + a.departureMinute) - (b.departureHour * 60 + b.departureMinute)
    );
  }

  getRouteLabel(routeId: string): string {
    const route = this.state?.routes.find(r => r.id === routeId);
    if (!route) return '—';
    const from = AIRPORTS.find(a => a.id === route.fromAirportId);
    const to = AIRPORTS.find(a => a.id === route.toAirportId);
    return from && to ? `${from.iata} → ${to.iata}` : '—';
  }

  getRouteDistance(routeId: string): number {
    return this.state?.routes.find(r => r.id === routeId)?.distance ?? 0;
  }

  getAircraftName(aircraftId: string): string {
    const ac = this.state?.aircraft.find(a => a.id === aircraftId);
    return ac ? `${ac.name}` : '—';
  }

  onRouteChange(): void {
    // Auto-select the aircraft assigned to this route if available
    const route = this.state?.routes.find(r => r.id === this.form.routeId);
    if (route?.aircraftId) {
      this.form.aircraftId = route.aircraftId;
    }
  }

  padTime(h: number, m: number): string {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  padHour(h: number): string {
    return h.toString().padStart(2, '0');
  }

  addSlot(): void {
    if (!this.form.routeId || !this.form.aircraftId) return;
    this.gameState.addScheduleSlot({
      routeId: this.form.routeId,
      aircraftId: this.form.aircraftId,
      dayOfWeek: Number(this.form.dayOfWeek),
      departureHour: Number(this.form.departureHour),
      departureMinute: Number(this.form.departureMinute)
    });
    // Reset day/time only, keep route/aircraft for convenience
    this.form.dayOfWeek = 0;
    this.form.departureHour = 8;
    this.form.departureMinute = 0;
  }

  removeSlot(id: string): void {
    this.gameState.removeScheduleSlot(id);
  }

  goBack(): void { this.router.navigate(['/game']); }
}
