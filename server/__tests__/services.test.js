jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { openid: 'mock_test_openid', session_key: 'mock_key', errcode: 0, errmsg: 'ok' } }),
}))

const path = require('path')
const os = require('os')
const fs = require('fs')

let testDbPath, db

beforeEach(() => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_svc_${Date.now()}.json`)
  db = require('../models/db')
  db.initDB(testDbPath)
})

afterEach(() => {
  db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

describe('WeChat 服务', () => {
  test('wechatCode2Session 返回 openid', async () => {
    const { wechatCode2Session } = require('../services/wechat')
    const result = await wechatCode2Session('test_code')
    expect(result.openid).toBeTruthy()
    expect(result.sessionKey).toBeTruthy()
  })

  test('syncWechatBills 返回账单数组', async () => {
    const { syncWechatBills } = require('../services/wechat')
    const bills = await syncWechatBills(null, 1)
    expect(Array.isArray(bills)).toBe(true)
    expect(bills.length).toBeGreaterThan(0)
    bills.forEach(b => {
      expect(b.id).toContain('sync_wechat_')
      expect(['expense', 'income']).toContain(b.type)
      expect(b.amount).toBeDefined()
    })
  })

  test('syncWechatBills 使用游标', async () => {
    const { syncWechatBills } = require('../services/wechat')
    const bills = await syncWechatBills(String(Date.now() - 3600000), 1)
    expect(Array.isArray(bills)).toBe(true)
  })
})

describe('Alipay 服务', () => {
  test('syncAlipayBills 返回账单数组', async () => {
    const { syncAlipayBills } = require('../services/alipay')
    const bills = await syncAlipayBills(null, 1)
    expect(Array.isArray(bills)).toBe(true)
    expect(bills.length).toBeGreaterThan(0)
    bills.forEach(b => {
      expect(b.id).toContain('sync_alipay_')
      expect(['expense', 'income']).toContain(b.type)
    })
  })

  test('syncAlipayBills 使用游标', async () => {
    const { syncAlipayBills } = require('../services/alipay')
    const bills = await syncAlipayBills(String(Date.now() - 3600000), 1)
    expect(Array.isArray(bills)).toBe(true)
  })
})

describe('错误处理', () => {
  test('wechatCode2Session 抛出 API 错误', async () => {
    const axios = require('axios')
    axios.get.mockResolvedValueOnce({ data: { errcode: 40013, errmsg: 'invalid appid' } })
    const { wechatCode2Session } = require('../services/wechat')
    await expect(wechatCode2Session('bad_code')).rejects.toThrow('40013')
  })
})
