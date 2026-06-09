const axios = require('axios')
const config = require('../config')

/**
 * 微信 code2session 接口
 * 用临时 code 换取 openid 和 session_key
 */
async function wechatCode2Session(code) {
  const { data } = await axios.get(config.wechat.loginUrl, {
    params: {
      appid: config.wechat.appid,
      secret: config.wechat.secret,
      js_code: code,
      grant_type: 'authorization_code',
    },
    timeout: 5000,
  })
  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errmsg} (${data.errcode})`)
  }
  return { openid: data.openid, sessionKey: data.session_key }
}

/**
 * 模拟同步微信支付账单
 * 正式对接时替换为微信支付V3账单API:
 *   GET https://api.mch.weixin.qq.com/v3/bill/tradebill
 *   需商户证书、平台证书验签
 */
async function syncWechatBills(cursor, userId) {
  const count = Math.floor(Math.random() * 6) + 3
  const bills = []
  const now = Date.now()
  const cursorTime = cursor ? parseInt(cursor) : (now - 30 * 86400000)

  for (let i = 0; i < count; i++) {
    const isExpense = Math.random() > 0.3
    const offset = Math.floor(Math.random() * (now - cursorTime))
    const tradeDate = new Date(cursorTime + offset)
    bills.push({
      id: `sync_wechat_${now}_${i}`,
      type: isExpense ? 'expense' : 'income',
      amount: isExpense
        ? -(Math.floor(Math.random() * 50000 + 100) / 100)
        : (Math.floor(Math.random() * 200000 + 1000) / 100),
      category: isExpense ? 'sys_exp_01' : 'sys_inc_05',
      categoryName: isExpense ? '餐饮' : '其他收入',
      categoryIcon: isExpense ? '🍜' : '💰',
      date: tradeDate.toISOString(),
      remark: `微信支付-${isExpense ? '消费' : '收款'}`,
    })
  }
  return bills
}

module.exports = { wechatCode2Session, syncWechatBills, syncAlipayBills: syncWechatBills }
