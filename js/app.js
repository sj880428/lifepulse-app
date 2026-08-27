/**
 * LifePulse 메인 애플리케이션 진입점 및 사이드패널 위젯 렌더러 (월간/주간 분석 지원)
 */
import { store } from './storage.js?v=4.4.0';
import { CalendarView } from './calendar.js?v=4.4.0';
import { ModalController } from './modal.js?v=4.4.0';
import { getWegovyStatus, INJECTION_SITES, getActiveMedication, MEDICATIONS } from './wegovy.js?v=4.4.0';
import { getMonthlyLedgerSummary, getWeeklyLedgerSummary } from './ledger.js?v=4.4.0';
import { getDailyMealsSummary, MEAL_TYPES } from './meals.js?v=4.4.0';
import { getDailyWorkoutsSummary, WORKOUT_TYPES } from './workouts.js?v=4.4.0';
import { renderWeightChart, renderExpenseDonutChart, renderWeeklyExpenseBarChart } from './charts.js?v=4.4.0';
import { QuoteBannerController } from './quotes.js?v=4.4.0';

export class App {
  constructor() {
    this.calendar = new CalendarView(this);
    this.modal = new ModalController(this);
    this.quoteBanner = new QuoteBannerController();
    this.weightPeriodMode = 'month'; // 'week' | 'month' | 'all'
    this.ledgerPeriodMode = 'month'; // 'month' | 'week'
    this.initTheme();
    this.initEvents();
    this.renderAll();
    this.checkUrlParams();

    // 데이터 스토어 구독 (데이터 변경 시 자동 리렌더링)
    store.subscribe(() => {
      this.renderAll();
    });
  }

  checkUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'workout' || params.get('workout_kcal') || params.get('kcal')) {
        const type = params.get('workout_type') || params.get('type') || 'galaxy_watch';
        const duration = parseInt(params.get('workout_min') || params.get('duration') || '30', 10);
        const kcal = parseInt(params.get('workout_kcal') || params.get('kcal') || '250', 10);
        const distance = params.get('distance') ? parseFloat(params.get('distance')) : null;
        const heartRate = params.get('heart_rate') || params.get('hr') ? parseInt(params.get('heart_rate') || params.get('hr'), 10) : null;
        const memo = params.get('memo') || '스마트워치 자동 연동 데이터 ⌚';

        setTimeout(() => {
          this.modal.applyApplePreset(type, duration, kcal, distance, heartRate, memo);
        }, 350);
      }
    } catch (err) {
      console.warn('URL 파라미터 파싱 중 오류:', err);
    }
  }

  initTheme() {
    const savedTheme = (store.getSettings && typeof store.getSettings === 'function') ? (store.getSettings().theme || 'dark') : 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButton(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.saveSettings({ theme: next });
    this.updateThemeButton(next);
  }

  updateThemeButton(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? '라이트' : '다크';
  }

  initEvents() {
    // 캘린더 네비게이션
    document.getElementById('btnPrevPeriod')?.addEventListener('click', () => this.calendar.prev());
    document.getElementById('btnNextPeriod')?.addEventListener('click', () => this.calendar.next());
    document.getElementById('btnTodayJump')?.addEventListener('click', () => {
      this.calendar.today();
      this.renderWegovyWidget();
      this.renderLedgerWidget();
    });

    // 뷰 모드 전환 버튼들
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.calendar.setViewMode(btn.dataset.view);
      });
    });

    // 테마 토글
    document.getElementById('btnToggleTheme')?.addEventListener('click', () => this.toggleTheme());

    // 모바일 환경 접속 모달 열기
    document.getElementById('btnOpenMobileConnect')?.addEventListener('click', () => this.modal.openMobileConnectModal());

    // 건강 프로필 & 목표 설정 모달 열기
    document.getElementById('btnOpenHealthSettings')?.addEventListener('click', () => this.modal.openHealthSettingsModal());

    // 백업 모달 열기
    document.getElementById('btnOpenBackup')?.addEventListener('click', () => this.modal.openBackupModal());

    // 퀵 추가 버튼
    document.getElementById('btnHeaderAdd')?.addEventListener('click', () => this.modal.openAddModal(null, 'meal'));
    document.getElementById('btnFabAdd')?.addEventListener('click', () => this.modal.openAddModal(null, 'meal'));

    // 레이어 필터 체크박스
    const filterCheckboxes = {
      filterEvents: 'events',
      filterWegovy: 'wegovy',
      filterMeals: 'meals',
      filterWorkouts: 'workouts',
      filterLedger: 'ledger'
    };

    Object.entries(filterCheckboxes).forEach(([elemId, key]) => {
      const el = document.getElementById(elemId);
      if (el) {
        const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
        el.checked = settings.layerFilters?.[key] ?? true;
        el.addEventListener('change', () => {
          const currentFilters = settings.layerFilters || {};
          currentFilters[key] = el.checked;
          store.saveSettings({ layerFilters: currentFilters });
          this.calendar.render();
        });
      }
    });

    // 사이드 대시보드 탭 전환
    document.querySelectorAll('.side-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.side-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.dataset.panel;
        document.getElementById('panelWegovy')?.classList.toggle('active', targetTab === 'wegovy');
        document.getElementById('panelLedger')?.classList.toggle('active', targetTab === 'ledger');
      });
    });
  }

  renderAll() {
    try {
      this.calendar.render();
    } catch (err) {
      console.error('Calendar render error:', err);
    }
    try {
      this.renderWegovyWidget();
    } catch (err) {
      console.error('Wegovy widget render error:', err);
    }
    try {
      this.renderLedgerWidget();
    } catch (err) {
      console.error('Ledger widget render error:', err);
    }
  }

  renderWegovyWidget() {
    const container = document.getElementById('panelWegovyContent');
    if (!container) return;

    try {
      const status = getWegovyStatus();
      const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
      const med = status.activeMed || getActiveMedication();
      const currDate = this.calendar.currentDate || new Date();

      let dDayBadgeClass = 'dday-badge normal';
      if (status.dDayClass === 'today') dDayBadgeClass = 'dday-badge today';
      else if (status.dDayClass === 'overdue') dDayBadgeClass = 'dday-badge overdue';

      // 주간/월간 체중 통계 연산
      let periodWeightMetricHtml = '';
      const pad = (n) => String(n).padStart(2, '0');
      const y = currDate.getFullYear();
      const m = currDate.getMonth() + 1;
      const prefix = `${y}-${pad(m)}`;

      const logs = status.allLogs || [];

      if (this.weightPeriodMode === 'month') {
        const monthLogs = logs.filter(l => l && l.date && l.date.startsWith(prefix) && l.weight);
        if (monthLogs.length > 0) {
          const weights = monthLogs.map(l => Number(l.weight));
          const minW = Math.min(...weights);
          const maxW = Math.max(...weights);
          const firstW = monthLogs[0].weight;
          const lastW = monthLogs[monthLogs.length - 1].weight;
          const monthDiff = (lastW - firstW).toFixed(1);
          const sign = Number(monthDiff) > 0 ? '+' : '';

          periodWeightMetricHtml = `
            <div class="period-metric-grid mt-2">
              <div class="metric-card">
                <span class="m-label">${m}월 시작 체중</span>
                <strong class="m-value">${firstW}kg</strong>
              </div>
              <div class="metric-card">
                <span class="m-label">${m}월 최근 체중</span>
                <strong class="m-value text-emerald">${lastW}kg</strong>
              </div>
              <div class="metric-card">
                <span class="m-label">${m}월 감량 폭</span>
                <strong class="m-value ${Number(monthDiff) <= 0 ? 'text-emerald' : 'text-rose'}">${sign}${monthDiff}kg</strong>
              </div>
            </div>
          `;
        }
      } else if (this.weightPeriodMode === 'week') {
        const d = currDate.getDate();
        const weekNum = Math.ceil(d / 7);
        const startDay = (weekNum - 1) * 7 + 1;
        const endDay = Math.min(new Date(y, m, 0).getDate(), weekNum * 7);
        
        const weekLogs = logs.filter(l => {
          if (!l || !l.date || !l.date.startsWith(prefix) || !l.weight) return false;
          const dayNum = parseInt(l.date.split('-')[2], 10);
          return dayNum >= startDay && dayNum <= endDay;
        });

        if (weekLogs.length > 0) {
          const weights = weekLogs.map(l => Number(l.weight));
          const minW = Math.min(...weights);
          const maxW = Math.max(...weights);
          const latestW = weekLogs[weekLogs.length - 1].weight;

          periodWeightMetricHtml = `
            <div class="period-metric-grid mt-2">
              <div class="metric-card">
                <span class="m-label">${m}월 ${weekNum}주차 최저</span>
                <strong class="m-value text-emerald">${minW}kg</strong>
              </div>
              <div class="metric-card">
                <span class="m-label">${m}월 ${weekNum}주차 최고</span>
                <strong class="m-value">${maxW}kg</strong>
              </div>
              <div class="metric-card">
                <span class="m-label">주차 최신</span>
                <strong class="m-value text-accent">${latestW}kg</strong>
              </div>
            </div>
          `;
        }
      }

      const chartHtml = renderWeightChart(logs, settings.targetWeight, settings.startWeight, this.weightPeriodMode, currDate);

      let heroCardHtml = '';
      if (med.isMedication) {
        heroCardHtml = `
          <!-- D-Day 투약 주기 카드 -->
          <div class="wegovy-dday-card">
            <div class="dday-header">
              <span class="dday-title">💉 ${med.name} 투약 주기</span>
              <span class="${dDayBadgeClass}">${status.dDayText || '투약 예정'}</span>
            </div>
            <div class="dday-details">
              <div class="dday-row">
                <span>현재 투약 용량</span>
                <strong class="text-emerald">${status.currentDose || '0.25mg'}</strong>
              </div>
              <div class="dday-row">
                <span>다음 투약 예정일</span>
                <strong>${status.nextDate || '설정 필요'}</strong>
              </div>
              <div class="dday-row">
                <span>추천 주사 부위</span>
                <strong class="text-accent">📍 ${status.nextRecommendedSite?.label || '복부 우측'}</strong>
              </div>
            </div>
            <button class="btn btn-emerald-outline w-100 mt-2" id="btnQuickInject">
              ✨ 오늘 바로 ${med.shortName} 투약 기록하기
            </button>
          </div>
        `;
      } else {
        heroCardHtml = `
          <!-- 일반 체중 & 건강 관리 모드 카드 -->
          <div class="wegovy-dday-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);">
            <div class="dday-header">
              <span class="dday-title">🌱 데일리 다이어트 & 건강</span>
              <span class="dday-badge normal">체중 관리 모드</span>
            </div>
            <div class="dday-details">
              <div class="dday-row">
                <span>시작 체중</span>
                <strong>${settings.startWeight || 80}kg</strong>
              </div>
              <div class="dday-row">
                <span>목표 체중</span>
                <strong class="text-emerald">${settings.targetWeight || 68}kg</strong>
              </div>
            </div>
            <button class="btn btn-emerald-outline w-100 mt-2" id="btnQuickInject">
              ✨ 오늘 체중 & 컨디션 기록하기
            </button>
          </div>
        `;
      }

      // 오늘 식사 및 운동 칼로리 밸런스 집계
      const todayStr = new Date().toISOString().substring(0, 10);
      const todayMealSummary = getDailyMealsSummary(todayStr);
      const todayWorkoutSummary = getDailyWorkoutsSummary(todayStr);
      const targetBurnKcal = settings.targetBurnCalorie || 400;
      const netCalories = todayMealSummary.totalKcal - todayWorkoutSummary.totalBurnedKcal;

      let todayMealsHtml = '';
      if (todayMealSummary.dayMeals.length > 0) {
        todayMealsHtml = `
          <div class="today-mini-section-title">🍽️ 섭취 식단 (+${todayMealSummary.totalKcal} kcal)</div>
          <div class="today-meals-mini-list">
            ${todayMealSummary.dayMeals.map(m => {
              const tMeta = MEAL_TYPES.find(t => t.id === m.mealType) || { name: '식사', icon: '🍽️', color: '#f59e0b' };
              return `
                <div class="today-meal-mini-item" data-meal-id="${m.id}" title="클릭하여 수정">
                  <span class="meal-mini-tag" style="background: ${tMeta.color}22; color: ${tMeta.color};">${tMeta.icon} ${tMeta.name}</span>
                  <span class="meal-mini-foods">${m.foods}</span>
                  <strong class="meal-mini-kcal">🔥 +${m.kcal}k</strong>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      let todayWorkoutsHtml = '';
      if (todayWorkoutSummary.dayWorkouts.length > 0) {
        todayWorkoutsHtml = `
          <div class="today-mini-section-title mt-2">🏃 운동 소모 (-${todayWorkoutSummary.totalBurnedKcal} kcal / ⏱️ ${todayWorkoutSummary.totalDurationMin}분)</div>
          <div class="today-meals-mini-list">
            ${todayWorkoutSummary.dayWorkouts.map(w => {
              const wMeta = WORKOUT_TYPES.find(t => t.id === w.type) || WORKOUT_TYPES[0];
              return `
                <div class="today-workout-mini-item" data-workout-id="${w.id}" title="클릭하여 수정">
                  <span class="meal-mini-tag" style="background: ${wMeta.color}22; color: ${wMeta.color};">${wMeta.icon} ${wMeta.name}</span>
                  <span class="meal-mini-foods">${w.duration}분 ${w.distance ? `(${w.distance}km)` : ''}</span>
                  <strong class="workout-mini-kcal" style="color: #ef4444;">🔥 -${w.burnedKcal}k</strong>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      container.innerHTML = `
        ${heroCardHtml}

        <!-- 오늘 칼로리 & 운동 밸런스 카드 -->
        <div class="widget-section">
          <div class="widget-sec-title">
            <span>🔥 오늘의 칼로리 밸런스</span>
            <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-primary); font-weight: 800;">
              순 칼로리: ${netCalories} kcal
            </span>
          </div>

          <div class="calorie-balance-mini-grid mt-2">
            <div class="balance-card">
              <span class="b-label">🍽️ 섭취</span>
              <strong class="b-val text-amber">+${todayMealSummary.totalKcal}</strong>
              <small>${todayMealSummary.targetKcal}k 목표</small>
            </div>
            <div class="balance-card">
              <span class="b-label">🏃 소모</span>
              <strong class="b-val text-rose">-${todayWorkoutSummary.totalBurnedKcal}</strong>
              <small>${targetBurnKcal}k 목표</small>
            </div>
            <div class="balance-card">
              <span class="b-label">⚖️ 순 칼로리</span>
              <strong class="b-val text-emerald">${netCalories}</strong>
              <small>섭취-소모</small>
            </div>
          </div>

          <div class="progress-bar-wrap" style="margin-top: 0.6rem;">
            <div class="progress-bar-header">
              <span>목표 섭취 대비 ${todayMealSummary.percent}%</span>
              <strong style="color: var(--accent-amber);">${todayMealSummary.remainKcal > 0 ? `${todayMealSummary.remainKcal} kcal 여유` : '목표 달성'}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${todayMealSummary.percent}%; background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);"></div>
            </div>
          </div>

          ${todayMealsHtml}
          ${todayWorkoutsHtml}

          <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem;">
            <button class="btn btn-outline w-100" id="btnQuickAddTodayMeal" style="color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.35); font-size: 0.78rem; padding: 0.35rem;">
              🍽️ + 식사 기록
            </button>
            <button class="btn btn-outline w-100" id="btnQuickAddTodayWorkout" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35); font-size: 0.78rem; padding: 0.35rem;">
              🏃 + 운동 기록
            </button>
            <button class="btn btn-outline" id="btnOpenAppleModalWidget" title="애플워치 연동" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;">
              ⌚
            </button>
          </div>
        </div>

        <!-- 체중 통계 및 주간/월간 그래프 -->
        <div class="widget-section">
          <div class="widget-sec-title">
            <span>⚖️ 체중 변화 추이</span>
            <div class="widget-pill-toggle">
              <button class="widget-pill-btn ${this.weightPeriodMode === 'week' ? 'active' : ''}" data-weight-mode="week">주간</button>
              <button class="widget-pill-btn ${this.weightPeriodMode === 'month' ? 'active' : ''}" data-weight-mode="month">월간</button>
              <button class="widget-pill-btn ${this.weightPeriodMode === 'all' ? 'active' : ''}" data-weight-mode="all">전체</button>
            </div>
          </div>

          ${periodWeightMetricHtml}

          <div class="chart-box mt-2">
            ${chartHtml}
          </div>
        </div>

        <!-- 최근 투약/체중 이력 -->
        <div class="widget-section">
          <div class="widget-sec-title">
            <span>📋 최근 ${med.isMedication ? '투약' : '체중'} 히스토리</span>
            <button class="btn-icon" id="btnOpenProfileSettings" title="목표 체중 및 의약품 설정">⚙️ 설정</button>
          </div>
          <div class="history-list">
            ${logs && logs.length > 0 ? logs.slice().reverse().slice(0, 4).map(l => `
              <div class="history-item" data-log-id="${l.id}">
                <div class="hist-left">
                  ${l.dose ? `<span class="hist-dose">${l.dose}</span>` : '<span class="hist-dose" style="color: var(--accent-teal);">⚖️</span>'}
                  <span class="hist-date">${l.date}</span>
                </div>
                <div class="hist-mid">
                  ${l.siteLabel ? `<span class="hist-site">${l.siteLabel}</span>` : ''}
                  ${l.weight ? `<span class="hist-weight">${l.weight}kg</span>` : ''}
                </div>
              </div>
            `).join('') : '<p class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem 0;">기록된 내역이 없습니다.</p>'}
          </div>
        </div>
      `;

      // 이벤트 리스너 바인딩
      document.getElementById('btnQuickInject')?.addEventListener('click', () => {
        this.modal.openAddModal(new Date().toISOString().substring(0, 10), 'wegovy');
      });

      document.getElementById('btnQuickAddTodayMeal')?.addEventListener('click', () => {
        this.modal.openAddModal(new Date().toISOString().substring(0, 10), 'meal');
      });

      document.getElementById('btnQuickAddTodayWorkout')?.addEventListener('click', () => {
        this.modal.openAddModal(new Date().toISOString().substring(0, 10), 'workout');
      });

      document.getElementById('btnOpenAppleModalWidget')?.addEventListener('click', () => {
        this.modal.openAppleWatchModal();
      });

      document.getElementById('btnOpenProfileSettings')?.addEventListener('click', () => {
        this.modal.openHealthSettingsModal();
      });

      container.querySelectorAll('[data-weight-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.weightPeriodMode = btn.dataset.weightMode;
          this.renderWegovyWidget();
        });
      });

      container.querySelectorAll('.today-meal-mini-item').forEach(item => {
        item.addEventListener('click', () => {
          this.modal.openEditModal('meal', item.dataset.mealId);
        });
      });

      container.querySelectorAll('.today-workout-mini-item').forEach(item => {
        item.addEventListener('click', () => {
          this.modal.openEditModal('workout', item.dataset.workoutId);
        });
      });

      container.querySelectorAll('.history-item[data-log-id]').forEach(item => {
        item.addEventListener('click', () => {
          this.modal.openEditModal('wegovy', item.dataset.logId);
        });
      });
    } catch (err) {
      console.error('Failed to render Wegovy Widget:', err);
      container.innerHTML = `<div class="chart-empty">위젯을 불러오는 중 문제가 발생했습니다: ${err.message}</div>`;
    }
  }

  renderLedgerWidget() {
    const container = document.getElementById('panelLedgerContent');
    if (!container) return;

    try {
      const currDate = this.calendar.currentDate || new Date();
      const year = currDate.getFullYear();
      const month = currDate.getMonth() + 1;

      let contentHtml = '';

      if (this.ledgerPeriodMode === 'month') {
        const summary = getMonthlyLedgerSummary(year, month);
        const donutHtml = renderExpenseDonutChart(summary.categoryBreakdown, summary.totalExpense);

        // 주차별 지출 미니 카드 생성
        let weeklyCardsHtml = '';
        const weeklyTotals = summary.weeklyTotals || [];
        if (weeklyTotals.length > 0) {
          weeklyCardsHtml = `
            <div class="weekly-spend-grid mt-2">
              ${weeklyTotals.map(w => `
                <div class="weekly-spend-card">
                  <span class="w-label">${w.label}</span>
                  <strong class="w-val">₩${w.expense > 0 ? (w.expense / 10000).toFixed(1) + '만' : '0'}</strong>
                </div>
              `).join('')}
            </div>
          `;
        }

        contentHtml = `
          <!-- 월간 요약 카드 -->
          <div class="ledger-summary-hero">
            <div class="hero-metric-row">
              <div class="hero-metric">
                <span class="metric-title">${month}월 총 지출</span>
                <strong class="metric-num text-rose">-₩${Number(summary.totalExpense).toLocaleString()}</strong>
              </div>
              <div class="hero-metric">
                <span class="metric-title">${month}월 총 수입</span>
                <strong class="metric-num text-teal">+₩${Number(summary.totalIncome).toLocaleString()}</strong>
              </div>
            </div>
            <div class="net-balance-row">
              <span>${month}월 순 잔액:</span>
              <strong class="${summary.netBalance >= 0 ? 'text-teal' : 'text-rose'}">
                ${summary.netBalance >= 0 ? '+' : ''}₩${Number(summary.netBalance).toLocaleString()}
              </strong>
            </div>
          </div>

          <!-- 주차별 지출 흐름 (1주~5주차) -->
          <div class="widget-section">
            <div class="widget-sec-title">
              <span>📊 ${month}월 주차별 지출 현황</span>
            </div>
            ${weeklyCardsHtml}
          </div>

          <!-- 지출 카테고리별 도넛 차트 -->
          <div class="widget-section">
            <div class="widget-sec-title">
              <span>🏷️ 지출 카테고리 분포</span>
            </div>
            <div class="donut-chart-wrap mt-2">
              ${donutHtml}
            </div>
          </div>
        `;
      } else {
        // 주간 분석 모드
        const d = currDate.getDate();
        const weekNum = Math.ceil(d / 7);
        const weekSummary = getWeeklyLedgerSummary(currDate);
        const barChartHtml = renderWeeklyExpenseBarChart(weekSummary.weekDays, weekSummary.totalExpense);

        let catRankHtml = '';
        if (weekSummary.categoryBreakdown && weekSummary.categoryBreakdown.length > 0) {
          catRankHtml = weekSummary.categoryBreakdown.map((c, idx) => `
            <div class="history-item">
              <div class="hist-left">
                <span class="hist-dose" style="background: var(--bg-subtle); color: var(--text-main); font-size: 0.72rem;">#${idx + 1}</span>
                <span class="hist-date">${c.category}</span>
              </div>
              <div class="hist-mid" style="margin-left: auto;">
                <strong class="text-rose">-₩${Number(c.total).toLocaleString()}</strong>
              </div>
            </div>
          `).join('');
        } else {
          catRankHtml = '<p class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem 0;">이번 주 지출 내역이 없습니다.</p>';
        }

        const dailyAvg = weekSummary.weekDays ? Math.round(weekSummary.totalExpense / 7) : 0;

        contentHtml = `
          <!-- 주간 요약 카드 -->
          <div class="ledger-summary-hero" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);">
            <div class="hero-metric-row">
              <div class="hero-metric">
                <span class="metric-title">${month}월 ${weekNum}주차 지출</span>
                <strong class="metric-num text-rose">-₩${Number(weekSummary.totalExpense).toLocaleString()}</strong>
              </div>
              <div class="hero-metric">
                <span class="metric-title">일평균 지출</span>
                <strong class="metric-num text-accent">₩${Number(dailyAvg).toLocaleString()}</strong>
              </div>
            </div>
            <div class="net-balance-row">
              <span>주간 순 잔액:</span>
              <strong class="${weekSummary.netBalance >= 0 ? 'text-teal' : 'text-rose'}">
                ${weekSummary.netBalance >= 0 ? '+' : ''}₩${Number(weekSummary.netBalance).toLocaleString()}
              </strong>
            </div>
          </div>

          <!-- 주간 요일별 지출 바 차트 -->
          <div class="widget-section">
            <div class="widget-sec-title">
              <span>📊 이번 주 요일별(일~토) 지출 추이</span>
            </div>
            <div class="chart-box mt-2">
              ${barChartHtml}
            </div>
          </div>

          <!-- 주간 주요 지출 카테고리 랭킹 -->
          <div class="widget-section">
            <div class="widget-sec-title">
              <span>🏆 이번 주 지출 랭킹</span>
            </div>
            <div class="history-list mt-1">
              ${catRankHtml}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <!-- 주간 vs 월간 토글 헤더 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 700; font-size: 0.95rem;">가계부 현황</span>
          <div class="widget-pill-toggle">
            <button class="widget-pill-btn ${this.ledgerPeriodMode === 'month' ? 'active' : ''}" data-ledger-mode="month">월간 분석</button>
            <button class="widget-pill-btn ${this.ledgerPeriodMode === 'week' ? 'active' : ''}" data-ledger-mode="week">주간 분석</button>
          </div>
        </div>

        ${contentHtml}

        <!-- 최근 거래 내역 -->
        <div class="widget-section">
          <div class="widget-sec-title">
            <span>📋 최근 거래 내역</span>
            <button class="btn-icon" id="btnSideAddLedger" title="새 거래 추가">+ 추가</button>
          </div>
          <div class="history-list">
            ${store.getTransactions().slice(0, 5).map(t => `
              <div class="history-item" data-tx-id="${t.id}">
                <div class="hist-left">
                  <span class="hist-dose ${t.type === 'expense' ? 'text-rose' : 'text-teal'}" style="background: ${t.type === 'expense' ? 'rgba(244,63,94,0.15)' : 'rgba(20,184,166,0.15)'}; font-size: 0.75rem;">
                    ${t.type === 'expense' ? '지출' : '수입'}
                  </span>
                  <span class="hist-date">${t.date}</span>
                </div>
                <div class="hist-mid">
                  <span class="hist-site">${t.category}</span>
                  <span class="hist-weight ${t.type === 'expense' ? 'text-rose' : 'text-teal'}">
                    ${t.type === 'expense' ? '-' : '+'}₩${Number(t.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // 이벤트 리스너 바인딩
      document.getElementById('btnSideAddLedger')?.addEventListener('click', () => {
        this.modal.openAddModal(new Date().toISOString().substring(0, 10), 'ledger');
      });

      container.querySelectorAll('[data-ledger-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.ledgerPeriodMode = btn.dataset.ledgerMode;
          this.renderLedgerWidget();
        });
      });

      container.querySelectorAll('.history-item[data-tx-id]').forEach(item => {
        item.addEventListener('click', () => {
          this.modal.openEditModal('ledger', item.dataset.txId);
        });
      });
    } catch (err) {
      console.error('Failed to render Ledger Widget:', err);
      container.innerHTML = `<div class="chart-empty">가계부 위젯을 불러오는 중 문제가 발생했습니다: ${err.message}</div>`;
    }
  }

  showToast(message) {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}

// 애플리케이션 부팅
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();

  // 오프라인 PWA 서비스 워커 등록 (인터넷 없이도 100% 실행)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('PWA 서비스 워커 등록:', err);
    });
  }
});
