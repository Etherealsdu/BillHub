jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { openid: 'mock_test_user', session_key: 'mock_key', errcode: 0, errmsg: 'ok' } }),
}))

jest.mock('../services/wechat', () => ({
  ...jest.requireActual('../services/wechat'),
  syncWechatBills: jest.fn().mockImplementation((cursor) => Promise.resolve([
    { id: 'sync_wx_1', type: 'expense', amount: -50, category: 'sys_exp_01', categoryName: '餐饮', categoryIcon: '🍜', date: new Date().toISOString(), remark: '微信测试' },
    { id: 'sync_wx_2', type: 'income', amount: 1000, category: 'sys_inc_01', categoryName: '工资', categoryIcon: '💼', date: new Date().toISOString(), remark: '微信收款' },
  ])),
}))

jest.mock('../services/alipay', () => ({
  syncAlipayBills: jest.fn().mockImplementation((cursor) => Promise.resolve([
    { id: 'sync_ali_1', type: 'expense', amount: -30, category: 'sys_exp_03', categoryName: '购物', categoryIcon: '🛒', date: new Date().toISOString(), remark: '支付宝测试' },
  ])),
}))

const request = require('supertest')
const path = require('path')
const os = require('os')
const fs = require('fs')
const express = require('express')

let app, testDbPath, db, token, userId

function setupApp() {
  app = express()
  app.use(express.json())
  app.use('/api/auth', require('../routes/auth'))
  app.use('/api/bills', require('../routes/bills'))
  return app
}

beforeEach(async () => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_bills_${Date.now()}.json`)
  db = require('../models/db')
  db.initDB(testDbPath)
  app = setupApp()

  const loginRes = await request(app).post('/api/auth/login').send({ code: 'bill_test_user' })
  token = loginRes.body.token
  userId = loginRes.body.user.id
})

afterEach(() => {
  db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

function createBill(overrides = {}) {
  return {
    type: 'expense',
    amount: -100,
    category: 'sys_exp_01',
    categoryName: '餐饮',
    categoryIcon: '🍜',
    date: new Date().toISOString(),
    source: 'manual',
    remark: '测试账单',
    ...overrides,
  }
}

describe('GET /api/bills', () => {
  test('空账单返回空列表', async () => {
    const res = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.bills).toEqual([])
    expect(res.body.total).toBe(0)
  })

  test('返回账单列表（分页）', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ date: new Date(2026, 5, i + 1).toISOString() }))
    }
    const res = await request(app).get('/api/bills?page=1&pageSize=5').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.bills).toHaveLength(5)
    expect(res.body.total).toBe(10)
  })

  test('按 type 筛选', async () => {
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ type: 'expense' }))
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ type: 'income', amount: 500 }))
    const res = await request(app).get('/api/bills?type=income').set('Authorization', 'Bearer ' + token)
    expect(res.body.bills).toHaveLength(1)
    expect(res.body.bills[0].type).toBe('income')
  })

  test('按 category 筛选', async () => {
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ category: 'a' }))
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ category: 'b' }))
    const res = await request(app).get('/api/bills?category=a').set('Authorization', 'Bearer ' + token)
    expect(res.body.bills).toHaveLength(1)
  })

  test('按日期范围筛选', async () => {
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ date: '2026-06-01T00:00:00Z' }))
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ date: '2026-06-15T00:00:00Z' }))
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ date: '2026-07-01T00:00:00Z' }))
    const res = await request(app).get('/api/bills?startDate=2026-06-01&endDate=2026-06-30').set('Authorization', 'Bearer ' + token)
    expect(res.body.bills).toHaveLength(2)
  })

  test('未认证返回 401', async () => {
    const res = await request(app).get('/api/bills')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/bills', () => {
  test('创建账单成功', async () => {
    const res = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill())
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTruthy()
    expect(res.body.type).toBe('expense')
    expect(res.body.amount).toBe(-100)
    expect(res.body.userId).toBe(userId)
  })

  test('缺少必填字段返回 400', async () => {
    const res = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send({ type: 'expense' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('缺少必填字段')
  })

  test('创建 amount 为 0 的账单', async () => {
    const res = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ amount: 0 }))
    expect(res.status).toBe(201)
  })
})

describe('PUT /api/bills/:id', () => {
  test('更新账单成功', async () => {
    const created = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill())
    const res = await request(app).put('/api/bills/' + created.body.id).set('Authorization', 'Bearer ' + token).send({ amount: -200, remark: '已修改' })
    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(-200)
    expect(res.body.remark).toBe('已修改')
  })

  test('不存在的账单返回 404', async () => {
    const res = await request(app).put('/api/bills/nonexistent').set('Authorization', 'Bearer ' + token).send({ amount: -50 })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/bills/:id', () => {
  test('删除账单成功', async () => {
    const created = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill())
    const res = await request(app).delete('/api/bills/' + created.body.id).set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const getRes = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + token)
    expect(getRes.body.total).toBe(0)
  })

  test('不存在的账单返回 404', async () => {
    const res = await request(app).delete('/api/bills/nonexistent').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/bills/batch', () => {
  let ids

  beforeEach(async () => {
    ids = []
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send(createBill({ remark: 'batch_' + i }))
      ids.push(r.body.id)
    }
  })

  test('批量删除', async () => {
    const res = await request(app).post('/api/bills/batch').set('Authorization', 'Bearer ' + token).send({ ids, action: 'delete' })
    expect(res.status).toBe(200)
    expect(res.body.affected).toBe(3)

    const getRes = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + token)
    expect(getRes.body.total).toBe(0)
  })

  test('批量修改分类', async () => {
    const res = await request(app).post('/api/bills/batch').set('Authorization', 'Bearer ' + token).send({ ids, action: 'category', category: 'new_cat', categoryName: '新分类' })
    expect(res.status).toBe(200)
    expect(res.body.affected).toBe(3)

    const getRes = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + token)
    getRes.body.bills.forEach(b => {
      expect(b.category).toBe('new_cat')
      expect(b.categoryName).toBe('新分类')
    })
  })

  test('无效 action 返回 400', async () => {
    const res = await request(app).post('/api/bills/batch').set('Authorization', 'Bearer ' + token).send({ ids, action: 'invalid' })
    expect(res.status).toBe(400)
  })

  test('空 ids 返回 400', async () => {
    const res = await request(app).post('/api/bills/batch').set('Authorization', 'Bearer ' + token).send({ ids: [], action: 'delete' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/bills/sync', () => {
  test('同步微信账单', async () => {
    const res = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'wechat' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.synced).toBeGreaterThan(0)
  })

  test('同步支付宝账单', async () => {
    const res = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'alipay' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.synced).toBeGreaterThan(0)
  })

  test('无效 source 返回 400', async () => {
    const res = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'invalid' })
    expect(res.status).toBe(400)
  })

  test('重复同步不重复插入', async () => {
    const r1 = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'wechat' })
    expect(r1.body.synced).toBe(2)
    const r2 = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'wechat' })
    expect(r2.body.synced).toBe(0)
    expect(r2.body.total).toBe(2)
  })

  test('同步失败返回 500', async () => {
    const wechat = require('../services/wechat')
    wechat.syncWechatBills.mockRejectedValueOnce(new Error('同步服务异常'))
    const res = await request(app).post('/api/bills/sync').set('Authorization', 'Bearer ' + token).send({ source: 'wechat' })
    expect(res.status).toBe(500)
    expect(res.body.error).toContain('同步服务异常')
  })
})
