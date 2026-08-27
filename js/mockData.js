/**
 * 초기 시연 및 기본 데이터 생성을 위한 Mock Data
 */

export const INITIAL_SETTINGS = {
  theme: 'dark',
  medicationType: 'wegovy', // 'none' | 'wegovy' | 'mounjaro' | 'saxenda'
  targetWeight: 68.0,
  startWeight: 84.5,
  targetCalorie: 1600, // 하루 목표 섭취 칼로리
  targetBurnCalorie: 400, // 하루 목표 운동 소모 칼로리
  wegovyIntervalDays: 7,
  preferredInjectionDay: 1, // 월요일
  layerFilters: {
    events: true,
    wegovy: true,
    meals: true,
    workouts: true,
    ledger: true
  }
};

export const INITIAL_WEGOVY_LOGS = [
  {
    id: 'wegovy-1',
    date: '2026-08-03',
    dose: '0.25mg',
    site: 'abdomen-right',
    siteLabel: '복부 (우측)',
    weight: 82.8,
    condition: 2,
    sideEffects: ['식욕감소', '경미한 메스꺼움'],
    memo: '위고비 1주차 첫 투약! 주사 통증 거의 없음.'
  },
  {
    id: 'wegovy-2',
    date: '2026-08-10',
    dose: '0.25mg',
    site: 'abdomen-left',
    siteLabel: '복부 (좌측)',
    weight: 81.6,
    condition: 1,
    sideEffects: ['식욕감소'],
    memo: '2주차 투약. 간식 생각이 거의 안 남. 물 2L 이상 마시기.'
  },
  {
    id: 'wegovy-3',
    date: '2026-08-17',
    dose: '0.25mg',
    site: 'thigh-right',
    siteLabel: '허벅지 (우측)',
    weight: 80.4,
    condition: 2,
    sideEffects: ['소화불량(약간)', '조기 포만감'],
    memo: '3주차 허벅지 투약. 저녁 소식했더니 속이 편함.'
  },
  {
    id: 'wegovy-4',
    date: '2026-08-24',
    dose: '0.25mg',
    site: 'thigh-left',
    siteLabel: '허벅지 (좌측)',
    weight: 79.3,
    condition: 1,
    sideEffects: ['식욕감소'],
    memo: '4주차 투약 완료! 다음 주부터는 0.5mg 증량 상담 예정.'
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-1',
    date: '2026-08-01',
    type: 'expense',
    amount: 375000,
    category: '의료/위고비',
    paymentMethod: '신용카드',
    memo: '위고비 0.25mg 4주분 처방 및 펜 구입'
  },
  {
    id: 'tx-2',
    date: '2026-08-03',
    type: 'expense',
    amount: 24500,
    category: '식비',
    paymentMethod: '체크카드',
    memo: '샐러드 및 닭가슴살 도시락 장보기'
  },
  {
    id: 'tx-3',
    date: '2026-08-05',
    type: 'expense',
    amount: 6500,
    category: '카페/디저트',
    paymentMethod: '간편결제',
    memo: '아이스 아메리카노 디카페인'
  },
  {
    id: 'tx-4',
    date: '2026-08-10',
    type: 'income',
    amount: 3800000,
    category: '급여/수입',
    paymentMethod: '계좌이체',
    memo: '8월 정기 급여'
  },
  {
    id: 'tx-5',
    date: '2026-08-12',
    type: 'expense',
    amount: 48000,
    category: '식비',
    paymentMethod: '신용카드',
    memo: '동료들과 가벼운 단백질 위주 식사'
  },
  {
    id: 'tx-6',
    date: '2026-08-15',
    type: 'expense',
    amount: 85000,
    category: '쇼핑',
    paymentMethod: '신용카드',
    memo: '운동용 스포츠웨어 및 텀블러'
  },
  {
    id: 'tx-7',
    date: '2026-08-18',
    type: 'expense',
    amount: 14500,
    category: '교통',
    paymentMethod: '신용카드',
    memo: '광역 교통비'
  },
  {
    id: 'tx-8',
    date: '2026-08-21',
    type: 'expense',
    amount: 32000,
    category: '식비',
    paymentMethod: '체크카드',
    memo: '그릭요거트, 방울토마토, 견과류'
  },
  {
    id: 'tx-9',
    date: '2026-08-24',
    type: 'expense',
    amount: 18000,
    category: '의료/위고비',
    paymentMethod: '신용카드',
    memo: '알콜스왑 및 인슐린 주사바늘 추가 구매'
  }
];

