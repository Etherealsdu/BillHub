const jwt = require('jsonwebtoken')
const config = require('../config')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.userId = payload.userId
    req.openid = payload.openid
    req.familyId = payload.familyId || null
    next()
  } catch (e) {
    return res.status(401).json({ error: '登录已过期', code: 'TOKEN_EXPIRED' })
  }
}

module.exports = authMiddleware
