import { Request, Response } from 'express';
import { QueueService } from './queue.service';

export const TicketController = {
  // POST /queue/join
  async join(req: Request, res: Response) {
    const { userId } = req.body;
    console.log('userId: ');
    console.log(userId);
    await QueueService.enterQueue(userId);
    res.json({ message: '대기열에 등록되었습니다.' });
  },

  // GET /queue/status
  async status(req: Request, res: Response) {
    const { userId } = req.query;
    const rank = await QueueService.getMyRank(String(userId));
    
    if (rank === null) {
      // 대기열에 없으면 입장 가능한지(Active Set에 있는지) 확인 필요
      // 여기서는 생략, 실제로는 isMember 체크
      return res.json({ status: 'entered' }); 
    }
    
    res.json({ rank, status: 'waiting' });
  },

  // POST /purchase
  async buy(req: Request, res: Response) {

    const userId = String(req.body.userId);
    const quantity = Number(req.body.quantity);
    
    if (!userId || Number.isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'invalid payload',
      });
    }    
    const result = await QueueService.purchase(userId, quantity);
    
    console.log('purchase result:', result);

    if (result.success) {
      return res.status(200).json(result);
    }
    
    switch (result.message) {
      case '접근 권한이 없습니다. 대기열을 통해 입장해주세요.':
        return res.status(403).json(result);
    
      case '매진되었습니다.':
      case '수량 오류':
        return res.status(409).json(result);
    
      default:
        return res.status(400).json(result);
    }
  }
};