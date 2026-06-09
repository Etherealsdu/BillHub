const { Router } = require('express')
const auth = require('../middleware/auth')
const db = require('../models/db')
const { syncWechatBills } = require('../services/wechat')
const { syncAlipayBills } = require('../services/alipay')

const router = Router()
router.use(auth)

/**
 * GET /api/bills
 * 查询账单列表
 * Query: type, category, startDate, endDate, page(1), pageSize(50)
 */
router.get('/', (req, res) => {
  let bills = db.find('bills', b => b.userId === req.userId)
  const { type, category, startDate, endDate, page = 1, pageSize = 50 } = req.query

  if (type) bills = bills.filter(b => b.type === type)
  if (category) bills = bills.filter(b => b.category === category)
  if (startDate) bills = bills.filter(b => b.date >= startDate)
  if (endDate) bills = bills.filter(b => b.date <= endDate)

  bills.sort((a, b) => new Date(b.date) - new Date(a.date))
  const total = bills.length
  const p = Math.max(1, Number(page))
  const ps = Number(pageSize)
  const paginated = bills.slice((p - 1) * ps, p * ps)

  res.json({ bills: paginated, total, page: p, pageSize: ps })
})

/**
 * POST /api/bills
 * 新增账单
 */
router.post('/', (req, res) => {
  const { type, amount, category, categoryName, categoryIcon, date, source, remark } = req.body
  if (!type || amount == null || !date) {
    return res.status(400).json({ error: '缺少必填字段(type/amount/date)' })
  }
  const bill = {
    id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: req.userId,
    type,
    amount: Number(amount),
    category: category || '',
    categoryName: categoryName || '',
    categoryIcon: categoryIcon || '📦',
    date,
    source: source || 'manual',
    remark: remark || '',
    syncSource: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.insert('bills', bill)
  res.status(201).json(bill)
})

/**
 * PUT /api/bills/:id
 * 更新账单
 */
router.put('/:id', (req, res) => {
  const existing = db.findOne('bills', b => b.id === req.params.id && b.userId === req.userId)
  if (!existing) return res.status(404).json({ error: '账单不存在' })

  const { type, amount, category, categoryName, categoryIcon, date, source, remark } = req.body
  const updated = db.update('bills', b => b.id === req.params.id, {
    type: type ?? existing.type,
    amount: amount != null ? Number(amount) : existing.amount,
    category: category ?? existing.category,
    categoryName: categoryName ?? existing.categoryName,
    categoryIcon: categoryIcon ?? existing.categoryIcon,
    date: date ?? existing.date,
    source: source ?? existing.source,
    remark: remark ?? existing.remark,
    updatedAt: new Date().toISOString(),
  })
  res.json(updated)
})

/**
 * DELETE /api/bills/:id
 * 删除账单
 */
router.delete('/:id', (req, res) => {
  const removed = db.remove('bills', b => b.id === req.params.id && b.userId === req.userId)
  if (removed === 0) return res.status(404).json({ error: '账单不存在' })
  res.json({ success: true })
})

/**
 * POST /api/bills/batch
 * 批量操作：改分类 / 删除
 */
router.post('/batch', (req, res) => {
  const { ids, action, category, categoryName, categoryIcon } = req.body
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '缺少 ids' })
  }

  let affected = 0
  if (action === 'delete') {
    ids.forEach(id => { affected += db.remove('bills', b => b.id === id && b.userId === req.userId) })
  } else if (action === 'category') {
    ids.forEach(id => {
      const r = db.update('bills', b => b.id === id && b.userId === req.userId, {
        category: category || '', categoryName: categoryName || '', categoryIcon: categoryIcon || '📦',
        updatedAt: new Date().toISOString(),
      })
      if (r) affected++
    })
  } else {
    return res.status(400).json({ error: '无效的 action' })
  }
  res.json({ success: true, affected })
})

/**
 * POST /api/bills/sync
 * 同步微信/支付宝账单
 */
router.post('/sync', async (req, res) => {
  try {
    const { source } = req.body
    if (!['wechat', 'alipay'].includes(source)) {
      return res.status(400).json({ error: '无效的同步来源' })
    }

    const cursorRow = db.findOne('syncCursors', c => c.userId === req.userId)
    const cursor = source === 'wechat' ? cursorRow?.wechatCursor : cursorRow?.alipayCursor
    const syncFn = source === 'wechat' ? syncWechatBills : syncAlipayBills
    const remoteBills = await syncFn(cursor, req.userId)

    let synced = 0
    for (const b of remoteBills) {
      const exists = db.findOne('bills', bill => bill.id === b.id)
      if (!exists) {
        db.insert('bills', { ...b, userId: req.userId, source, syncSource: source, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        synced++
      }
    }

    const newCursor = String(Date.now())
    if (cursorRow) {
      const updateKey = source === 'wechat' ? { wechatCursor: newCursor } : { alipayCursor: newCursor }
      db.update('syncCursors', c => c.userId === req.userId, { ...updateKey, updatedAt: new Date().toISOString() })
    } else {
      const entry = { userId: req.userId, wechatCursor: null, alipayCursor: null, updatedAt: new Date().toISOString() }
      entry[source === 'wechat' ? 'wechatCursor' : 'alipayCursor'] = newCursor
      db.insert('syncCursors', entry)
    }

    res.json({ success: true, synced, total: remoteBills.length })
  } catch (e) {
    console.error('[Sync] 同步失败:', e.message)
    res.status(500).json({ error: '同步失败: ' + e.message })
  }
})

module.exports = router
