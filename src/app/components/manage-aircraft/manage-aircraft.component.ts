import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService, GameState, Aircraft, AIRPORTS } from '../../services/game-state.service';

@Component({
  selector: 'app-manage-aircraft',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Map</button>
        <h2>✈ Fleet Management</h2>
        <div class="summary">
          <span class="badge badge-primary">{{ state?.aircraft?.length || 0 }} Aircraft</span>
        </div>
      </div>

      <div class="content">
        <div *ngIf="!state?.aircraft?.length" class="empty-state">
          <div class="empty-icon">✈</div>
          <h3>No Aircraft</h3>
          <p>Purchase aircraft from the marketplace to build your fleet.</p>
          <button class="btn btn-primary" (click)="router.navigate(['/buy-aircraft'])">Buy Aircraft</button>
        </div>

        <div class="aircraft-list" *ngIf="state?.aircraft?.length">
          <div class="aircraft-row card" *ngFor="let ac of state?.aircraft">
            <div class="ac-info">
              <div class="ac-icon-sm">✈</div>
              <div>
                <div class="ac-name">{{ ac.name }}</div>
                <div class="ac-model-sm">{{ ac.model }}</div>
              </div>
            </div>

            <div class="ac-specs">
              <span class="chip">{{ ac.capacity }} seats</span>
              <span class="chip">{{ ac.range | number }} km range</span>
              <span class="chip">{{ ac.speed }} km/h</span>
            </div>

            <div class="ac-classes">
              <span class="class-badge eco">Y {{ ac.seatConfig.economy }}</span>
              <span class="class-badge biz">J {{ ac.seatConfig.business }}</span>
              <span class="class-badge first" *ngIf="ac.seatConfig.first > 0">F {{ ac.seatConfig.first }}</span>
            </div>

            <div class="ac-status">
              <span class="badge" [class.badge-success]="ac.assignedRouteId" [class.badge-warning]="!ac.assignedRouteId">
                {{ ac.assignedRouteId ? '✓ Deployed' : '⚠ Idle' }}
              </span>
              <span *ngIf="ac.assignedRouteId" class="route-info">
                {{ getRouteLabel(ac.assignedRouteId) }}
              </span>
            </div>

            <div class="ac-actions">
              <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px"
                      (click)="router.navigate(['/configure-aircraft', ac.id])">
                Configure
              </button>
              <button class="btn btn-danger" style="padding:6px 12px;font-size:12px" (click)="sell(ac)">
                Sell ({{ (ac.cost * 0.5) | currency:'USD':'symbol':'1.0-0' }})
              </button>
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
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 12px;
      color: var(--text-secondary);
    }

    .empty-icon { font-size: 48px; opacity: 0.3; }
    h3 { font-size: 18px; color: var(--text); }

    .aircraft-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .aircraft-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 20px;
      flex-wrap: wrap;
    }

    .ac-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 180px;
    }

    .ac-icon-sm {
      font-size: 22px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      border-radius: 10px;
    }

    .ac-name { font-weight: 700; font-size: 14px; }
    .ac-model-sm { font-size: 12px; color: var(--text-secondary); }

    .ac-specs {
      display: flex;
      gap: 6px;
      flex: 1;
      flex-wrap: wrap;
    }

    .ac-classes {
      display: flex;
      gap: 6px;
    }

    .class-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .class-badge.eco { background: #e3f2fd; color: #1565c0; }
    .class-badge.biz { background: #e8f5e9; color: #2e7d32; }
    .class-badge.first { background: #fff8e1; color: #f57c00; }

    .ac-status {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    }

    .route-info { font-size: 11px; color: var(--text-secondary); }

    .ac-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
  `]
})
export class ManageAircraftComponent implements OnInit {
  state?: GameState;

  constructor(public router: Router, private gameState: GameStateService) {}

  ngOnInit(): void {
    this.gameState.state$.subscribe(s => this.state = s);
  }

  sell(ac: Aircraft): void {
    if (confirm(`Sell ${ac.name} for ${(ac.cost * 0.5).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}?`)) {
      this.gameState.sellAircraft(ac.id);
    }
  }

  getRouteLabel(routeId?: string): string {
    if (!routeId) return '';
    const route = this.state?.routes.find(r => r.id === routeId);
    if (!route) return '';
    const from = AIRPORTS.find(a => a.id === route.fromAirportId);
    const to = AIRPORTS.find(a => a.id === route.toAirportId);
    return from && to ? `${from.iata} → ${to.iata}` : '';
  }

  goBack(): void { this.router.navigate(['/game']); }
}

