/**
 * LifePulse 기기 간 실시간 자동 클라우드 동기화 모듈 (PC ↔ 스마트폰)
 * 번거로운 파일 전송 없이 6자리 동기화 코드로 24시간 실시간 자동 연동
 */

const SYNC_ENDPOINT_BASE = 'https://kvdb.io/6iH8g2DqHhN9vN4u9Jv8kX/'; // Free zero-config public KV bucket for LifePulse

/**
 * 나만의 6자리 고유 동기화 코드 생성 (예: LP-8829-K)
 */
export function generateSyncCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LP-${rand}`;
}

/**
 * 클라우드에 현재 기기 데이터 실시간 백그라운드 업로드
 */
export async function pushDataToCloud(syncCode, data) {
  if (!syncCode || !data) return { success: false, message: '동기화 코드가 없습니다.' };

  const cleanCode = syncCode.trim().toUpperCase();
  const payload = {
    updatedAt: Date.now(),
    version: '5.0',
    data: data
  };

  try {
    const resp = await fetch(`${SYNC_ENDPOINT_BASE}${cleanCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      localStorage.setItem('lifepulse_last_synced_at', String(payload.updatedAt));
      return { success: true, timestamp: payload.updatedAt };
    } else {
      return { success: false, message: `서버 응답 오류 (HTTP ${resp.status})` };
    }
  } catch (err) {
    console.warn('클라우드 동기화 푸시 실패 (오프라인 상태일 수 있음):', err);
    return { success: false, message: err.message };
  }
}

/**
 * 클라우드에서 최신 데이터 가져오기
 */
export async function pullDataFromCloud(syncCode) {
  if (!syncCode) return { success: false, message: '동기화 코드가 없습니다.' };

  const cleanCode = syncCode.trim().toUpperCase();

  try {
    const resp = await fetch(`${SYNC_ENDPOINT_BASE}${cleanCode}?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (resp.ok) {
      const result = await resp.json();
      if (result && result.data) {
        return {
          success: true,
          updatedAt: result.updatedAt || 0,
          data: result.data
        };
      }
    } else if (resp.status === 404) {
      return { success: false, isNew: true, message: '등록된 클라우드 데이터가 아직 없습니다. (첫 기기에서 업로드 필요)' };
    }
    return { success: false, message: `데이터 조회 실패 (HTTP ${resp.status})` };
  } catch (err) {
    console.warn('클라우드 동기화 풀 실패:', err);
    return { success: false, message: err.message };
  }
}

/**
 * 실시간 자동 동기화 매니저 (앱 시작 시 및 데이터 변경 시 백그라운드 자동 동기화)
 */
export class CloudSyncManager {
  constructor(store, app) {
    this.store = store;
    this.app = app;
    this.debounceTimer = null;
    this.isSyncing = false;
    this.init();
  }

  init() {
    const settings = this.store.getSettings();
    if (settings.syncCode) {
      // 1. 앱 켜질 때 클라우드에서 최신 데이터 자동 수신
      this.checkAndPullLatest(false);

      // 2. 창이 다시 활성화될 때(스마트폰 화면 켤 때) 자동 최신화
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkAndPullLatest(false);
        }
      });
      window.addEventListener('focus', () => {
        this.checkAndPullLatest(false);
      });
    }

    // 3. 데이터가 변경되면 1.5초 뒤 클라우드로 자동 푸시
    this.store.subscribe((changeType) => {
      if (changeType === 'cloud_sync') return; // 무한루프 방지
      const currentSettings = this.store.getSettings();
      if (currentSettings.syncCode) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.pushCurrentData(false);
        }, 1200);
      }
    });
  }

  async pushCurrentData(showToast = false) {
    const settings = this.store.getSettings();
    if (!settings.syncCode) return;

    this.isSyncing = true;
    this.updateSyncIndicator(true);

    const snapshot = this.store.exportAllData();
    const res = await pushDataToCloud(settings.syncCode, snapshot);

    this.isSyncing = false;
    this.updateSyncIndicator(false);

    if (res.success && showToast) {
      this.app?.showToast('☁️ 클라우드에 최신 데이터가 실시간 저장되었습니다!');
    }
  }

  async checkAndPullLatest(showToast = false) {
    const settings = this.store.getSettings();
    if (!settings.syncCode || this.isSyncing) return;

    this.isSyncing = true;
    this.updateSyncIndicator(true);

    const res = await pullDataFromCloud(settings.syncCode);
    this.isSyncing = false;
    this.updateSyncIndicator(false);

    if (res.success && res.data) {
      const localLastSync = parseInt(localStorage.getItem('lifepulse_last_synced_at') || '0', 10);
      if (res.updatedAt > localLastSync) {
        // 클라우드 데이터가 더 최신인 경우 로컬 저장소 갱신
        this.store.importAllData(res.data);
        localStorage.setItem('lifepulse_last_synced_at', String(res.updatedAt));
        if (showToast) {
          this.app?.showToast('☁️ 다른 기기에서 수정한 최신 데이터를 실시간으로 불러왔습니다!');
        }
      }
    }
  }

  updateSyncIndicator(isSyncing) {
    const dot = document.getElementById('cloudSyncStatusDot');
    const text = document.getElementById('cloudSyncStatusText');
    if (dot) dot.style.background = isSyncing ? '#f59e0b' : '#10b981';
    if (text) text.textContent = isSyncing ? '클라우드 동기화 중...' : '실시간 동기화 완료';
  }
}
