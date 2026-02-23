import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  GameStateService, GameState, ScheduleSlot, AIRPORTS, TURNAROUND_MINUTES, formatGameDate
} from '../../services/game-state.service';

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Map</button>
        <h2>📅 Schedule Management</h2>
        <div class="header-right">
          <span class="badge badge-primary">{{ state?.schedule?.length || 0 }} Flights/week</span>
          <div class="tab-toggle">
            <button class="tab-btn" [class.active]="activeTab === 'planner'" (click)="activeTab = 'planner'">Planner</button>
            <button class="tab-btn" [class.active]="activeTab === 'live'" (click)="activeTab = 'live'">Live Schedule</button>
          </div>
        </div>
      </div>

      <div class="content" *ngIf="activeTab === 'planner'">
        <!-- Weekly card grid -->
        <div class="section">
          <h3 class="section-title">Weekly Schedule</h3>
          <p class="section-desc">Scheduled flights operate automatically each in-game week. Flights must not overlap for the same aircraft.</p>

          <div class="week-grid">
            <div class="day-col" *ngFor="let day of days; let di = index">
              <div class="day-header">{{ day }}</div>
              <div class="day-slots">
                <div class="slot-card" *ngFor="let slot of getSlotsForDay(di)">
                  <div class="slot-time">{{ padTime(slot.departureHour, slot.departureMinute) }}</div>
                  <div class="slot-route">{{ getRouteLabel(slot.routeId) }}</div>
                  <div class="slot-dur">{{ getDurationLabel(slot) }}</div>
                  <div class="slot-aircraft">{{ getAircraftName(slot.aircraftId) }}</div>
                  <button class="slot-remove" (click)="removeSlot(slot.id)" title="Remove">✕</button>
                </div>
                <div class="day-empty" *ngIf="getSlotsForDay(di).length === 0">—</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add new slot -->
        <div class="section">
          <h3 class="section-title">Add Flight</h3>

          <div *ngIf="!state?.routes?.length" class="sub-empty card">
            No routes available. Open routes from Route Management first.
          </div>

          <div class="add-form card" *ngIf="state?.routes?.length">
            <div class="add-form-grid">
              <div class="form-group">
                <label>Route</label>
                <select [(ngModel)]="form.routeId" class="form-select" (change)="onRouteChange()">
                  <option value="">Select route...</option>
                  <option *ngFor="let r of state?.routes" [value]="r.id">
                    {{ getRouteLabel(r.id) }} ({{ getRouteDurationLabel(r.id, form.aircraftId) }})
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
                <div class="conflict-msg" *ngIf="conflictWarning">
                  ⚠ {{ conflictWarning }}
                </div>
                <button class="btn btn-primary"
                        [disabled]="!form.routeId || !form.aircraftId || !!conflictWarning"
                        (click)="addSlot()">
                  Add Flight
                </button>
              </div>
            </div>

            <!-- Duration preview -->
            <div class="duration-preview" *ngIf="form.routeId && form.aircraftId">
              <span class="dur-icon">⏱</span>
              <span>Flight time: <strong>{{ getRouteDurationLabel(form.routeId, form.aircraftId) }}</strong></span>
              <span class="dur-sep">·</span>
              <span>Turnaround: <strong>{{ turnaround }}min</strong></span>
              <span class="dur-sep">·</span>
              <span>Aircraft free at: <strong>{{ getFreeAtLabel() }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Summary table -->
        <div class="section" *ngIf="state?.schedule?.length">
          <h3 class="section-title">All Scheduled Flights</h3>
          <div class="schedule-table">
            <div class="table-header">
              <span>Day</span>
              <span>Dep.</span>
              <span>Arr.</span>
              <span>Route</span>
              <span>Aircraft</span>
              <span>Distance</span>
              <span></span>
            </div>
            <div class="table-row" *ngFor="let slot of sortedSchedule">
              <span class="day-badge">{{ days[slot.dayOfWeek] }}</span>
              <span class="time-cell">{{ padTime(slot.departureHour, slot.departureMinute) }}</span>
              <span class="time-cell">{{ getArrivalLabel(slot) }}</span>
              <span class="route-cell">{{ getRouteLabel(slot.routeId) }}</span>
              <span class="ac-cell">{{ getAircraftName(slot.aircraftId) }}</span>
              <span class="dist-cell">{{ getRouteDistance(slot.routeId) | number }} km</span>
              <button class="del-btn" (click)="removeSlot(slot.id)">Remove</button>
            </div>
          </div>
        </div>
      </div>

      <!-- LIVE SCHEDULE TAB -->
      <div class="live-content" *ngIf="activeTab === 'live'">
        <div class="live-header-bar">
          <div class="live-legend">
            <span class="legend-dot flying"></span><span>Flying</span>
            <span class="legend-dot scheduled"></span><span>Scheduled</span>
            <span class="legend-dot turnaround"></span><span>Turnaround</span>
          </div>
          <div class="live-date">{{ formatDate(state?.day || 1) }} · {{ padTime(state?.hour || 0, state?.minute || 0) }}</div>
        </div>

        <div class="gantt-wrap" *ngIf="state?.schedule?.length; else noFlights">
          <!-- Hour axis -->
          <div class="gantt-axis-row">
            <div class="gantt-label-cell"></div>
            <div class="gantt-timeline">
              <div class="hour-tick" *ngFor="let d of days; let di = index" [style.left.%]="di / 7 * 100">
                <span class="hour-label">{{ days[di] }}</span>
              </div>
              <!-- Current time cursor -->
              <div class="time-cursor" [style.left.%]="currentWeekPct"></div>
            </div>
          </div>

          <!-- One row per schedule slot -->
          <div class="gantt-row" *ngFor="let slot of sortedSchedule; let i = index">
            <div class="gantt-label-cell">
              <div class="gantt-route-label">{{ getRouteLabel(slot.routeId) }}</div>
              <div class="gantt-ac-label">{{ getAircraftName(slot.aircraftId) }}</div>
            </div>
            <div class="gantt-timeline">
              <!-- Current time cursor -->
              <div class="time-cursor" [style.left.%]="currentWeekPct"></div>
              <!-- Flight block -->
              <div class="gantt-block flight-block"
                   [style.left.%]="slotStartPct(slot)"
                   [style.width.%]="slotFlightPct(slot)"
                   [class.is-flying]="isSlotFlying(slot)"
                   [title]="getRouteLabel(slot.routeId) + ' — ' + getDurationLabel(slot)">
                <span class="block-label">{{ getRouteLabel(slot.routeId) }}</span>
              </div>
              <!-- Turnaround block -->
              <div class="gantt-block turn-block"
                   [style.left.%]="slotTurnStartPct(slot)"
                   [style.width.%]="slotTurnPct(slot)"
                   title="Turnaround {{ turnaround }}min">
              </div>
            </div>
          </div>
        </div>

        <ng-template #noFlights>
          <div class="no-flights-msg">No flights scheduled yet. Add flights in the Planner tab.</div>
        </ng-template>
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
      padding: 14px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 8px var(--shadow);
      gap: 12px;
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
      white-space: nowrap;
    }
    .back-btn:hover { background: var(--primary-light); color: white; }

    h2 { font-size: 22px; font-weight: 700; color: var(--primary-dark); }

    .header-right { display: flex; align-items: center; gap: 12px; }

    .tab-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
    .tab-btn {
      padding: 6px 16px;
      background: var(--surface);
      border: none;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn.active { background: var(--primary-light); color: white; }

    /* PLANNER TAB */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .section-title { font-size: 18px; font-weight: 700; color: var(--primary-dark); margin-bottom: 6px; }
    .section-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; }
    .sub-empty { color: var(--text-secondary); font-size: 14px; padding: 16px; font-style: italic; }

    .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }

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

    .day-slots { padding: 6px; display: flex; flex-direction: column; gap: 4px; min-height: 80px; }

    .slot-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 6px 8px;
      position: relative;
      font-size: 11px;
    }

    .slot-time { font-weight: 800; color: var(--primary-dark); font-size: 12px; }
    .slot-route { font-weight: 600; color: var(--text); }
    .slot-dur { font-size: 10px; color: var(--primary-lighter); font-weight: 600; }
    .slot-aircraft { color: var(--text-secondary); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .slot-remove {
      position: absolute; top: 4px; right: 4px;
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; font-size: 10px; padding: 1px 3px; border-radius: 3px;
    }
    .slot-remove:hover { background: var(--danger); color: white; }

    .day-empty { display: flex; align-items: center; justify-content: center; flex: 1; color: var(--border); font-size: 18px; padding: 12px 0; }

    /* Add form */
    .add-form { padding: 20px; }

    .add-form-grid {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
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

    .time-inputs { display: flex; align-items: center; gap: 4px; }
    .time-sep { font-weight: 700; color: var(--text-secondary); }

    .form-action { display: flex; flex-direction: column; gap: 6px; justify-content: flex-end; }

    .conflict-msg {
      font-size: 11px;
      color: var(--danger, #c62828);
      font-weight: 600;
      padding: 4px 8px;
      background: #fff3f3;
      border-radius: 5px;
      border: 1px solid #ffcdd2;
    }

    .duration-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 10px 14px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .dur-icon { font-size: 16px; }
    .dur-sep { color: var(--border); }

    /* Summary table */
    .schedule-table {
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 70px 65px 65px 1fr 1fr 85px 80px;
      gap: 0;
      padding: 10px 16px;
      align-items: center;
    }

    .table-header {
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;
    }

    .table-row { border-bottom: 1px solid var(--border); font-size: 13px; transition: background 0.15s; }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: var(--surface-2); }

    .day-badge { font-weight: 700; color: var(--primary-dark); }
    .time-cell { font-variant-numeric: tabular-nums; font-weight: 600; }
    .route-cell { font-weight: 600; }
    .ac-cell { color: var(--text-secondary); font-size: 12px; }
    .dist-cell { color: var(--text-secondary); }

    .del-btn {
      padding: 4px 10px; border: 1px solid var(--border); border-radius: 5px;
      background: var(--surface); color: var(--danger); font-size: 12px; cursor: pointer; transition: all 0.15s;
    }
    .del-btn:hover { background: var(--danger); color: white; border-color: var(--danger); }

    /* ─── LIVE SCHEDULE TAB ─── */
    .live-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    .live-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 24px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }

    .live-legend { display: flex; align-items: center; gap: 12px; }
    .legend-dot {
      display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 4px;
    }
    .legend-dot.flying    { background: #1976d2; }
    .legend-dot.scheduled { background: #90caf9; }
    .legend-dot.turnaround{ background: #ffcc80; }

    .live-date { font-weight: 700; color: var(--primary-dark); font-variant-numeric: tabular-nums; }

    .gantt-wrap { flex: 1; overflow-x: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 0; }

    /* Axis row */
    .gantt-axis-row { display: flex; position: sticky; top: 0; z-index: 10; background: var(--surface); border-bottom: 2px solid var(--border); }

    .gantt-label-cell {
      width: 160px;
      flex-shrink: 0;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .gantt-timeline {
      flex: 1;
      position: relative;
      height: 32px;
    }

    .hour-tick {
      position: absolute;
      top: 0;
      height: 100%;
      border-left: 1px solid var(--border);
      display: flex;
      align-items: center;
    }
    .hour-label {
      font-size: 10px;
      color: var(--text-secondary);
      margin-left: 3px;
      font-weight: 600;
    }

    /* Gantt rows */
    .gantt-row {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid var(--border);
      min-height: 44px;
    }
    .gantt-row:hover { background: var(--surface-2); }

    .gantt-label-cell .gantt-route-label { font-size: 13px; font-weight: 700; color: var(--text); }
    .gantt-label-cell .gantt-ac-label { font-size: 11px; color: var(--text-secondary); }

    .gantt-timeline {
      flex: 1;
      position: relative;
      min-height: 44px;
    }

    /* Day dividers */
    .gantt-row .gantt-timeline::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(
        90deg,
        transparent 0,
        transparent calc(100%/7 - 1px),
        var(--border) calc(100%/7 - 1px),
        var(--border) calc(100%/7)
      );
      pointer-events: none;
    }

    .time-cursor {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e53935;
      z-index: 5;
      box-shadow: 0 0 4px rgba(229,57,53,0.6);
    }

    .gantt-block {
      position: absolute;
      top: 6px;
      height: 32px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      overflow: hidden;
      transition: opacity 0.2s;
      min-width: 4px;
    }

    .flight-block {
      background: #90caf9;
      border: 1px solid #1976d2;
    }
    .flight-block.is-flying {
      background: #1976d2;
      border-color: #0d47a1;
    }
    .flight-block:hover { opacity: 0.85; }

    .turn-block {
      background: #ffcc80;
      border: 1px solid #ff9800;
      top: 6px;
      height: 32px;
    }

    .block-label {
      font-size: 10px;
      font-weight: 700;
      color: white;
      padding: 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .no-flights-msg {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 16px;
      font-style: italic;
    }
  `]
})
export class SchedulerComponent implements OnInit, OnDestroy {
  state?: GameState;
  activeTab: 'planner' | 'live' = 'planner';

  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  hours = Array.from({ length: 24 }, (_, i) => i);
  turnaround = TURNAROUND_MINUTES;

  form = {
    routeId: '',
    aircraftId: '',
    dayOfWeek: 0,
    departureHour: 8,
    departureMinute: 0
  };

  conflictWarning = '';
  private sub?: Subscription;

  constructor(public router: Router, private gameState: GameStateService) {}

  ngOnInit(): void {
    this.sub = this.gameState.state$.subscribe(s => {
      this.state = s;
      this.validateConflict();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ──────────── Planner helpers ────────────

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
    return ac ? ac.name : '—';
  }

  getDurationLabel(slot: ScheduleSlot): string {
    const mins = this.gameState.getFlightDurationMins(slot.routeId, slot.aircraftId);
    return mins > 0 ? this.minsToHHMM(mins) : '—';
  }

  getRouteDurationLabel(routeId: string, aircraftId: string): string {
    if (!routeId || !aircraftId) return '';
    const mins = this.gameState.getFlightDurationMins(routeId, aircraftId);
    return mins > 0 ? this.minsToHHMM(mins) : '';
  }

  getArrivalLabel(slot: ScheduleSlot): string {
    const mins = this.gameState.getFlightDurationMins(slot.routeId, slot.aircraftId);
    const total = slot.departureHour * 60 + slot.departureMinute + mins;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return this.padTime(h, m);
  }

  getFreeAtLabel(): string {
    if (!this.form.routeId || !this.form.aircraftId) return '';
    const dur = this.gameState.getFlightDurationMins(this.form.routeId, this.form.aircraftId);
    const total = Number(this.form.departureHour) * 60 + Number(this.form.departureMinute) + dur + TURNAROUND_MINUTES;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    const extraDays = Math.floor(total / (24 * 60));
    const dayLabel = extraDays > 0 ? ` (+${extraDays}d)` : '';
    return this.padTime(h, m) + dayLabel;
  }

  private minsToHHMM(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  validateConflict(): void {
    if (!this.form.routeId || !this.form.aircraftId) { this.conflictWarning = ''; return; }
    const conflict = this.gameState.checkScheduleConflict(
      this.form.aircraftId,
      Number(this.form.dayOfWeek),
      Number(this.form.departureHour),
      Number(this.form.departureMinute),
      this.form.routeId
    );
    this.conflictWarning = conflict ? 'This aircraft already has a flight in this time window.' : '';
  }

  onRouteChange(): void {
    const route = this.state?.routes.find(r => r.id === this.form.routeId);
    if (route?.aircraftId) this.form.aircraftId = route.aircraftId;
    this.validateConflict();
  }

  padTime(h: number, m: number): string {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  padHour(h: number): string { return h.toString().padStart(2, '0'); }

  addSlot(): void {
    if (!this.form.routeId || !this.form.aircraftId || this.conflictWarning) return;
    this.gameState.addScheduleSlot({
      routeId: this.form.routeId,
      aircraftId: this.form.aircraftId,
      dayOfWeek: Number(this.form.dayOfWeek),
      departureHour: Number(this.form.departureHour),
      departureMinute: Number(this.form.departureMinute)
    });
    this.form.dayOfWeek = 0;
    this.form.departureHour = 8;
    this.form.departureMinute = 0;
    this.conflictWarning = '';
  }

  removeSlot(id: string): void { this.gameState.removeScheduleSlot(id); }

  goBack(): void { this.router.navigate(['/game']); }

  // ──────────── Live Schedule helpers ────────────

  readonly WEEK_MINS = 7 * 24 * 60;

  formatDate(day: number): string { return formatGameDate(day); }

  /** Day of week index (0=Mon..6=Sun) for the current game time */
  private currentDayOfWeek(): number {
    return (this.state!.day - 1) % 7;
  }

  get currentWeekPct(): number {
    if (!this.state) return 0;
    const mins = this.currentDayOfWeek() * 24 * 60 + this.state.hour * 60 + this.state.minute;
    return (mins / this.WEEK_MINS) * 100;
  }

  slotStartMins(slot: ScheduleSlot): number {
    return slot.dayOfWeek * 24 * 60 + slot.departureHour * 60 + slot.departureMinute;
  }

  slotStartPct(slot: ScheduleSlot): number {
    return (this.slotStartMins(slot) / this.WEEK_MINS) * 100;
  }

  slotFlightPct(slot: ScheduleSlot): number {
    const dur = this.gameState.getFlightDurationMins(slot.routeId, slot.aircraftId);
    return (dur / this.WEEK_MINS) * 100;
  }

  slotTurnStartPct(slot: ScheduleSlot): number {
    const dur = this.gameState.getFlightDurationMins(slot.routeId, slot.aircraftId);
    return ((this.slotStartMins(slot) + dur) / this.WEEK_MINS) * 100;
  }

  slotTurnPct(_slot: ScheduleSlot): number {
    return (TURNAROUND_MINUTES / this.WEEK_MINS) * 100;
  }

  isSlotFlying(slot: ScheduleSlot): boolean {
    if (!this.state) return false;
    const currentMins = this.currentDayOfWeek() * 24 * 60 + this.state.hour * 60 + this.state.minute;
    const start = this.slotStartMins(slot);
    const dur = this.gameState.getFlightDurationMins(slot.routeId, slot.aircraftId);
    return currentMins >= start && currentMins < start + dur;
  }
}
