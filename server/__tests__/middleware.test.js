const jwt = require('jsonwebtoken')
const config = require('../config')

function createMiddleware() {
  return require('../middleware/auth')
}

function mockReqRes(token) {
  const req = { headers: {} }
  if (token) req.headers.authorization = 'Bearer ' + token
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  const next = jest.fn()
  return { req, res, next }
}

describe('JWT 认证中间件', () => {
  test('缺少 Authorization 头返回 401', () => {
    const { req, res, next } = mockReqRes()
    createMiddleware()(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }))
    expect(next).not.toHaveBeenCalled()
  })

  test('token 格式错误返回 401', () => {
    const { req, res, next } = mockReqRes('invalid-token-format')
    createMiddleware()(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }))
  })

  test('有效 token 通过认证', () => {
    const token = jwt.sign({ userId: 1, openid: 'test_openid' }, config.jwtSecret, { expiresIn: '1h' })
    const { req, res, next } = mockReqRes(token)
    createMiddleware()(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe(1)
    expect(req.openid).toBe('test_openid')
  })

  test('过期 token 返回 401', () => {
    const token = jwt.sign({ userId: 1 }, config.jwtSecret, { expiresIn: '0s' })
    expect(() => jwt.verify(token, config.jwtSecret)).toThrow()
  })

  test('错误 secret 签名的 token 返回 401', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong-secret')
    const { req, res, next } = mockReqRes(token)
    createMiddleware()(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('Authorization 头不是 Bearer 开头返回 401', () => {
    const req = { headers: { authorization: 'Token xxx' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()
    createMiddleware()(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
