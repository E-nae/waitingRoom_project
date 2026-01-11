import { useState, useEffect } from 'react';

type QueueStatus = 'idle' | 'waiting' | 'entered' | 'sold_out' | 'success';

export function useTicketQueue(userId: string) {
  const [status, setStatus] = useState<QueueStatus>('idle');
  const [myRank, setMyRank] = useState<number | null>(null);
  const [initialRank, setInitialRank] = useState<number>(0); // 진행률 계산용

  // 1. 대기열 진입 (POST /queue/join)
  const joinQueue = async () => {
    try {
      setStatus('waiting');
      await fetch('http://localhost:4000/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      // 진입 직후 상태 확인 시작
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  // 2. 상태 확인 폴링 (GET /queue/status)
  useEffect(() => {
    if (status !== 'waiting') return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/queue/status?userId=${userId}`);
        const data = await res.json();

        if (data.status === 'entered') {
          setStatus('entered'); // 입장 성공!
          clearInterval(intervalId);
        } else if (data.rank) {
          setMyRank((prev) => {
             // 처음 순번을 저장해둠 (진행률 바 계산 위해)
             if (!initialRank) setInitialRank(data.rank); 
             return data.rank;
          });
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000); // 2초마다 확인 (서버 부하 고려)

    return () => clearInterval(intervalId);
  }, [status, userId, initialRank]);

  // 3. 예매 요청 (POST /purchase) - Lua Script 실행 트리거
  const buyTicket = async () => {
    try {
      const res = await fetch('http://localhost:4000/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, quantity: 1 }),
      });
      const result = await res.json();
      
      if (result.success) setStatus('success');
      else alert(result.message); // 매진 혹은 권한 없음
      
    } catch (e) {
      alert('통신 오류 발생');
    }
  };

  return { status, myRank, initialRank, joinQueue, buyTicket };
}