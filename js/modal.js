/**
 * 모달 및 팝업 대화상자 컨트롤러 (식사, 운동, 투약/체중, 일정, 가계부 5-in-1 통합 허브)
 */
import { store } from './storage.js?v=4.0.0';
import { INJECTION_SITES, COMMON_SIDE_EFFECTS, getWegovyStatus, MEDICATIONS, getActiveMedication } from './wegovy.js?v=4.0.0';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './ledger.js?v=4.0.0';
import { MEAL_TYPES, SATIETY_LEVELS, COMMON_FOOD_ITEMS, FOOD_CATEGORIES, parseFoodsAndCalculateNutrition, estimateCaloriesFromText, searchFoodDatabase, searchOnlineFoodDatabase, saveCustomFood, getCustomFoods, analyzeFoodPhotoWithGemini, analyzeFoodTextWithGemini, getDailyMealsSummary } from './meals.js?v=4.0.0';
import { WORKOUT_TYPES, INTENSITY_LEVELS, estimateWorkoutCalories, getDailyWorkoutsSummary } from './workouts.js?v=4.0.0';
import { checkHoliday } from './holidays.js?v=5.0.0';
import { generateIcsContent, downloadIcsFile, parseAndImportIcs } from './calendarSync.js?v=5.0.0';
import { generateSyncCode, pushDataToCloud, pullDataFromCloud } from './sync.js?v=5.1.0';

export class ModalController {
  constructor(app) {
    this.app = app;
    this.activeTab = 'meal'; // 'meal' | 'workout' | 'wegovy' | 'event' | 'ledger'
    this.editTarget = null; // { type, id, data }
    this.selectedDate = new Date().toISOString().substring(0, 10);
    this.selectedSite = 'abdomen-right';
    this.selectedSideEffects = new Set();
    this.selectedCondition = 2;
    this.selectedSatiety = 2;
    this.selectedWorkoutType = 'running';
    this.selectedFoodCategory = 'all';
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modalOverlay = document.getElementById('modalOverlay');
    this.addEditModal = document.getElementById('addEditModal');
    this.backupModal = document.getElementById('backupModal');
    this.healthSettingsModal = document.getElementById('healthSettingsModal');
    this.mobileConnectModal = document.getElementById('mobileConnectModal');
    this.appleWatchModal = document.getElementById('appleWatchModal');
    this.calendarSyncModal = document.getElementById('calendarSyncModal');
    this.userGuideModal = document.getElementById('userGuideModal');
    this.modalTitle = document.getElementById('modalTitle');
  }

