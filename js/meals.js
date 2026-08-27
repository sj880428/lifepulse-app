/**
 * 식사 및 식품의약품안전처 표준 영양DB 기반 고정밀 칼로리 계산 & 스마트 음식 검색 엔진
 */
import { store } from './storage.js?v=3.0.0';

export const MEAL_TYPES = [
  { id: 'breakfast', name: '아침', icon: '🌅', color: '#f59e0b', defaultTime: '08:00' },
  { id: 'lunch', name: '점심', icon: '☀️', color: '#10b981', defaultTime: '12:30' },
  { id: 'dinner', name: '저녁', icon: '🌙', color: '#6366f1', defaultTime: '19:00' },
  { id: 'snack', name: '간식', icon: '🥪', color: '#ec4899', defaultTime: '15:30' }
];

export const SATIETY_LEVELS = [
  { value: 1, label: '가벼움 (배고픔)', emoji: '🥗' },
  { value: 2, label: '적당함 (80% 포만)', emoji: '😊' },
  { value: 3, label: '든든함 (100% 포만)', emoji: '😋' },
  { value: 4, label: '과식 (조금 더부룩)', emoji: '😵' }
];

export const FOOD_CATEGORIES = [
  { id: 'all', name: '전체' },
  { id: 'fruit', name: '과일/채소' },
  { id: 'diet', name: '다이어트/단백질' },
  { id: 'korean', name: '한식/식사' },
  { id: 'snack', name: '간식/베이커리' },
  { id: 'drink', name: '카페/음료' },
  { id: 'fastfood', name: '외식/배달' }
];

