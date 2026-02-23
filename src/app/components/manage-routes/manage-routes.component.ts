import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService, GameState, AIRPORTS, Airport } from '../../services/game-state.service';

@Component({
  selector: 'app-manage-routes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="screen animate-fade-in">
      <div class="screen-header">
        <button class="back-btn" (click)="goBack()">← Back to Map</button>
        <h2>🗺 Route Management</h2>
        <div class="money-display">
          <span class="money-label">Available Funds</span>
          <span class="money-value">{{ state?.money | currency:'USD':'symbol':'1.0-0' }}</span>
        </div>
      </div>

      <div class="content">
        <!-- Hubs Section (view-only – purchase hubs on the map) -->
        <div class="section">
          <h3 class="section-title">🏢 Owned Hubs</h3>
          <p class="section-desc">Hub airports are purchased directly from the world map. Additional slots can be bought here.</p>

          <div *ngIf="!state?.hubs?.length" class="sub-empty">
            No hubs owned yet — click an airport on the map to buy a hub.
          </div>

          <div class="hub-list" *ngIf="state?.hubs?.length">
            <div class="hub-card card" *ngFor="let hub of state?.hubs">
              <div class="hub-info">
                <div class="hub-iata">{{ getAirport(hub.airportId)?.iata }}</div>
                <div>
                  <div class="hub-name">{{ getAirport(hub.airportId)?.city }}</div>
                  <div class="hub-detail">{{ hub.purchasedSlots }} slot(s) owned</div>
                </div>
              </div>
              <div class="hub-actions">
                <span class="badge badge-success">Active Hub</span>
                <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px" (click)="addSlot(hub.airportId)">
                  + Slot ($2M)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Routes Section -->
        <div class="section">
          <h3 class="section-title">✈ Routes</h3>
          <p class="section-desc">Routes cost $500K to open. Assign aircraft to generate revenue.</p>

          <div class="route-list" *ngIf="state?.routes?.length">
            <div class="route-card card" *ngFor="let route of state?.routes">
              <div class="route-header">
                <div class="route-airports">
                  <span class="route-code">{{ getAirport(route.fromAirportId)?.iata }}</span>
                  <span class="route-arrow">→</span>
                  <span class="route-code">{{ getAirport(route.toAirportId)?.iata }}</span>
                </div>
                <div class="route-meta">
                  <span class="chip">{{ route.distance | number }} km</span>
                  <span class="badge" [class.badge-success]="route.aircraftId" [class.badge-warning]="!route.aircraftId">
                    {{ route.aircraftId ? 'Active' : 'No Aircraft' }}
                  </span>
                </div>
              </div>

              <div class="route-details">
                <div class="detail">
                  <span class="dl">From</span>
                  <span class="dv">{{ getAirport(route.fromAirportId)?.name }}</span>
                </div>
                <div class="detail">
                  <span class="dl">To</span>
                  <span class="dv">{{ getAirport(route.toAirportId)?.name }}</span>
                </div>
                <div class="detail">
                  <span class="dl">Economy Price</span>
                  <span class="dv">{{ route.price | currency }}</span>
                </div>
              </div>

              <div class="route-aircraft">
                <label class="detail-label">Assigned Aircraft</label>
                <div class="assign-row">
                  <select class="form-select" (change)="assignAircraft($event, route.id)"
                          [value]="route.aircraftId || ''">
                    <option value="">-- None --</option>
                    <option *ngFor="let ac of getAvailableAircraft(route.id)" [value]="ac.id">
                      {{ ac.name }} ({{ ac.model }})
                    </option>
                  </select>
                  <button class="btn btn-danger" style="padding:6px 12px;font-size:12px" (click)="removeRoute(route.id)">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="!state?.routes?.length" class="sub-empty">
            No routes yet. Create one below.
          </div>

          <!-- New Route -->
          <div class="buy-route card" *ngIf="state?.hubs?.length">
            <h4>Open New Route ($500K)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>From (Hub)</label>
                <select [(ngModel)]="newRoute.from" class="form-select">
                  <option value="">Select Hub...</option>
                  <option *ngFor="let hub of state?.hubs" [value]="hub.airportId">
                    {{ getAirport(hub.airportId)?.iata }} - {{ getAirport(hub.airportId)?.city }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>To</label>
                <select [(ngModel)]="newRoute.to" class="form-select">
                  <option value="">Select Destination...</option>
                  <option *ngFor="let a of getAvailableDestinations()" [value]="a.id">
                    {{ a.iata }} - {{ a.city }}, {{ a.country }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Economy Ticket Price ($)</label>
                <input type="number" [(ngModel)]="newRoute.price" class="form-input"
                       min="50" max="5000" step="10" />
              </div>
              <div class="form-group form-action">
                <button class="btn btn-primary"
                        [disabled]="!newRoute.from || !newRoute.to || !newRoute.price || (state?.money || 0) < 500000"
                        (click)="createRoute()">
                  Open Route
                </button>
              </div>
            </div>
          </div>

          <div class="sub-empty card" *ngIf="!state?.hubs?.length">
            You need to own at least one hub airport before you can open routes. Click an airport on the map to buy a hub.
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

    .money-display {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .money-label { font-size: 12px; color: var(--text-secondary); }
    .money-value { font-size: 20px; font-weight: 700; color: var(--success); }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
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
      margin-bottom: 16px;
    }

    .sub-empty {
      color: var(--text-secondary);
      font-size: 14px;
      padding: 12px;
      font-style: italic;
    }

    .hub-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .hub-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
    }

    .hub-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hub-iata {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary-dark);
      width: 52px;
      text-align: center;
    }

    .hub-name { font-weight: 600; font-size: 15px; }
    .hub-detail { font-size: 12px; color: var(--text-secondary); }

    .hub-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-select, .form-input {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      flex: 1;
    }
    .form-select:focus, .form-input:focus { border-color: var(--primary-light); }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
    }

    .route-card { padding: 16px 20px; }

    .route-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .route-airports {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-code { font-size: 22px; font-weight: 800; color: var(--primary-dark); }
    .route-arrow { font-size: 18px; color: var(--primary-lighter); }

    .route-meta {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .route-details {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
      padding: 10px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
    }

    .detail { display: flex; flex-direction: column; }
    .dl { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
    .dv { font-size: 13px; font-weight: 600; }

    .detail-label {
      font-size: 12px;
      color: var(--text-secondary);
      display: block;
      margin-bottom: 6px;
    }

    .assign-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .buy-route { padding: 20px; }
    .buy-route h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 12px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

    .form-action { justify-content: flex-end; }
  `]
})
export class ManageRoutesComponent implements OnInit {
  state?: GameState;
  newRoute = { from: '', to: '', price: 250 };

  constructor(public router: Router, private gameState: GameStateService) {}

  ngOnInit(): void {
    this.gameState.state$.subscribe(s => this.state = s);
  }

  getAirport(id: string): Airport | undefined {
    return AIRPORTS.find(a => a.id === id);
  }

  getAvailableDestinations(): Airport[] {
    return AIRPORTS.filter(a => a.id !== this.newRoute.from);
  }

  getAvailableAircraft(routeId: string) {
    return this.state?.aircraft.filter(ac => !ac.assignedRouteId || ac.assignedRouteId === routeId) || [];
  }

  addSlot(airportId: string): void {
    this.gameState.buyHub(airportId);
  }

  createRoute(): void {
    if (!this.newRoute.from || !this.newRoute.to || !this.newRoute.price) return;
    this.gameState.buyRoute(this.newRoute.from, this.newRoute.to, this.newRoute.price);
    this.newRoute = { from: '', to: '', price: 250 };
  }

  removeRoute(routeId: string): void {
    if (confirm('Remove this route?')) {
      this.gameState.removeRoute(routeId);
    }
  }

  assignAircraft(event: Event, routeId: string): void {
    const aircraftId = (event.target as HTMLSelectElement).value;
    if (aircraftId) {
      this.gameState.assignAircraftToRoute(aircraftId, routeId);
    } else {
      this.gameState.unassignAircraftFromRoute(routeId);
    }
  }

  goBack(): void { this.router.navigate(['/game']); }
}

