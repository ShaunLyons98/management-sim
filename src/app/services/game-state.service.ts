import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PassengerMix {
  /** Annual throughput in millions */
  annualPax: number;
  /** Fraction travelling economy (0–1) */
  ecoShare: number;
  /** Fraction travelling business (0–1) */
  businessShare: number;
  /** Fraction travelling first class (0–1) */
  firstShare: number;
}

export interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  iata: string;
  lat: number;
  lng: number;
  slots: number;
  passengerMix: PassengerMix;
}

export interface Hub {
  airportId: string;
  purchasedSlots: number;
  cost: number;
}

export interface SeatConfig {
  economy: number;
  business: number;
  first: number;
}

export interface Aircraft {
  id: string;
  name: string;
  model: string;
  /** Total seat capacity (sum of seatConfig when configured) */
  capacity: number;
  range: number;
  speed: number;
  cost: number;
  operatingCost: number;
  assignedRouteId?: string;
  seatConfig: SeatConfig;
}

export interface Route {
  id: string;
  fromAirportId: string;
  toAirportId: string;
  aircraftId?: string;
  /** Economy ticket price */
  price: number;
  /** Business class ticket price */
  businessPrice: number;
  /** First class ticket price */
  firstPrice: number;
  distance: number;
  active: boolean;
}

/** A single scheduled flight slot within the weekly schedule */
export interface ScheduleSlot {
  id: string;
  routeId: string;
  aircraftId: string;
  /** 0=Mon … 6=Sun */
  dayOfWeek: number;
  /** Departure hour (0–23) */
  departureHour: number;
  /** Departure minute (0 or 30) */
  departureMinute: number;
}

export interface GameState {
  money: number;
  day: number;
  hour: number;
  minute: number;
  paused: boolean;
  speed: number;
  aircraft: Aircraft[];
  routes: Route[];
  hubs: Hub[];
  schedule: ScheduleSlot[];
}