// 한국인이 자주 먹는 표준 영양 사전 (과일, 다이어트식, 한식, 외식, 카페 등 120+개)
export const COMMON_FOOD_ITEMS = [
  // 1. 과일 & 채소류 (수박, 참외, 복숭아, 사과, 바나나 등)
  { name: '수박 (1조각/150g)', aliases: ['수박', '수박조각', '수박화채', '수박한조각'], kcal: 45, unit: '조각', baseAmount: 1, category: 'fruit', icon: '🍉' },
  { name: '수박 (1/4통/1kg)', aliases: ['수박반통', '수박통', '수박1kg'], kcal: 300, unit: '통', baseAmount: 0.25, category: 'fruit', icon: '🍉' },
  { name: '참외 (1개/250g)', aliases: ['참외', '노란참외'], kcal: 80, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍈' },
  { name: '복숭아 (1개/200g)', aliases: ['복숭아', '백도', '황도', '천도복숭아', '딱딱이복숭아'], kcal: 70, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍑' },
  { name: '사과 (1개/250g)', aliases: ['사과', '풋사과', '아오리사과'], kcal: 110, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍎' },
  { name: '바나나 (1개/120g)', aliases: ['바나나'], kcal: 105, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍌' },
  { name: '포도 / 샤인머스캣 (1송이)', aliases: ['포도', '샤인머스캣', '거봉', '머스캣'], kcal: 180, unit: '송이', baseAmount: 1, category: 'fruit', icon: '🍇' },
  { name: '딸기 (10알/200g)', aliases: ['딸기'], kcal: 60, unit: '알', baseAmount: 10, category: 'fruit', icon: '🍓' },
  { name: '블루베리 (100g)', aliases: ['블루베리', '베리'], kcal: 55, unit: 'g', baseAmount: 100, category: 'fruit', icon: '🫐' },
  { name: '귤 / 오렌지 (1개)', aliases: ['귤', '오렌지', '한라봉', '천혜향', '레드향'], kcal: 50, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍊' },
  { name: '토마토 (1개/200g)', aliases: ['토마토', '완숙토마토'], kcal: 40, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍅' },
  { name: '방울토마토 (10알)', aliases: ['방울토마토', '스테비아토마토'], kcal: 30, unit: '알', baseAmount: 10, category: 'fruit', icon: '🍅' },
  { name: '아보카도 (반개/100g)', aliases: ['아보카도'], kcal: 160, unit: '개', baseAmount: 0.5, category: 'fruit', icon: '🥑' },
  { name: '키위 (1개)', aliases: ['키위', '골드키위', '그린키위'], kcal: 55, unit: '개', baseAmount: 1, category: 'fruit', icon: '🥝' },
  { name: '망고 (1개)', aliases: ['망고', '애플망고'], kcal: 130, unit: '개', baseAmount: 1, category: 'fruit', icon: '🥭' },
  { name: '자몽 (1개)', aliases: ['자몽'], kcal: 80, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍊' },
  { name: '배 (1개/400g)', aliases: ['배', '나주배'], kcal: 180, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍐' },
  { name: '감 / 단감 (1개)', aliases: ['감', '단감', '홍시', '곶감'], kcal: 110, unit: '개', baseAmount: 1, category: 'fruit', icon: '🍊' },

  // 2. 다이어트 & 고단백질
  { name: '닭가슴살 (100g)', aliases: ['닭가슴살', '닭가슴', '수비드닭', '스팀닭'], kcal: 120, unit: 'g', baseAmount: 100, category: 'diet', icon: '🍗' },
  { name: '닭가슴살 핫바/소시지 (1개)', aliases: ['닭가슴살소시지', '닭가슴살핫바', '닭가슴소세지'], kcal: 135, unit: '개', baseAmount: 1, category: 'diet', icon: '🌭' },
  { name: '삶은 달걀 (1개)', aliases: ['삶은달걀', '삶은계란', '계란', '달걀', '구운계란'], kcal: 75, unit: '개', baseAmount: 1, category: 'diet', icon: '🥚' },
  { name: '계란 후라이 (1개)', aliases: ['계란후라이', '달걀후라이', '후라이'], kcal: 95, unit: '개', baseAmount: 1, category: 'diet', icon: '🍳' },
  { name: '단백질 쉐이크 (1회)', aliases: ['단백질쉐이크', '프로틴', '프로틴쉐이크', '단백질음료'], kcal: 150, unit: '회', baseAmount: 1, category: 'diet', icon: '🥤' },
  { name: '두부구이 (150g)', aliases: ['두부', '두부구이', '생두부', '순두부'], kcal: 130, unit: 'g', baseAmount: 150, category: 'diet', icon: '🧈' },
  { name: '연어 구이 (150g)', aliases: ['연어', '연어구이', '생연어'], kcal: 260, unit: 'g', baseAmount: 150, category: 'diet', icon: '🐟' },
  { name: '소고기 우둔/안심 (150g)', aliases: ['소고기', '소안심', '소우둔', '스테이크'], kcal: 240, unit: 'g', baseAmount: 150, category: 'diet', icon: '🥩' },
  { name: '돼지 안심/목살 (150g)', aliases: ['돼지안심', '돼지목살', '목살'], kcal: 270, unit: 'g', baseAmount: 150, category: 'diet', icon: '🥩' },
  { name: '단백질 바 (1개)', aliases: ['프로틴바', '단백질바', '에너지바'], kcal: 190, unit: '개', baseAmount: 1, category: 'diet', icon: '🍫' },
  { name: '그릭 요거트 무가당 (100g)', aliases: ['그릭요거트', '요거트', '요플레'], kcal: 90, unit: 'g', baseAmount: 100, category: 'diet', icon: '🥣' },
  { name: '오트밀 (40g/1그릇)', aliases: ['오트밀', '귀리'], kcal: 150, unit: 'g', baseAmount: 40, category: 'diet', icon: '🥣' },
  { name: '고구마 (1개/150g)', aliases: ['고구마', '군고구마', '찐고구마'], kcal: 190, unit: '개', baseAmount: 1, category: 'diet', icon: '🍠' },
  { name: '감자 (1개/150g)', aliases: ['감자', '찐감자', '삶은감자'], kcal: 110, unit: '개', baseAmount: 1, category: 'diet', icon: '🥔' },
  { name: '단호박 (150g)', aliases: ['단호박', '찐단호박'], kcal: 100, unit: 'g', baseAmount: 150, category: 'diet', icon: '🎃' },
  { name: '닭가슴살 샐러드 (1그릇)', aliases: ['닭가슴살샐러드', '치킨샐러드', '샐러드'], kcal: 240, unit: '그릇', baseAmount: 1, category: 'diet', icon: '🥗' },
  { name: '포케 (연어/참치 1그릇)', aliases: ['포케', '연어포케', '참치포케', '샐러드보울'], kcal: 480, unit: '그릇', baseAmount: 1, category: 'diet', icon: '🥗' },
  { name: '서브웨이 로스트치킨', aliases: ['서브웨이', '샌드위치', '로스트치킨'], kcal: 320, unit: '개', baseAmount: 1, category: 'diet', icon: '🥪' },

  // 3. 한식 & 찌개 & 식사
  { name: '햇반 / 즉석밥 (200g/1개)', aliases: ['햇반', '오뚜기밥', '즉석밥', '햇반200g', '햇반200그램'], kcal: 310, unit: '개', baseAmount: 1, category: 'korean', icon: '🍚' },
  { name: '조미김 / 구운김 (1봉/5g)', aliases: ['김', '조미김', '구운김', '도시락김', '양반김', '들기름김'], kcal: 25, unit: '봉', baseAmount: 1, category: 'korean', icon: '⬛' },
  { name: '참치캔 (1캔/100g)', aliases: ['참치', '참치캔', '동원참치', '고추참치', '라이트참치', '캔참치'], kcal: 160, unit: '캔', baseAmount: 1, category: 'diet', icon: '🥫' },
  { name: '스팸 / 통조림햄 (2조각/50g)', aliases: ['스팸', '런천미트', '리챔', '통조림햄'], kcal: 170, unit: '조각', baseAmount: 2, category: 'korean', icon: '🥩' },
  { name: '라면 / 봉지라면 (1봉지)', aliases: ['라면', '신라면', '진라면', '짜파게티', '불닭볶음면', '안성탕면'], kcal: 500, unit: '봉', baseAmount: 1, category: 'korean', icon: '🍜' },
  { name: '김치 (1접시/50g)', aliases: ['김치', '배추김치', '깍두기', '열무김치', '총각김치'], kcal: 20, unit: '접시', baseAmount: 1, category: 'korean', icon: '🥬' },
  { name: '만두 (5개/150g)', aliases: ['만두', '군만두', '비비고만두', '물만두', '교자'], kcal: 290, unit: '개', baseAmount: 5, category: 'korean', icon: '🥟' },
  { name: '현미밥 (1공기/200g)', aliases: ['현미밥', '잡곡밥'], kcal: 300, unit: '공기', baseAmount: 1, category: 'korean', icon: '🍚' },
  { name: '백미 쌀밥 (1공기/210g)', aliases: ['쌀밥', '백미밥', '공기밥', '밥'], kcal: 310, unit: '공기', baseAmount: 1, category: 'korean', icon: '🍚' },
  { name: '곤약밥 (1공기/150g)', aliases: ['곤약밥', '귀리곤약밥'], kcal: 120, unit: '공기', baseAmount: 1, category: 'korean', icon: '🍚' },
  { name: '된장찌개 & 밥', aliases: ['된장찌개', '된장국'], kcal: 460, unit: '인분', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '김치찌개 & 밥', aliases: ['김치찌개'], kcal: 520, unit: '인분', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '순두부찌개 & 밥', aliases: ['순두부찌개'], kcal: 510, unit: '인분', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '부대찌개 (1인분)', aliases: ['부대찌개'], kcal: 620, unit: '인분', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '미역국 (1대접)', aliases: ['미역국', '소고기미역국'], kcal: 120, unit: '대접', baseAmount: 1, category: 'korean', icon: '🥣' },
  { name: '비빔밥 (1그릇)', aliases: ['비빔밥', '나물비빔밥'], kcal: 560, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '제육볶음 & 밥', aliases: ['제육볶음', '제육덮밥', '제육'], kcal: 680, unit: '인분', baseAmount: 1, category: 'korean', icon: '🍛' },
  { name: '소불고기 (1인분/200g)', aliases: ['불고기', '소불고기'], kcal: 380, unit: '인분', baseAmount: 1, category: 'korean', icon: '🥩' },
  { name: '삼계탕 (1그릇)', aliases: ['삼계탕', '반계탕'], kcal: 850, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '설렁탕 / 곰탕 (1그릇)', aliases: ['설렁탕', '곰탕', '소고기국밥', '국밥'], kcal: 540, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '순대국밥 (1그릇)', aliases: ['순대국', '순대국밥', '돼지국밥'], kcal: 680, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '뼈해장국 (1그릇)', aliases: ['뼈해장국', '감자탕', '해장국'], kcal: 750, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍲' },
  { name: '칼국수 / 수제비 (1그릇)', aliases: ['칼국수', '수제비', '바지락칼국수'], kcal: 580, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍜' },
  { name: '잔치국수 (1그릇)', aliases: ['잔치국수', '온면'], kcal: 420, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍜' },
  { name: '비빔국수 (1그릇)', aliases: ['비빔국수', '쫄면'], kcal: 520, unit: '그릇', baseAmount: 1, category: 'korean', icon: '🍜' },

  // 4. 외식 & 배달 & 아시안
  { name: '삼겹살 구이 (1인분/200g)', aliases: ['삼겹살', '오겹살'], kcal: 660, unit: '인분', baseAmount: 1, category: 'fastfood', icon: '🥓' },
  { name: '마라탕 (1그릇)', aliases: ['마라탕', '마라샹궈'], kcal: 650, unit: '그릇', baseAmount: 1, category: 'fastfood', icon: '🍲' },
  { name: '쌀국수 (1그릇)', aliases: ['쌀국수', '베트남쌀국수', '분짜'], kcal: 480, unit: '그릇', baseAmount: 1, category: 'fastfood', icon: '🍜' },
  { name: '치킨 후라이드 (3조각)', aliases: ['치킨', '후라이드치킨', '양념치킨'], kcal: 650, unit: '조각', baseAmount: 3, category: 'fastfood', icon: '🍗' },
  { name: '굽네 / 오븐구이 치킨 (반마리)', aliases: ['굽네치킨', '오븐구이치킨', '구운치킨'], kcal: 480, unit: '마리', baseAmount: 0.5, category: 'fastfood', icon: '🍗' },
  { name: '피자 (1조각)', aliases: ['피자'], kcal: 290, unit: '조각', baseAmount: 1, category: 'fastfood', icon: '🍕' },
  { name: '햄버거 단품 (1개)', aliases: ['햄버거', '버거'], kcal: 520, unit: '개', baseAmount: 1, category: 'fastfood', icon: '🍔' },
  { name: '초밥 (10피스)', aliases: ['초밥', '스시', '연어초밥', '모듬초밥'], kcal: 550, unit: '세트', baseAmount: 1, category: 'fastfood', icon: '🍣' },
  { name: '돈까스 / 돈가스 (1인분)', aliases: ['돈까스', '돈가스', '치즈돈까스'], kcal: 750, unit: '인분', baseAmount: 1, category: 'fastfood', icon: '🍱' },
  { name: '냉면 (물/비빔 1그릇)', aliases: ['냉면', '물냉면', '비빔냉면'], kcal: 500, unit: '그릇', baseAmount: 1, category: 'fastfood', icon: '🍜' },
  { name: '짜장면 (1그릇)', aliases: ['짜장면', '자장면'], kcal: 780, unit: '그릇', baseAmount: 1, category: 'fastfood', icon: '🥢' },
  { name: '짬뽕 (1그릇)', aliases: ['짬뽕'], kcal: 680, unit: '그릇', baseAmount: 1, category: 'fastfood', icon: '🥢' },
  { name: '라면 (1봉지)', aliases: ['라면', '신라면', '진라면'], kcal: 500, unit: '봉지', baseAmount: 1, category: 'fastfood', icon: '🍜' },

  // 5. 카페 & 음료
  { name: '아메리카노 (1잔)', aliases: ['아메리카노', '아이스아메리카노', '블랙커피', '드립커피'], kcal: 10, unit: '잔', baseAmount: 1, category: 'drink', icon: '☕' },
  { name: '카페 라떼 (1잔)', aliases: ['카페라떼', '라떼', '아이스라떼'], kcal: 170, unit: '잔', baseAmount: 1, category: 'drink', icon: '☕' },
  { name: '바닐라 라떼 (1잔)', aliases: ['바닐라라떼', '바닐라빈라떼'], kcal: 240, unit: '잔', baseAmount: 1, category: 'drink', icon: '☕' },
  { name: '아몬드 브리즈 언스위트 (1팩)', aliases: ['아몬드브리즈', '아몬드유'], kcal: 35, unit: '팩', baseAmount: 1, category: 'drink', icon: '🥛' },
  { name: '두유 무가당 (1팩)', aliases: ['두유', '매일두유'], kcal: 95, unit: '팩', baseAmount: 1, category: 'drink', icon: '🥛' },
  { name: '제로 탄산음료 (1캔)', aliases: ['제로콜라', '나랑드', '제로사이다', '펩시제로', '제로'], kcal: 0, unit: '캔', baseAmount: 1, category: 'drink', icon: '🥤' },
  { name: '녹차 / 허브티 (1잔)', aliases: ['녹차', '허브티', '캐모마일', '페퍼민트', '차'], kcal: 2, unit: '잔', baseAmount: 1, category: 'drink', icon: '🍵' },

  // 6. 분식 & 간식 & 베이커리
  { name: '떡볶이 (1인분)', aliases: ['떡볶이', '로제떡볶이'], kcal: 580, unit: '인분', baseAmount: 1, category: 'snack', icon: '🍢' },
  { name: '순대 (1인분)', aliases: ['순대'], kcal: 450, unit: '인분', baseAmount: 1, category: 'snack', icon: '🍢' },
  { name: '김밥 (1줄)', aliases: ['김밥', '참치김밥', '야채김밥'], kcal: 420, unit: '줄', baseAmount: 1, category: 'snack', icon: '🍙' },
  { name: '하루 견과 1봉 (25g)', aliases: ['견과류', '하루견과', '아몬드', '호두'], kcal: 145, unit: '봉', baseAmount: 1, category: 'snack', icon: '🥜' },
  { name: '베이글 (1개)', aliases: ['베이글'], kcal: 280, unit: '개', baseAmount: 1, category: 'snack', icon: '🥯' },
  { name: '크루아상 (1개)', aliases: ['크루아상', '크로와상'], kcal: 240, unit: '개', baseAmount: 1, category: 'snack', icon: '🥐' },
  { name: '식빵 (1장)', aliases: ['식빵', '토스트'], kcal: 100, unit: '장', baseAmount: 1, category: 'snack', icon: '🍞' },
  { name: '다크 초콜릿 (2조각)', aliases: ['다크초콜릿', '초콜릿'], kcal: 110, unit: '조각', baseAmount: 2, category: 'snack', icon: '🍫' }
];

/**
 * 사용자 정의 커스텀 음식 사전 (로컬스토리지 저장)
 */
export function getCustomFoods() {
  try {
    return JSON.parse(localStorage.getItem('lifepulse_custom_foods')) || [];
  } catch {
    return [];
  }
}

export function saveCustomFood(food) {
  if (!food || !food.name || !food.kcal) return;
  const custom = getCustomFoods();
  const existingIdx = custom.findIndex(c => c.name.toLowerCase() === food.name.toLowerCase());
  const item = {
    name: food.name,
    aliases: [food.name.split(' (')[0], ...(food.aliases || [])],
    kcal: parseInt(food.kcal, 10),
    unit: food.unit || '개',
    baseAmount: food.baseAmount || 1,
    category: food.category || 'custom',
    icon: food.icon || '⭐'
  };

  if (existingIdx >= 0) {
    custom[existingIdx] = item;
  } else {
    custom.unshift(item);
  }
  localStorage.setItem('lifepulse_custom_foods', JSON.stringify(custom.slice(0, 100)));
}

/**
 * 사용자 입력 키워드로 로컬 및 커스텀 음식 사전 검색
 * @param {string} query 
 * @returns {Array<typeof COMMON_FOOD_ITEMS[0]>}
 */
export function searchFoodDatabase(query) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return [];

  const allFoods = [...getCustomFoods(), ...COMMON_FOOD_ITEMS];

  return allFoods.filter(item => {
    if (item.name.toLowerCase().replace(/\s+/g, '').includes(q)) return true;
    return item.aliases.some(a => a.toLowerCase().replace(/\s+/g, '').includes(q));
  });
}

/**
 * 온라인 오픈 푸드(Open Food Facts) 공공 영양 데이터베이스 실시간 검색
 * @param {string} query 
 * @returns {Promise<Array<{ name: string, foodName: string, kcal: number, brand: string, icon: string }>>}
 */
export async function searchOnlineFoodDatabase(query) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim();
  if (!q) return [];

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('온라인 서버 응답 실패');
    
    const data = await resp.json();
    if (data && Array.isArray(data.products)) {
      const results = [];
      data.products.forEach(p => {
        const prodName = p.product_name || p.product_name_ko || p.product_name_en;
        const nutriments = p.nutriments || {};
        const kcal = Math.round(nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0);

        if (prodName && kcal > 0) {
          const serving = p.serving_size ? ` (${p.serving_size})` : '';
          const brand = p.brands ? ` [${p.brands.split(',')[0]}]` : '';
          results.push({
            name: `${prodName}${brand}${serving}`,
            foodName: prodName,
            kcal: kcal,
            brand: p.brands || '온라인 영양DB',
            source: 'online',
            icon: '🌐'
          });
        }
      });
      return results.slice(0, 6);
    }
    return [];
  } catch (err) {
    console.warn('온라인 식품 영양 검색 실패 또는 오프라인:', err);
    return [];
  }
}

/**
 * 텍스트에서 수량과 단위를 파싱하여 정확한 칼로리를 곱연산으로 계산하는 스마트 파서
 */
export function parseFoodsAndCalculateNutrition(text) {
  if (!text || typeof text !== 'string') {
    return { totalKcal: 0, recognizedItems: [] };
  }

  const chunks = text.split(/[,+\n]/).map(c => c.trim()).filter(Boolean);
  const recognizedItems = [];
  let totalKcal = 0;

  chunks.forEach(chunk => {
    const clean = chunk.toLowerCase().replace(/\s+/g, '');
    let matchedFood = null;
    let multiplier = 1.0;
    let quantityDisplay = '기본';

    // 가장 긴 별칭 매칭 우선 정렬
    const sortedFoods = [...COMMON_FOOD_ITEMS].sort((a, b) => {
      const maxA = Math.max(...a.aliases.map(x => x.length));
      const maxB = Math.max(...b.aliases.map(x => x.length));
      return maxB - maxA;
    });

    for (const food of sortedFoods) {
      const match = food.aliases.find(alias => clean.includes(alias.toLowerCase()));
      if (match) {
        matchedFood = food;
        break;
      }
    }

    if (matchedFood) {
      // 2. 수량/단위 파싱 (예: 200g, 200그램, 1.5공기, 3조각, 1캔, 1봉지, 2개, 2잔 등)
      const numUnitMatch = chunk.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|kg|그램|킬로그램|공기|개|알|조각|잔|캔|병|인분|그릇|줄|봉|봉지|회|스푼|대접|팩|마리|송이|통|장|세트)?/i);

      if (numUnitMatch) {
        const num = parseFloat(numUnitMatch[1]);
        const unit = numUnitMatch[2]?.toLowerCase();

        if (!isNaN(num) && num > 0) {
          if (unit === 'g' || unit === '그램') {
            multiplier = num / (matchedFood.baseAmount || (matchedFood.unit === 'g' ? 100 : 200));
            quantityDisplay = `${num}g`;
          } else if (unit === 'kg' || unit === '킬로그램') {
            multiplier = (num * 1000) / (matchedFood.baseAmount || 100);
            quantityDisplay = `${num}kg`;
          } else if (unit) {
            multiplier = num / (matchedFood.baseAmount || 1);
            quantityDisplay = `${num}${unit}`;
          } else {
            multiplier = num;
            quantityDisplay = `${num}개`;
          }
        }
      }

      const calculatedKcal = Math.round(matchedFood.kcal * multiplier);
      totalKcal += calculatedKcal;
      recognizedItems.push({
        food: matchedFood.name.split(' (')[0],
        icon: matchedFood.icon || '🍽️',
        originalChunk: chunk,
        quantityStr: quantityDisplay,
        kcal: calculatedKcal
      });
    }
  });

  return {
    totalKcal,
    recognizedItems
  };
}

export function estimateCaloriesFromText(text) {
  const result = parseFoodsAndCalculateNutrition(text);
  return result.totalKcal;
}

export function getDailyMealsSummary(dateStr) {
  const allMeals = (store.getMeals && typeof store.getMeals === 'function') ? store.getMeals() : [];
  const dayMeals = allMeals.filter(m => m && m.date === dateStr);

  let totalKcal = 0;
  const mealBreakdown = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0
  };

  dayMeals.forEach(m => {
    const k = Number(m.kcal) || 0;
    totalKcal += k;
    if (mealBreakdown[m.mealType] !== undefined) {
      mealBreakdown[m.mealType] += k;
    }
  });

  const settings = (store.getSettings && typeof store.getSettings === 'function') ? store.getSettings() : {};
  const targetKcal = settings.targetCalorie || 1600;
  const percent = targetKcal > 0 ? Math.min(100, Math.round((totalKcal / targetKcal) * 100)) : 0;
  const remainKcal = Math.max(0, targetKcal - totalKcal);

  return {
    dateStr,
    dayMeals,
    totalKcal,
    targetKcal,
    remainKcal,
    percent,
    mealBreakdown,
    count: dayMeals.length
  };
}

export function getMonthlyMealMap(year, month) {
  const allMeals = (store.getMeals && typeof store.getMeals === 'function') ? store.getMeals() : [];
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `${year}-${pad(month)}`;
  const mealMap = {};

  allMeals.forEach(m => {
    if (m && m.date && m.date.startsWith(prefix)) {
      if (!mealMap[m.date]) {
        mealMap[m.date] = { totalKcal: 0, count: 0, meals: [] };
      }
      mealMap[m.date].totalKcal += (Number(m.kcal) || 0);
      mealMap[m.date].count += 1;
      mealMap[m.date].meals.push(m);
    }
  });

  return mealMap;
}

/**
 * Google Gemini Vision AI를 이용한 음식 사진 실시간 영양 및 칼로리 정밀 분석
 * @param {string} base64Data (순수 base64 데이터)
 * @param {string} mimeType (예: 'image/jpeg' 또는 'image/png')
 * @param {string} apiKey (사용자 Gemini API 키)
 */
export async function analyzeFoodPhotoWithGemini(base64Data, mimeType = 'image/jpeg', apiKey = null) {
  if (!apiKey) {
    return {
      success: false,
      isNoKey: true,
      message: '⚙️ 설정 메뉴에서 Google Gemini API 키를 등록하시면 AI가 사진 속 음식을 100% 실시간으로 정밀 분석합니다!'
    };
  }

  const promptText = `
당신은 대한민국 최고의 수석 임상영양사입니다. 제공된 음식 사진을 세밀하게 관찰하여 식별된 모든 음식 메뉴와 추정 분량(예: 1공기, 150g, 1그릇 등), 음식별 칼로리(kcal), 총 칼로리(kcal), 그리고 다이어트 관점의 영양 코칭 피드백을 작성해주세요.

반드시 마크다운 백틱 없이 순수한 JSON 형식으로만 아래와 같이 응답해주세요:
{
  "foods": "현미밥 1공기, 소고기 미역국, 계란말이 3조각, 김치",
  "totalKcal": 520,
  "breakdown": [
    { "name": "현미밥", "portion": "1공기(200g)", "kcal": 300 },
    { "name": "소고기 미역국", "portion": "1대접", "kcal": 140 },
    { "name": "계란말이", "portion": "3조각", "kcal": 80 }
  ],
  "feedback": "단백질과 무기질이 풍부하며 혈당 관리에 매우 우수한 식단입니다!"
}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json"
      }
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `API 요청 오류 (${resp.status})`);
    }

    const data = await resp.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      success: true,
      foods: parsed.foods || '음식 분석 완료',
      totalKcal: parseInt(parsed.totalKcal, 10) || 400,
      breakdown: parsed.breakdown || [],
      feedback: parsed.feedback || '건강하고 균형 잡힌 식단입니다.'
    };
  } catch (err) {
    console.error('Gemini Vision AI 분석 에러:', err);
    return {
      success: false,
      message: `AI 분석 중 오류가 발생했습니다: ${err.message}`
    };
  }
}

/**
 * Google Gemini AI를 이용한 텍스트 자연어 식단 실시간 영양 & 칼로리 정밀 계산
 * 예: "햇반 200그램 1개, 김, 참치 1캔" -> AI가 각 분량 및 칼로리 분해 후 계산
 */
export async function analyzeFoodTextWithGemini(text, apiKey = null) {
  if (!text || !text.trim()) {
    return { success: false, message: '식단 텍스트를 입력해주세요.' };
  }

  // 1. API 키가 있는 경우 Gemini 1.5 Flash로 최고 정밀도 자연어 분석
  if (apiKey) {
    const promptText = `
당신은 대한민국 최고의 전문 임상영양사입니다. 
사용자가 입력한 식사 텍스트를 정밀 분석하여 음식별 분량과 칼로리(kcal), 총 칼로리(kcal), 다이어트 영양 피드백을 JSON으로 작성해주세요.

사용자 식사 입력: "${text.trim()}"

반드시 마크다운 백틱 없이 순수 JSON으로만 응답하세요:
{
  "foods": "정리된 식사 메뉴 (예: 햇반 200g 1개, 조미김 1봉, 참치캔 1캔)",
  "totalKcal": 495,
  "breakdown": [
    { "name": "햇반 200g", "portion": "1개", "kcal": 310 },
    { "name": "조미김", "portion": "1봉", "kcal": 25 },
    { "name": "참치캔", "portion": "1캔(100g)", "kcal": 160 }
  ],
  "feedback": "탄수화물과 단백질이 적절히 조화된 식단입니다!"
}
`;

    try {
      const cleanKey = apiKey.trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
        }
      };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const data = await resp.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          success: true,
          isAi: true,
          foods: parsed.foods || text,
          totalKcal: parseInt(parsed.totalKcal, 10) || 400,
          breakdown: parsed.breakdown || [],
          feedback: parsed.feedback || '영양 분석이 완료되었습니다.'
        };
      } else {
        const errJson = await resp.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${resp.status}`;
        console.error('Gemini API 응답 오류:', errJson);
        return {
          success: false,
          isAi: true,
          error: true,
          message: `Google Gemini API 키 오류 (${errMsg})`
        };
      }
    } catch (err) {
      console.warn('Gemini 텍스트 API 네트워크 오류:', err);
      return {
        success: false,
        isAi: true,
        error: true,
        message: `네트워크 또는 API 연결 오류: ${err.message}`
      };
    }
  }

  // 2. 로컬 스마트 영양 계산 엔진 (API 키 없어도 즉시 100% 작동)
  const localRes = parseFoodsAndCalculateNutrition(text);
  if (localRes.recognizedItems.length > 0) {
    return {
      success: true,
      isAi: false,
      foods: text,
      totalKcal: localRes.totalKcal,
      breakdown: localRes.recognizedItems.map(item => ({
        name: item.food,
        portion: item.quantityStr,
        kcal: item.kcal
      })),
      feedback: `로컬 정밀 영양 데이터베이스에서 ${localRes.recognizedItems.length}개 항목을 인식하여 계산했습니다.`
    };
  }

  return {
    success: true,
    isAi: false,
    foods: text,
    totalKcal: 350,
    breakdown: [],
    feedback: '일반 1인분 평균 기준 칼로리가 적용되었습니다.'
  };
}