  bindEvents() {
    // 탭 전환 이벤트 위임 (어디를 클릭하든 100% 정확하게 탭 전환 보장)
    const navTabsContainer = document.querySelector('.modal-nav-tabs');
    if (navTabsContainer) {
      navTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.modal-tab-btn');
        if (btn && btn.dataset.tab) {
          e.preventDefault();
          this.switchTab(btn.dataset.tab);
        }
      });
    }

    // 모달 배경 클릭 시 닫기
    this.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeAll();
      }
    });

    // 닫기 버튼들 (X 표시 및 하단 닫기 바)
    document.querySelectorAll('.btn-close-modal, .btn-modal-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeAll();
      });
    });

    // 📖 사용 설명서 모달 열기 버튼
    document.getElementById('btnOpenUserGuide')?.addEventListener('click', () => {
      this.openUserGuideModal();
    });

    // 🧹 예시 데이터 삭제 및 내 진짜 기록 시작하기 버튼
    document.getElementById('btnClearMockDataAndStart')?.addEventListener('click', () => {
      if (confirm('체험용으로 등록되어 있던 예시 식단, 운동, 가계부, 일정 기록을 모두 삭제하고 깨끗한 새 상태로 시작하시겠습니까?\n\n(목표 체중 및 API 키 등의 개인 설정값은 그대로 안전하게 유지됩니다)')) {
        store.clearAllSampleData();
        this.closeAll();
        this.app.showToast('🎉 예시 데이터가 모두 정리되었습니다! 이제 나만의 진짜 건강 & 가계부 기록을 시작해보세요! 🌱');
      }
    });

    // ⚡ 실시간 클라우드 동기화 이벤트
    document.getElementById('btnGenerateNewSyncCode')?.addEventListener('click', async () => {
      const code = generateSyncCode();
      store.saveSettings({ syncCode: code });
      this.renderCloudSyncStatus();
      if (this.app?.cloudSync) {
        await this.app.cloudSync.pushCurrentData(true);
      }
      this.app.showToast(`✨ 새 동기화 코드 '${code}'가 발급되어 클라우드에 연결되었습니다!`);
    });

    document.getElementById('btnConnectSyncCode')?.addEventListener('click', async () => {
      const input = document.getElementById('inputSyncCode');
      const code = input?.value.trim().toUpperCase();
      if (!code) {
        this.app.showToast('동기화 코드를 입력해주세요! (예: LP-8842)');
        return;
      }
      store.saveSettings({ syncCode: code });
      this.renderCloudSyncStatus();
      if (this.app?.cloudSync) {
        await this.app.cloudSync.checkAndPullLatest(true);
      }
    });

    document.getElementById('btnCopySyncCode')?.addEventListener('click', () => {
      const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
      if (settings.syncCode) {
        navigator.clipboard.writeText(settings.syncCode);
        this.app.showToast(`📋 동기화 코드 '${settings.syncCode}'가 복사되었습니다! (다른 기기 설정에 입력하세요)`);
      }
    });

    document.getElementById('btnManualCloudSync')?.addEventListener('click', async () => {
      if (this.app?.cloudSync) {
        await this.app.cloudSync.pushCurrentData(false);
        await this.app.cloudSync.checkAndPullLatest(true);
      }
    });

    document.getElementById('btnDisconnectSync')?.addEventListener('click', () => {
      if (confirm('클라우드 실시간 동기화를 해제하시겠습니까?\n(로컬에 저장된 기록은 삭제되지 않습니다)')) {
        store.saveSettings({ syncCode: '' });
        this.renderCloudSyncStatus();
        this.app.showToast('동기화 연결이 해제되었습니다.');
      }
    });

    // ESC 키로 닫기
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });

    // 폼 서브밋 이벤트
    document.getElementById('mealForm')?.addEventListener('submit', (e) => this.handleMealSubmit(e));
    document.getElementById('workoutForm')?.addEventListener('submit', (e) => this.handleWorkoutSubmit(e));
    document.getElementById('wegovyForm')?.addEventListener('submit', (e) => this.handleWegovySubmit(e));
    document.getElementById('eventForm')?.addEventListener('submit', (e) => this.handleEventSubmit(e));
    document.getElementById('ledgerForm')?.addEventListener('submit', (e) => this.handleLedgerSubmit(e));
    document.getElementById('healthSettingsForm')?.addEventListener('submit', (e) => this.handleHealthSettingsSubmit(e));
    
    // 가계부 지출/수입 라디오 변경 시 카테고리 셀렉터 동적 변경
    document.querySelectorAll('input[name="ledgerType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.renderCategoryOptions(e.target.value);
      });
    });

    // 투약 모달 내 약물 종류 변경 시 용량 드롭다운 동적 갱신
    document.getElementById('wegMedType')?.addEventListener('change', (e) => {
      this.renderDosageOptions(e.target.value);
    });

    // 식사 음식 입력 시 자동 칼로리 계산
    document.getElementById('mealFoods')?.addEventListener('input', () => {
      this.autoEstimateCalories();
    });

    // API 키 상태 배지 클릭 시 설정 모달 열기
    document.getElementById('badgeApiKeyStatus')?.addEventListener('click', () => {
      this.openHealthSettingsModal();
    });

    // 🤖 텍스트 자연어 AI 문장 정밀 계산 버튼
    document.getElementById('btnAiCalculateFoodText')?.addEventListener('click', async () => {
      const foodInput = document.getElementById('mealFoods');
      const kcalInput = document.getElementById('mealKcal');
      const text = foodInput?.value.trim();

      if (!text) {
        this.app.showToast('식사 메뉴를 먼저 입력해주세요! (예: 햇반 200그램 1개, 김, 참치 1캔)');
        foodInput?.focus();
        return;
      }

      const btn = document.getElementById('btnAiCalculateFoodText');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ 분석 중...';
      btn.disabled = true;

      const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
      const res = await analyzeFoodTextWithGemini(text, settings.geminiApiKey);

      btn.innerHTML = originalText;
      btn.disabled = false;

      if (res.success) {
        if (res.foods && res.isAi) foodInput.value = res.foods;
        if (kcalInput) kcalInput.value = res.totalKcal;
        if (res.feedback) {
          const memoEl = document.getElementById('mealMemo');
          if (memoEl) memoEl.value = `[AI 영양 분석] ${res.feedback}`;
        }
        this.autoEstimateCalories();
        this.app.showToast(`✨ ${res.isAi ? 'Gemini AI' : '스마트 영양엔진'} 분석 완료! (+${res.totalKcal} kcal)`);
      } else {
        this.app.showToast(res.message || '분석 중 오류가 발생했습니다.');
      }
    });

    // 스마트 음식 영양 검색기 이벤트
    const foodSearchInput = document.getElementById('foodSearchInput');
    const foodSearchResults = document.getElementById('foodSearchResults');
    const btnFoodSearchClear = document.getElementById('btnFoodSearchClear');

    foodSearchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (!q) {
        if (foodSearchResults) foodSearchResults.style.display = 'none';
        if (btnFoodSearchClear) btnFoodSearchClear.style.display = 'none';
        return;
      }

      if (btnFoodSearchClear) btnFoodSearchClear.style.display = 'inline-block';
      const matches = searchFoodDatabase(q);

      let html = '';

      if (matches.length > 0) {
        html += matches.slice(0, 8).map(item => `
          <div class="search-result-item" data-food-name="${item.name.split(' (')[0]}" data-kcal="${item.kcal}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; transition: background 0.15s; font-size: 0.78rem; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${item.icon || '🍽️'}</span>
              <strong style="color: var(--text-main);">${item.name}</strong>
            </div>
            <span style="color: var(--accent-amber); font-weight: 800; white-space: nowrap;">+${item.kcal} kcal</span>
          </div>
        `).join('');
      }

      // 온라인 검색 및 외부 영양 검색 유틸리티 바
      html += `
        <div style="padding: 0.5rem 0.6rem; background: var(--bg-subtle); border-radius: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 0.35rem;">
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn btn-outline w-100" id="btnOnlineSearchFood" style="font-size: 0.74rem; padding: 0.3rem 0.5rem; color: #3b82f6; border-color: rgba(59, 130, 246, 0.4); display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>🌐</span> <strong>'${q}' 온라인/AI 실시간 검색</strong>
            </button>
            <button type="button" class="btn btn-outline" id="btnDirectAddFood" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: var(--text-muted); white-space: nowrap;">
              + 직접 추가
            </button>
          </div>
          <a href="https://search.naver.com/search.naver?query=${encodeURIComponent(q + ' 칼로리 영양성분')}" target="_blank" rel="noopener noreferrer" style="font-size: 0.7rem; text-decoration: none; text-align: center; color: var(--text-muted); display: block;">
            🔍 네이버/식약처 포털 영양성분 조회 ↗
          </a>
          <div id="onlineSearchResultsBox" style="display: none; margin-top: 4px;"></div>
        </div>
      `;

      foodSearchResults.style.display = 'block';
      foodSearchResults.innerHTML = html;

      // 로컬 항목 클릭 이벤트 바인딩
      foodSearchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const fName = el.dataset.foodName;
          const foodInput = document.getElementById('mealFoods');
          if (foodInput.value.trim()) {
            foodInput.value = `${foodInput.value.trim()}, ${fName}`;
          } else {
            foodInput.value = fName;
          }
          foodSearchInput.value = '';
          foodSearchResults.style.display = 'none';
          btnFoodSearchClear.style.display = 'none';
          this.autoEstimateCalories();
          this.app.showToast(`'${fName}' 음식이 추가되었습니다!`);
        });
      });

      // 온라인 & AI 실시간 검색 버튼 클릭 이벤트
      document.getElementById('btnOnlineSearchFood')?.addEventListener('click', async () => {
        const box = document.getElementById('onlineSearchResultsBox');
        if (!box) return;
        box.style.display = 'block';
        box.innerHTML = '<p style="text-align: center; font-size: 0.75rem; color: #3b82f6; padding: 0.4rem 0;">⏳ 온라인 영양 DB 및 AI 실시간 조회 중...</p>';

        const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
        const onlineResults = await searchOnlineFoodDatabase(q);
        let aiResult = null;

        if (settings.geminiApiKey) {
          aiResult = await analyzeFoodTextWithGemini(q, settings.geminiApiKey);
        }

        let combinedHtml = '';

        if (aiResult && aiResult.success && aiResult.isAi) {
          combinedHtml += `
            <div style="font-weight: 700; font-size: 0.72rem; color: var(--accent-primary); margin-bottom: 3px;">🤖 Gemini AI 정밀 분석 결과:</div>
            <div class="online-result-item" data-name="${aiResult.foods}" data-kcal="${aiResult.totalKcal}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; background: rgba(99, 102, 241, 0.1); border: 1.5px solid var(--accent-primary); border-radius: 6px; cursor: pointer; margin-bottom: 4px; font-size: 0.75rem;">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">✨ <strong>${aiResult.foods}</strong></span>
              <strong style="color: var(--accent-primary); white-space: nowrap;">+${aiResult.totalKcal}k</strong>
            </div>
          `;
        }

        if (onlineResults.length > 0) {
          combinedHtml += `
            <div style="font-weight: 700; font-size: 0.72rem; color: #3b82f6; margin-top: 4px; margin-bottom: 3px;">🌐 공공 식품 영양 DB 결과:</div>
            ${onlineResults.map(p => `
              <div class="online-result-item" data-name="${p.name}" data-food-name="${p.foodName}" data-kcal="${p.kcal}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; cursor: pointer; margin-bottom: 3px; font-size: 0.75rem;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">🌐 <strong>${p.name}</strong></span>
                <strong style="color: #3b82f6; white-space: nowrap;">+${p.kcal}k</strong>
              </div>
            `).join('')}
          `;
        }

        if (combinedHtml) {
          box.innerHTML = combinedHtml;
          box.querySelectorAll('.online-result-item').forEach(itemEl => {
            itemEl.addEventListener('click', () => {
              const name = itemEl.dataset.name;
              const kcal = parseInt(itemEl.dataset.kcal, 10);
              const foodInput = document.getElementById('mealFoods');

              if (foodInput.value.trim()) {
                foodInput.value = `${foodInput.value.trim()}, ${name}`;
              } else {
                foodInput.value = name;
              }

              saveCustomFood({ name, kcal, icon: '⭐' });

              foodSearchInput.value = '';
              foodSearchResults.style.display = 'none';
              btnFoodSearchClear.style.display = 'none';
              this.autoEstimateCalories();
              this.app.showToast(`'${name}' (+${kcal} kcal) 영양 데이터가 추가되었습니다!`);
            });
          });
        } else {
          box.innerHTML = `
            <p style="text-align: center; font-size: 0.72rem; color: var(--text-muted); padding: 0.3rem 0;">
              온라인 영양 DB에 일치하는 항목이 없습니다. 상단 '네이버/식약처 포털 영양성분 조회' 링크를 이용해 보세요!
            </p>
          `;
        }
      });

      // 텍스트 직접 추가 버튼
      document.getElementById('btnDirectAddFood')?.addEventListener('click', () => {
        const foodInput = document.getElementById('mealFoods');
        if (foodInput.value.trim()) {
          foodInput.value = `${foodInput.value.trim()}, ${q}`;
        } else {
          foodInput.value = q;
        }
        foodSearchInput.value = '';
        foodSearchResults.style.display = 'none';
        btnFoodSearchClear.style.display = 'none';
        this.autoEstimateCalories();
      });
    });

    btnFoodSearchClear?.addEventListener('click', () => {
      if (foodSearchInput) foodSearchInput.value = '';
      if (foodSearchResults) foodSearchResults.style.display = 'none';
      btnFoodSearchClear.style.display = 'none';
    });

    // 운동 시간 변경 시 소모 칼로리 자동 계산
    document.getElementById('workoutDuration')?.addEventListener('input', () => {
      this.autoEstimateWorkoutCalories();
    });
    document.getElementById('workoutIntensity')?.addEventListener('change', () => {
      this.autoEstimateWorkoutCalories();
    });

    // 운동 퀵 시간 버튼 (+15분, +30분, +45분, +60분)
    document.querySelectorAll('.quick-dur-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('workoutDuration');
        const addMin = parseInt(btn.dataset.min, 10) || 15;
        const current = parseInt(input.value, 10) || 0;
        input.value = current + addMin;
        this.autoEstimateWorkoutCalories();
      });
    });

    // 스마트워치 가이드 모달 열기 버튼
    document.getElementById('btnOpenAppleWatchGuide')?.addEventListener('click', () => {
      this.openAppleWatchModal();
    });

    // 📸 음식 사진 촬영/업로드 시 Gemini Vision AI 분석
    const aiFoodPhotoInput = document.getElementById('aiFoodPhotoInput');
    const aiPhotoStatusWrap = document.getElementById('aiPhotoStatusWrap');
    const aiPhotoPreviewImg = document.getElementById('aiPhotoPreviewImg');
    const aiPhotoStatusText = document.getElementById('aiPhotoStatusText');
    const aiPhotoStatusSub = document.getElementById('aiPhotoStatusSub');

    aiFoodPhotoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const fullDataUrl = ev.target.result;
        const mimeType = file.type || 'image/jpeg';
        const base64Data = fullDataUrl.split(',')[1];

        if (aiPhotoStatusWrap) aiPhotoStatusWrap.style.display = 'block';
        if (aiPhotoPreviewImg) aiPhotoPreviewImg.src = fullDataUrl;
        if (aiPhotoStatusText) aiPhotoStatusText.textContent = '🤖 Gemini Vision AI가 음식 사진을 분석하는 중입니다...';
        if (aiPhotoStatusSub) aiPhotoStatusSub.textContent = '사진 속 음식의 종류, 분량, 칼로리를 식별하고 있습니다.';

        const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
        const res = await analyzeFoodPhotoWithGemini(base64Data, mimeType, settings.geminiApiKey);

        if (res.success) {
          document.getElementById('mealFoods').value = res.foods;
          document.getElementById('mealKcal').value = res.totalKcal;
          if (res.feedback) {
            const memoEl = document.getElementById('mealMemo');
            if (memoEl) memoEl.value = `[AI 영양 피드백] ${res.feedback}`;
          }
          if (aiPhotoStatusText) aiPhotoStatusText.textContent = `✅ AI 분석 완료: ${res.totalKcal} kcal`;
          if (aiPhotoStatusSub) aiPhotoStatusSub.textContent = `${res.foods} - ${res.feedback}`;
          this.autoEstimateCalories();
          this.app.showToast(`📸 음식 사진 분석 완료! (+${res.totalKcal} kcal)`);
        } else if (res.isNoKey) {
          if (aiPhotoStatusText) aiPhotoStatusText.textContent = '💡 Gemini API 키 필요';
          if (aiPhotoStatusSub) {
            aiPhotoStatusSub.innerHTML = `
              ${res.message} 
              <button type="button" class="btn btn-outline mt-1" style="font-size: 0.72rem; padding: 2px 6px; display: block;" id="btnGoToApiKeySettings">
                ⚙️ 설정에서 API 키 등록하기 (무료)
              </button>
            `;
            document.getElementById('btnGoToApiKeySettings')?.addEventListener('click', () => {
              this.openHealthSettingsModal();
            });
          }
        } else {
          if (aiPhotoStatusText) aiPhotoStatusText.textContent = '⚠️ 사진 분석 오류';
          if (aiPhotoStatusSub) aiPhotoStatusSub.textContent = res.message;
        }
      };
      reader.readAsDataURL(file);
    });

    // 📅 구글 & 애플 캘린더 양방향 연동 모달 열기
    document.getElementById('btnOpenCalendarSync')?.addEventListener('click', () => {
      this.openCalendarSyncModal();
    });

    // 🍏 애플 캘린더 / 아이폰 원클릭 내보내기 (.ics)
    document.getElementById('btnExportAppleCalendar')?.addEventListener('click', () => {
      const options = {
        syncWegovy: document.getElementById('syncChkMed')?.checked ?? true,
        syncEvents: document.getElementById('syncChkEvent')?.checked ?? true,
        syncWorkouts: document.getElementById('syncChkWorkout')?.checked ?? true,
        syncMeals: document.getElementById('syncChkMeal')?.checked ?? false,
        syncLedger: document.getElementById('syncChkLedger')?.checked ?? false
      };
      const ics = generateIcsContent(options);
      downloadIcsFile('lifepulse_apple_calendar.ics', ics);
      this.app.showToast('🍏 애플 캘린더용 파일이 다운로드되었습니다! (터치하면 캘린더에 바로 추가됩니다)');
    });

    // 🌐 구글 캘린더 등록용 파일 내보내기 (.ics)
    document.getElementById('btnExportGoogleCalendar')?.addEventListener('click', () => {
      const options = {
        syncWegovy: document.getElementById('syncChkMed')?.checked ?? true,
        syncEvents: document.getElementById('syncChkEvent')?.checked ?? true,
        syncWorkouts: document.getElementById('syncChkWorkout')?.checked ?? true,
        syncMeals: document.getElementById('syncChkMeal')?.checked ?? false,
        syncLedger: document.getElementById('syncChkLedger')?.checked ?? false
      };
      const ics = generateIcsContent(options);
      downloadIcsFile('lifepulse_google_calendar.ics', ics);
      this.app.showToast('🌐 구글 캘린더 등록용 파일이 생성되었습니다! (구글 캘린더 설정 > 가져오기에서 등록)');
    });

    // 📥 캘린더 파일(.ics) 가져오기
    const inputImportIcsFile = document.getElementById('inputImportIcsFile');
    inputImportIcsFile?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const res = parseAndImportIcs(text);
        if (res.count > 0) {
          this.closeAll();
          this.app.showToast(`🎉 ${res.count}개의 기존 캘린더 일정이 LifePulse로 등록되었습니다!`);
        } else {
          this.app.showToast('⚠️ 불러올 수 있는 일정이 파일에 없습니다.');
        }
        inputImportIcsFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  openCalendarSyncModal() {
    this.showModal(this.calendarSyncModal);
  }

  openUserGuideModal() {
    this.showModal(this.userGuideModal);
  }

  applyApplePreset(type, duration, kcal, distance, heartRate, memo) {
    this.closeAll();
    this.openAddModal(this.selectedDate, 'workout');
    this.selectedWorkoutType = type;
    this.renderWorkoutTypeSelector();
    document.getElementById('workoutDuration').value = duration;
    document.getElementById('workoutBurnedKcal').value = kcal;
    if (distance) document.getElementById('workoutDistance').value = distance;
    if (heartRate) document.getElementById('workoutHeartRate').value = heartRate;
    document.getElementById('workoutMemo').value = memo;
    this.app.showToast('스마트워치 운동 데이터가 입력되었습니다! ⌚');
  }

  openAppleWatchModal() {
    this.showModal(this.appleWatchModal);
  }

  openAddModal(defaultDate = null, defaultTab = 'meal') {
    this.editTarget = null;
    this.activeTab = defaultTab || 'meal';
    this.selectedDate = defaultDate || new Date().toISOString().substring(0, 10);
    
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[new Date(y, m - 1, d).getDay()];
    if (this.modalTitle) {
      this.modalTitle.textContent = `${y}년 ${m}월 ${d}일 (${dayOfWeek}) 새 기록 추가`;
    }
    
    this.resetForms();
    this.switchTab(this.activeTab);
    
    // 날짜 기본값 설정
    const dateInputs = ['mealDate', 'workoutDate', 'wegDate', 'evDate', 'txDate'];
    dateInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = this.selectedDate;
    });

    // 현재 설정된 의약품 기반 용량 세팅
    const activeMed = getActiveMedication();
    const medSelect = document.getElementById('wegMedType');
    if (medSelect) {
      medSelect.value = activeMed.id;
    }
    this.renderDosageOptions(activeMed.id);

    // 모달 탭 텍스트 갱신
    const modalTabWegovy = document.getElementById('modalTabWegovy');
    if (modalTabWegovy) {
      modalTabWegovy.textContent = activeMed.isMedication ? `💉 ${activeMed.shortName}` : '🌱 투약·체중';
    }

    // 추천 부위 자동 세팅
    const wegovyStatus = getWegovyStatus();
    this.selectedSite = wegovyStatus.nextRecommendedSite?.id || 'abdomen-right';
    this.renderInjectionSitePicker();
    this.renderSideEffectChips();

    // 식사 & 운동 폼 초기화
    this.renderQuickFoodChips();
    this.renderSatietyPicker();
    this.renderWorkoutTypeSelector();
    this.renderApiKeyStatusBadge();

    // 해당 날짜의 기존 등록 내역 요약 렌더링
    this.renderDayHistoryList(this.selectedDate);

    this.showModal(this.addEditModal);

    // 입력 필드 자동 포커스
    if (defaultTab === 'meal') {
      setTimeout(() => document.getElementById('mealFoods')?.focus(), 120);
    } else if (defaultTab === 'workout') {
      setTimeout(() => document.getElementById('workoutDuration')?.focus(), 120);
    } else if (defaultTab === 'event') {
      setTimeout(() => document.getElementById('evTitle')?.focus(), 120);
    } else if (defaultTab === 'wegovy') {
      setTimeout(() => document.getElementById('wegWeight')?.focus(), 120);
    }
  }

  openEditModal(type, id) {
    this.editTarget = { type, id };
    this.activeTab = type;
    if (this.modalTitle) this.modalTitle.textContent = '기록 수정';
    this.switchTab(type);

    if (type === 'meal') {
      const meal = store.getMeals().find(m => m.id === id);
      if (meal) {
        this.selectedDate = meal.date;
        const typeRadio = document.querySelector(`input[name="mealType"][value="${meal.mealType}"]`);
        if (typeRadio) typeRadio.checked = true;
        document.getElementById('mealDate').value = meal.date || '';
        document.getElementById('mealFoods').value = meal.foods || '';
        document.getElementById('mealKcal').value = meal.kcal || '';
        document.getElementById('mealMemo').value = meal.memo || '';
        this.selectedSatiety = meal.satiety || 2;
        this.renderQuickFoodChips();
        this.renderSatietyPicker();
      }
    } else if (type === 'workout') {
      const w = store.getWorkouts().find(item => item.id === id);
      if (w) {
        this.selectedDate = w.date;
        this.selectedWorkoutType = w.type || 'running';
        this.renderWorkoutTypeSelector();
        document.getElementById('workoutDate').value = w.date || '';
        document.getElementById('workoutDuration').value = w.duration || '';
        document.getElementById('workoutBurnedKcal').value = w.burnedKcal || '';
        document.getElementById('workoutDistance').value = w.distance || '';
        document.getElementById('workoutHeartRate').value = w.heartRate || '';
        document.getElementById('workoutMemo').value = w.memo || '';
      }
    } else if (type === 'wegovy') {
      const log = store.getWegovyLogs().find(l => l.id === id);
      if (log) {
        this.selectedDate = log.date;
        const medKey = log.medication || store.getSettings().medicationType || 'wegovy';
        const medSelect = document.getElementById('wegMedType');
        if (medSelect) medSelect.value = medKey;
        this.renderDosageOptions(medKey);

        document.getElementById('wegDate').value = log.date || '';
        document.getElementById('wegDose').value = log.dose || '';
        document.getElementById('wegWeight').value = log.weight || '';
        document.getElementById('wegMemo').value = log.memo || '';
        this.selectedSite = log.site || 'abdomen-right';
        this.selectedCondition = log.condition || 2;
        this.selectedSideEffects = new Set(log.sideEffects || []);
        this.renderInjectionSitePicker();
        this.renderSideEffectChips();
      }
    } else if (type === 'event') {
      const ev = store.getEvents().find(e => e.id === id);
      if (ev) {
        this.selectedDate = ev.date;
        document.getElementById('evTitle').value = ev.title || '';
        document.getElementById('evDate').value = ev.date || '';
        document.getElementById('evTime').value = ev.time || '';
        document.getElementById('evCategory').value = ev.category || 'work';
        document.getElementById('evMemo').value = ev.memo || '';
      }
    } else if (type === 'ledger') {
      const tx = store.getTransactions().find(t => t.id === id);
      if (tx) {
        this.selectedDate = tx.date;
        const typeRadio = document.querySelector(`input[name="ledgerType"][value="${tx.type}"]`);
        if (typeRadio) typeRadio.checked = true;
        this.renderCategoryOptions(tx.type);
        document.getElementById('txDate').value = tx.date || '';
        document.getElementById('txAmount').value = tx.amount || '';
        document.getElementById('txCategory').value = tx.category || '';
        document.getElementById('txPayment').value = tx.paymentMethod || '신용카드';
        document.getElementById('txMemo').value = tx.memo || '';
      }
    }

    this.renderApiKeyStatusBadge();
    this.renderDayHistoryList(this.selectedDate);
    this.showModal(this.addEditModal);
  }

  renderApiKeyStatusBadge() {
    const badge = document.getElementById('badgeApiKeyStatus');
    if (!badge) return;
    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    if (settings.geminiApiKey && settings.geminiApiKey.trim()) {
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = 'var(--accent-emerald)';
      badge.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      badge.innerHTML = '🟢 Gemini AI 연동됨 ⚙️';
      badge.title = 'Gemini API 키가 등록되어 실시간 AI 분석이 작동 중입니다. (클릭 시 변경)';
    } else {
      badge.style.background = 'rgba(239, 68, 68, 0.1)';
      badge.style.color = '#ef4444';
      badge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      badge.innerHTML = '🔴 API 키 미등록 (클릭하여 무료 등록) ⚙️';
      badge.title = '클릭하여 무료 Gemini API 키를 등록하세요!';
    }
  }

  renderDayHistoryList(dateStr) {
    const section = document.getElementById('modalDayHistorySection');
    const container = document.getElementById('modalDayHistoryList');
    if (!section || !container) return;

    const meals = (store.getMeals && typeof store.getMeals === 'function') ? store.getMeals().filter(m => m && m.date === dateStr) : [];
    const workouts = (store.getWorkouts && typeof store.getWorkouts === 'function') ? store.getWorkouts().filter(w => w && w.date === dateStr) : [];
    const wegovyLogs = (store.getWegovyLogs && typeof store.getWegovyLogs === 'function') ? store.getWegovyLogs().filter(l => l && l.date === dateStr) : [];
    const events = (store.getEvents && typeof store.getEvents === 'function') ? store.getEvents().filter(e => e && e.date === dateStr) : [];
    const txs = (store.getTransactions && typeof store.getTransactions === 'function') ? store.getTransactions().filter(t => t && t.date === dateStr) : [];

    const totalCount = meals.length + workouts.length + wegovyLogs.length + events.length + txs.length;

    if (totalCount === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    let html = '<div style="display: flex; flex-direction: column; gap: 0.4rem;">';

    meals.forEach(m => {
      const tMeta = MEAL_TYPES.find(t => t.id === m.mealType) || { name: '식사', icon: '🍽️', color: '#f59e0b' };
      html += `
        <div class="today-meal-mini-item" style="border-left: 3px solid ${tMeta.color};">
          <span class="meal-mini-tag" style="background: ${tMeta.color}22; color: ${tMeta.color};">${tMeta.icon} ${tMeta.name}</span>
          <span class="meal-mini-foods">${m.foods}</span>
          <strong class="meal-mini-kcal">🔥 +${m.kcal}k</strong>
          <button type="button" class="btn-icon" data-action="edit-meal" data-id="${m.id}" title="수정">✏️</button>
          <button type="button" class="btn-icon text-danger" data-action="delete-meal" data-id="${m.id}" title="삭제">🗑️</button>
        </div>
      `;
    });

    workouts.forEach(w => {
      const wMeta = WORKOUT_TYPES.find(t => t.id === w.type) || WORKOUT_TYPES[0];
      html += `
        <div class="today-workout-mini-item" style="border-left: 3px solid ${wMeta.color};">
          <span class="meal-mini-tag" style="background: ${wMeta.color}22; color: ${wMeta.color};">${wMeta.icon} ${wMeta.name}</span>
          <span class="meal-mini-foods">⏱️ ${w.duration}분 ${w.distance ? `(${w.distance}km)` : ''}</span>
          <strong class="workout-mini-kcal" style="color: #ef4444;">🔥 -${w.burnedKcal}k</strong>
          <button type="button" class="btn-icon" data-action="edit-workout" data-id="${w.id}" title="수정">✏️</button>
          <button type="button" class="btn-icon text-danger" data-action="delete-workout" data-id="${w.id}" title="삭제">🗑️</button>
        </div>
      `;
    });

    wegovyLogs.forEach(l => {
      const med = MEDICATIONS[l.medication] || getActiveMedication();
      html += `
        <div class="today-meal-mini-item" style="border-left: 3px solid ${med.color};">
          <span class="meal-mini-tag" style="background: ${med.color}22; color: ${med.color};">💉 ${med.shortName} ${l.dose}</span>
          <span class="meal-mini-foods">${l.siteLabel || ''} ${l.weight ? `| ⚖️ ${l.weight}kg` : ''}</span>
          <button type="button" class="btn-icon" data-action="edit-wegovy" data-id="${l.id}" title="수정">✏️</button>
          <button type="button" class="btn-icon text-danger" data-action="delete-wegovy" data-id="${l.id}" title="삭제">🗑️</button>
        </div>
      `;
    });

    events.forEach(e => {
      html += `
        <div class="today-meal-mini-item" style="border-left: 3px solid ${e.color || '#6366f1'};">
          <span class="meal-mini-tag" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">📅 일정</span>
          <span class="meal-mini-foods">${e.title}</span>
          <button type="button" class="btn-icon" data-action="edit-event" data-id="${e.id}" title="수정">✏️</button>
          <button type="button" class="btn-icon text-danger" data-action="delete-event" data-id="${e.id}" title="삭제">🗑️</button>
        </div>
      `;
    });

    txs.forEach(t => {
      const isExp = t.type === 'expense';
      html += `
        <div class="today-meal-mini-item" style="border-left: 3px solid ${isExp ? '#f43f5e' : '#14b8a6'};">
          <span class="meal-mini-tag" style="background: ${isExp ? 'rgba(244,63,94,0.15)' : 'rgba(20,184,166,0.15)'}; color: ${isExp ? '#f43f5e' : '#14b8a6'};">
            ${isExp ? '💸 지출' : '💰 수입'}
          </span>
          <span class="meal-mini-foods">${t.category}</span>
          <strong style="color: ${isExp ? '#f43f5e' : '#14b8a6'};">${isExp ? '-' : '+'}₩${Number(t.amount).toLocaleString()}</strong>
          <button type="button" class="btn-icon" data-action="edit-ledger" data-id="${t.id}" title="수정">✏️</button>
          <button type="button" class="btn-icon text-danger" data-action="delete-ledger" data-id="${t.id}" title="삭제">🗑️</button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit-meal') this.openEditModal('meal', id);
        else if (action === 'delete-meal' && confirm('이 식사 기록을 삭제하시겠습니까?')) { store.deleteMeal(id); this.renderDayHistoryList(dateStr); }
        else if (action === 'edit-workout') this.openEditModal('workout', id);
        else if (action === 'delete-workout' && confirm('이 운동 기록을 삭제하시겠습니까?')) { store.deleteWorkout(id); this.renderDayHistoryList(dateStr); }
        else if (action === 'edit-wegovy') this.openEditModal('wegovy', id);
        else if (action === 'delete-wegovy' && confirm('이 투약/체중 기록을 삭제하시겠습니까?')) { store.deleteWegovyLog(id); this.renderDayHistoryList(dateStr); }
        else if (action === 'edit-event') this.openEditModal('event', id);
        else if (action === 'delete-event' && confirm('이 일정을 삭제하시겠습니까?')) { store.deleteEvent(id); this.renderDayHistoryList(dateStr); }
        else if (action === 'edit-ledger') this.openEditModal('ledger', id);
        else if (action === 'delete-ledger' && confirm('이 가계부 내역을 삭제하시겠습니까?')) { store.deleteTransaction(id); this.renderDayHistoryList(dateStr); }
      });
    });
  }

  openHealthSettingsModal() {
    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    const medKey = settings.medicationType || 'wegovy';
    
    const medRadio = document.querySelector(`input[name="settingMedType"][value="${medKey}"]`);
    if (medRadio) medRadio.checked = true;

    document.getElementById('settingStartWeight').value = settings.startWeight || 84.5;
    document.getElementById('settingTargetWeight').value = settings.targetWeight || 68.0;
    document.getElementById('settingTargetCalorie').value = settings.targetCalorie || 1600;
    document.getElementById('settingTargetBurnCalorie').value = settings.targetBurnCalorie || 400;
    document.getElementById('settingIntervalDays').value = settings.wegovyIntervalDays || 7;
    const apiKeyInput = document.getElementById('settingGeminiApiKey');
    if (apiKeyInput) apiKeyInput.value = settings.geminiApiKey || '';
    if (this.app?.updateThemeButton) this.app.updateThemeButton(settings.theme || 'dark');
    this.renderCloudSyncStatus();

    document.getElementById('btnClearWegovyLogs').onclick = () => {
      if (confirm('등록된 모든 투약 및 체중 기록을 완전히 삭제하시겠습니까? (되돌릴 수 없습니다)')) {
        store.clearAllWegovyLogs();
        this.closeAll();
        this.app.showToast('모든 투약/체중 기록이 삭제되었습니다.');
      }
    };

    this.showModal(this.healthSettingsModal);
  }

  renderCloudSyncStatus() {
    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    const badge = document.getElementById('cloudSyncBadge');
    const activeBox = document.getElementById('cloudSyncActiveBox');
    const inputBox = document.getElementById('cloudSyncInputBox');
    const displayCode = document.getElementById('displaySyncCode');

    if (settings.syncCode && settings.syncCode.trim()) {
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = 'var(--accent-emerald)';
        badge.textContent = '🟢 실시간 연결됨';
      }
      if (activeBox) activeBox.style.display = 'block';
      if (inputBox) inputBox.style.display = 'none';
      if (displayCode) displayCode.textContent = settings.syncCode;
    } else {
      if (badge) {
        badge.style.background = 'var(--bg-subtle)';
        badge.style.color = 'var(--text-muted)';
        badge.textContent = '⚪ 미연결';
      }
      if (activeBox) activeBox.style.display = 'none';
      if (inputBox) inputBox.style.display = 'flex';
    }
  }

  handleHealthSettingsSubmit(e) {
    e.preventDefault();
    const medType = document.querySelector('input[name="settingMedType"]:checked')?.value || 'wegovy';
    const startWeight = parseFloat(document.getElementById('settingStartWeight').value) || 80.0;
    const targetWeight = parseFloat(document.getElementById('settingTargetWeight').value) || 68.0;
    const targetCalorie = parseInt(document.getElementById('settingTargetCalorie').value, 10) || 1600;
    const targetBurnCalorie = parseInt(document.getElementById('settingTargetBurnCalorie').value, 10) || 400;
    const intervalDays = parseInt(document.getElementById('settingIntervalDays').value, 10) || 7;
    const geminiApiKey = document.getElementById('settingGeminiApiKey')?.value.trim() || '';

    store.saveSettings({
      medicationType: medType,
      startWeight,
      targetWeight,
      targetCalorie,
      targetBurnCalorie,
      wegovyIntervalDays: intervalDays,
      geminiApiKey
    });

    const med = MEDICATIONS[medType] || MEDICATIONS.wegovy;
    this.renderApiKeyStatusBadge();
    this.closeAll();
    const keyMsg = geminiApiKey ? ' + 🤖 Gemini AI 활성화' : '';
    this.app.showToast(`설정이 저장되었습니다! (${med.name}, 목표: ${targetWeight}kg${keyMsg})`);
  }

  renderDosageOptions(medKey = 'wegovy') {
    const doseSelect = document.getElementById('wegDose');
    const doseFormGroup = doseSelect?.closest('.form-group') || doseSelect?.parentElement;
    const siteGroup = document.getElementById('injectionSiteGrid')?.closest('.form-group');
    const btnSubmit = document.getElementById('btnSubmitWegovy');
    const med = MEDICATIONS[medKey] || MEDICATIONS.wegovy;

    if (med.isMedication === false) {
      if (doseFormGroup) doseFormGroup.style.display = 'none';
      if (siteGroup) siteGroup.style.display = 'none';
      if (btnSubmit) btnSubmit.innerHTML = '🌱 체중 & 건강 기록 저장';
    } else {
      if (doseFormGroup) doseFormGroup.style.display = 'block';
      if (siteGroup) siteGroup.style.display = 'block';
      if (btnSubmit) btnSubmit.innerHTML = `💉 ${med.shortName} 투약 기록 저장`;
      if (doseSelect) {
        doseSelect.innerHTML = med.doses.map(d => `<option value="${d.value}">${d.label}</option>`).join('');
      }
    }
  }

  // --- 식사 카테고리별 빠른 음식 칩 렌더링 & 실시간 정밀 영양 분석 ---
  renderFoodCategoryPills() {
    const container = document.getElementById('foodCategoryPills');
    if (!container) return;

    container.innerHTML = FOOD_CATEGORIES.map(c => `
      <button type="button" class="food-cat-pill-btn ${this.selectedFoodCategory === c.id ? 'active' : ''}" data-cat-id="${c.id}" style="padding: 0.22rem 0.55rem; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid var(--border-subtle); background: ${this.selectedFoodCategory === c.id ? 'var(--accent-amber)' : 'var(--bg-subtle)'}; color: ${this.selectedFoodCategory === c.id ? '#000' : 'var(--text-muted)'}; white-space: nowrap; cursor: pointer;">
        ${c.name}
      </button>
    `).join('');

    container.querySelectorAll('.food-cat-pill-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedFoodCategory = btn.dataset.catId;
        this.renderFoodCategoryPills();
        this.renderQuickFoodChips();
      };
    });
  }

  renderQuickFoodChips() {
    const container = document.getElementById('quickFoodChips');
    if (!container) return;

    this.renderFoodCategoryPills();

    const cat = this.selectedFoodCategory || 'all';
    const filteredFoods = cat === 'all' 
      ? COMMON_FOOD_ITEMS.slice(0, 16) 
      : COMMON_FOOD_ITEMS.filter(f => f.category === cat);

    container.innerHTML = filteredFoods.map(f => `
      <button type="button" class="quick-food-chip" data-food-name="${f.name.split(' (')[0]}" data-food-full="${f.name}" data-food-kcal="${f.kcal}">
        + ${f.name} <small style="color: var(--accent-amber); font-weight: 700;">(${f.kcal}k)</small>
      </button>
    `).join('');

    container.querySelectorAll('.quick-food-chip').forEach(chip => {
      chip.onclick = () => {
        const foodName = chip.dataset.foodName;
        const foodInput = document.getElementById('mealFoods');

        if (foodInput.value.trim()) {
          foodInput.value = `${foodInput.value.trim()}, ${foodName}`;
        } else {
          foodInput.value = foodName;
        }

        this.autoEstimateCalories();
      };
    });
  }

  autoEstimateCalories() {
    const foodInput = document.getElementById('mealFoods');
    const kcalInput = document.getElementById('mealKcal');
    const breakdownBox = document.getElementById('liveNutritionBreakdown');
    const breakdownTags = document.getElementById('liveBreakdownTags');
    const totalBadge = document.getElementById('liveTotalKcalBadge');
    const aiIndicator = document.getElementById('liveAiStatusIndicator');

    if (!foodInput) return;

    const text = foodInput.value.trim();
    if (!text) {
      if (breakdownBox) breakdownBox.style.display = 'none';
      if (aiIndicator) aiIndicator.style.display = 'none';
      return;
    }

    // 1. 로컬 규칙 기반 0ms 즉각 계산 (지연 없이 즉각 반응)
    const result = parseFoodsAndCalculateNutrition(text);

    if (result.recognizedItems.length > 0) {
      if (breakdownBox) breakdownBox.style.display = 'block';
      if (totalBadge) totalBadge.textContent = `합계: ${result.totalKcal} kcal`;
      if (breakdownTags) {
        breakdownTags.innerHTML = result.recognizedItems.map(item => `
          <span style="display: inline-flex; align-items: center; gap: 3px; background: rgba(245, 158, 11, 0.16); color: var(--accent-amber); font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; border: 1px solid rgba(245, 158, 11, 0.3);">
            🥗 ${item.food} (${item.quantityStr}) ➔ <strong>+${item.kcal}k</strong>
          </span>
        `).join('');
      }
      if (kcalInput) {
        kcalInput.value = result.totalKcal;
      }
    } else {
      if (breakdownBox) breakdownBox.style.display = 'none';
    }

    // 2. Gemini API 키가 있는 경우: 입력이 멈춘 후 600ms 뒤 AI가 백그라운드에서 100% 자동 정밀 분석 수행!
    clearTimeout(this.aiAutoDebounceTimer);
    const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
    
    if (settings.geminiApiKey && text.length >= 2) {
      if (aiIndicator) {
        aiIndicator.style.display = 'inline';
        aiIndicator.textContent = '✨ AI가 자동 분석 중...';
      }

      this.aiAutoDebounceTimer = setTimeout(async () => {
        const res = await analyzeFoodTextWithGemini(text, settings.geminiApiKey);
        if (res.success && res.isAi) {
          if (kcalInput) kcalInput.value = res.totalKcal;
          if (res.feedback) {
            const memoEl = document.getElementById('mealMemo');
            if (memoEl && (!memoEl.value || memoEl.value.startsWith('[AI 영양'))) {
              memoEl.value = `[AI 영양 분석] ${res.feedback}`;
            }
          }

          if (breakdownBox) breakdownBox.style.display = 'block';
          if (totalBadge) totalBadge.textContent = `AI 정밀 합계: ${res.totalKcal} kcal`;
          if (breakdownTags && res.breakdown && res.breakdown.length > 0) {
            breakdownTags.innerHTML = res.breakdown.map(item => `
              <span style="display: inline-flex; align-items: center; gap: 3px; background: rgba(99, 102, 241, 0.15); color: var(--accent-primary); font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; border: 1px solid rgba(99, 102, 241, 0.3);">
                🤖 ${item.name} (${item.portion}) ➔ <strong>+${item.kcal}k</strong>
              </span>
            `).join('');
          }

          if (aiIndicator) {
            aiIndicator.textContent = '✅ AI 분석 적용됨';
            setTimeout(() => { if (aiIndicator) aiIndicator.style.display = 'none'; }, 2000);
          }
        } else if (res.error) {
          if (aiIndicator) aiIndicator.style.display = 'none';
          this.app.showToast(res.message);
        } else {
          if (aiIndicator) aiIndicator.style.display = 'none';
        }
      }, 650);
    } else {
      if (aiIndicator) aiIndicator.style.display = 'none';
    }
  }

  renderSatietyPicker() {
    const container = document.getElementById('satietySelector');
    if (!container) return;

    container.innerHTML = SATIETY_LEVELS.map(s => `
      <button type="button" class="satiety-btn ${this.selectedSatiety === s.value ? 'active' : ''}" data-value="${s.value}">
        <span class="sat-emoji">${s.emoji}</span>
        <span class="sat-label">${s.label}</span>
      </button>
    `).join('');

    container.querySelectorAll('.satiety-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedSatiety = parseInt(btn.dataset.value, 10);
        this.renderSatietyPicker();
      };
    });
  }

  // --- 운동 종류 셀렉터 및 칼로리 자동 계산 ---
  renderWorkoutTypeSelector() {
    const container = document.getElementById('workoutTypeSelector');
    if (!container) return;

    container.innerHTML = WORKOUT_TYPES.map(t => `
      <button type="button" class="workout-type-btn ${this.selectedWorkoutType === t.id ? 'active' : ''}" data-type-id="${t.id}" style="border-left-color: ${t.color};">
        <span class="w-icon">${t.icon}</span>
        <span class="w-name">${t.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.workout-type-btn').forEach(btn => {
      btn.onclick = () => {
        this.selectedWorkoutType = btn.dataset.typeId;
        this.renderWorkoutTypeSelector();
        this.autoEstimateWorkoutCalories();
      };
    });
  }

  autoEstimateWorkoutCalories() {
    const durInput = document.getElementById('workoutDuration');
    const kcalInput = document.getElementById('workoutBurnedKcal');
    const intensitySelect = document.getElementById('workoutIntensity');
    if (!durInput || !kcalInput) return;

    const duration = parseInt(durInput.value, 10) || 0;
    const intensity = parseFloat(intensitySelect?.value || '1.0');

    if (duration > 0 && this.selectedWorkoutType !== 'apple_watch') {
      const estimated = estimateWorkoutCalories(this.selectedWorkoutType, duration, intensity);
      kcalInput.value = estimated;
    }
  }

  openMobileConnectModal() {
    const copyBtn = document.getElementById('btnCopyMobileUrl');
    const urlInput = document.getElementById('mobileUrlInput');
    if (copyBtn && urlInput) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(urlInput.value).then(() => {
          this.app.showToast('주소가 클립보드에 복사되었습니다!');
        }).catch(() => {
          urlInput.select();
          document.execCommand('copy');
          this.app.showToast('주소가 복사되었습니다!');
        });
      };
    }
    this.showModal(this.mobileConnectModal);
  }

  handleMealSubmit(e) {
    e.preventDefault();
    const mealType = document.querySelector('input[name="mealType"]:checked')?.value || 'lunch';
    const date = document.getElementById('mealDate').value;
    const foods = document.getElementById('mealFoods').value.trim();
    const kcal = parseInt(document.getElementById('mealKcal').value, 10) || 0;
    const memo = document.getElementById('mealMemo').value.trim();

    const mealData = {
      mealType,
      date,
      foods,
      kcal,
      satiety: this.selectedSatiety,
      memo
    };

    if (this.editTarget && this.editTarget.type === 'meal') {
      mealData.id = this.editTarget.id;
      store.saveMeal(mealData);
      this.app.showToast('식사 기록이 수정되었습니다.');
    } else {
      store.saveMeal(mealData);
      this.app.showToast(`식사 기록이 저장되었습니다! (${kcal} kcal) 🍽️`);
    }

    this.closeAll();
  }

  handleWorkoutSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('workoutDate').value;
    const duration = parseInt(document.getElementById('workoutDuration').value, 10) || 0;
    const burnedKcal = parseInt(document.getElementById('workoutBurnedKcal').value, 10) || 0;
    const distanceVal = document.getElementById('workoutDistance').value;
    const distance = distanceVal ? parseFloat(distanceVal) : null;
    const heartRateVal = document.getElementById('workoutHeartRate').value;
    const heartRate = heartRateVal ? parseInt(heartRateVal, 10) : null;
    const intensity = parseFloat(document.getElementById('workoutIntensity').value || '1.0');
    const memo = document.getElementById('workoutMemo').value.trim();

    const workoutData = {
      type: this.selectedWorkoutType,
      date,
      duration,
      burnedKcal,
      distance,
      heartRate,
      intensity,
      memo
    };

    const typeMeta = WORKOUT_TYPES.find(t => t.id === this.selectedWorkoutType) || WORKOUT_TYPES[0];

    if (this.editTarget && this.editTarget.type === 'workout') {
      workoutData.id = this.editTarget.id;
      store.saveWorkout(workoutData);
      this.app.showToast(`${typeMeta.name} 기록이 수정되었습니다.`);
    } else {
      store.saveWorkout(workoutData);
      this.app.showToast(`${typeMeta.name} (${burnedKcal} kcal 소모) 저장 완료! 🏃`);
    }

    this.closeAll();
  }

  handleWegovySubmit(e) {
    e.preventDefault();
    const medKey = document.getElementById('wegMedType')?.value || 'wegovy';
    const date = document.getElementById('wegDate').value;
    const dose = document.getElementById('wegDose').value;
    const weightVal = document.getElementById('wegWeight').value;
    const weight = weightVal ? parseFloat(weightVal) : null;
    const memo = document.getElementById('wegMemo').value.trim();
    const siteObj = INJECTION_SITES.find(s => s.id === this.selectedSite) || INJECTION_SITES[0];

    const logData = {
      medication: medKey,
      date,
      dose,
      site: siteObj.id,
      siteLabel: siteObj.label,
      weight,
      condition: this.selectedCondition,
      sideEffects: Array.from(this.selectedSideEffects),
      memo
    };

    const med = MEDICATIONS[medKey] || MEDICATIONS.wegovy;

    if (this.editTarget && this.editTarget.type === 'wegovy') {
      logData.id = this.editTarget.id;
      store.saveWegovyLog(logData);
      this.app.showToast(`${med.shortName} 기록이 수정되었습니다.`);
    } else {
      store.saveWegovyLog(logData);
      this.app.showToast(`${med.shortName} 기록이 저장되었습니다! 💉`);
    }

    this.closeAll();
  }

  handleEventSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('evTitle').value.trim();
    const date = document.getElementById('evDate').value;
    const time = document.getElementById('evTime').value;
    const category = document.getElementById('evCategory').value;
    const memo = document.getElementById('evMemo').value.trim();

    const categoryColors = {
      work: '#6366f1',
      personal: '#ec4899',
      health: '#10b981',
      important: '#f59e0b',
      other: '#94a3b8'
    };

    const eventData = {
      title,
      date,
      time,
      category,
      color: categoryColors[category] || '#6366f1',
      memo
    };

    if (this.editTarget && this.editTarget.type === 'event') {
      eventData.id = this.editTarget.id;
      store.saveEvent(eventData);
      this.app.showToast('일정이 수정되었습니다.');
    } else {
      store.saveEvent(eventData);
      this.app.showToast('새 일정이 등록되었습니다.');
    }

    this.closeAll();
  }

  handleLedgerSubmit(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="ledgerType"]:checked')?.value || 'expense';
    const date = document.getElementById('txDate').value;
    const amount = parseInt(document.getElementById('txAmount').value, 10);
    const category = document.getElementById('txCategory').value;
    const paymentMethod = document.getElementById('txPayment').value;
    const memo = document.getElementById('txMemo').value.trim();

    const txData = {
      type,
      date,
      amount,
      category,
      paymentMethod,
      memo
    };

    if (this.editTarget && this.editTarget.type === 'ledger') {
      txData.id = this.editTarget.id;
      store.saveTransaction(txData);
      this.app.showToast('가계부 내역이 수정되었습니다.');
    } else {
      store.saveTransaction(txData);
      this.app.showToast(`₩${amount.toLocaleString()} ${type === 'expense' ? '지출' : '수입'} 내역이 등록되었습니다.`);
    }

    this.closeAll();
  }

  renderInjectionSitePicker() {
    const grid = document.getElementById('injectionSiteGrid');
    if (!grid) return;

    grid.innerHTML = INJECTION_SITES.map(s => `
      <div class="site-chip ${this.selectedSite === s.id ? 'active' : ''}" data-site-id="${s.id}">
        <span class="site-dot"></span>
        <span class="site-label">${s.label}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.site-chip').forEach(chip => {
      chip.onclick = () => {
        this.selectedSite = chip.dataset.siteId;
        this.renderInjectionSitePicker();
      };
    });
  }

  renderSideEffectChips() {
    const wrap = document.getElementById('sideEffectChips');
    if (!wrap) return;

    wrap.innerHTML = COMMON_SIDE_EFFECTS.map(effect => `
      <div class="effect-chip ${this.selectedSideEffects.has(effect) ? 'active' : ''}" data-effect="${effect}">
        ${effect}
      </div>
    `).join('');

    wrap.querySelectorAll('.effect-chip').forEach(chip => {
      chip.onclick = () => {
        const eff = chip.dataset.effect;
        if (this.selectedSideEffects.has(eff)) {
          this.selectedSideEffects.delete(eff);
        } else {
          this.selectedSideEffects.add(eff);
        }
        this.renderSideEffectChips();
      };
    });
  }

  renderCategoryOptions(type = 'expense') {
    const select = document.getElementById('txCategory');
    if (!select) return;

    const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    select.innerHTML = list.map(c => `
      <option value="${c.id}">${c.icon} ${c.name}</option>
    `).join('');
  }

  switchTab(tabId) {
    if (!tabId) tabId = 'meal';
    this.activeTab = tabId;

    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    const tabContents = document.querySelectorAll('.modal-tab-content');

    tabButtons.forEach(btn => {
      const match = btn.dataset.tab === tabId;
      btn.classList.toggle('active', match);
      if (match) {
        btn.style.background = 'var(--bg-surface)';
        btn.style.color = 'var(--text-main)';
        btn.style.boxShadow = 'var(--shadow-sm)';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
        btn.style.boxShadow = 'none';
      }
    });

    tabContents.forEach(content => {
      const isTarget = content.id === `tab-${tabId}`;
      content.classList.toggle('active', isTarget);
      content.style.display = isTarget ? 'block' : 'none';
    });
  }

  resetForms() {
    document.getElementById('mealForm')?.reset();
    document.getElementById('workoutForm')?.reset();
    document.getElementById('wegovyForm')?.reset();
    document.getElementById('eventForm')?.reset();
    document.getElementById('ledgerForm')?.reset();
    this.selectedSideEffects.clear();
    this.selectedCondition = 2;
    this.selectedSatiety = 2;
    this.selectedWorkoutType = 'running';
    this.renderCategoryOptions('expense');
  }

  showModal(modalEl) {
    if (!this.modalOverlay || !modalEl) return;
    this.modalOverlay.style.display = 'flex';
    this.modalOverlay.style.opacity = '1';
    this.modalOverlay.style.visibility = 'visible';
    this.modalOverlay.classList.add('active');
    this.modalOverlay.classList.add('open');

    document.querySelectorAll('.modal-window').forEach(w => {
      w.style.display = 'none';
      w.classList.remove('active');
      w.classList.remove('open');
    });

    modalEl.style.display = 'flex';
    modalEl.classList.add('active');
    modalEl.classList.add('open');
  }

  closeAll() {
    if (this.modalOverlay) {
      this.modalOverlay.style.display = 'none';
      this.modalOverlay.style.opacity = '0';
      this.modalOverlay.style.visibility = 'hidden';
      this.modalOverlay.classList.remove('active');
      this.modalOverlay.classList.remove('open');
    }
    document.querySelectorAll('.modal-window').forEach(w => {
      w.style.display = 'none';
      w.classList.remove('active');
      w.classList.remove('open');
    });
    this.editTarget = null;
  }

  openBackupModal() {
    const backupArea = document.getElementById('backupJsonArea');
    if (backupArea) {
      backupArea.value = JSON.stringify(store.exportAllData(), null, 2);
    }

    document.getElementById('btnDownloadJson').onclick = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(backupArea.value);
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `lifepulse_backup_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      this.app.showToast('백업 파일이 다운로드되었습니다.');
    };

    document.getElementById('btnApplyImport').onclick = () => {
      try {
        const parsed = JSON.parse(backupArea.value);
        store.importAllData(parsed);
        this.closeAll();
        this.app.showToast('데이터가 성공적으로 복원되었습니다! 🎉');
      } catch (err) {
        alert('올바른 JSON 형식의 백업 데이터가 아닙니다: ' + err.message);
      }
    };

    document.getElementById('btnResetMock').onclick = () => {
      if (confirm('모든 데이터를 초기 샘플 상태로 되돌리시겠습니까? 현재 입력된 데이터는 사라집니다.')) {
        store.resetToDefaults();
        this.closeAll();
        this.app.showToast('초기 데이터로 리셋되었습니다.');
      }
    };

    this.showModal(this.backupModal);
  }
}
