import { INITIAL_EVENTS, INITIAL_WEGOVY_LOGS, INITIAL_TRANSACTIONS, INITIAL_SETTINGS, INITIAL_MEALS, INITIAL_WORKOUTS } from './mockData.js?v=3.0.0';

const STORAGE_KEYS = {
  EVENTS: 'lifepulse_events',
  WEGOVY: 'lifepulse_wegovy',
  MEALS: 'lifepulse_meals',
  WORKOUTS: 'lifepulse_workouts',
  TRANSACTIONS: 'lifepulse_transactions',
  SETTINGS: 'lifepulse_settings',
  INITIALIZED: 'lifepulse_init_v4'
};

export class DataStore {
  constructor() {
    this.listeners = new Set();
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.resetToDefaults();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
    // 식사 및 운동 키가 누락되었을 경우 초기값 자동 보충
    if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(INITIAL_MEALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORKOUTS)) {
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(INITIAL_WORKOUTS));
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changeType) {
    this.listeners.forEach(fn => fn(changeType));
  }

  // --- GETTERS ---
  getEvents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS)) || [];
    } catch {
      return [];
    }
  }

  getWegovyLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEGOVY)) || [];
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch {
      return [];
    }
  }

  getMeals() {
    try {
      const meals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS)) || [];
      return meals.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch {
      return [];
    }
  }

  getWorkouts() {
    try {
      const workouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS)) || [];
      return workouts.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch {
      return [];
    }
  }

  getTransactions() {
    try {
      const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
      return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch {
      return [];
    }
  }

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  // --- SETTERS / MUTATORS ---
  saveEvent(event) {
    const events = this.getEvents();
    const idx = events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      if (!event.id) event.id = 'ev_' + Date.now();
      events.push(event);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify('events');
  }

  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify('events');
  }

  saveWegovyLog(log) {
    const logs = this.getWegovyLogs();
    const idx = logs.findIndex(l => l.id === log.id);
    if (idx >= 0) {
      logs[idx] = log;
    } else {
      if (!log.id) log.id = 'weg_' + Date.now();
      logs.push(log);
    }
    localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify(logs));
    this.notify('wegovy');
  }

  deleteWegovyLog(id) {
    const logs = this.getWegovyLogs().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify(logs));
    this.notify('wegovy');
  }

  clearAllWegovyLogs() {
    localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify([]));
    this.notify('wegovy');
  }

  saveMeal(meal) {
    const meals = this.getMeals();
    const idx = meals.findIndex(m => m.id === meal.id);
    if (idx >= 0) {
      meals[idx] = meal;
    } else {
      if (!meal.id) meal.id = 'meal_' + Date.now();
      meals.push(meal);
    }
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    this.notify('meals');
  }

  deleteMeal(id) {
    const meals = this.getMeals().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    this.notify('meals');
  }

  saveWorkout(workout) {
    const workouts = this.getWorkouts();
    const idx = workouts.findIndex(w => w.id === workout.id);
    if (idx >= 0) {
      workouts[idx] = workout;
    } else {
      if (!workout.id) workout.id = 'wo_' + Date.now();
      workouts.push(workout);
    }
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    this.notify('workouts');
  }

  deleteWorkout(id) {
    const workouts = this.getWorkouts().filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    this.notify('workouts');
  }

  saveTransaction(tx) {
    const txs = this.getTransactions();
    const idx = txs.findIndex(t => t.id === tx.id);
    if (idx >= 0) {
      txs[idx] = tx;
    } else {
      if (!tx.id) tx.id = 'tx_' + Date.now();
      txs.push(tx);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    this.notify('ledger');
  }

  deleteTransaction(id) {
    const txs = this.getTransactions().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    this.notify('ledger');
  }

  saveSettings(settings) {
    const curr = this.getSettings();
    const updated = { ...curr, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.notify('settings');
  }

  // --- BACKUP & RESTORE ---
  exportAllData() {
    return {
      version: '1.4',
      exportedAt: new Date().toISOString(),
      events: this.getEvents(),
      wegovyLogs: this.getWegovyLogs(),
      meals: this.getMeals(),
      workouts: this.getWorkouts(),
      transactions: this.getTransactions(),
      settings: this.getSettings()
    };
  }

  importAllData(data) {
    if (!data || typeof data !== 'object') throw new Error('유효하지 않은 데이터 포맷입니다.');
    if (Array.isArray(data.events)) localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events));
    if (Array.isArray(data.wegovyLogs)) localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify(data.wegovyLogs));
    if (Array.isArray(data.meals)) localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(data.meals));
    if (Array.isArray(data.workouts)) localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(data.workouts));
    if (Array.isArray(data.transactions)) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    this.notify('all');
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify(INITIAL_WEGOVY_LOGS));
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(INITIAL_MEALS));
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(INITIAL_WORKOUTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    this.notify('all');
  }

  clearAllSampleData() {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.WEGOVY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    this.notify('all');
  }
}

export const store = new DataStore();
