import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameStateService, GameState, AIRPORTS, Airport, suggestPrices } from '../../services/game-state.service';

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
        <!-- Hubs Section -->
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
                  <span class="chip">~{{ flightHours(route.distance) }}h flight</span>
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
                  <span class="dl">Economy</span>
                  <span class="dv">{{ route.price | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
                <div class="detail">
                  <span class="dl">Business</span>
                  <span class="dv">{{ route.businessPrice | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
                <div class="detail">
                  <span class="dl">First</span>
                  <span class="dv">{{ route.firstPrice | currency:'USD':'symbol':'1.0-0' }}</span>
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

            <!-- Origin / Destination selectors -->
            <div class="route-selectors">
              <div class="form-group">
                <label>From (Hub)</label>
                <select [(ngModel)]="newRoute.from" class="form-select" (change)="onRouteParamsChange()">
                  <option value="">Select Hub...</option>
                  <option *ngFor="let hub of state?.hubs" [value]="hub.airportId">
                    {{ getAirport(hub.airportId)?.iata }} - {{ getAirport(hub.airportId)?.city }}
                  </option>
                </select>
              </div>
              <div class="route-sep">→</div>
              <div class="form-group">
                <label>To</label>
                <select [(ngModel)]="newRoute.to" class="form-select" (change)="onRouteParamsChange()">
                  <option value="">Select Destination...</option>
                  <option *ngFor="let a of getAvailableDestinations()" [value]="a.id">
                    {{ a.iata }} - {{ a.city }}, {{ a.country }}
                  </option>
                </select>
              </div>
              <div class="route-distance" *ngIf="previewDistance > 0">
                <span class="dist-val">{{ previewDistance | number:'1.0-0' }} km</span>
                <span class="dist-lbl">~{{ flightHours(previewDistance) }}h flight</span>
              </div>
            </div>

            <!-- Pricing section -->
            <div class="pricing-section" *ngIf="newRoute.from && newRoute.to">
              <div class="pricing-header">
                <span class="pricing-title">Ticket Prices</span>
                <button class="suggest-btn" (click)="applySuggestedPrices()">✨ Apply Suggested</button>
              </div>
              <div class="pricing-grid">
                <div class="price-card eco-price">
                  <div class="price-class-label">Economy</div>
                  <div class="price-suggest" *ngIf="suggested.economy">Suggested: {{ suggested.economy | currency:'USD':'symbol':'1.0-0' }}</div>
                  <div class="price-input-wrap">
                    <span class="price-currency">$</span>
                    <input type="number" [(ngModel)]="newRoute.price" class="price-input"
                           min="10" max="99999" step="10" />
                  </div>
                </div>
                <div class="price-card biz-price">
                  <div class="price-class-label">Business</div>
                  <div class="price-suggest" *ngIf="suggested.business">Suggested: {{ suggested.business | currency:'USD':'symbol':'1.0-0' }}</div>
                  <div class="price-input-wrap">
                    <span class="price-currency">$</span>
                    <input type="number" [(ngModel)]="newRoute.businessPrice" class="price-input"
                           min="10" max="99999" step="10" />
                  </div>
                </div>
                <div class="price-card first-price">
                  <div class="price-class-label">First Class</div>
                  <div class="price-suggest" *ngIf="suggested.first">Suggested: {{ suggested.first | currency:'USD':'symbol':'1.0-0' }}</div>
                  <div class="price-input-wrap">
                    <span class="price-currency">$</span>
                    <input type="number" [(ngModel)]="newRoute.firstPrice" class="price-input"
                           min="10" max="99999" step="10" />
                  </div>
                </div>
              </div>
            </div>

            <div class="form-action-row">
              <button class="btn btn-primary"
                      [disabled]="!newRoute.from || !newRoute.to || !newRoute.price || (state?.money || 0) < 500000"
                      (click)="createRoute()">
                Open Route ($500K)
              </button>
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

    .money-display { display: flex; flex-direction: column; align-items: flex-end; }
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

    .section-title { font-size: 18px; font-weight: 700; color: var(--primary-dark); margin-bottom: 6px; }
    .section-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }

    .sub-empty { color: var(--text-secondary); font-size: 14px; padding: 12px; font-style: italic; }

    /* Hubs */
    .hub-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .hub-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; }
    .hub-info { display: flex; align-items: center; gap: 12px; }
    .hub-iata { font-size: 24px; font-weight: 800; color: var(--primary-dark); width: 52px; text-align: center; }
    .hub-name { font-weight: 600; font-size: 15px; }
    .hub-detail { font-size: 12px; color: var(--text-secondary); }
    .hub-actions { display: flex; align-items: center; gap: 8px; }

    /* Existing routes */
    .route-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
    .route-card { padding: 16px 20px; }

    .route-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .route-airports { display: flex; align-items: center; gap: 8px; }
    .route-code { font-size: 22px; font-weight: 800; color: var(--primary-dark); }
    .route-arrow { font-size: 18px; color: var(--primary-lighter); }
    .route-meta { display: flex; gap: 8px; align-items: center; }

    .route-details {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      padding: 10px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      flex-wrap: wrap;
    }
    .detail { display: flex; flex-direction: column; }
    .dl { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
    .dv { font-size: 13px; font-weight: 600; }

    .detail-label { font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 6px; }
    .assign-row { display: flex; gap: 8px; align-items: center; }

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

    /* New route form */
    .buy-route { padding: 20px; }
    .buy-route h4 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 16px; }

    .route-selectors {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .route-selectors .form-group { flex: 1; min-width: 180px; }
    .route-sep { font-size: 22px; font-weight: 800; color: var(--primary-lighter); padding-bottom: 8px; }

    .route-distance {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 14px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }
    .dist-val { font-size: 16px; font-weight: 700; color: var(--primary-dark); }
    .dist-lbl { font-size: 11px; color: var(--text-secondary); }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

    /* Pricing */
    .pricing-section { margin-bottom: 20px; }

    .pricing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .pricing-title { font-size: 14px; font-weight: 600; color: var(--text-secondary); }

    .suggest-btn {
      padding: 5px 14px;
      background: linear-gradient(135deg, #1565c0, #1976d2);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .suggest-btn:hover { opacity: 0.85; }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .price-card {
      padding: 14px;
      border-radius: var(--radius-sm);
      border: 2px solid transparent;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .eco-price   { background: #e3f2fd; border-color: #90caf9; }
    .biz-price   { background: #e8f5e9; border-color: #a5d6a7; }
    .first-price { background: #fff8e1; border-color: #ffe082; }

    .price-class-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
    .price-suggest { font-size: 11px; color: var(--text-secondary); }

    .price-input-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .price-currency { font-size: 16px; font-weight: 700; color: var(--text-secondary); }
    .price-input {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: white;
      color: var(--text);
      font-size: 15px;
      font-weight: 700;
      outline: none;
    }
    .price-input:focus { border-color: var(--primary-light); }

    .form-action-row {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class ManageRoutesComponent implements OnInit {
  state?: GameState;
  newRoute = { from: '', to: '', price: 250, businessPrice: 625, firstPrice: 1000 };
  previewDistance = 0;
  suggested = { economy: 0, business: 0, first: 0 };

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

  onRouteParamsChange(): void {
    if (!this.newRoute.from || !this.newRoute.to) {
      this.previewDistance = 0;
      this.suggested = { economy: 0, business: 0, first: 0 };
      return;
    }
    const from = AIRPORTS.find(a => a.id === this.newRoute.from);
    const to = AIRPORTS.find(a => a.id === this.newRoute.to);
    if (!from || !to) return;
    const R = 6371;
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    this.previewDistance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    this.suggested = suggestPrices(this.previewDistance);
  }

  applySuggestedPrices(): void {
    this.newRoute.price = this.suggested.economy;
    this.newRoute.businessPrice = this.suggested.business;
    this.newRoute.firstPrice = this.suggested.first;
  }

  flightHours(distanceKm: number): string {
    const avgSpeed = 850;
    const hours = distanceKm / avgSpeed;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  addSlot(airportId: string): void {
    this.gameState.buyHub(airportId);
  }

  createRoute(): void {
    if (!this.newRoute.from || !this.newRoute.to || !this.newRoute.price) return;
    this.gameState.buyRoute(
      this.newRoute.from,
      this.newRoute.to,
      this.newRoute.price,
      this.newRoute.businessPrice,
      this.newRoute.firstPrice
    );
    this.newRoute = { from: '', to: '', price: 250, businessPrice: 625, firstPrice: 1000 };
    this.previewDistance = 0;
    this.suggested = { economy: 0, business: 0, first: 0 };
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
