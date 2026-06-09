/**
 * 模拟数据生成模块
 * 用于开发阶段生成演示账单数据
 */

const storage = require('./storage')

function generateMockBills(count = 50) {
  const categories = storage.getCategories()
  const expenseCats = categories.expense || []
  const incomeCats = categories.income || []
  const sources = ['wechat', 'alipay', 'manual']
  const remarks = [
    '午餐', '晚餐', '早餐', '打车', '地铁', '公交',
    '超市购物', '网购', '买衣服', '看电影',
    '交房租', '话费充值', '买书', '学习课程',
    '朋友聚餐', '红包', '礼物', '水电费',
    '健身', '理发', '买药', '咖啡'
  ]

  const bills = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const isExpense = Math.random() > 0.25
    const cats = isExpense ? expenseCats : incomeCats
    const cat = cats.length > 0 ? cats[Math.floor(Math.random() * cats.length)] : { id: 'other', name: '其他', icon: '📦' }
    const source = sources[Math.floor(Math.random() * sources.length)]

    const daysAgo = Math.floor(Math.random() * 60)
    const hoursAgo = Math.floor(Math.random() * 24)
    const date = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000 - Math.floor(Math.random() * 3600) * 1000)

    const amount = isExpense
      ? -(Math.floor(Math.random() * 200000 + 50) / 100)
      : (Math.floor(Math.random() * 500000 + 1000) / 100)

    bills.push({
      id: `mock_${i}_${date.getTime()}`,
      type: isExpense ? 'expense' : 'income',
      amount: amount,
      category: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon || '📦',
      date: date.toISOString(),
      source: source,
      remark: remarks[Math.floor(Math.random() * remarks.length)],
      syncSource: source !== 'manual' ? source : null,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString()
    })
  }

  bills.sort((a, b) => new Date(b.date) - new Date(a.date))
  return bills
}

function initMockData() {
  const existing = storage.getBills()
  if (existing.length > 0) return false
  const bills = generateMockBills(60)
  storage.setBills(bills)
  return true
}

module.exports = {
  generateMockBills,
  initMockData
}
