import redis from './redis.service';

const EVENT_ID = 'concert_2025';
const QUEUE_KEY = `queue:${EVENT_ID}`;       // 대기열 (Sorted Set)
const ACTIVE_KEY = `active:${EVENT_ID}`;     // 입장 가능 유저 (Set)
const STOCK_KEY = `stock:${EVENT_ID}`;       // 재고 (String)

export const QueueService = {
  
  /**
   * 1단계: 대기열 진입 (Waiting Room)
   * Sorted Set을 사용해 타임스탬프 순으로 정렬
   */
  async enterQueue(userId: string) {
    const timestamp = Date.now();
    // ZADD key score member: 점수(시간)를 기준으로 정렬되어 저장됨
    await redis.zadd(QUEUE_KEY, timestamp, userId);
    return true;
  },

  /**
   * 내 대기 순번 조회 (Polling용)
   */
  async getMyRank(userId: string) {
    // ZRANK: 0부터 시작하는 순위 반환 (0등이 1번째)
    const rank = await redis.zrank(QUEUE_KEY, userId);
    if (rank === null) return null; // 대기열에 없음 (이미 입장했거나 미진입)
    return rank + 1; // 사용자에겐 1등부터 보여줌
  },

  /**
   * 2단계: 스케줄러 (Scheduler) - 문지기 역할
   * 주기적으로 실행되어 대기자를 활성 상태로 변경 (Batch Processing)
   * limit: 한 번에 입장시킬 인원 수
   */
  async allowEntry(limit: number = 100) {
    // 1. 대기열에서 상위 N명 꺼내기 (Score 낮은 순 = 먼저 온 순)
    // zpopmin: [userId, score, userId, score...] 형태의 배열 반환
    const users = await redis.zpopmin(QUEUE_KEY, limit);
    
    if (users.length === 0) return 0;

    // 2. 활성 유저 Set으로 이동 (Pipeline으로 최적화)
    const pipeline = redis.pipeline();
    
    // zpopmin 결과는 [id, score, id, score...]라 짝수 인덱스만 ID임
    for (let i = 0; i < users.length; i += 2) {
      const userId = users[i];
      pipeline.sadd(ACTIVE_KEY, userId); // 입장 명단에 추가
    }
    
    // 3. 입장한 유저들에게 TTL 설정 (예: 5분 안에 결제 안 하면 만료)
    pipeline.expire(ACTIVE_KEY, 300); // Set 자체의 만료가 아니라 로직 보완 필요 (개별 TTL은 별도 로직 필요하지만 간단히 전체 Set 갱신으로 처리)

    await pipeline.exec();
    return users.length / 2; // 입장시킨 인원 수 반환
  },

  /**
   * 3단계: 결제 시도 (Atomic Transaction)
   * Lua Script 실행
   */
  async purchase(userId: string, quantity: number) {
    // @ts-ignore (defineCommand로 추가된 메서드라 TS가 모를 수 있음)
    const result = await redis.atomicPurchase(STOCK_KEY, ACTIVE_KEY, userId, quantity);

    if (result === 1) {
      // 성공: DB에 주문 데이터 Insert
      // await db.orders.create(...) 
      // 결제 완료 후 활성 목록에서 제거
      await redis.srem(ACTIVE_KEY, userId);
      return { success: true, message: '예매 성공!' };
    } else if (result === -1) {
      return { success: false, message: '접근 권한이 없습니다. 대기열을 통해 입장해주세요.' };
    } else {
      return { success: false, message: '매진되었습니다.' };
    }
  }
};