import express from 'express';
import cors from 'cors';
import { TicketController } from './services/controller';
import { QueueService } from './services/queue.service';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: 'http://localhost:3000', 
    credentials: true, 
}));

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트
app.post('/queue/join', TicketController.join);
app.get('/queue/status', TicketController.status);
app.post('/purchase', TicketController.buy);


/*** 스케쥴러 */
setInterval(async () => {
    try {
        // allowEntry(50) -> 1초에 50명씩 입장 (이 숫자를 조절해서 속도 제어)
        const enteredCount = await QueueService.allowEntry(50);
        
        if (enteredCount > 0) {
            console.log(`[Scheduler] 문 열림! ${enteredCount}명 입장 성공`);
        }
    } catch (e) {
        console.error('[Scheduler Error]', e);
    }
}, 1000);

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