export const AIRPORTS: Airport[] = [
  { id: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', iata: 'LHR', lat: 51.4775, lng: -0.4614, slots: 10, passengerMix: { annualPax: 80.9, ecoShare: 0.72, businessShare: 0.22, firstShare: 0.06 } },
  { id: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', iata: 'JFK', lat: 40.6413, lng: -73.7781, slots: 10, passengerMix: { annualPax: 62.6, ecoShare: 0.75, businessShare: 0.20, firstShare: 0.05 } },
  { id: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', iata: 'CDG', lat: 49.0097, lng: 2.5479, slots: 10, passengerMix: { annualPax: 76.2, ecoShare: 0.74, businessShare: 0.21, firstShare: 0.05 } },
  { id: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', iata: 'DXB', lat: 25.2532, lng: 55.3657, slots: 10, passengerMix: { annualPax: 86.4, ecoShare: 0.70, businessShare: 0.24, firstShare: 0.06 } },
  { id: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', iata: 'NRT', lat: 35.7647, lng: 140.3864, slots: 10, passengerMix: { annualPax: 35.5, ecoShare: 0.76, businessShare: 0.19, firstShare: 0.05 } },
  { id: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', iata: 'SIN', lat: 1.3644, lng: 103.9915, slots: 10, passengerMix: { annualPax: 68.3, ecoShare: 0.71, businessShare: 0.23, firstShare: 0.06 } },
  { id: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia', iata: 'SYD', lat: -33.9399, lng: 151.1753, slots: 10, passengerMix: { annualPax: 44.4, ecoShare: 0.78, businessShare: 0.18, firstShare: 0.04 } },
  { id: 'GRU', name: 'São Paulo-Guarulhos International', city: 'São Paulo', country: 'Brazil', iata: 'GRU', lat: -23.4356, lng: -46.4731, slots: 10, passengerMix: { annualPax: 41.0, ecoShare: 0.80, businessShare: 0.17, firstShare: 0.03 } },
  { id: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', iata: 'YYZ', lat: 43.6777, lng: -79.6248, slots: 10, passengerMix: { annualPax: 50.5, ecoShare: 0.77, businessShare: 0.19, firstShare: 0.04 } },
  { id: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', iata: 'FRA', lat: 50.0379, lng: 8.5622, slots: 10, passengerMix: { annualPax: 70.5, ecoShare: 0.73, businessShare: 0.22, firstShare: 0.05 } },
  { id: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', iata: 'AMS', lat: 52.3086, lng: 4.7639, slots: 10, passengerMix: { annualPax: 71.7, ecoShare: 0.75, businessShare: 0.20, firstShare: 0.05 } },
  { id: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China', iata: 'HKG', lat: 22.3080, lng: 113.9185, slots: 10, passengerMix: { annualPax: 71.5, ecoShare: 0.69, businessShare: 0.24, firstShare: 0.07 } },
  { id: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', iata: 'ICN', lat: 37.4602, lng: 126.4407, slots: 10, passengerMix: { annualPax: 71.2, ecoShare: 0.74, businessShare: 0.21, firstShare: 0.05 } },
  { id: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', iata: 'LAX', lat: 33.9425, lng: -118.4081, slots: 10, passengerMix: { annualPax: 88.1, ecoShare: 0.76, businessShare: 0.19, firstShare: 0.05 } },
  { id: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'USA', iata: 'ORD', lat: 41.9742, lng: -87.9073, slots: 10, passengerMix: { annualPax: 79.8, ecoShare: 0.78, businessShare: 0.18, firstShare: 0.04 } },
  { id: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'Spain', iata: 'MAD', lat: 40.4936, lng: -3.5668, slots: 10, passengerMix: { annualPax: 61.8, ecoShare: 0.77, businessShare: 0.19, firstShare: 0.04 } },
  { id: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', iata: 'BCN', lat: 41.2971, lng: 2.0785, slots: 10, passengerMix: { annualPax: 52.7, ecoShare: 0.79, businessShare: 0.17, firstShare: 0.04 } },
  { id: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', iata: 'MXP', lat: 45.6306, lng: 8.7281, slots: 10, passengerMix: { annualPax: 28.8, ecoShare: 0.80, businessShare: 0.17, firstShare: 0.03 } },
  { id: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', iata: 'BKK', lat: 13.6900, lng: 100.7501, slots: 10, passengerMix: { annualPax: 65.4, ecoShare: 0.73, businessShare: 0.22, firstShare: 0.05 } },
  { id: 'MEX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', iata: 'MEX', lat: 19.4363, lng: -99.0721, slots: 10, passengerMix: { annualPax: 47.7, ecoShare: 0.81, businessShare: 0.16, firstShare: 0.03 } },
  { id: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa', iata: 'JNB', lat: -26.1367, lng: 28.2411, slots: 10, passengerMix: { annualPax: 21.2, ecoShare: 0.79, businessShare: 0.18, firstShare: 0.03 } },
  { id: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', iata: 'CAI', lat: 30.1219, lng: 31.4056, slots: 10, passengerMix: { annualPax: 19.7, ecoShare: 0.82, businessShare: 0.15, firstShare: 0.03 } },
  { id: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', iata: 'MUC', lat: 48.3538, lng: 11.7861, slots: 10, passengerMix: { annualPax: 47.9, ecoShare: 0.74, businessShare: 0.21, firstShare: 0.05 } },
  { id: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', iata: 'ZRH', lat: 47.4647, lng: 8.5492, slots: 10, passengerMix: { annualPax: 31.5, ecoShare: 0.70, businessShare: 0.24, firstShare: 0.06 } },
  { id: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', iata: 'CPT', lat: -33.9715, lng: 18.6021, slots: 10, passengerMix: { annualPax: 10.5, ecoShare: 0.80, businessShare: 0.17, firstShare: 0.03 } },
];

export const AIRCRAFT_CATALOG: Omit<Aircraft, 'id' | 'assignedRouteId'>[] = [
  { name: 'Turboprop', model: 'ATR 72-600', capacity: 70, range: 1528, speed: 510, cost: 5000000, operatingCost: 800, seatConfig: { economy: 68, business: 2, first: 0 } },
  { name: 'Regional Jet', model: 'Bombardier CRJ-900', capacity: 90, range: 2800, speed: 820, cost: 8000000, operatingCost: 1200, seatConfig: { economy: 82, business: 8, first: 0 } },
  { name: 'Narrowbody', model: 'Boeing 737-800', capacity: 162, range: 5765, speed: 842, cost: 35000000, operatingCost: 2800, seatConfig: { economy: 144, business: 18, first: 0 } },
  { name: 'Next-Gen Narrowbody', model: 'Airbus A320neo', capacity: 165, range: 6300, speed: 833, cost: 42000000, operatingCost: 2600, seatConfig: { economy: 148, business: 17, first: 0 } },
  { name: 'Widebody', model: 'Boeing 767-300ER', capacity: 218, range: 11093, speed: 851, cost: 55000000, operatingCost: 4500, seatConfig: { economy: 174, business: 38, first: 6 } },
  { name: 'Next-Gen Widebody', model: 'Boeing 787-9', capacity: 296, range: 14140, speed: 903, cost: 95000000, operatingCost: 5800, seatConfig: { economy: 247, business: 42, first: 7 } },
  { name: 'Long-Haul Widebody', model: 'Boeing 777-300ER', capacity: 396, range: 13650, speed: 905, cost: 120000000, operatingCost: 7500, seatConfig: { economy: 316, business: 68, first: 12 } },
  { name: 'Super Jumbo', model: 'Airbus A380', capacity: 555, range: 15200, speed: 903, cost: 180000000, operatingCost: 10000, seatConfig: { economy: 421, business: 97, first: 14 } },
];

/** Load factors (fraction of seats sold) per cabin class */
const ECONOMY_LOAD_FACTOR = 0.80;
const BUSINESS_LOAD_FACTOR = 0.70;
const FIRST_LOAD_FACTOR = 0.65;

/** Revenue multiplier relative to economy base fare */
export const BUSINESS_FARE_MULTIPLIER = 2.5;
export const FIRST_FARE_MULTIPLIER = 4.0;

/** Ground turnaround time added to every flight when checking schedule conflicts (minutes) */
export const TURNAROUND_MINUTES = 60;

/** Game epoch – the in-game calendar starts on this date */
export const GAME_START_DATE = new Date(2024, 0, 1); // 1 Jan 2024

/** Convert a game day number (1-based) to a human-readable date string e.g. "Mon 1 Jan 2024" */
export function formatGameDate(day: number): string {
  const d = new Date(GAME_START_DATE.getTime() + (day - 1) * 86400000);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Suggest economy/business/first prices for a route based on distance */
export function suggestPrices(distanceKm: number): { economy: number; business: number; first: number } {
  const economy = Math.round((50 + distanceKm * 0.08) / 10) * 10;
  const business = Math.round(economy * BUSINESS_FARE_MULTIPLIER / 10) * 10;
  const first = Math.round(economy * FIRST_FARE_MULTIPLIER / 10) * 10;
  return { economy, business, first };
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private state: GameState = {
    money: 500000000,
    day: 1,
    hour: 8,
    minute: 0,
    paused: false,
    speed: 1,
    aircraft: [],
    routes: [],
    hubs: [],
    schedule: []
  };

  private stateSubject = new BehaviorSubject<GameState>({ ...this.state });
  state$ = this.stateSubject.asObservable();

  private tickInterval?: ReturnType<typeof setInterval>;
  private readonly TICK_MS = 1000;

  constructor() {
    this.startClock();
  }

  get currentState(): GameState { return { ...this.state }; }
  get airports(): Airport[] { return AIRPORTS; }
  get aircraftCatalog() { return AIRCRAFT_CATALOG; }

  startClock(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      if (!this.state.paused) {
        this.tick();
      }
    }, this.TICK_MS);
  }

  private tick(): void {
    const minsPerTick = 10 * this.state.speed;
    this.state.minute += minsPerTick;
    while (this.state.minute >= 60) {
      this.state.minute -= 60;
      this.state.hour++;
    }
    while (this.state.hour >= 24) {
      this.state.hour -= 24;
      this.state.day++;
      this.processDaily();
    }
    this.stateSubject.next({ ...this.state });
  }

  private processDaily(): void {
    let dailyRevenue = 0;
    let dailyCosts = 0;
    this.state.routes.forEach(route => {
      if (route.active && route.aircraftId) {
        const aircraft = this.state.aircraft.find(a => a.id === route.aircraftId);
        if (aircraft) {
          const flightTime = route.distance / aircraft.speed;
          const dailyFlights = Math.floor(20 / flightTime);
          const sc = aircraft.seatConfig;
          const revenuePerFlight =
            sc.economy  * route.price         * ECONOMY_LOAD_FACTOR +
            sc.business * route.businessPrice  * BUSINESS_LOAD_FACTOR +
            sc.first    * route.firstPrice     * FIRST_LOAD_FACTOR;
          dailyRevenue += dailyFlights * revenuePerFlight;
          dailyCosts += flightTime * aircraft.operatingCost * dailyFlights;
        }
      }
    });
    this.state.aircraft.forEach(a => {
      dailyCosts += a.operatingCost * 0.2;
    });
    this.state.money += (dailyRevenue - dailyCosts);
    this.stateSubject.next({ ...this.state });
  }

  setPaused(paused: boolean): void {
    this.state.paused = paused;
    this.stateSubject.next({ ...this.state });
  }

  setSpeed(speed: number): void {
    this.state.speed = speed;
    this.stateSubject.next({ ...this.state });
  }

  buyAircraft(catalogIndex: number): boolean {
    const catalog = AIRCRAFT_CATALOG[catalogIndex];
    if (this.state.money < catalog.cost) return false;
    const aircraft: Aircraft = {
      ...catalog,
      seatConfig: { ...catalog.seatConfig },
      id: `ac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    this.state.money -= catalog.cost;
    this.state.aircraft.push(aircraft);
    this.stateSubject.next({ ...this.state });
    return true;
  }

  sellAircraft(aircraftId: string): void {
    const idx = this.state.aircraft.findIndex(a => a.id === aircraftId);
    if (idx === -1) return;
    const aircraft = this.state.aircraft[idx];
    this.state.money += aircraft.cost * 0.5;
    const route = this.state.routes.find(r => r.aircraftId === aircraftId);
    if (route) route.aircraftId = undefined;
    this.state.aircraft.splice(idx, 1);
    this.stateSubject.next({ ...this.state });
  }

  buyHub(airportId: string): boolean {
    const existing = this.state.hubs.find(h => h.airportId === airportId);
    if (existing) {
      const slotCost = 2000000;
      if (this.state.money < slotCost) return false;
      existing.purchasedSlots++;
      this.state.money -= slotCost;
    } else {
      const hubCost = 10000000;
      if (this.state.money < hubCost) return false;
      this.state.hubs.push({ airportId, purchasedSlots: 1, cost: hubCost });
      this.state.money -= hubCost;
    }
    this.stateSubject.next({ ...this.state });
    return true;
  }

  getHub(airportId: string): Hub | undefined {
    return this.state.hubs.find(h => h.airportId === airportId);
  }

  hasHub(airportId: string): boolean {
    return !!this.state.hubs.find(h => h.airportId === airportId);
  }

  buyRoute(fromAirportId: string, toAirportId: string, price: number, businessPrice?: number, firstPrice?: number): boolean {
    const routeCost = 500000;
    if (this.state.money < routeCost) return false;
    if (!this.hasHub(fromAirportId)) return false;

    const from = AIRPORTS.find(a => a.id === fromAirportId)!;
    const to = AIRPORTS.find(a => a.id === toAirportId)!;
    const distance = this.calcDistance(from.lat, from.lng, to.lat, to.lng);
    const suggested = suggestPrices(distance);

    const route: Route = {
      id: `rt-${Date.now()}`,
      fromAirportId,
      toAirportId,
      price,
      businessPrice: businessPrice ?? suggested.business,
      firstPrice: firstPrice ?? suggested.first,
      distance,
      active: true
    };
    this.state.money -= routeCost;
    this.state.routes.push(route);
    this.stateSubject.next({ ...this.state });
    return true;
  }

  removeRoute(routeId: string): void {
    const idx = this.state.routes.findIndex(r => r.id === routeId);
    if (idx !== -1) {
      this.state.routes.splice(idx, 1);
      this.stateSubject.next({ ...this.state });
    }
  }

  assignAircraftToRoute(aircraftId: string, routeId: string): void {
    const prevRoute = this.state.routes.find(r => r.aircraftId === aircraftId);
    if (prevRoute) prevRoute.aircraftId = undefined;
    const aircraft = this.state.aircraft.find(a => a.id === aircraftId);
    if (aircraft) aircraft.assignedRouteId = routeId;
    const route = this.state.routes.find(r => r.id === routeId);
    if (route) route.aircraftId = aircraftId;
    this.stateSubject.next({ ...this.state });
  }

  unassignAircraftFromRoute(routeId: string): void {
    const route = this.state.routes.find(r => r.id === routeId);
    if (route) {
      const aircraft = this.state.aircraft.find(a => a.id === route.aircraftId);
      if (aircraft) aircraft.assignedRouteId = undefined;
      route.aircraftId = undefined;
      this.stateSubject.next({ ...this.state });
    }
  }

  updateSeatConfig(aircraftId: string, config: SeatConfig): void {
    const aircraft = this.state.aircraft.find(a => a.id === aircraftId);
    if (!aircraft) return;
    aircraft.seatConfig = { ...config };
    aircraft.capacity = config.economy + config.business + config.first;
    this.stateSubject.next({ ...this.state });
  }

  addScheduleSlot(slot: Omit<ScheduleSlot, 'id'>): void {
    const newSlot: ScheduleSlot = { ...slot, id: `sl-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` };
    this.state.schedule.push(newSlot);
    this.stateSubject.next({ ...this.state });
  }

  removeScheduleSlot(slotId: string): void {
    const idx = this.state.schedule.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      this.state.schedule.splice(idx, 1);
      this.stateSubject.next({ ...this.state });
    }
  }

  /** Flight duration in minutes for a given route and aircraft */
  getFlightDurationMins(routeId: string, aircraftId: string): number {
    const route = this.state.routes.find(r => r.id === routeId);
    const aircraft = this.state.aircraft.find(a => a.id === aircraftId);
    if (!route || !aircraft) return 0;
    return Math.ceil(route.distance / aircraft.speed * 60);
  }

  /**
   * Returns true if adding the slot would cause an overlap for the aircraft.
   * Checks across a flat weekly window; each slot occupies [depMins, depMins + duration + turnaround].
   */
  checkScheduleConflict(
    aircraftId: string,
    dayOfWeek: number,
    departureHour: number,
    departureMinute: number,
    routeId: string,
    excludeSlotId?: string
  ): boolean {
    const newStart = dayOfWeek * 24 * 60 + departureHour * 60 + departureMinute;
    const newDur = this.getFlightDurationMins(routeId, aircraftId);
    const newEnd = newStart + newDur + TURNAROUND_MINUTES;

    for (const slot of this.state.schedule) {
      if (slot.aircraftId !== aircraftId) continue;
      if (slot.id === excludeSlotId) continue;
      const slotStart = slot.dayOfWeek * 24 * 60 + slot.departureHour * 60 + slot.departureMinute;
      const slotDur = this.getFlightDurationMins(slot.routeId, slot.aircraftId);
      const slotEnd = slotStart + slotDur + TURNAROUND_MINUTES;
      // Overlap test
      if (newStart < slotEnd && newEnd > slotStart) return true;
    }
    return false;
  }

  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
}
