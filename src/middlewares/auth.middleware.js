import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';
import dotenv from 'dotenv';

dotenv.config();

export default async function (req, res, next) {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) {
      return res.status(403).json({ message: 'Access Token이 없습니다' });
    }

    const [tokenType, token] = accessToken.split(' ');

    if (tokenType !== 'Bearer') {
      return res.status(403).json({ message: 'Token의 타입이 일치하지 않습니다' });
    }

    const payload = validateToken(
      token,
      process.env.ACCESS_TOKEN_SECRET_KEY,
      res
    );

    if (!payload) {
      return res
        .status(401)
        .json({ errorMessage: 'Access Token이 정상적이지 않습니다.' });
    }

    const userId = payload.userId;

    const user = await prisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) {
      return res.status(404).json({ message: 'Token사용자가 존재하지 않습니다.' });
    }

    // req.user에 사용자 정보를 저장합니다.
    req.user = user;

    next();
  } catch (error) {
    res.clearCookie('accessToken');
    return res
      .status(401)
      .json({ message: error.message ?? '비정상적인 요청입니다.' });
  }
}

function validateToken(token, secretKey, res) {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    res.clearCookie('accessToken');
    // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: 'Token이 만료되었습니다.' });
      case 'JsonWebTokenError':
        return res.status(401).json({ message: 'Token이 조작되었습니다.' });
      default:
        return res
          .status(401)
          .json({ message: error.message ?? '비정상적인 요청입니다.' });
    }
  }
}
