import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
// Redis 클라이언트 생성 (환경변수 사용 권장)
const redis = redisUrl 
  ? new Redis(redisUrl) // Upstash (Production)
  : new Redis({         // Local (Development)
      host: 'localhost',
      port: 6379,
    });

/**
 * Lua Script: 결제 승인 (Atomic)
 * 로직:
 * 1. 유저가 '입장 가능한 상태(Active)'인지 확인 (보안)
 * 2. 재고가 요청 수량보다 많은지 확인
 * 3. 위 조건이 모두 맞으면 재고 차감 후 성공(1) 반환
 * 4. 하나라도 틀리면 실패 반환
 */
const PURCHASE_SCRIPT = `
  local stockKey = KEYS[1]      -- 재고 키 
  local activeUsersKey = KEYS[2] -- 활성 유저 목록 키
  local userId = ARGV[1]        -- 유저 ID
  local quantity = tonumber(ARGV[2]) -- 구매 수량
  
  if not quantity or quantity <= 0 then
    return -2 -- invalid quantity
  end

  -- 1. 입장 권한(Active) 체크
  -- sismember: Set에 값이 있으면 1, 없으면 0 리턴
  if redis.call('sismember', activeUsersKey, userId) == 0 then
    return -1 -- 권한 없음 (대기열을 우회한 부정 접근 시도)
  end

  -- 2. 재고 체크
  local currentStock = tonumber(redis.call('get', stockKey) or "0")
  if currentStock < quantity then
    return 0 -- 재고 부족
  end

  -- 3. 재고 차감
  redis.call('decrby', stockKey, quantity)
  return 1 -- 성공
`;

// redis 인스턴스에 커스텀 명령어 등록
redis.defineCommand('atomicPurchase', {
  numberOfKeys: 2,
  lua: PURCHASE_SCRIPT,
});

export default redis;