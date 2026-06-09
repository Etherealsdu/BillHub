jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { openid: 'mock_cat_user', session_key: 'mock_key', errcode: 0, errmsg: 'ok' } }),
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
  app.use('/api/categories', require('../routes/categories'))
  return app
}

beforeEach(async () => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_cats_${Date.now()}.json`)
  db = require('../models/db')
  db.initDB(testDbPath)
  app = setupApp()

  const loginRes = await request(app).post('/api/auth/login').send({ code: 'cat_test_user' })
  token = loginRes.body.token
  userId = loginRes.body.user.id
})

afterEach(() => {
  db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

describe('GET /api/categories', () => {
  test('返回系统预置分类', async () => {
    const res = await request(app).get('/api/categories').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.expense).toHaveLength(11)
    expect(res.body.income).toHaveLength(5)
    expect(res.body.expense[0].isSystem).toBe(true)
    expect(res.body.expense[0].name).toBe('餐饮')
    expect(res.body.income[0].name).toBe('工资')
  })

  test('未认证返回 401', async () => {
    const res = await request(app).get('/api/categories')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/categories', () => {
  test('新增支出分类', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '测试支出', type: 'expense' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('测试支出')
    expect(res.body.type).toBe('expense')
    expect(res.body.isSystem).toBe(false)
    expect(res.body.id).toContain('cus_expense_')
  })

  test('新增收入分类', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '测试收入', type: 'income', icon: '💰' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('测试收入')
    expect(res.body.icon).toBe('💰')
  })

  test('缺少 name 返回 400', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ type: 'expense' })
    expect(res.status).toBe(400)
  })

  test('无效 type 返回 400', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: 'x', type: 'invalid' })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/categories/:id', () => {
  test('修改自定义分类', async () => {
    const created = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '旧名', type: 'expense' })
    const res = await request(app).put('/api/categories/' + created.body.id).set('Authorization', 'Bearer ' + token).send({ name: '新名', icon: '🆕' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('新名')
    expect(res.body.icon).toBe('🆕')
  })

  test('系统分类不可修改', async () => {
    const res = await request(app).put('/api/categories/sys_exp_1').set('Authorization', 'Bearer ' + token).send({ name: '改了' })
    expect(res.status).toBe(403)
  })

  test('不存在返回 404', async () => {
    const res = await request(app).put('/api/categories/nonexistent').set('Authorization', 'Bearer ' + token).send({ name: 'x' })
    expect(res.status).toBe(404)
  })

  test('修改分类不传 name/icon 保留原值', async () => {
    const created = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '原名字', type: 'expense', icon: '🔴' })
    const res = await request(app).put('/api/categories/' + created.body.id).set('Authorization', 'Bearer ' + token).send({})
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('原名字')
    expect(res.body.icon).toBe('🔴')
  })
})

describe('DELETE /api/categories/:id', () => {
  test('删除自定义分类', async () => {
    const created = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '要删除的', type: 'expense' })
    const res = await request(app).delete('/api/categories/' + created.body.id).set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('系统分类不可删除', async () => {
    const res = await request(app).delete('/api/categories/sys_exp_1').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(403)
  })

  test('不存在的分类删除返回 404', async () => {
    const res = await request(app).delete('/api/categories/nonexistent').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(404)
  })

  test('删除分类后相关账单变为未分类', async () => {
    const created = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: '待删', type: 'expense' })
    const catId = created.body.id
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + token).send({
      type: 'expense', amount: -50, category: catId, categoryName: '待删', date: new Date().toISOString()
    })
    await request(app).delete('/api/categories/' + catId).set('Authorization', 'Bearer ' + token)
    const billsRes = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + token)
    expect(billsRes.body.bills[0].categoryName).toBe('未分类')
  })
})

describe('PUT /api/categories/reorder/batch', () => {
  test('批量调整排序', async () => {
    const r1 = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: 'A', type: 'expense' })
    const r2 = await request(app).post('/api/categories').set('Authorization', 'Bearer ' + token).send({ name: 'B', type: 'expense' })
    const res = await request(app).put('/api/categories/reorder/batch').set('Authorization', 'Bearer ' + token).send({ ids: [r2.body.id, r1.body.id] })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const cats = await request(app).get('/api/categories').set('Authorization', 'Bearer ' + token)
    const custom = cats.body.expense.filter(c => !c.isSystem)
    expect(custom[0].name).toBe('B')
    expect(custom[0].sortOrder).toBe(custom[1].sortOrder - 1)
  })

  test('缺少 ids 返回 400', async () => {
    const res = await request(app).put('/api/categories/reorder/batch').set('Authorization', 'Bearer ' + token).send({})
    expect(res.status).toBe(400)
  })
})
