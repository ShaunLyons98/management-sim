import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GameStateService, GameState, Airport, Route, AIRPORTS, formatGameDate } from '../../services/game-state.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container">

      <!-- ── Top navigation bar ── -->
      <div class="top-bar animate-fade-in">
        <div class="top-bar-brand" (click)="goToMenu()">✈ AirSim</div>
        <nav class="top-nav">
          <button class="nav-btn" (click)="navigate('/buy-aircraft')">
            <span class="nav-icon">🛒</span> Buy Aircraft
          </button>
          <button class="nav-btn" (click)="navigate('/manage-aircraft')">
            <span class="nav-icon">✈️</span> Fleet
          </button>
          <button class="nav-btn" (click)="navigate('/manage-routes')">
            <span class="nav-icon">🗺️</span> Routes
          </button>
          <button class="nav-btn" (click)="navigate('/scheduler')">
            <span class="nav-icon">📅</span> Schedule
          </button>
        </nav>
      </div>

      <!-- ── Map (fills between top and bottom bars) ── -->
      <div #mapContainer class="map-container"></div>

      <!-- ── Airport info popup (above bottom bar) ── -->
      <div class="airport-panel animate-fade-in" *ngIf="selectedAirport">
        <div class="airport-panel-header">
          <div>
            <div class="airport-iata">{{ selectedAirport.iata }}</div>
            <div class="airport-name">{{ selectedAirport.name }}</div>
            <div class="airport-city">{{ selectedAirport.city }}, {{ selectedAirport.country }}</div>
          </div>
          <button class="close-btn" (click)="selectedAirport = null">✕</button>
        </div>
        <div class="airport-panel-body">
          <div class="pax-stats">
            <div class="pax-row">
              <span class="pax-label">Annual Pax</span>
              <span class="pax-val">{{ selectedAirport.passengerMix.annualPax }}M</span>
            </div>
            <div class="pax-row">
              <span class="pax-label">Economy</span>
              <span class="pax-val">{{ (selectedAirport.passengerMix.ecoShare * 100) | number:'1.0-0' }}%</span>
            </div>
            <div class="pax-row">
              <span class="pax-label">Business</span>
              <span class="pax-val">{{ (selectedAirport.passengerMix.businessShare * 100) | number:'1.0-0' }}%</span>
            </div>
            <div class="pax-row">
              <span class="pax-label">First Class</span>
              <span class="pax-val">{{ (selectedAirport.passengerMix.firstShare * 100) | number:'1.0-0' }}%</span>
            </div>
          </div>
          <div class="hub-status" *ngIf="isHub(selectedAirport.id)">
            <span class="badge badge-success">✓ Hub Owned</span>
            <span class="chip">{{ getHubSlots(selectedAirport.id) }} slots</span>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px" (click)="buyHub(selectedAirport)">
            {{ isHub(selectedAirport.id) ? '+ Add Slot ($2M)' : '🏢 Buy Hub ($10M)' }}
          </button>
          <div class="route-count" *ngIf="getRoutesFromAirport(selectedAirport.id).length > 0">
            <span>{{ getRoutesFromAirport(selectedAirport.id).length }} route(s) from here</span>
          </div>
        </div>
      </div>

      <!-- ── Bottom HUD bar ── -->
      <div class="bottom-bar animate-fade-in">
        <div class="bottom-stats">
          <div class="stat-item">
            <span class="stat-label">Cash</span>
            <span class="stat-value money">{{ state?.money | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Fleet</span>
            <span class="stat-value">{{ state?.aircraft?.length || 0 }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Routes</span>
            <span class="stat-value">{{ state?.routes?.length || 0 }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Hubs</span>
            <span class="stat-value">{{ state?.hubs?.length || 0 }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Flights/wk</span>
            <span class="stat-value">{{ state?.schedule?.length || 0 }}</span>
          </div>
        </div>

        <div class="time-block">
          <div class="time-date">{{ formatGameDate(state?.day || 1) }}</div>
          <div class="time-clock">{{ formatTime(state?.hour || 0, state?.minute || 0) }}</div>
          <div class="time-controls">
            <button class="time-btn" (click)="togglePause()" [title]="state?.paused ? 'Resume' : 'Pause'">
              {{ state?.paused ? '▶' : '⏸' }}
            </button>
            <button class="time-btn" [class.active]="state?.speed === 1" (click)="setSpeed(1)">1×</button>
            <button class="time-btn" [class.active]="state?.speed === 2" (click)="setSpeed(2)">2×</button>
            <button class="time-btn" [class.active]="state?.speed === 4" (click)="setSpeed(4)">4×</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .game-container {
      width: 100vw;
      height: 100vh;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Top bar ── */
    .top-bar {
      position: relative;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 10px var(--shadow);
      display: flex;
      align-items: center;
      padding: 0 16px;
      height: 52px;
      gap: 16px;
      flex-shrink: 0;
    }

    .top-bar-brand {
      font-size: 18px;
      font-weight: 800;
      color: var(--primary-dark);
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.2s;
      margin-right: 8px;
    }
    .top-bar-brand:hover { color: var(--primary-lighter); }

    .top-nav {
      display: flex;
      gap: 4px;
      flex: 1;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s;
      white-space: nowrap;
    }
    .nav-btn:hover {
      background: var(--primary-light);
      color: white;
      border-color: var(--primary-light);
      transform: translateY(-1px);
    }
    .nav-icon { font-size: 15px; }

    /* ── Map ── */
    .map-container {
      flex: 1;
      position: relative;
      z-index: 1;
    }

    /* ── Airport panel ── */
    .airport-panel {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border-radius: var(--radius);
      box-shadow: 0 4px 20px var(--shadow);
      border: 1px solid var(--border);
      min-width: 320px;
      overflow: hidden;
    }

    .airport-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 14px 16px;
      background: linear-gradient(135deg, #1565c0, #1976d2);
      color: white;
    }

    .airport-iata { font-size: 26px; font-weight: 800; letter-spacing: 2px; }
    .airport-name { font-size: 13px; font-weight: 600; opacity: 0.9; }
    .airport-city { font-size: 11px; opacity: 0.75; }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-size: 13px;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.35); }

    .airport-panel-body { padding: 14px 16px; }

    .pax-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
      padding: 10px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
    }
    .pax-row { display: flex; justify-content: space-between; align-items: center; }
    .pax-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
    .pax-val { font-size: 13px; font-weight: 700; color: var(--text); }

    .hub-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .route-count {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* ── Bottom bar ── */
    .bottom-bar {
      position: relative;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border-top: 1px solid var(--border);
      box-shadow: 0 -2px 10px var(--shadow);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      height: 60px;
      flex-shrink: 0;
      gap: 16px;
    }

    .bottom-stats {
      display: flex;
      align-items: center;
      gap: 0;
      flex: 1;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 20px;
    }

    .stat-label {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
    }
    .stat-value.money { color: var(--success); }

    .stat-divider {
      width: 1px;
      height: 28px;
      background: var(--border);
    }

    /* ── Time block (right side of bottom bar) ── */
    .time-block {
      display: flex;
      align-items: center;
      gap: 12px;
      border-left: 1px solid var(--border);
      padding-left: 20px;
    }

    .time-date {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .time-clock {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-dark);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .time-controls {
      display: flex;
      gap: 4px;
    }

    .time-btn {
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .time-btn:hover, .time-btn.active {
      background: var(--primary-light);
      color: white;
      border-color: var(--primary-light);
    }
  `]
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  state?: GameState;
  selectedAirport: Airport | null = null;

  private map?: L.Map;
  private markerMap = new Map<string, L.CircleMarker>();
  private routeLines = new Map<string, L.Polyline>();
  /** Animated aircraft-position dots keyed by scheduleSlot id */
  private aircraftDots = new Map<string, L.CircleMarker>();
  private sub?: Subscription;

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.gameState.state$.subscribe(s => {
      this.state = s;
      this.updateMapOverlays();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: true
    });

    // CartoDB Positron — clean white/grey/black style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    AIRPORTS.forEach(airport => {
      const marker = L.circleMarker([airport.lat, airport.lng], {
        radius: 5,
        fillColor: '#1976d2',
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(this.map!);

      marker.bindTooltip(`${airport.iata} — ${airport.city}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -8]
      });

      marker.on('click', () => {
        this.selectedAirport = airport;
        this.highlightMarker(airport.id);
      });

      this.markerMap.set(airport.id, marker);
    });
  }

  private highlightMarker(airportId: string): void {
    this.markerMap.forEach((marker, id) => {
      const isHub = this.gameState.hasHub(id);
      const isSelected = id === airportId;
      marker.setStyle({
        radius: isSelected ? 9 : (isHub ? 7 : 5),
        fillColor: isSelected ? '#e65100' : (isHub ? '#2e7d32' : '#1976d2'),
        fillOpacity: isSelected ? 1 : (isHub ? 0.9 : 0.85)
      });
    });
  }

  private updateMapOverlays(): void {
    if (!this.map || !this.state) return;

    this.markerMap.forEach((marker, id) => {
      const isHub = this.gameState.hasHub(id);
      const isSelected = this.selectedAirport?.id === id;
      marker.setStyle({
        radius: isSelected ? 9 : (isHub ? 7 : 5),
        fillColor: isSelected ? '#e65100' : (isHub ? '#2e7d32' : '#1976d2'),
        fillOpacity: isSelected ? 1 : (isHub ? 0.9 : 0.85),
        weight: isHub ? 2.5 : 1.5
      });
    });

    const currentRouteIds = new Set(this.state.routes.map(r => r.id));

    this.routeLines.forEach((line, id) => {
      if (!currentRouteIds.has(id)) {
        line.remove();
        this.routeLines.delete(id);
      }
    });

    this.state.routes.forEach(route => {
      const from = AIRPORTS.find(a => a.id === route.fromAirportId);
      const to = AIRPORTS.find(a => a.id === route.toAirportId);
      if (!from || !to) return;

      if (!this.routeLines.has(route.id)) {
        const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color: route.aircraftId ? '#1565c0' : '#90caf9',
          weight: route.aircraftId ? 2 : 1.5,
          opacity: 0.75,
          dashArray: route.aircraftId ? undefined : '6, 8'
        }).addTo(this.map!);

        line.bindTooltip(`${from.iata} → ${to.iata} | ${route.distance} km`, { direction: 'top' });
        this.routeLines.set(route.id, line);
      } else {
        this.routeLines.get(route.id)!.setStyle({
          color: route.aircraftId ? '#1565c0' : '#90caf9',
          weight: route.aircraftId ? 2 : 1.5,
          dashArray: route.aircraftId ? undefined : '6, 8'
        });
      }
    });
    this.updateAircraftDots();
  }

  formatTime(h: number, m: number): string {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatGameDate(day: number): string { return formatGameDate(day); }

  togglePause(): void { this.gameState.setPaused(!this.state?.paused); }
  setSpeed(s: number): void { this.gameState.setSpeed(s); }

  isHub(airportId: string): boolean { return this.gameState.hasHub(airportId); }

  getHubSlots(airportId: string): number {
    return this.gameState.getHub(airportId)?.purchasedSlots || 0;
  }

  getRoutesFromAirport(airportId: string): Route[] {
    return this.state?.routes.filter(r => r.fromAirportId === airportId) || [];
  }

  buyHub(airport: Airport): void {
    this.gameState.buyHub(airport.id);
  }

  navigate(path: string): void { this.router.navigate([path]); }
  goToMenu(): void { this.router.navigate(['/menu']); }

  /** Update animated aircraft position dots for all flying schedule slots */
  private updateAircraftDots(): void {
    if (!this.map || !this.state) return;
    const WEEK_MINS = 7 * 24 * 60;
    const dayOfWeek = (this.state.day - 1) % 7;
    const currentMins = dayOfWeek * 24 * 60 + this.state.hour * 60 + this.state.minute;

    const activeSlotIds = new Set<string>();

    for (const slot of this.state.schedule) {
      const route = this.state.routes.find(r => r.id === slot.routeId);
      const aircraft = this.state.aircraft.find(a => a.id === slot.aircraftId);
      if (!route || !aircraft) continue;

      const from = AIRPORTS.find(a => a.id === route.fromAirportId);
      const to = AIRPORTS.find(a => a.id === route.toAirportId);
      if (!from || !to) continue;

      const depMins = slot.dayOfWeek * 24 * 60 + slot.departureHour * 60 + slot.departureMinute;
      const durationMins = Math.ceil(route.distance / aircraft.speed * 60);
      const arrMins = depMins + durationMins;

      if (currentMins < depMins || currentMins >= arrMins) {
        // Not flying this tick
        if (this.aircraftDots.has(slot.id)) {
          this.aircraftDots.get(slot.id)!.remove();
          this.aircraftDots.delete(slot.id);
        }
        continue;
      }

      const t = (currentMins - depMins) / durationMins;
      const lat = from.lat + t * (to.lat - from.lat);
      const lng = from.lng + t * (to.lng - from.lng);

      activeSlotIds.add(slot.id);

      if (!this.aircraftDots.has(slot.id)) {
        const dot = L.circleMarker([lat, lng], {
          radius: 7,
          fillColor: '#ff6f00',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(this.map);
        dot.bindTooltip(`✈ ${from.iata} → ${to.iata} · ${aircraft.name}`, { direction: 'top' });
        this.aircraftDots.set(slot.id, dot);
      } else {
        this.aircraftDots.get(slot.id)!.setLatLng([lat, lng]);
      }
    }

    // Clean up dots for removed slots
    this.aircraftDots.forEach((dot, id) => {
      if (!activeSlotIds.has(id)) {
        dot.remove();
        this.aircraftDots.delete(id);
      }
    });
  }
}
