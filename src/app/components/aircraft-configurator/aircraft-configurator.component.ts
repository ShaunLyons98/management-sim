import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GameStateService, Aircraft, SeatConfig, BUSINESS_FARE_MULTIPLIER, FIRST_FARE_MULTIPLIER } from '../../services/game-state.service';

@Component({
  selector: 'app-aircraft-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="screen animate-fade-in">
      <!-- Header -->
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Fleet</button>
        <div class="header-center" *ngIf="aircraft">
          <h2>⚙ Cabin Configurator</h2>
          <div class="ac-subtitle">{{ aircraft.name }} · {{ aircraft.model }}</div>
        </div>
        <div class="header-right" *ngIf="aircraft">
          <div class="cap-pill" [class.over]="remaining < 0" [class.ok]="remaining === 0">
            <span class="cap-num">{{ totalSeats }}</span>
            <span class="cap-sep">/</span>
            <span class="cap-total">{{ aircraft.capacity }}</span>
            <span class="cap-label">seats</span>
          </div>
        </div>
      </div>

      <div class="page-body" *ngIf="aircraft; else notFound">

        <!-- ─── Top: visual cabin plan ─── -->
        <div class="cabin-card">
          <div class="cabin-top">
            <div class="cabin-nose">✈</div>
            <div class="cabin-bar">
              <div class="cabin-seg first-seg"
                   [style.flex]="draft.first + MIN_FLEX"
                   [class.hidden-seg]="draft.first === 0">
                <span class="seg-label">First</span>
                <span class="seg-count">{{ draft.first }}</span>
              </div>
              <div class="cabin-seg biz-seg"
                   [style.flex]="draft.business + MIN_FLEX"
                   [class.hidden-seg]="draft.business === 0">
                <span class="seg-label">Biz</span>
                <span class="seg-count">{{ draft.business }}</span>
              </div>
              <div class="cabin-seg eco-seg"
                   [style.flex]="draft.economy + MIN_FLEX"
                   [class.hidden-seg]="draft.economy === 0">
                <span class="seg-label">Economy</span>
                <span class="seg-count">{{ draft.economy }}</span>
              </div>
              <div class="cabin-unalloc"
                   *ngIf="remaining > 0"
                   [style.flex]="remaining">
                <span class="unalloc-label">{{ remaining }} unassigned</span>
              </div>
            </div>
            <div class="cabin-tail">▲</div>
          </div>
          <div class="cabin-status" [class.status-ok]="remaining === 0" [class.status-over]="remaining < 0" [class.status-pending]="remaining > 0">
            <ng-container *ngIf="remaining === 0">✓ All seats allocated</ng-container>
            <ng-container *ngIf="remaining > 0">{{ remaining }} seat(s) unallocated</ng-container>
            <ng-container *ngIf="remaining < 0">⚠ Over capacity by {{ -remaining }}</ng-container>
          </div>
        </div>

        <!-- ─── Class controls ─── -->
        <div class="classes-grid">

          <!-- First Class -->
          <div class="class-card first-card">
            <div class="class-icon-wrap first-icon">🥇</div>
            <div class="class-info">
              <div class="class-name">First Class</div>
              <div class="class-mult">{{ firstMult }}× fare · luxury</div>
            </div>
            <div class="class-controls">
              <div class="count-row">
                <button class="adj" (click)="adjust('first', -1)">−</button>
                <input type="number" class="count-input" [(ngModel)]="draft.first"
                       [min]="0" [max]="maxFirst" (change)="clampAll()" />
                <button class="adj" (click)="adjust('first', 1)">+</button>
              </div>
              <input type="range" class="cabin-slider first-s" [(ngModel)]="draft.first"
                     [min]="0" [max]="maxFirst" step="1" (input)="onSliderChange()" />
              <div class="class-pct">{{ pct(draft.first) }}% of cabin</div>
            </div>
          </div>

          <!-- Business Class -->
          <div class="class-card biz-card">
            <div class="class-icon-wrap biz-icon">💼</div>
            <div class="class-info">
              <div class="class-name">Business Class</div>
              <div class="class-mult">{{ bizMult }}× fare · premium</div>
            </div>
            <div class="class-controls">
              <div class="count-row">
                <button class="adj" (click)="adjust('business', -1)">−</button>
                <input type="number" class="count-input" [(ngModel)]="draft.business"
                       [min]="0" [max]="maxBusiness" (change)="clampAll()" />
                <button class="adj" (click)="adjust('business', 1)">+</button>
              </div>
              <input type="range" class="cabin-slider biz-s" [(ngModel)]="draft.business"
                     [min]="0" [max]="maxBusiness" step="1" (input)="onSliderChange()" />
              <div class="class-pct">{{ pct(draft.business) }}% of cabin</div>
            </div>
          </div>

          <!-- Economy Class -->
          <div class="class-card eco-card">
            <div class="class-icon-wrap eco-icon">🧳</div>
            <div class="class-info">
              <div class="class-name">Economy Class</div>
              <div class="class-mult">1× fare · standard</div>
            </div>
            <div class="class-controls">
              <div class="count-row">
                <button class="adj" (click)="adjust('economy', -1)">−</button>
                <input type="number" class="count-input" [(ngModel)]="draft.economy"
                       [min]="0" [max]="aircraft.capacity" (change)="clampAll()" />
                <button class="adj" (click)="adjust('economy', 1)">+</button>
              </div>
              <input type="range" class="cabin-slider eco-s" [(ngModel)]="draft.economy"
                     [min]="0" [max]="aircraft.capacity" step="1" (input)="onSliderChange()" />
              <div class="class-pct">{{ pct(draft.economy) }}% of cabin</div>
            </div>
          </div>

        </div>

        <!-- ─── Revenue preview ─── -->
        <div class="rev-card">
          <div class="rev-title">Estimated Revenue Weight per Flight</div>
          <div class="rev-bar-wrap">
            <div class="rev-seg rev-eco" [style.flex]="revEco">
              <span *ngIf="revEco > 2">Eco</span>
            </div>
            <div class="rev-seg rev-biz" [style.flex]="revBiz">
              <span *ngIf="revBiz > 2">Biz</span>
            </div>
            <div class="rev-seg rev-first" [style.flex]="revFirst">
              <span *ngIf="revFirst > 2">First</span>
            </div>
          </div>
          <div class="rev-numbers">
            <span class="rev-num eco-num">Eco {{ pct(draft.economy) }}%</span>
            <span class="rev-num biz-num">Biz {{ pct(draft.business) }}%</span>
            <span class="rev-num first-num">First {{ pct(draft.first) }}%</span>
          </div>
        </div>

        <!-- ─── Actions ─── -->
        <div class="actions-row">
          <button class="btn btn-secondary" (click)="resetToDefault()">↺ Reset to Default</button>
          <button class="btn btn-primary save-btn"
                  [disabled]="remaining !== 0"
                  (click)="save()">
            {{ remaining === 0 ? '✓ Save Configuration' : remaining > 0 ? 'Allocate ' + remaining + ' more seat(s)' : 'Over by ' + (-remaining) }}
          </button>
        </div>

      </div>

      <ng-template #notFound>
        <div class="not-found">Aircraft not found.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; }

    .screen {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    /* Header */
    .screen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 8px var(--shadow);
      flex-shrink: 0;
      gap: 16px;
    }

    .back-btn {
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--primary-light);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .back-btn:hover { background: var(--primary-light); color: white; }

    .header-center {
      flex: 1;
      text-align: center;
    }
    h2 { font-size: 20px; font-weight: 700; color: var(--primary-dark); margin: 0; }
    .ac-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

    .header-right { flex-shrink: 0; }

    .cap-pill {
      display: inline-flex;
      align-items: baseline;
      gap: 3px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 2px solid var(--border);
      background: var(--surface-2);
    }
    .cap-pill.ok  { border-color: var(--success); background: #e8f5e9; }
    .cap-pill.over { border-color: var(--danger, #c62828); background: #ffebee; }

    .cap-num  { font-size: 20px; font-weight: 800; color: var(--primary-dark); }
    .cap-sep  { font-size: 14px; color: var(--text-secondary); }
    .cap-total{ font-size: 16px; font-weight: 600; color: var(--text-secondary); }
    .cap-label{ font-size: 11px; color: var(--text-secondary); margin-left: 4px; text-transform: uppercase; }

    /* Page body */
    .page-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 920px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* Cabin visual */
    .cabin-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      box-shadow: 0 1px 4px var(--shadow);
    }

    .cabin-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .cabin-nose { font-size: 20px; flex-shrink: 0; }
    .cabin-tail { font-size: 14px; flex-shrink: 0; color: var(--text-secondary); }

    .cabin-bar {
      flex: 1;
      display: flex;
      height: 52px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .cabin-seg {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: flex 0.25s ease;
      overflow: hidden;
      min-width: 0;
    }
    .first-seg { background: linear-gradient(180deg, #fff8e1, #ffe082); }
    .biz-seg   { background: linear-gradient(180deg, #e8f5e9, #a5d6a7); }
    .eco-seg   { background: linear-gradient(180deg, #e3f2fd, #90caf9); }

    .hidden-seg { flex: 0 !important; min-width: 0; }

    .seg-label { font-size: 10px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
    .seg-count { font-size: 20px; font-weight: 800; color: #333; line-height: 1; }

    .cabin-unalloc {
      display: flex;
      align-items: center;
      justify-content: center;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(0,0,0,0.04) 4px,
        rgba(0,0,0,0.04) 8px
      );
      border-left: 1px dashed var(--border);
    }
    .unalloc-label { font-size: 10px; color: var(--text-secondary); white-space: nowrap; }

    .cabin-status {
      font-size: 13px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .status-ok      { background: #e8f5e9; color: var(--success, #2e7d32); }
    .status-over    { background: #ffebee; color: var(--danger, #c62828); }
    .status-pending { background: #fff3e0; color: #e65100; }

    /* Class cards */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 700px) {
      .classes-grid { grid-template-columns: 1fr; }
    }

    .class-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 1px 4px var(--shadow);
    }

    .first-card { border-top: 3px solid #ffd54f; }
    .biz-card   { border-top: 3px solid #81c784; }
    .eco-card   { border-top: 3px solid #64b5f6; }

    .class-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .first-icon { background: linear-gradient(135deg, #fff8e1, #ffe082); }
    .biz-icon   { background: linear-gradient(135deg, #e8f5e9, #a5d6a7); }
    .eco-icon   { background: linear-gradient(135deg, #e3f2fd, #90caf9); }

    .class-name { font-size: 15px; font-weight: 700; color: var(--text); }
    .class-mult { font-size: 12px; color: var(--text-secondary); }

    .class-controls { display: flex; flex-direction: column; gap: 8px; }

    .count-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .adj {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .adj:hover { background: var(--primary-light); color: white; border-color: var(--primary-light); }

    .count-input {
      flex: 1;
      min-width: 0;
      text-align: center;
      padding: 6px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 20px;
      font-weight: 800;
      color: var(--primary-dark);
      background: var(--surface);
    }
    .count-input:focus { outline: none; border-color: var(--primary-light); }

    .cabin-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      cursor: pointer;
    }
    .first-s { accent-color: #ffc107; }
    .biz-s   { accent-color: #4caf50; }
    .eco-s   { accent-color: #1976d2; }

    .class-pct { font-size: 12px; color: var(--text-secondary); text-align: center; }

    /* Revenue bar */
    .rev-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      box-shadow: 0 1px 4px var(--shadow);
    }

    .rev-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }

    .rev-bar-wrap {
      display: flex;
      height: 28px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
      margin-bottom: 8px;
    }

    .rev-seg {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: white;
      transition: flex 0.25s;
      overflow: hidden;
      min-width: 0;
    }
    .rev-eco   { background: #42a5f5; }
    .rev-biz   { background: #66bb6a; }
    .rev-first { background: #ffa726; }

    .rev-numbers {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .rev-num { font-size: 12px; font-weight: 600; }
    .eco-num   { color: #1976d2; }
    .biz-num   { color: #388e3c; }
    .first-num { color: #f57c00; }

    /* Actions */
    .actions-row {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-bottom: 8px;
    }

    .save-btn { min-width: 220px; }

    .not-found { padding: 48px; text-align: center; color: var(--text-secondary); font-size: 18px; }
  `]
})
export class AircraftConfiguratorComponent implements OnInit, OnDestroy {
  aircraft?: Aircraft;
  draft: SeatConfig = { economy: 0, business: 0, first: 0 };

  readonly bizMult = BUSINESS_FARE_MULTIPLIER;
  readonly firstMult = FIRST_FARE_MULTIPLIER;
  /** Small non-zero flex value so cabin segments never fully collapse to width-0 when empty */
  readonly MIN_FLEX = 0.001;

  private sub?: Subscription;
  private aircraftId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameState: GameStateService
  ) {}

  ngOnInit(): void {
    this.aircraftId = this.route.snapshot.paramMap.get('id') ?? '';
    this.sub = this.gameState.state$.subscribe(s => {
      const found = s.aircraft.find(a => a.id === this.aircraftId);
      if (found && !this.aircraft) {
        // First load — initialise draft from current config
        this.draft = { ...found.seatConfig };
      }
      this.aircraft = found;
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get totalSeats(): number { return this.draft.economy + this.draft.business + this.draft.first; }
  get remaining(): number  { return (this.aircraft?.capacity ?? 0) - this.totalSeats; }

  get maxFirst(): number {
    return Math.max(0, (this.aircraft?.capacity ?? 0) - this.draft.business - this.draft.economy);
  }
  get maxBusiness(): number {
    return Math.max(0, (this.aircraft?.capacity ?? 0) - this.draft.first - this.draft.economy);
  }

  get revEco():   number { return this.draft.economy; }
  get revBiz():   number { return this.draft.business * this.bizMult; }
  get revFirst(): number { return this.draft.first    * this.firstMult; }

  pct(seats: number): number {
    const cap = this.aircraft?.capacity || 1;
    return Math.round(seats / cap * 100);
  }

  onSliderChange(): void {
    // When slider pushes total over capacity, pull back economy (most flexible class)
    const cap = this.aircraft?.capacity ?? 0;
    const used = this.draft.first + this.draft.business + this.draft.economy;
    if (used > cap) {
      this.draft.economy = Math.max(0, cap - this.draft.first - this.draft.business);
    }
  }

  clampAll(): void {
    const cap = this.aircraft?.capacity ?? 0;
    this.draft.first    = Math.min(Math.max(0, this.draft.first),    cap);
    this.draft.business = Math.min(Math.max(0, this.draft.business), cap - this.draft.first);
    this.draft.economy  = Math.min(Math.max(0, this.draft.economy),  cap - this.draft.first - this.draft.business);
  }

  adjust(cls: keyof SeatConfig, delta: number): void {
    const cap = this.aircraft?.capacity ?? 0;
    const current = this.draft[cls];
    const newVal = Math.max(0, current + delta);
    const others = this.totalSeats - current;
    if (others + newVal > cap) return;
    this.draft[cls] = newVal;
  }

  resetToDefault(): void {
    if (!this.aircraft) return;
    const catalog = this.gameState.aircraftCatalog.find(c => c.model === this.aircraft!.model);
    if (catalog) this.draft = { ...catalog.seatConfig };
  }

  save(): void {
    if (!this.aircraft || this.remaining !== 0) return;
    this.gameState.updateSeatConfig(this.aircraft.id, { ...this.draft });
    this.router.navigate(['/manage-aircraft']);
  }

  goBack(): void { this.router.navigate(['/manage-aircraft']); }
}
