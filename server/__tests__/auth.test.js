jest.mock('axios', () => ({
  get: jest.fn().mockImplementation((url, opts) => {
    const code = opts?.params?.js_code || 'unknown'
    return Promise.resolve({ data: { openid: `mock_${code}`, session_key: 'mock_key', errcode: 0, errmsg: 'ok' } })
  }),
}))

const request = require('supertest')
const path = require('path')
const os = require('os')
const fs = require('fs')
const express = require('express')
const jwt = require('jsonwebtoken')
const config = require('../config')

let app, testDbPath, db

function setupApp() {
  app = express()
  app.use(express.json())
  app.use('/api/auth', require('../routes/auth'))
  return app
}

beforeEach(() => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_auth_${Date.now()}.json`)
  db = require('../models/db')
  db.initDB(testDbPath)
  app = setupApp()
})

afterEach(() => {
  db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

describe('POST /api/auth/login', () => {
  test('缺少 code 返回 400', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('缺少 code')
  })

  test('有效 code 返回 token 和用户信息', async () => {
    const res = await request(app).post('/api/auth/login').send({ code: 'valid_code' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user).toBeTruthy()
    expect(res.body.user.wechatBound).toBe(false)
    expect(res.body.user.alipayBound).toBe(false)

    const decoded = jwt.verify(res.body.token, config.jwtSecret)
    expect(decoded.userId).toBeTruthy()
  })

  test('首次登录自动创建用户和默认分类', async () => {
    const res1 = await request(app).post('/api/auth/login').send({ code: 'code_1' })
    const res2 = await request(app).post('/api/auth/login').send({ code: 'code_1' })
    expect(res1.body.user.id).toBe(res2.body.user.id)

    const cats = db.find('categories', c => c.userId === res1.body.user.id)
    expect(cats.filter(c => c.type === 'expense')).toHaveLength(11)
    expect(cats.filter(c => c.type === 'income')).toHaveLength(5)
  })

  test('不同 code 创建不同用户', async () => {
    const r1 = await request(app).post('/api/auth/login').send({ code: 'user_a' })
    const r2 = await request(app).post('/api/auth/login').send({ code: 'user_b' })
    expect(r1.body.user.id).not.toBe(r2.body.user.id)
  })
})

describe('POST /api/auth/update-profile', () => {
  async function loginAndGetToken(code) {
    const res = await request(app).post('/api/auth/login').send({ code })
    return res.body.token
  }

  test('更新昵称和头像', async () => {
    const token = await loginAndGetToken('update_test')
    const res = await request(app)
      .post('/api/auth/update-profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ nickname: '测试用户', avatarUrl: 'https://example.com/avatar.png' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const user = db.findOne('users', u => u.openid === 'mock_update_test')
    expect(user.nickname).toBe('测试用户')
    expect(user.avatarUrl).toBe('https://example.com/avatar.png')
  })

  test('未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/auth/update-profile')
      .send({ nickname: 'test' })
    expect(res.status).toBe(401)
  })
})

describe('错误处理', () => {
  test('微信登录失败返回 500', async () => {
    const axios = require('axios')
    axios.get.mockRejectedValueOnce(new Error('网络错误'))
    const res = await request(app).post('/api/auth/login').send({ code: 'bad_code' })
    expect(res.status).toBe(500)
    expect(res.body.error).toContain('网络错误')
  })
})
