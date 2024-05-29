import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

/** 아이템 생성 API **/
router.post('/items', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { item_code, item_name, item_stat, item_price } = req.body;

  const item = await prisma.items.create({
    data: {
      UserId: +userId,
      CharacterId: +characterId,
      item_code,
      item_name,
      item_stat,
      item_price,
    },
  });

  return res.status(201).json({ data: item });
});

/** 아이템 목록 조회 API **/
router.get('/items', async (req, res, next) => {
  const items = await prisma.items.findMany({
    where: {
      CharacterId: +characterId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.status(200).json({ data: items });
});

/** 아이템 수정 API **/
router.put('/items/:itemId', authMiddleware, async (req, res, next) => {
  const { itemId } = req.params;
  const { item_name, item_stat } = req.body;

  try {
    // 아이템을 찾습니다.
    const item = await prisma.items.findUnique({
      where: {
        itemId: +itemId,
      },
    });

    // 아이템이 존재하지 않는 경우
    if (!item) {
      return res.status(404).json({ message: '아이템이 존재하지 않습니다.' });
    }

    // 아이템 정보 업데이트
    const updatedItem = await prisma.items.update({
      where: {
        itemId: +itemId,
      },
      data: {
        item_name,
        item_stat,
      },
    });

    return res.status(200).json({ data: updatedItem });
  } catch (error) {
    next(error);
  }
});

/** 아이템 상세 조회 API **/
router.get('/items/:itemCode', async (req, res, next) => {
  const { itemCode } = req.params;

  try {
    // 아이템을 조회합니다.
    const item = await prisma.items.findUnique({
      where: {
        item_code: +itemCode,
      },
      select: {
        item_code: true,
        item_name: true,
        item_stat: true,
        item_price: true,
      },
    });

    // 아이템이 존재하지 않는 경우
    if (!item) {
      return res.status(404).json({ message: '아이템을 찾을 수 없습니다.' });
    }

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

export default router;
