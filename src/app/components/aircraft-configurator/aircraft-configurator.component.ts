import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService, Aircraft, SeatConfig, BUSINESS_FARE_MULTIPLIER, FIRST_FARE_MULTIPLIER } from '../../services/game-state.service';

@Component({
  selector: 'app-aircraft-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Fleet</button>
        <h2>⚙ Aircraft Configurator</h2>
        <div class="ac-identity" *ngIf="aircraft">
          <span class="ac-name-h">{{ aircraft.name }}</span>
          <span class="ac-model-h">{{ aircraft.model }}</span>
        </div>
      </div>

      <div class="content" *ngIf="aircraft; else notFound">
        <div class="config-layout">
          <!-- Visual cabin diagram -->
          <div class="cabin-visual card">
            <h3 class="card-title">Cabin Layout</h3>
            <div class="cabin-diagram">
              <div class="cabin-section first-sec" [style.flex]="draft.first">
                <div class="cabin-label">First</div>
                <div class="cabin-count">{{ draft.first }}</div>
              </div>
              <div class="cabin-section biz-sec" [style.flex]="draft.business">
                <div class="cabin-label">Business</div>
                <div class="cabin-count">{{ draft.business }}</div>
              </div>
              <div class="cabin-section eco-sec" [style.flex]="draft.economy">
                <div class="cabin-label">Economy</div>
                <div class="cabin-count">{{ draft.economy }}</div>
              </div>
            </div>
            <div class="cabin-total">
              Total: <strong>{{ totalSeats }}</strong> / {{ aircraft.capacity }} seats
              <span class="remaining" [class.over]="remaining < 0">
                ({{ remaining >= 0 ? remaining + ' unassigned' : (-remaining) + ' over capacity' }})
              </span>
            </div>
          </div>

          <!-- Controls -->
          <div class="config-controls card">
            <h3 class="card-title">Seat Allocation</h3>

            <div class="class-row">
              <div class="class-header first-hdr">
                <span class="class-icon">🥇</span>
                <div>
                  <div class="class-name">First Class</div>
                  <div class="class-desc">Premium luxury — earns 4× economy fare</div>
                </div>
              </div>
              <div class="slider-area">
                <input type="range" [(ngModel)]="draft.first"
                       [min]="0" [max]="maxFirst" step="1"
                       class="class-slider first-slider"
                       (input)="onSliderChange()" />
                <div class="slider-row">
                  <button class="adj-btn" (click)="adjust('first', -1)">−</button>
                  <input type="number" [(ngModel)]="draft.first" [min]="0" [max]="maxFirst"
                         class="seat-input" (change)="onSliderChange()" />
                  <button class="adj-btn" (click)="adjust('first', 1)">+</button>
                </div>
              </div>
            </div>

            <div class="class-divider"></div>

            <div class="class-row">
              <div class="class-header biz-hdr">
                <span class="class-icon">💼</span>
                <div>
                  <div class="class-name">Business Class</div>
                  <div class="class-desc">Premium comfort — earns 2.5× economy fare</div>
                </div>
              </div>
              <div class="slider-area">
                <input type="range" [(ngModel)]="draft.business"
                       [min]="0" [max]="maxBusiness" step="1"
                       class="class-slider biz-slider"
                       (input)="onSliderChange()" />
                <div class="slider-row">
                  <button class="adj-btn" (click)="adjust('business', -1)">−</button>
                  <input type="number" [(ngModel)]="draft.business" [min]="0" [max]="maxBusiness"
                         class="seat-input" (change)="onSliderChange()" />
                  <button class="adj-btn" (click)="adjust('business', 1)">+</button>
                </div>
              </div>
            </div>

            <div class="class-divider"></div>

            <div class="class-row">
              <div class="class-header eco-hdr">
                <span class="class-icon">🧳</span>
                <div>
                  <div class="class-name">Economy Class</div>
                  <div class="class-desc">Standard seating — base fare revenue</div>
                </div>
              </div>
              <div class="slider-area">
                <input type="range" [(ngModel)]="draft.economy"
                       [min]="0" [max]="aircraft.capacity" step="1"
                       class="class-slider eco-slider"
                       (input)="onSliderChange()" />
                <div class="slider-row">
                  <button class="adj-btn" (click)="adjust('economy', -1)">−</button>
                  <input type="number" [(ngModel)]="draft.economy" [min]="0" [max]="aircraft.capacity"
                         class="seat-input" (change)="onSliderChange()" />
                  <button class="adj-btn" (click)="adjust('economy', 1)">+</button>
                </div>
              </div>
            </div>

            <div class="config-actions">
              <button class="btn btn-secondary" (click)="resetToDefault()">Reset to Default</button>
              <button class="btn btn-primary" [disabled]="remaining !== 0" (click)="save()">
                {{ remaining === 0 ? 'Save Configuration' : 'Allocate all ' + aircraft.capacity + ' seats first' }}
              </button>
            </div>

            <div class="revenue-preview" *ngIf="aircraft">
              <h4>Estimated Revenue Multiplier</h4>
              <div class="rev-bar">
                <div class="rev-eco" [style.flex]="draft.economy">Eco</div>
                <div class="rev-biz" [style.flex]="draft.business * bizMult">Biz</div>
                <div class="rev-first" [style.flex]="draft.first * firstMult">First</div>
              </div>
              <div class="rev-note">
                Relative revenue weight per flight at the same economy fare.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #notFound>
        <div class="not-found">Aircraft not found.</div>
      </ng-template>
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
      gap: 16px;
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

    .ac-identity { display: flex; flex-direction: column; align-items: flex-end; }
    .ac-name-h { font-size: 15px; font-weight: 700; color: var(--text); }
    .ac-model-h { font-size: 12px; color: var(--text-secondary); }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .config-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 16px;
    }

    /* Cabin diagram */
    .cabin-diagram {
      display: flex;
      height: 200px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
      margin-bottom: 12px;
    }

    .cabin-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      transition: flex 0.3s ease;
    }

    .first-sec { background: linear-gradient(180deg, #fff8e1, #ffe082); }
    .biz-sec   { background: linear-gradient(180deg, #e8f5e9, #a5d6a7); }
    .eco-sec   { background: linear-gradient(180deg, #e3f2fd, #90caf9); }

    .cabin-label { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; }
    .cabin-count { font-size: 28px; font-weight: 800; color: #333; }

    .cabin-total {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .remaining { margin-left: 6px; font-weight: 600; color: var(--success); }
    .remaining.over { color: var(--danger); }

    /* Controls */
    .class-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 16px 0;
    }

    .class-header {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 200px;
    }

    .class-icon { font-size: 24px; }
    .class-name { font-size: 15px; font-weight: 700; }
    .class-desc { font-size: 12px; color: var(--text-secondary); }

    .slider-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .class-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      appearance: none;
      background: var(--border);
    }

    .class-slider::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      cursor: pointer;
    }

    .eco-slider::-webkit-slider-thumb { background: var(--primary-light); }
    .biz-slider::-webkit-slider-thumb { background: var(--success); }
    .first-slider::-webkit-slider-thumb { background: var(--warning); }

    .eco-slider { accent-color: var(--primary-light); }
    .biz-slider { accent-color: var(--success); }
    .first-slider { accent-color: var(--warning); }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .adj-btn {
      width: 28px;
      height: 28px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      cursor: pointer;
      font-size: 16px;
      font-weight: 700;
      transition: all 0.15s;
    }
    .adj-btn:hover { background: var(--primary-light); color: white; border-color: var(--primary-light); }

    .seat-input {
      width: 70px;
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
      background: var(--surface);
    }

    .class-divider {
      height: 1px;
      background: var(--border);
    }

    .config-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    /* Revenue preview */
    .revenue-preview {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    .revenue-preview h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }

    .rev-bar {
      display: flex;
      height: 32px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .rev-eco   { background: #90caf9; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #1565c0; transition: flex 0.3s; }
    .rev-biz   { background: #a5d6a7; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #2e7d32; transition: flex 0.3s; }
    .rev-first { background: #ffe082; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #f57c00; transition: flex 0.3s; }

    .rev-note { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }

    .not-found { padding: 48px; text-align: center; color: var(--text-secondary); font-size: 18px; }
  `]
})
export class AircraftConfiguratorComponent implements OnInit {
  aircraft?: Aircraft;
  draft: SeatConfig = { economy: 0, business: 0, first: 0 };

  /** Expose fare multipliers to template (shared constants from service) */
  readonly bizMult = BUSINESS_FARE_MULTIPLIER;
  readonly firstMult = FIRST_FARE_MULTIPLIER;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameState: GameStateService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.gameState.state$.subscribe(s => {
      this.aircraft = s.aircraft.find(a => a.id === id);
      if (this.aircraft && this.draft.economy === 0 && this.draft.business === 0 && this.draft.first === 0) {
        this.draft = { ...this.aircraft.seatConfig };
      }
    });
  }

  get totalSeats(): number {
    return this.draft.economy + this.draft.business + this.draft.first;
  }

  get remaining(): number {
    return (this.aircraft?.capacity ?? 0) - this.totalSeats;
  }

  get maxFirst(): number {
    return Math.max(0, (this.aircraft?.capacity ?? 0) - this.draft.business - this.draft.economy);
  }

  get maxBusiness(): number {
    return Math.max(0, (this.aircraft?.capacity ?? 0) - this.draft.first - this.draft.economy);
  }

  onSliderChange(): void {
    const cap = this.aircraft?.capacity ?? 0;
    const used = this.draft.first + this.draft.business + this.draft.economy;
    // When sliders push total over capacity, reduce economy (the most flexible class)
    // so that premium class changes are always honoured precisely.
    if (used > cap) {
      this.draft.economy = Math.max(0, cap - this.draft.first - this.draft.business);
    }
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
    if (catalog) {
      this.draft = { ...catalog.seatConfig };
    }
  }

  save(): void {
    if (!this.aircraft || this.remaining !== 0) return;
    this.gameState.updateSeatConfig(this.aircraft.id, { ...this.draft });
    this.router.navigate(['/manage-aircraft']);
  }

  goBack(): void { this.router.navigate(['/manage-aircraft']); }
}
