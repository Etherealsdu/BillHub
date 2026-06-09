const { Router } = require('express')
const auth = require('../middleware/auth')
const db = require('../models/db')
const { createChildLogger } = require('../utils/logger')

const router = Router()
const log = createChildLogger('CATEGORIES')
router.use(auth)

/**
 * GET /api/categories
 * 获取用户全部分类
 */
router.get('/', (req, res) => {
  const cats = db.find('categories', c => c.userId === req.userId)
  cats.sort((a, b) => a.sortOrder - b.sortOrder)
  res.json({
    expense: cats.filter(c => c.type === 'expense').map(fmt),
    income: cats.filter(c => c.type === 'income').map(fmt),
  })
})

/**
 * POST /api/categories
 * 新增自定义分类
 */
router.post('/', (req, res) => {
  const { name, icon, type } = req.body
  if (!name || !type) return res.status(400).json({ error: '缺少 name 或 type' })
  if (!['expense', 'income'].includes(type)) return res.status(400).json({ error: 'type 无效' })
  if (name.trim().length > 10) return res.status(400).json({ error: '分类名称最多 10 个字符' })

  const existing = db.find('categories', c => c.userId === req.userId && c.type === type)
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), 0)
  const cat = {
    id: `cus_${type}_${Date.now()}`,
    userId: req.userId,
    name: name.trim(),
    icon: icon || '📁',
    type,
    isSystem: 0,
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }
  db.insert('categories', cat)
  log.info('新增分类', { userId: req.userId, name: cat.name, type: cat.type })
  res.status(201).json(fmt(cat))
})

/**
 * PUT /api/categories/reorder/batch
 * 批量调整排序
 * (必须在 PUT /:id 之前注册，否则 /reorder/batch 会被 /:id 匹配)
 */
router.put('/reorder/batch', (req, res) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '缺少 ids' })
  ids.forEach((id, i) => {
    db.update('categories', c => c.id === id && c.userId === req.userId, { sortOrder: i + 1 })
  })
  log.info('分类排序', { userId: req.userId, count: ids.length })
  res.json({ success: true })
})

/**
 * PUT /api/categories/:id
 * 修改分类名称/图标
 */
router.put('/:id', (req, res) => {
  const cat = db.findOne('categories', c => c.id === req.params.id && c.userId === req.userId)
  if (!cat) return res.status(404).json({ error: '分类不存在' })
  if (cat.isSystem) return res.status(403).json({ error: '系统分类不可修改' })

  const { name, icon } = req.body
  const updated = db.update('categories', c => c.id === req.params.id && c.userId === req.userId, {
    name: (name || cat.name).trim(),
    icon: icon || cat.icon,
  })
  log.info('修改分类', { userId: req.userId, id: req.params.id, name: name })
  res.json(fmt(updated))
})

/**
 * DELETE /api/categories/:id
 * 删除自定义分类
 */
router.delete('/:id', (req, res) => {
  const cat = db.findOne('categories', c => c.id === req.params.id && c.userId === req.userId)
  if (!cat) return res.status(404).json({ error: '分类不存在' })
  if (cat.isSystem) return res.status(403).json({ error: '系统分类不可删除' })

  db.remove('categories', c => c.id === req.params.id && c.userId === req.userId)
  db.find('bills', b => b.userId === req.userId && b.category === req.params.id).forEach(b => {
    db.update('bills', bill => bill.id === b.id, { category: '', categoryName: '未分类', categoryIcon: '📦', updatedAt: new Date().toISOString() })
  })
  log.info('删除分类', { userId: req.userId, id: req.params.id, name: cat.name })
  res.json({ success: true })
})

function fmt(c) {
  return { id: c.id, name: c.name, icon: c.icon, type: c.type, isSystem: !!c.isSystem, sortOrder: c.sortOrder }
}

module.exports = router