export const INITIAL_EVENTS = [
  {
    id: 'ev-1',
    title: '병원 내분비내과 정기 상담',
    date: '2026-08-01',
    time: '14:00',
    category: 'health',
    color: '#10b981',
    memo: '위고비 첫 처방 및 인바디 측정'
  },
  {
    id: 'ev-2',
    title: '주간 프로젝트 리뷰 미팅',
    date: '2026-08-07',
    time: '10:30',
    category: 'work',
    color: '#6366f1',
    memo: 'Q3 실적 점검'
  },
  {
    id: 'ev-3',
    title: '광복절 연휴 피트니스 루틴',
    date: '2026-08-15',
    time: '09:00',
    category: 'personal',
    color: '#f59e0b',
    memo: '유산소 40분 + 코어 운동'
  },
  {
    id: 'ev-4',
    title: '친구 저녁 약속 (단백질 위주)',
    date: '2026-08-22',
    time: '18:30',
    category: 'personal',
    color: '#ec4899',
    memo: '샤브샤브 식당 예약'
  },
  {
    id: 'ev-5',
    title: '위고비 0.5mg 증량 진료 예약',
    date: '2026-08-28',
    time: '15:30',
    category: 'health',
    color: '#10b981',
    memo: '1개월 체중 감량 경과 보고 및 0.5mg 처방'
  }
];

export const INITIAL_MEALS = [
  {
    id: 'meal-1',
    date: '2026-08-24',
    mealType: 'breakfast',
    foods: '삶은 달걀 2개, 그릭 요거트 & 베리',
    kcal: 300,
    satiety: 2,
    memo: '아침 단백질 위주 가볍게 식사'
  },
  {
    id: 'meal-2',
    date: '2026-08-24',
    mealType: 'lunch',
    foods: '닭가슴살 샐러드, 현미밥 1공기',
    kcal: 520,
    satiety: 3,
    memo: '드레싱 절반만 뿌림'
  },
  {
    id: 'meal-3',
    date: '2026-08-24',
    mealType: 'dinner',
    foods: '두부구이 & 채소, 아메리카노',
    kcal: 210,
    satiety: 2,
    memo: '위고비 투약일이라 저녁 조기 포만감 있음'
  },
  {
    id: 'meal-4',
    date: '2026-08-25',
    mealType: 'lunch',
    foods: '서브웨이 샌드위치 (로티세리)',
    kcal: 380,
    satiety: 2,
    memo: '올리브오일 소스 선택'
  },
  {
    id: 'meal-5',
    date: '2026-08-26',
    mealType: 'breakfast',
    foods: '단백질 쉐이크, 바나나 1개',
    kcal: 250,
    satiety: 2,
    memo: '운동 전 간단 식사'
  },
  {
    id: 'meal-6',
    date: '2026-08-26',
    mealType: 'lunch',
    foods: '연어 구이 (150g), 현미밥 반공기',
    kcal: 430,
    satiety: 3,
    memo: '양질의 단백질 섭취'
  }
];

export const INITIAL_WORKOUTS = [
  {
    id: 'workout-1',
    date: '2026-08-24',
    type: 'walking',
    title: '저녁 가벼운 산책',
    duration: 40,
    burnedKcal: 170,
    distance: 3.2,
    heartRate: 110,
    memo: '식후 소화 산책 (애플워치 기록)'
  },
  {
    id: 'workout-2',
    date: '2026-08-25',
    type: 'running',
    title: '야외 인터벌 러닝',
    duration: 35,
    burnedKcal: 350,
    distance: 4.5,
    heartRate: 152,
    memo: '애플워치 러닝 세션 완료 ⌚'
  },
  {
    id: 'workout-3',
    date: '2026-08-26',
    type: 'gym',
    title: '상체 웨이트 & 복근',
    duration: 50,
    burnedKcal: 320,
    distance: null,
    heartRate: 128,
    memo: '덤벨 프레스, 랫풀다운'
  }
];
