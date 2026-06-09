const { Router } = require('express')
const jwt = require('jsonwebtoken')
const config = require('../config')
const db = require('../models/db')
const { wechatCode2Session } = require('../services/wechat')

const router = Router()

/**
 * POST /api/auth/login
 * 微信小程序登录，用 code 换取 openid，返回 JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: '缺少 code' })

    const session = await wechatCode2Session(code)
    let user = db.findOne('users', u => u.openid === session.openid)

    if (!user) {
      const newUser = {
        id: db.nextUserId(),
        openid: session.openid,
        nickname: '',
        avatarUrl: '',
        wechatBound: 0,
        alipayBound: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      user = db.insert('users', newUser)
      initDefaultCategories(user.id)
    }

    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    )

    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        wechatBound: !!user.wechatBound,
        alipayBound: !!user.alipayBound,
      },
    })
  } catch (e) {
    console.error('[Auth] 登录失败:', e.message)
    res.status(500).json({ error: '登录失败' })
  }
})

/**
 * POST /api/auth/update-profile
 * 更新用户资料
 */
router.post('/update-profile', require('../middleware/auth'), (req, res) => {
  const { nickname, avatarUrl } = req.body
  const updates = { updatedAt: new Date().toISOString() }
  if (nickname !== undefined) updates.nickname = String(nickname).trim().slice(0, 50) || ''
  if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim().slice(0, 500) || ''

  db.update('users', u => u.id === req.userId, updates)
  res.json({ success: true })
})

/**
 * 初始化默认分类
 * ID 格式使用两位数字补齐 (sys_exp_01, sys_inc_01)
 */
function initDefaultCategories(userId) {
  const expenseCats = [
    { name: '餐饮', icon: '🍜' }, { name: '交通', icon: '🚗' },
    { name: '购物', icon: '🛒' }, { name: '住宿', icon: '🏠' },
    { name: '娱乐', icon: '🎮' }, { name: '日用', icon: '🧴' },
    { name: '通讯', icon: '📱' }, { name: '医疗', icon: '💊' },
    { name: '教育', icon: '📚' }, { name: '人情往来', icon: '🧧' },
    { name: '其他支出', icon: '📦' },
  ]
  const incomeCats = [
    { name: '工资', icon: '💼' }, { name: '理财', icon: '📈' },
    { name: '兼职', icon: '💻' }, { name: '红包', icon: '🧧' },
    { name: '其他收入', icon: '💰' },
  ]
  expenseCats.forEach((c, i) => {
    db.insert('categories', { id: `sys_exp_${String(i + 1).padStart(2, '0')}`, userId, name: c.name, icon: c.icon, type: 'expense', isSystem: 1, sortOrder: i + 1, createdAt: new Date().toISOString() })
  })
  incomeCats.forEach((c, i) => {
    db.insert('categories', { id: `sys_inc_${String(i + 1).padStart(2, '0')}`, userId, name: c.name, icon: c.icon, type: 'income', isSystem: 1, sortOrder: i + 1, createdAt: new Date().toISOString() })
  })
}

module.exports = router
