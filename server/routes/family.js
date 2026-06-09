const { Router } = require('express')
const auth = require('../middleware/auth')
const db = require('../models/db')
const { createChildLogger } = require('../utils/logger')

const router = Router()
const log = createChildLogger('FAMILY')
router.use(auth)

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

router.get('/', (req, res) => {
  const user = db.findOne('users', u => u.id === req.userId)
  if (!user || !user.familyId) return res.json({ family: null })

  const family = db.findOne('families', f => f.id === user.familyId)
  if (!family) return res.json({ family: null })

  const members = db.find('users', u => u.familyId === family.id).map(u => ({
    id: u.id,
    nickname: u.nickname || '用户' + u.id,
    avatarUrl: u.avatarUrl,
    role: u.familyRole || 'member',
    billCount: db.find('bills', b => b.userId === u.id).length,
  }))

  res.json({
    family: {
      id: family.id,
      name: family.name,
      code: family.code,
      createdAt: family.createdAt,
      memberCount: members.length,
    },
    members,
  })
})

router.post('/create', (req, res) => {
  const { name } = req.body
  if (!name || name.trim().length === 0) return res.status(400).json({ error: '请输入家庭名称' })
  if (name.trim().length > 20) return res.status(400).json({ error: '家庭名称最多 20 个字符' })

  const user = db.findOne('users', u => u.id === req.userId)
  if (user && user.familyId) return res.status(400).json({ error: '您已在一个家庭中' })

  let code
  do { code = generateInviteCode() } while (db.findOne('families', f => f.code === code))

  const family = {
    id: 'fam_' + Date.now(),
    name: name.trim(),
    code: code,
    createdAt: new Date().toISOString(),
  }
  db.insert('families', family)
  db.update('users', u => u.id === req.userId, { familyId: family.id, familyRole: 'admin' })

  log.info('创建家庭', { userId: req.userId, familyId: family.id, name: family.name })
  res.status(201).json({ family: { id: family.id, name: family.name, code: family.code } })
})

router.post('/join', (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: '请输入邀请码' })

  const family = db.findOne('families', f => f.code === code.toUpperCase())
  if (!family) return res.status(404).json({ error: '邀请码无效' })

  const user = db.findOne('users', u => u.id === req.userId)
  if (user && user.familyId) return res.status(400).json({ error: '您已在一个家庭中' })

  db.update('users', u => u.id === req.userId, { familyId: family.id, familyRole: 'member' })

  log.info('加入家庭', { userId: req.userId, familyId: family.id })
  res.json({ family: { id: family.id, name: family.name, code: family.code } })
})

router.post('/leave', (req, res) => {
  const user = db.findOne('users', u => u.id === req.userId)
  if (!user || !user.familyId) return res.status(400).json({ error: '您不在任何家庭中' })

  const familyId = user.familyId
  db.update('users', u => u.id === req.userId, { familyId: null, familyRole: null })

  const remaining = db.find('users', u => u.familyId === familyId)
  if (remaining.length === 0) {
    db.remove('families', f => f.id === familyId)
    log.info('家庭已解散', { familyId })
  }

  log.info('离开家庭', { userId: req.userId, familyId })
  res.json({ success: true })
})

router.post('/remove/:targetId', (req, res) => {
  const targetId = Number(req.params.targetId)
  const user = db.findOne('users', u => u.id === req.userId)
  if (!user || user.familyRole !== 'admin') return res.status(403).json({ error: '仅家庭管理员可操作' })

  const target = db.findOne('users', u => u.id === targetId && u.familyId === user.familyId)
  if (!target) return res.status(404).json({ error: '成员不存在' })

  db.update('users', u => u.id === targetId, { familyId: null, familyRole: null })

  log.info('移除成员', { adminId: req.userId, targetId, familyId: user.familyId })
  res.json({ success: true })
})

module.exports = router
