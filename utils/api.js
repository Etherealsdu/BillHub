/**
 * API接口对接模块
 * 封装微信支付、支付宝账单同步API对接逻辑
 * 实际对接时需要替换为真实的后端接口地址和认证逻辑
 *
 * 对接注意事项:
 * 1. 微信支付账单: 需通过wx.requestPayment获取支付凭证, 后端通过微信支付V3 API查询账单
 * 2. 支付宝账单: 需通过支付宝小程序SDK获取auth_code, 后端调用支付宝账单查询接口
 * 3. 同步采用游标(cursor)增量拉取, 避免重复同步
 */

const storage = require('./storage')

const CONFIG = {
  BASE_URL: 'https://api.billhub.example.com/v1',
  WECHAT_APPID: 'wx0000000000000000',
  TIMEOUT: 10000
}

function request(url, data = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    wx.request({
      url: CONFIG.BASE_URL + url,
      method,
      data,
      timeout: CONFIG.TIMEOUT,
      success(res) {
        if (res.statusCode === 200 && res.data) {
          resolve(res.data)
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

/**
 * 微信授权登录
 * 获取微信用户信息及支付授权凭证
 */
function wechatAuth() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve({ code: res.code })
        } else {
          reject(new Error('微信登录失败'))
        }
      },
      fail: reject
    })
  })
}

/**
 * 同步微信支付账单
 * @param {string} cursor - 上次同步游标(时间戳), 首次同步传null
 * @returns {Array} 新增的账单数据
 *
 * 对接逻辑说明:
 * 1. 前端获取用户登录凭证(code)传给后端
 * 2. 后端调用微信支付"交易账单"API, 根据cursor增量拉取
 * 3. 返回数据格式: [{tradeTime, tradeAmount, tradeType, remark}]
 */
function syncWechatBills(cursor) {
  return new Promise((resolve) => {
    showLoading('正在同步微信账单...')
    setTimeout(() => {
      hideLoading()
      const mockBills = generateMockBills('wechat', cursor, 8)
      resolve(mockBills)
    }, 1500)
  })
}

/**
 * 同步支付宝账单
 * @param {string} cursor - 上次同步游标
 * @returns {Array} 新增的账单数据
 *
 * 对接逻辑说明:
 * 1. 前端调用my.getAuthCode获取支付宝用户授权
 * 2. 后端使用支付宝"账单查询"接口(alipay.data.bill)拉取
 * 3. 根据cursor增量同步, 避免全量拉取
 */
function syncAlipayBills(cursor) {
  return new Promise((resolve) => {
    showLoading('正在同步支付宝账单...')
    setTimeout(() => {
      hideLoading()
      const mockBills = generateMockBills('alipay', cursor, 6)
      resolve(mockBills)
    }, 1800)
  })
}

function generateMockBills(source, cursor, count) {
  const bills = []
  const now = Date.now()
  const categories = storage.getCategories()
  const allExpenseCats = categories.expense || []
  const allIncomeCats = categories.income || []
  const cursorTime = cursor ? parseInt(cursor) : (now - 30 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const isExpense = Math.random() > 0.3
    const cats = isExpense ? allExpenseCats : allIncomeCats
    const cat = cats.length > 0 ? cats[Math.floor(Math.random() * cats.length)] : { id: 'other', name: '其他', icon: '📦' }
    const offset = Math.floor(Math.random() * (now - cursorTime))
    const tradeDate = new Date(cursorTime + offset)

    bills.push({
      id: `sync_${source}_${now}_${i}`,
      type: isExpense ? 'expense' : 'income',
      amount: isExpense
        ? -(Math.floor(Math.random() * 50000 + 100) / 100)
        : (Math.floor(Math.random() * 200000 + 1000) / 100),
      category: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon || '📦',
      date: tradeDate.toISOString(),
      source: source,
      remark: isExpense ? `${source === 'wechat' ? '微信' : '支付宝'}消费-${cat.name}` : `${source === 'wechat' ? '微信' : '支付宝'}收入-${cat.name}`,
      syncSource: source,
      createdAt: tradeDate.toISOString(),
      updatedAt: tradeDate.toISOString()
    })
  }

  return bills
}

function showLoading(title) {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

module.exports = {
  CONFIG,
  wechatAuth,
  syncWechatBills,
  syncAlipayBills,
  request
}
