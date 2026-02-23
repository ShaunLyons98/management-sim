import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService, GameState, AIRCRAFT_CATALOG } from '../../services/game-state.service';

@Component({
  selector: 'app-buy-aircraft',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Map</button>
        <h2>✈ Aircraft Marketplace</h2>
        <div class="money-display">
          <span class="money-label">Available Funds</span>
          <span class="money-value">{{ state?.money | currency:'USD':'symbol':'1.0-0' }}</span>
        </div>
      </div>

      <div class="aircraft-grid">
        <div class="aircraft-card card" *ngFor="let ac of catalog; let i = index"
             [class.affordable]="(state?.money || 0) >= ac.cost">
          <div class="ac-header">
            <div class="ac-icon">✈</div>
            <div class="ac-title">
              <h3>{{ ac.name }}</h3>
              <p class="ac-model">{{ ac.model }}</p>
            </div>
          </div>
          <div class="ac-stats">
            <div class="stat">
              <span class="stat-l">Capacity</span>
              <span class="stat-v">{{ ac.capacity }} pax</span>
            </div>
            <div class="stat">
              <span class="stat-l">Range</span>
              <span class="stat-v">{{ ac.range | number }} km</span>
            </div>
            <div class="stat">
              <span class="stat-l">Speed</span>
              <span class="stat-v">{{ ac.speed }} km/h</span>
            </div>
            <div class="stat">
              <span class="stat-l">Op. Cost</span>
              <span class="stat-v">{{ ac.operatingCost | currency:'USD':'symbol':'1.0-0' }}/hr</span>
            </div>
          </div>
          <div class="ac-footer">
            <div class="ac-price">{{ ac.cost | currency:'USD':'symbol':'1.0-0' }}</div>
            <button class="btn btn-primary"
                    [disabled]="(state?.money || 0) < ac.cost"
                    (click)="buy(i)">
              {{ (state?.money || 0) >= ac.cost ? 'Purchase' : 'Insufficient Funds' }}
            </button>
          </div>
          <div class="owned-count" *ngIf="getOwnedCount(i) > 0">
            <span class="badge badge-primary">Owned: {{ getOwnedCount(i) }}</span>
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

    h2 {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-dark);
    }

    .money-display {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .money-label { font-size: 12px; color: var(--text-secondary); }
    .money-value { font-size: 20px; font-weight: 700; color: var(--success); }

    .aircraft-grid {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      align-content: start;
    }

    .aircraft-card {
      position: relative;
      opacity: 0.7;
      transition: all 0.2s ease;
    }
    .aircraft-card.affordable { opacity: 1; }
    .aircraft-card:hover { transform: translateY(-2px); }

    .ac-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .ac-icon {
      font-size: 36px;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-radius: 12px;
    }

    h3 { font-size: 16px; font-weight: 700; color: var(--text); }
    .ac-model { font-size: 13px; color: var(--text-secondary); }

    .ac-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
    }

    .stat {
      display: flex;
      flex-direction: column;
    }
    .stat-l { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
    .stat-v { font-size: 14px; font-weight: 600; color: var(--text); }

    .ac-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ac-price {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary-dark);
    }

    .owned-count {
      position: absolute;
      top: 12px;
      right: 12px;
    }
  `]
})
export class BuyAircraftComponent implements OnInit {
  state?: GameState;
  catalog = AIRCRAFT_CATALOG;

  constructor(private gameState: GameStateService, private router: Router) {}

  ngOnInit(): void {
    this.gameState.state$.subscribe(s => this.state = s);
  }

  buy(index: number): void {
    this.gameState.buyAircraft(index);
  }

  getOwnedCount(catalogIndex: number): number {
    return this.state?.aircraft.filter(a => a.model === AIRCRAFT_CATALOG[catalogIndex].model).length || 0;
  }

  goBack(): void { this.router.navigate(['/game']); }
}
