// src/routes/users.router.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import dotenv from 'dotenv';
import { prisma } from '../utils/prisma/index.js';

dotenv.config();
const router = express.Router();

/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  try {
    const { email, password, name, age, gender, profileImage } = req.body;
    const isExistUser = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
    }

    // 암호화
    const hashedPassword = await bcrypt.hash(password, 10);
    // Users 테이블에 사용자를 추가합니다.
    const user = await prisma.users.create({
      data: { email, password: hashedPassword },
    });
    // UserInfos 테이블에 사용자 정보를 추가합니다.
    const userInfo = await prisma.userInfos.create({
      data: {
        UserId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
        name,
        age,
        gender: gender.toUpperCase(), // 성별을 대문자로 변환합니다.
        profileImage,
      },
    });

    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

//로그인 api
router.post('/sign-in', async (req, res, next) => {
  const { email, password } = req.body;

  const user = await prisma.users.findFirst({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
  }

  const tokenStorages = {}; // 리프래시 토큰 관리

  //JWT, accessToken
  const accessToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.ACCESS_TOKEN_SECRET_KEY,
    { expiresIn: '10s' } // 비밀 키 보이면 안됨
  );
  const refreshToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.REFRESH_TOKEN_SECRET_KEY,
    { expiresIn: '7d' } // 비밀 키 보이면 안됨
  );

  tokenStorages[refreshToken] = {
    id: user.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  res.cookie('accessToken', `Bearer ${accessToken}`);
  res.cookie('refreshToken', `Bearer ${refreshToken}`);

  return res.status(200).json({ message: '로그인 성공했습니다.' });
});

// src/routes/users.route.js

/** 사용자 조회 API **/
router.get('/users', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;

  const user = await prisma.users.findFirst({
    where: { userId: +userId },
    select: {
      userId: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      UserInfos: {
        // 1:1 관계를 맺고있는 UserInfos 테이블을 조회합니다.
        select: {
          name: true,
          age: true,
          gender: true,
          profileImage: true,
        },
      },
    },
  });

  return res.status(200).json({ data: user });
});

export default router;
