## 대기열 예매 시스템
    - 대규모 트래픽이 몰리는 티켓 예매 상황을 가정하여 구축한 가상 대기열(Virtual Waiting Room) 시스템입니다. Redis의 자료구조를 활용하여 선착순 대기열을 구현하고, Lua Script를 통해 결제 시점의 동시성 문제(Race Condition)를 해결했습니다.

🚀 주요 기능 및 기술적 특징
1. 가상 대기열 (Virtual Queue) 구현
- Redis Sorted Set (ZSET): 타임스탬프(Score)를 기준으로 유저를 정렬하여 완벽한 FIFO(선착순) 구조를 보장합니다.
- 실시간 순번 확인: 프론트엔드에서 주기적인 폴링(Polling)을 통해 자신의 현재 대기 순번과 남은 진행률을 시각적으로 보여줍니다.

2. 스케줄러 기반의 유량 제어 (Flow Control)
- 백엔드 스케줄러: 1초마다 대기열 상위 N명의 유저를 Active 상태(입장 가능)로 전환합니다.
- 서버가 감당 가능한 트래픽 양만큼만 들여보내는 Backpressure 역할을 수행합니다.

3. 동시성 제어 (Lua Scripting)
- 원자적(Atomic) 트랜잭션: 재고 확인, 재고 차감, 유저 권한 확인 과정을 Lua Script 하나로 묶어 처리합니다.
- 이를 통해 수천 명의 유저가 동시에 결제 버튼을 눌러도 재고 초과 판매(Overselling)를 원천 차단합니다.

🛠 기술 스택 (Tech Stack)
[Frontend]
React / Next.js: 클라이언트 상태 관리 및 UI 렌더링.
Framer Motion: 대기열 진입, 로딩, 입장 성공 등 상태 변화 애니메이션 구현.
Tailwind CSS: 직관적이고 모던한 스타일링.

[Backend]
Node.js / Express: REST API 서버 구축.
TypeScript: 타입 안정성 확보.
Redis (ioredis): 대기열 관리(Sorted Set), 활성 유저 관리(Set), 재고 관리(String), 원자적 연산 수행.

📂 프로젝트 구조
Bash
<pre>
.
├── frontend/ (추정)
│   ├── components/NumberTicker.tsx  # 숫자 롤링 애니메이션
│   ├── hooks/useTicketQueue.ts      # 대기열 로직 (진입, 폴링, 결제) 훅
│   └── page.tsx                     # 메인 예약 페이지 UI
│
└── backend/
    ├── src/
    │   ├── services/
    │   │   ├── controller.ts        # API 요청 핸들러
    │   │   ├── queue.service.ts     # 대기열 비즈니스 로직 (Redis 연동)
    │   │   └── redis.service.ts     # Redis 설정 및 Lua Script 정의
    │   └── index.ts                 # 서버 엔트리포인트 & 스케줄러 실행
    └── package.json

</pre>

⚙️ 실행 방법 (Getting Started)
1. 사전 요구사항 (Prerequisites)
Node.js (v18 이상 권장)
Redis Server (로컬 혹은 원격 실행 필요)

2. Redis 설정
- Redis 서버가 실행 중이어야 합니다. .env 설정이 없다면 기본적으로 localhost:6379에 접속을 시도합니다. 

3. 백엔드 실행
[Bash]
cd backend
npm install
npm run dev # 또는 npx ts-node index.ts
서버는 http://localhost:4000에서 실행됩니다.

4. 프론트엔드 실행
[Bash]

cd frontend
npm install
npm run dev
브라우저에서 http://localhost:3000으로 접속하여 테스트합니다.

💡 핵심 로직 상세
Step 1: 대기열 진입 (Waiting)
1. 유저가 '대기열 진입' 버튼 클릭.
2. 서버는 Redis ZADD queue:concert_2025 {timestamp} {userId} 실행.
3. 유저는 '대기 중' 상태가 되며 내 순번을 계속 확인(Polling).

Step 2: 입장 허용 (Active)
- 백엔드의 setInterval 스케줄러가 매초 실행됨.
- ZPOPMIN을 사용하여 가장 오래 기다린 유저 50명을 추출.
- 해당 유저들을 SADD active:concert_2025 {userId}로 활성 목록(Active Set)으로 이동.

Step 3: 결제 (Purchase)
1. 유저가 '결제하기' 버튼 클릭.

2. Lua Script 실행 (atomicPurchase):
- Check 1: 유저가 active 목록에 있는가? (부정 접근 방지)
- Check 2: 재고(stock)가 충분한가?
- Action: 조건 만족 시 재고 차감(DECRBY) 후 성공 반환.
- 결제 성공 시 예매 완료 화면 출력.


====================================
License: ISC
