// src/routes/users.router.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { prisma } from '../utils/prisma/index.js';

dotenv.config();
const router = express.Router();

/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  try {
    const { passwordCheck, password, loginId } = req.body;

    // 유효성 검사
    const errors = [];

    if (!/^[a-z0-9]+$/.test(loginId)) {
      errors.push({
        msg: '아이디는 영어 소문자와 숫자의 조합이어야 합니다.',
        param: 'loginId',
      });
    }

    if (password.length < 6) {
      errors.push({
        msg: '비밀번호는 최소 6자 이상이어야 합니다.',
        param: 'password',
      });
    }

    if (password !== passwordCheck) {
      errors.push({
        msg: '비밀번호 확인이 일치하지 않습니다.',
        param: 'passwordCheck',
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    // 암호화
    const hashedPassword = await bcrypt.hash(password, 10);
    // Users 테이블에 사용자를 추가합니다.
    const user = await prisma.users.create({
      data: { loginId, password: hashedPassword },
    });

    return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

//로그인 api
router.post('/sign-in', async (req, res, next) => {
  const { loginId, password } = req.body;

  const user = await prisma.users.findFirst({ where: { loginId } });
  if (!user) {
    return res.status(401).json({ message: '존재하지 않는 ID입니다.' });
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

export default router;
