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

let app, testDbPath, db

function setupApp() {
  app = express()
  app.use(express.json())
  app.use('/api/auth', require('../routes/auth'))
  app.use('/api/family', require('../routes/family'))
  app.use('/api/bills', require('../routes/bills'))
  return app
}

beforeEach(() => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_family_${Date.now()}.json`)
  db = require('../models/db')
  db.initDB(testDbPath)
  app = setupApp()
})

afterEach(() => {
  db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

async function loginUser(code) {
  const res = await request(app).post('/api/auth/login').send({ code })
  return { token: res.body.token, userId: res.body.user.id }
}

describe('GET /api/family', () => {
  test('未加入家庭返回 null', async () => {
    const { token } = await loginUser('no_fam')
    const res = await request(app).get('/api/family').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(200)
    expect(res.body.family).toBeNull()
    expect(res.body.members).toEqual([])
  })

  test('未认证返回 401', async () => {
    const res = await request(app).get('/api/family')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/family/create', () => {
  test('创建家庭成功', async () => {
    const { token } = await loginUser('creator')
    const res = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({ name: '我的家庭' })
    expect(res.status).toBe(201)
    expect(res.body.family.name).toBe('我的家庭')
    expect(res.body.family.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('缺少名称返回 400', async () => {
    const { token } = await loginUser('no_name')
    const res = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('请输入家庭名称')
  })

  test('已在家庭中不可重复创建', async () => {
    const { token } = await loginUser('double')
    await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({ name: '家庭A' })
    const res = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({ name: '家庭B' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('已在一个家庭中')
  })
})

describe('POST /api/family/join', () => {
  test('加入家庭成功', async () => {
    const { token: t1 } = await loginUser('admin')
    const createRes = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '共享家庭' })
    const code = createRes.body.family.code

    const { token: t2 } = await loginUser('member')
    const joinRes = await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })
    expect(joinRes.status).toBe(200)
    expect(joinRes.body.family.code).toBe(code)
  })

  test('无效邀请码返回 404', async () => {
    const { token } = await loginUser('bad_code')
    const res = await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + token).send({ code: 'XXXXXX' })
    expect(res.status).toBe(404)
  })

  test('已在家庭中不可重复加入', async () => {
    const { token: t1 } = await loginUser('admin2')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '家庭' })
    const { token: t2 } = await loginUser('dup')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code: cr.body.family.code })
    const res = await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code: cr.body.family.code })
    expect(res.status).toBe(400)
  })
})

describe('家庭成员管理', () => {
  test('获取家庭包含成员信息和账单数', async () => {
    const { token: t1 } = await loginUser('admin3')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '统计测试' })
    const code = cr.body.family.code

    const { token: t2 } = await loginUser('member1')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })

    const getRes = await request(app).get('/api/family').set('Authorization', 'Bearer ' + t1)
    expect(getRes.body.family.memberCount).toBe(2)
    expect(getRes.body.members.length).toBe(2)
    expect(getRes.body.members[0].billCount).toBe(0)
  })

  test('管理员可移除成员', async () => {
    const { token: t1 } = await loginUser('admin4')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '移除测试' })
    const code = cr.body.family.code

    const { token: t2, userId: uid2 } = await loginUser('toremove')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })

    const removeRes = await request(app).post('/api/family/remove/' + uid2).set('Authorization', 'Bearer ' + t1)
    expect(removeRes.status).toBe(200)
    expect(removeRes.body.success).toBe(true)

    const user = db.findOne('users', u => u.id === uid2)
    expect(user.familyId).toBeNull()
  })

  test('非管理员不可移除成员', async () => {
    const { token: t1 } = await loginUser('admin5')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '权限测试' })
    const code = cr.body.family.code

    const { token: t2, userId: uid2 } = await loginUser('nonadmin')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })
    const { token: t3 } = await loginUser('other')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t3).send({ code })

    const removeRes = await request(app).post('/api/family/remove/' + uid2).set('Authorization', 'Bearer ' + t3)
    expect(removeRes.status).toBe(403)
  })

  test('移除不存在成员返回 404', async () => {
    const { token } = await loginUser('admin6')
    await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({ name: '家庭' })
    const res = await request(app).post('/api/family/remove/99999').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/family/leave', () => {
  test('离开家庭后可重新加入', async () => {
    const { token: t1 } = await loginUser('admin7')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '离开测试' })
    const code = cr.body.family.code

    const { token: t2 } = await loginUser('leaver')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })

    const leaveRes = await request(app).post('/api/family/leave').set('Authorization', 'Bearer ' + t2)
    expect(leaveRes.status).toBe(200)

    const rejoinRes = await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })
    expect(rejoinRes.status).toBe(200)
  })

  test('不在家庭中无法离开', async () => {
    const { token } = await loginUser('lonely')
    const res = await request(app).post('/api/family/leave').set('Authorization', 'Bearer ' + token)
    expect(res.status).toBe(400)
  })

  test('最后一人离开后家庭自动解散', async () => {
    const { token } = await loginUser('last')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + token).send({ name: '解散测试' })
    const familyId = cr.body.family.id

    await request(app).post('/api/family/leave').set('Authorization', 'Bearer ' + token)

    const family = db.findOne('families', f => f.id === familyId)
    expect(family).toBeNull()
  })
})

describe('家庭账单范围', () => {
  test('家庭模式下 bills 返回所有成员账单', async () => {
    const { token: t1, userId: uid1 } = await loginUser('fam_bill_1')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '账单测试' })
    const code = cr.body.family.code

    const { token: t2 } = await loginUser('fam_bill_2')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })

    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + t1).send({ type: 'expense', amount: -50, category: 'sys_exp_01', categoryName: '餐饮', date: new Date().toISOString() })
    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + t2).send({ type: 'income', amount: 200, category: 'sys_inc_01', categoryName: '工资', date: new Date().toISOString() })

    const famRes = await request(app).get('/api/bills?scope=family').set('Authorization', 'Bearer ' + t1)
    expect(famRes.status).toBe(200)
    expect(famRes.body.bills.length).toBe(2)

    const personalRes = await request(app).get('/api/bills').set('Authorization', 'Bearer ' + t1)
    expect(personalRes.body.bills.length).toBe(1)
  })

  test('家庭账单包含 ownerName', async () => {
    const { token: t1 } = await loginUser('owner_test')
    const cr = await request(app).post('/api/family/create').set('Authorization', 'Bearer ' + t1).send({ name: '姓名测试' })
    const code = cr.body.family.code

    const { token: t2 } = await loginUser('owner_member')
    await request(app).post('/api/family/join').set('Authorization', 'Bearer ' + t2).send({ code })

    await request(app).post('/api/bills').set('Authorization', 'Bearer ' + t1).send({ type: 'expense', amount: -30, category: 'sys_exp_01', categoryName: '餐饮', date: new Date().toISOString() })

    const famRes = await request(app).get('/api/bills?scope=family').set('Authorization', 'Bearer ' + t1)
    expect(famRes.body.bills[0].ownerName).toBeTruthy()
  })
})
