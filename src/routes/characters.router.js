import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 캐릭터 생성 API **/
router.post('/characters', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { name } = req.body;

  const character = await prisma.characters.create({
    data: {
      UserId: userId,
      name,
    },
  });

  return res.status(201).json({ data: post });
});

/** 캐릭터 상세 조회 API **/
router.get(
  '/characters/:characterId',
  authMiddleware,
  async (req, res, next) => {
    const { characterId } = req.params;
    const character = await prisma.characters.findFirst({
      where: {
        characterId: +characterId,
      },
      select: {
        UserId: true,
        name: true,
        health: true,
        power: true,
        money: true,
      },
    });

    if (!character) {
      return res.status(404).json({ message: '캐릭터를 찾을 수 없습니다.' });
    }

    const isOwner = req.user && req.user.id === character.UserId;

    const responseData = {
      name: character.name,
      health: character.health,
      power: character.power,
    };

    if (isOwner) {
      responseData.money = character.money;
    }

    return res.status(200).json({ data: responseData });
  }
);

/** 캐릭터 삭제 **/
router.delete(
  '/characters/:characterId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { characterId } = req.params;

      // 캐릭터 정보 조회
      const character = await prisma.characters.findFirst({
        where: {
          characterId: +characterId,
        },
        select: {
          UserId: true,
        },
      });

      // 캐릭터가 존재하지 않는 경우
      if (!character) {
        return res.status(404).json({ message: '캐릭터를 찾을 수 없습니다.' });
      }

      // 현재 사용자가 캐릭터의 소유자가 아닌 경우
      if (req.user.id !== character.UserId) {
        return res
          .status(403)
          .json({ message: '이 캐릭터를 삭제할 권한이 없습니다.' });
      }

      // 캐릭터 삭제
      await prisma.characters.delete({
        where: {
          characterId: +characterId,
        },
      });

      return res
        .status(200)
        .json({ message: '캐릭터가 성공적으로 삭제되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
