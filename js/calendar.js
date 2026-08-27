/**
 * 캘린더 렌더링 및 원클릭 직관적 입력 인터랙션 엔진
 */
import { store } from './storage.js?v=3.0.0';
import { checkHoliday } from './holidays.js?v=3.0.0';
import { getDailyLedgerMap } from './ledger.js?v=3.0.0';
import { MEDICATIONS, getActiveMedication } from './wegovy.js?v=3.0.0';
import { getMonthlyMealMap, getDailyMealsSummary, MEAL_TYPES, SATIETY_LEVELS } from './meals.js?v=3.0.0';
import { getMonthlyWorkoutMap, getDailyWorkoutsSummary, WORKOUT_TYPES } from './workouts.js?v=3.0.0';

export class CalendarView {
  constructor(app) {
    this.app = app;
    this.currentDate = new Date(); // 기준 날짜
    this.viewMode = 'month'; // 'month' | 'week' | 'day' | 'list'
    this.container = document.getElementById('calendarContainer');
  }

  setDate(year, month, day = 1) {
    this.currentDate = new Date(year, month - 1, day);
    this.render();
  }

  next() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else if (this.viewMode === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }
    this.render();
  }

  prev() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else if (this.viewMode === 'day') {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }
    this.render();
  }

  today() {
    this.currentDate = new Date();
    this.render();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  render() {
    if (!this.container) return;
    this.updateHeaderTitle();

    if (this.viewMode === 'month') {
      this.renderMonthView();
    } else if (this.viewMode === 'week') {
      this.renderWeekView();
    } else if (this.viewMode === 'day') {
      this.renderDayView();
    } else if (this.viewMode === 'list') {
      this.renderListView();
    }
  }

  updateHeaderTitle() {
    const label = document.getElementById('currentPeriodLabel');
    if (!label) return;

    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth() + 1;
    const d = this.currentDate.getDate();

    if (this.viewMode === 'month') {
      label.textContent = `${y}년 ${m}월`;
    } else if (this.viewMode === 'week') {
      const weekNum = Math.ceil(d / 7);
      label.textContent = `${y}년 ${m}월 ${weekNum}주차`;
    } else if (this.viewMode === 'day') {
      label.textContent = `${y}년 ${m}월 ${d}일`;
    } else {
      label.textContent = `${y}년 ${m}월 목록`;
    }
  }

  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0: 일요일
    const lastDate = new Date(year, month, 0).getDate();
    const prevMonthLastDate = new Date(year, month - 1, 0).getDate();

    const events = (store.getEvents && typeof store.getEvents === 'function') ? store.getEvents() : [];
    const wegovyLogs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs() : [];
    const ledgerMap = getDailyLedgerMap(year, month);
    const mealMap = getMonthlyMealMap(year, month);
    const workoutMap = getMonthlyWorkoutMap(year, month);
    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    const filters = settings.layerFilters || { events: true, wegovy: true, meals: true, workouts: true, ledger: true };

    const todayStr = new Date().toISOString().substring(0, 10);
    const pad = (n) => String(n).padStart(2, '0');

    let cellsHtml = '';

    // 이전 달 빈 날짜 채우기
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = prevMonthLastDate - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const prevDateStr = `${prevY}-${pad(prevM)}-${pad(prevD)}`;
      const holiday = checkHoliday(prevDateStr);

      cellsHtml += `
        <div class="calendar-day other-month ${holiday.isHoliday ? 'is-holiday' : ''}" data-date="${prevDateStr}">
          <div class="day-cell-top">
            <span class="day-number">${prevD}</span>
            ${holiday.isHoliday ? `<span class="holiday-name">${holiday.name}</span>` : ''}
          </div>
        </div>
      `;
    }

    // 이번 달 날짜 렌더링
    for (let day = 1; day <= lastDate; day++) {
      const dateStr = `${year}-${pad(month)}-${pad(day)}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      const isToday = dateStr === todayStr;
      const holiday = checkHoliday(dateStr);
      const isSun = dayOfWeek === 0;
      const isSat = dayOfWeek === 6;

      const dayEvents = filters.events ? events.filter(e => e && e.date === dateStr) : [];
      const dayWegovy = filters.wegovy ? wegovyLogs.filter(l => l && l.date === dateStr) : [];
      const dayMeals = filters.meals ? mealMap[dateStr] : null;
      const dayWorkouts = filters.workouts ? workoutMap[dateStr] : null;
      const dayLedger = filters.ledger ? ledgerMap[dateStr] : null;

      let itemsHtml = '';

      // 1. 투약/체중 배지
      if (dayWegovy.length > 0) {
        dayWegovy.forEach(log => {
          const med = MEDICATIONS[log.medication] || getActiveMedication();
          const isMed = med.isMedication !== false;
          itemsHtml += `
            <div class="item-chip chip-wegovy" data-chip-type="wegovy" data-id="${log.id}" data-date="${dateStr}" style="border-left-color: ${med.color}; color: ${med.color}; background: ${med.color}15;" title="${isMed ? `${med.name} 투약: ${log.dose}` : `체중: ${log.weight || '-'}kg`}">
              <span class="chip-icon">${isMed ? '💉' : '⚖️'}</span>
              <span class="chip-title">${isMed ? `${med.shortName} ${log.dose}` : `${log.weight ? `${log.weight}kg` : '체중'}`}</span>
              ${isMed && log.weight ? `<span class="chip-sub">${log.weight}k</span>` : ''}
            </div>
          `;
        });
      }

      // 2. 식사/섭취 칼로리 배지
      if (dayMeals && dayMeals.totalKcal > 0) {
        itemsHtml += `
          <div class="item-chip chip-meal" data-chip-type="meal" data-date="${dateStr}" style="border-left-color: #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.12);" title="식사 ${dayMeals.count}회 (+${dayMeals.totalKcal} kcal)">
            <span class="chip-icon">🍽️</span>
            <span class="chip-title">+${dayMeals.totalKcal}k</span>
          </div>
        `;
      }

      // 3. 운동/소모 칼로리 배지
      if (dayWorkouts && dayWorkouts.totalBurnedKcal > 0) {
        itemsHtml += `
          <div class="item-chip chip-workout" data-chip-type="workout" data-date="${dateStr}" style="border-left-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.12);" title="운동 ${dayWorkouts.totalDurationMin}분 (-${dayWorkouts.totalBurnedKcal} kcal)">
            <span class="chip-icon">🏃</span>
            <span class="chip-title">-${dayWorkouts.totalBurnedKcal}k</span>
          </div>
        `;
      }

      // 4. 일반 일정 배지
      if (dayEvents.length > 0) {
        dayEvents.slice(0, 1).forEach(ev => {
          itemsHtml += `
            <div class="item-chip chip-event" data-chip-type="event" data-id="${ev.id}" data-date="${dateStr}" style="background-color: ${ev.color}15; border-left: 3px solid ${ev.color};" title="${ev.title}">
              <span class="chip-title">${ev.title}</span>
            </div>
          `;
        });
        if (dayEvents.length > 1) {
          itemsHtml += `<div class="item-more">+${dayEvents.length - 1}</div>`;
        }
      }

      // 5. 가계부 요약 배지
      let ledgerPills = '';
      if (dayLedger && (dayLedger.expense > 0 || dayLedger.income > 0)) {
        ledgerPills = `
          <div class="day-ledger-badge-wrap">
            ${dayLedger.expense > 0 ? `<span class="pill-exp">-₩${this.formatShortMoney(dayLedger.expense)}</span>` : ''}
            ${dayLedger.income > 0 ? `<span class="pill-inc">+₩${this.formatShortMoney(dayLedger.income)}</span>` : ''}
          </div>
        `;
      }

      // 6. 모바일 인디케이터 도트
      let mobileDotsHtml = '';
      if (dayWegovy.length > 0 || (dayMeals && dayMeals.totalKcal > 0) || (dayWorkouts && dayWorkouts.totalBurnedKcal > 0) || dayEvents.length > 0 || (dayLedger && (dayLedger.expense > 0 || dayLedger.income > 0))) {
        mobileDotsHtml = `
          <div class="mobile-indicators-bar">
            ${dayWegovy.length > 0 ? '<span class="m-dot m-dot-wegovy" title="투약"></span>' : ''}
            ${dayMeals && dayMeals.totalKcal > 0 ? '<span class="m-dot m-dot-meal" title="식사"></span>' : ''}
            ${dayWorkouts && dayWorkouts.totalBurnedKcal > 0 ? '<span class="m-dot m-dot-workout" title="운동"></span>' : ''}
            ${dayEvents.length > 0 ? '<span class="m-dot m-dot-event" title="일정"></span>' : ''}
            ${dayLedger && dayLedger.expense > 0 ? '<span class="m-dot m-dot-exp" title="지출"></span>' : ''}
            ${dayLedger && dayLedger.income > 0 ? '<span class="m-dot m-dot-inc" title="수입"></span>' : ''}
          </div>
        `;
      }

      let holidayTag = '';
      if (holiday.isHoliday) {
        holidayTag = `<span class="holiday-name ${holiday.isSubstitute ? 'substitute' : ''}" title="${holiday.name}">${holiday.name}</span>`;
      }

      const dayClasses = [
        'calendar-day',
        isToday ? 'is-today' : '',
        holiday.isHoliday ? 'is-holiday' : '',
        isSun ? 'is-sun' : '',
        isSat ? 'is-sat' : '',
        (dayWegovy.length > 0) ? 'has-wegovy' : ''
      ].filter(Boolean).join(' ');

      // 날짜 셀 상단에 원클릭 바로가기 미니 버튼 배치
      const cellQuickActions = `
        <div class="cell-hover-actions">
          <button type="button" class="cell-action-btn meal-btn" data-direct-tab="meal" data-date="${dateStr}" title="식사 바로 기록">🍽️</button>
          <button type="button" class="cell-action-btn workout-btn" data-direct-tab="workout" data-date="${dateStr}" title="운동 바로 기록">🏃</button>
          <button type="button" class="cell-action-btn add-btn" data-direct-tab="meal" data-date="${dateStr}" title="새 기록">+</button>
        </div>
      `;

      cellsHtml += `
        <div class="${dayClasses}" data-date="${dateStr}" tabindex="0">
          <div class="day-cell-top">
            <span class="day-number">${day}</span>
            ${holidayTag}
            ${cellQuickActions}
            ${ledgerPills}
          </div>
          <div class="day-items-list">
            ${itemsHtml}
          </div>
          ${mobileDotsHtml}
        </div>
      `;
    }

    // 다음 달 날짜 채우기
    const totalRendered = firstDayIndex + lastDate;
    const remainingSlots = (7 - (totalRendered % 7)) % 7;
    for (let nextD = 1; nextD <= remainingSlots; nextD++) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const nextDateStr = `${nextY}-${pad(nextM)}-${pad(nextD)}`;
      const holiday = checkHoliday(nextDateStr);

      cellsHtml += `
        <div class="calendar-day other-month ${holiday.isHoliday ? 'is-holiday' : ''}" data-date="${nextDateStr}">
          <div class="day-cell-top">
            <span class="day-number">${nextD}</span>
            ${holiday.isHoliday ? `<span class="holiday-name">${holiday.name}</span>` : ''}
          </div>
        </div>
      `;
    }

    const weekdaysHeader = `
      <div class="calendar-header-weekdays">
        <div class="calendar-weekday is-sun">일</div>
        <div class="calendar-weekday">월</div>
        <div class="calendar-weekday">화</div>
        <div class="calendar-weekday">수</div>
        <div class="calendar-weekday">목</div>
        <div class="calendar-weekday">금</div>
        <div class="calendar-weekday is-sat">토</div>
      </div>
    `;

    this.container.innerHTML = `
      <div class="month-view-grid">
        ${weekdaysHeader}
        <div class="calendar-days-grid">
          ${cellsHtml}
        </div>
      </div>
    `;

    this.bindCellEvents();
  }

  renderWeekView() {
    const curr = new Date(this.currentDate);
    const dayOfWeek = curr.getDay();
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - dayOfWeek);

    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    const filters = settings.layerFilters || { events: true, wegovy: true, meals: true, workouts: true, ledger: true };
    const events = (store.getEvents && typeof store.getEvents === 'function') ? store.getEvents() : [];
    const wegovyLogs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs() : [];
    const meals = (store.getMeals && typeof store.getMeals === 'function') ? store.getMeals() : [];
    const workouts = (store.getWorkouts && typeof store.getWorkouts === 'function') ? store.getWorkouts() : [];
    const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions() : [];

    const pad = (n) => String(n).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    let daysHtml = '';

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(firstDay);
      dayDate.setDate(firstDay.getDate() + i);
      const dateStr = `${dayDate.getFullYear()}-${pad(dayDate.getMonth() + 1)}-${pad(dayDate.getDate())}`;
      const holiday = checkHoliday(dateStr);
      const isToday = dateStr === new Date().toISOString().substring(0, 10);

      const dayEvents = filters.events ? events.filter(e => e && e.date === dateStr) : [];
      const dayWegovy = filters.wegovy ? wegovyLogs.filter(l => l && l.date === dateStr) : [];
      const dayMeals = filters.meals ? meals.filter(m => m && m.date === dateStr) : [];
      const dayWorkouts = filters.workouts ? workouts.filter(w => w && w.date === dateStr) : [];
      const dayTxs = filters.ledger ? txs.filter(t => t && t.date === dateStr) : [];

      let cardsHtml = '';

      if (dayMeals.length > 0) {
        dayMeals.forEach(m => {
          const typeMeta = MEAL_TYPES.find(t => t.id === m.mealType) || { name: '식사', icon: '🍽️', color: '#f59e0b' };
          cardsHtml += `
            <div class="week-card card-meal" data-chip-type="meal" data-id="${m.id}" data-date="${dateStr}" style="border-left: 3px solid ${typeMeta.color}; cursor: pointer;">
              <div class="card-head">${typeMeta.icon} ${typeMeta.name} (+${m.kcal}k)</div>
              <div class="card-desc">${m.foods}</div>
            </div>
          `;
        });
      }

      if (dayWorkouts.length > 0) {
        dayWorkouts.forEach(w => {
          const wMeta = WORKOUT_TYPES.find(t => t.id === w.type) || WORKOUT_TYPES[0];
          cardsHtml += `
            <div class="week-card card-workout" data-chip-type="workout" data-id="${w.id}" data-date="${dateStr}" style="border-left: 3px solid ${wMeta.color}; cursor: pointer;">
              <div class="card-head">${wMeta.icon} ${wMeta.name} (-${w.burnedKcal}k)</div>
              <div class="card-desc">⏱️ ${w.duration}분 ${w.distance ? `| ${w.distance}km` : ''}</div>
            </div>
          `;
        });
      }

      if (dayWegovy.length > 0) {
        dayWegovy.forEach(w => {
          const med = MEDICATIONS[w.medication] || getActiveMedication();
          cardsHtml += `
            <div class="week-card card-wegovy" data-chip-type="wegovy" data-id="${w.id}" data-date="${dateStr}" style="border-left: 3px solid ${med.color}; cursor: pointer;">
              <div class="card-head">💉 ${med.shortName} ${w.dose}</div>
              <div class="card-desc">${w.siteLabel || w.site} | ⚖️ ${w.weight || '-'}kg</div>
            </div>
          `;
        });
      }

      if (dayEvents.length > 0) {
        dayEvents.forEach(e => {
          cardsHtml += `
            <div class="week-card card-event" data-chip-type="event" data-id="${e.id}" data-date="${dateStr}" style="border-left: 3px solid ${e.color}; cursor: pointer;">
              <div class="card-head">${e.time ? `[${e.time}] ` : ''}${e.title}</div>
              ${e.memo ? `<div class="card-desc">${e.memo}</div>` : ''}
            </div>
          `;
        });
      }

      if (dayTxs.length > 0) {
        dayTxs.forEach(t => {
          const isExp = t.type === 'expense';
          cardsHtml += `
            <div class="week-card card-tx ${isExp ? 'exp' : 'inc'}" data-chip-type="ledger" data-id="${t.id}" data-date="${dateStr}" style="cursor: pointer;">
              <div class="card-head">${t.category} ${isExp ? '-' : '+'}₩${Number(t.amount).toLocaleString()}</div>
              ${t.memo ? `<div class="card-desc">${t.memo}</div>` : ''}
            </div>
          `;
        });
      }

      if (!cardsHtml) {
        cardsHtml = `<div class="week-empty-slot">+ 탭하여 식사/운동 기록</div>`;
      }

      daysHtml += `
        <div class="week-column ${isToday ? 'is-today' : ''} ${holiday.isHoliday ? 'is-holiday' : ''}" data-date="${dateStr}">
          <div class="week-col-header">
            <span class="w-dayname">${dayNames[i]}</span>
            <span class="w-daynum">${dayDate.getDate()}</span>
            ${holiday.isHoliday ? `<span class="w-holiday">${holiday.name}</span>` : ''}
          </div>
          <div class="week-cards-wrap">
            ${cardsHtml}
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `<div class="week-view-container">${daysHtml}</div>`;
    this.bindCellEvents();
  }

  renderDayView() {
    const pad = (n) => String(n).padStart(2, '0');
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth() + 1;
    const d = this.currentDate.getDate();
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;

    const holiday = checkHoliday(dateStr);
    const events = (store.getEvents && typeof store.getEvents === 'function') ? store.getEvents().filter(e => e && e.date === dateStr) : [];
    const wegovyLogs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs().filter(l => l && l.date === dateStr) : [];
    const dayMealsSummary = getDailyMealsSummary(dateStr);
    const dayWorkoutsSummary = getDailyWorkoutsSummary(dateStr);
    const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions().filter(t => t && t.date === dateStr) : [];

    let html = `
      <div class="day-view-hero">
        <div class="day-hero-info">
          <h2>${y}년 ${m}월 ${d}일</h2>
          ${holiday.isHoliday ? `<span class="badge badge-holiday">${holiday.name}</span>` : ''}
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-outline" id="btnDayAddMeal" style="color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.4);">🍽️ 식사 기록</button>
          <button class="btn btn-outline" id="btnDayAddWorkout" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">🏃 운동 기록</button>
          <button class="btn btn-primary" id="btnDayViewAdd">+ 전체 기록</button>
        </div>
      </div>
      <div class="day-view-sections">
    `;

    // 식사 & 칼로리
    html += `<div class="day-section">
      <h3>🍽️ 식사 & 섭취 (총 ${dayMealsSummary.totalKcal.toLocaleString()} kcal)</h3>`;
    if (dayMealsSummary.dayMeals.length > 0) {
      dayMealsSummary.dayMeals.forEach(m => {
        const typeMeta = MEAL_TYPES.find(t => t.id === m.mealType) || { name: '식사', icon: '🍽️', color: '#f59e0b' };
        html += `
          <div class="day-detail-block block-meal" data-chip-type="meal" data-id="${m.id}" style="border-left: 3px solid ${typeMeta.color}; cursor: pointer;">
            <div class="block-title">${typeMeta.icon} ${typeMeta.name} - ${m.foods} <strong>(${m.kcal} kcal)</strong></div>
            <div class="block-memo">${m.memo || ''}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="text-muted" style="cursor: pointer;" data-direct-tab="meal" data-date="${dateStr}">+ 탭하여 오늘 식사 기록하기</p>`;
    }
    html += `</div>`;

    // 운동 & 소모 칼로리
    html += `<div class="day-section">
      <h3>🏃 운동 & 소모 (총 -${dayWorkoutsSummary.totalBurnedKcal.toLocaleString()} kcal)</h3>`;
    if (dayWorkoutsSummary.dayWorkouts.length > 0) {
      dayWorkoutsSummary.dayWorkouts.forEach(w => {
        const wMeta = WORKOUT_TYPES.find(t => t.id === w.type) || WORKOUT_TYPES[0];
        html += `
          <div class="day-detail-block block-workout" data-chip-type="workout" data-id="${w.id}" style="border-left: 3px solid ${wMeta.color}; cursor: pointer;">
            <div class="block-title">${wMeta.icon} ${wMeta.name} ⏱️ ${w.duration}분 <strong>(-${w.burnedKcal} kcal)</strong></div>
            <div class="block-memo">${w.memo || ''}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="text-muted" style="cursor: pointer;" data-direct-tab="workout" data-date="${dateStr}">+ 탭하여 오늘 운동 기록하기</p>`;
    }
    html += `</div>`;

    // 의약품 투약/체중
    const activeMed = getActiveMedication();
    html += `<div class="day-section">
      <h3>💉 ${activeMed.shortName} 투약 및 체중</h3>`;
    if (wegovyLogs.length > 0) {
      wegovyLogs.forEach(w => {
        const med = MEDICATIONS[w.medication] || activeMed;
        html += `
          <div class="day-detail-block block-wegovy" data-chip-type="wegovy" data-id="${w.id}" style="border-left: 3px solid ${med.color}; cursor: pointer;">
            <div class="block-title">${med.shortName} ${w.dose} 투약 완료</div>
            <div class="block-meta">부위: ${w.siteLabel || w.site} | 체중: ${w.weight ? `${w.weight}kg` : '미기록'}</div>
            <div class="block-memo">${w.memo || ''}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="text-muted">이 날짜의 투약 기록이 없습니다.</p>`;
    }
    html += `</div>`;

    // 일정
    html += `<div class="day-section">
      <h3>📅 일반 일정</h3>`;
    if (events.length > 0) {
      events.forEach(e => {
        html += `
          <div class="day-detail-block block-event" data-chip-type="event" data-id="${e.id}" style="cursor: pointer;">
            <div class="block-title">${e.time ? `[${e.time}] ` : ''}${e.title}</div>
            <div class="block-memo">${e.memo || ''}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="text-muted">등록된 일정이 없습니다.</p>`;
    }
    html += `</div>`;

    // 가계부
    html += `<div class="day-section">
      <h3>💰 가계부 지출 / 수입</h3>`;
    if (txs.length > 0) {
      txs.forEach(t => {
        const isExp = t.type === 'expense';
        html += `
          <div class="day-detail-block block-tx ${isExp ? 'exp' : 'inc'}" data-chip-type="ledger" data-id="${t.id}" style="cursor: pointer;">
            <div class="block-title">${t.category} <strong>${isExp ? '-' : '+'}₩${Number(t.amount).toLocaleString()}</strong> (${t.paymentMethod})</div>
            <div class="block-memo">${t.memo || ''}</div>
          </div>
        `;
      });
    } else {
      html += `<p class="text-muted">등록된 가계부 내역이 없습니다.</p>`;
    }
    html += `</div></div>`;

    this.container.innerHTML = html;

    document.getElementById('btnDayAddMeal')?.addEventListener('click', () => {
      this.app.modal.openAddModal(dateStr, 'meal');
    });
    document.getElementById('btnDayAddWorkout')?.addEventListener('click', () => {
      this.app.modal.openAddModal(dateStr, 'workout');
    });
    document.getElementById('btnDayViewAdd')?.addEventListener('click', () => {
      this.app.modal.openAddModal(dateStr, 'meal');
    });

    this.bindCellEvents();
  }

  renderListView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const pad = (n) => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month)}`;

    const events = (store.getEvents && typeof store.getEvents === 'function') ? store.getEvents().filter(e => e && e.date && e.date.startsWith(prefix)) : [];
    const wegovyLogs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs().filter(l => l && l.date && l.date.startsWith(prefix)) : [];
    const meals = (store.getMeals && typeof store.getMeals === 'function') ? store.getMeals().filter(m => m && m.date && m.date.startsWith(prefix)) : [];
    const workouts = (store.getWorkouts && typeof store.getWorkouts === 'function') ? store.getWorkouts().filter(w => w && w.date && w.date.startsWith(prefix)) : [];
    const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions().filter(t => t && t.date && t.date.startsWith(prefix)) : [];

    const activeMed = getActiveMedication();
    const combined = [];
    events.forEach(e => combined.push({ type: 'event', id: e.id, date: e.date, title: e.title, desc: e.memo, meta: e.time }));
    meals.forEach(m => {
      const typeMeta = MEAL_TYPES.find(t => t.id === m.mealType) || { name: '식사', icon: '🍽️' };
      combined.push({ type: 'meal', id: m.id, date: m.date, title: `${typeMeta.icon} ${typeMeta.name}: ${m.foods}`, desc: m.memo, meta: `🔥 +${m.kcal} kcal` });
    });
    workouts.forEach(w => {
      const wMeta = WORKOUT_TYPES.find(t => t.id === w.type) || WORKOUT_TYPES[0];
      combined.push({ type: 'workout', id: w.id, date: w.date, title: `${wMeta.icon} ${wMeta.name} (⏱️ ${w.duration}분)`, desc: w.memo, meta: `🔥 -${w.burnedKcal} kcal` });
    });
    wegovyLogs.forEach(w => {
      const med = MEDICATIONS[w.medication] || activeMed;
      combined.push({ type: 'wegovy', id: w.id, date: w.date, title: `${med.shortName} ${w.dose} 투약`, desc: `${w.siteLabel || w.site} | ${w.weight ? `${w.weight}kg` : ''}`, meta: '💉 투약' });
    });
    txs.forEach(t => combined.push({ type: 'ledger', id: t.id, date: t.date, title: `${t.category} (${t.paymentMethod})`, desc: t.memo, meta: `${t.type === 'expense' ? '-' : '+'}₩${Number(t.amount).toLocaleString()}` }));

    combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (combined.length === 0) {
      this.container.innerHTML = `
        <div class="list-empty-state">
          <div class="empty-icon">📂</div>
          <p>${year}년 ${month}월에 등록된 데이터가 없습니다.</p>
        </div>
      `;
      return;
    }

    let listHtml = combined.map(item => `
      <div class="agenda-row is-${item.type}" data-chip-type="${item.type}" data-id="${item.id}" data-date="${item.date}" style="cursor: pointer;">
        <div class="agenda-date">${item.date}</div>
        <div class="agenda-info">
          <div class="agenda-title">${item.title}</div>
          ${item.desc ? `<div class="agenda-desc">${item.desc}</div>` : ''}
        </div>
        <div class="agenda-meta">${item.meta || ''}</div>
      </div>
    `).join('');

    this.container.innerHTML = `<div class="agenda-view-container">${listHtml}</div>`;
    this.bindCellEvents();
  }

  bindCellEvents() {
    // 1. 셀 내 미니 빠른 액션 버튼 (🍽️ 또는 🏃 또는 +)
    this.container.querySelectorAll('[data-direct-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = btn.dataset.date;
        const tab = btn.dataset.directTab || 'meal';
        this.app.modal.openAddModal(dateStr, tab);
      });
    });

    // 2. 칩/카드 직접 클릭 시 수정 모달 또는 상세 열기
    this.container.querySelectorAll('[data-chip-type]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = chip.dataset.chipType;
        const id = chip.dataset.id;
        const dateStr = chip.dataset.date;
        if (id) {
          this.app.modal.openEditModal(type, id);
        } else {
          this.app.modal.openAddModal(dateStr, type);
        }
      });
    });

    // 3. 날짜 셀 본체 클릭 시 즉시 해당 날짜의 '식사/운동/일정 통합 입력창' 바로 열기
    this.container.querySelectorAll('.calendar-day[data-date], .week-column[data-date]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        // 내부 버튼이나 칩 클릭이 아닌 경우
        if (e.target.closest('.item-chip') || e.target.closest('[data-direct-tab]')) return;
        const dateStr = cell.dataset.date;
        this.app.modal.openAddModal(dateStr, 'meal');
      });
    });
  }

  formatShortMoney(amount) {
    if (amount >= 1000000) {
      return (amount / 10000).toFixed(0) + '만';
    }
    if (amount >= 10000) {
      return (amount / 10000).toFixed(1) + '만';
    }
    return (amount / 1000).toFixed(0) + '천';
  }
}
