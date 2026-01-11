import { Request, Response } from 'express';
import { QueueService } from './queue.service';

export const TicketController = {
  // POST /queue/join
  async join(req: Request, res: Response) {
    const { userId } = req.body;
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
    const { userId, quantity } = req.body;
    const result = await QueueService.purchase(userId, quantity);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  }
};