const config = require('../config')

/**
 * 模拟同步支付宝账单
 * 正式对接时替换为支付宝账单查询API:
 *   alipay.data.bill.detail.query
 *   需应用私钥、支付宝公钥验签
 */
async function syncAlipayBills(cursor, userId) {
  const count = Math.floor(Math.random() * 5) + 2
  const bills = []
  const now = Date.now()
  const cursorTime = cursor ? parseInt(cursor) : (now - 30 * 86400000)

  for (let i = 0; i < count; i++) {
    const isExpense = Math.random() > 0.3
    const offset = Math.floor(Math.random() * (now - cursorTime))
    const tradeDate = new Date(cursorTime + offset)
    bills.push({
      id: `sync_alipay_${now}_${i}`,
      type: isExpense ? 'expense' : 'income',
      amount: isExpense
        ? -(Math.floor(Math.random() * 30000 + 50) / 100)
        : (Math.floor(Math.random() * 100000 + 500) / 100),
      category: isExpense ? 'sys_exp_03' : 'sys_inc_05',
      categoryName: isExpense ? '购物' : '其他收入',
      categoryIcon: isExpense ? '🛒' : '💰',
      date: tradeDate.toISOString(),
      remark: `支付宝-${isExpense ? '消费' : '收款'}`,
    })
  }
  return bills
}

module.exports = { syncAlipayBills }
