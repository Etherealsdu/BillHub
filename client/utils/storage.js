/**
 * 本地存储管理模块
 * 提供账单数据、分类数据的本地缓存读写能力
 * 数据持久化基于微信小程序 wx.getStorageSync / wx.setStorageSync
 */

const STORAGE_KEYS = {
  BILLS: 'billhub_bills',
  CATEGORIES: 'billhub_categories',
  SYNC_CURSOR: 'billhub_sync_cursor',
  USER_INFO: 'billhub_user_info',
  SETTINGS: 'billhub_settings',
  LAST_SYNC_TIME: 'billhub_last_sync_time'
}

const SYSTEM_CATEGORIES = {
  expense: [
    { id: 'sys_exp_01', name: '餐饮', icon: '🍜', type: 'expense', isSystem: true, sortOrder: 1 },
    { id: 'sys_exp_02', name: '交通', icon: '🚗', type: 'expense', isSystem: true, sortOrder: 2 },
    { id: 'sys_exp_03', name: '购物', icon: '🛒', type: 'expense', isSystem: true, sortOrder: 3 },
    { id: 'sys_exp_04', name: '住宿', icon: '🏠', type: 'expense', isSystem: true, sortOrder: 4 },
    { id: 'sys_exp_05', name: '娱乐', icon: '🎮', type: 'expense', isSystem: true, sortOrder: 5 },
    { id: 'sys_exp_06', name: '日用', icon: '🧴', type: 'expense', isSystem: true, sortOrder: 6 },
    { id: 'sys_exp_07', name: '通讯', icon: '📱', type: 'expense', isSystem: true, sortOrder: 7 },
    { id: 'sys_exp_08', name: '医疗', icon: '💊', type: 'expense', isSystem: true, sortOrder: 8 },
    { id: 'sys_exp_09', name: '教育', icon: '📚', type: 'expense', isSystem: true, sortOrder: 9 },
    { id: 'sys_exp_10', name: '人情往来', icon: '🧧', type: 'expense', isSystem: true, sortOrder: 10 },
    { id: 'sys_exp_11', name: '其他支出', icon: '📦', type: 'expense', isSystem: true, sortOrder: 99 }
  ],
  income: [
    { id: 'sys_inc_01', name: '工资', icon: '💼', type: 'income', isSystem: true, sortOrder: 1 },
    { id: 'sys_inc_02', name: '理财', icon: '📈', type: 'income', isSystem: true, sortOrder: 2 },
    { id: 'sys_inc_03', name: '兼职', icon: '💻', type: 'income', isSystem: true, sortOrder: 3 },
    { id: 'sys_inc_04', name: '红包', icon: '🧧', type: 'income', isSystem: true, sortOrder: 4 },
    { id: 'sys_inc_05', name: '其他收入', icon: '💰', type: 'income', isSystem: true, sortOrder: 99 }
  ]
}

function safeGet(key, defaultVal) {
  try {
    const val = wx.getStorageSync(key)
    return val !== '' ? val : defaultVal
  } catch (e) {
    console.warn(`[Storage] 读取失败 ${key}:`, e)
    return defaultVal
  }
}

function safeSet(key, val) {
  try {
    wx.setStorageSync(key, val)
    return true
  } catch (e) {
    console.error(`[Storage] 写入失败 ${key}:`, e)
    return false
  }
}

function initSystemData() {
  let cats = safeGet(STORAGE_KEYS.CATEGORIES, null)
  if (!cats || !cats.expense || cats.expense.length === 0) {
    cats = JSON.parse(JSON.stringify(SYSTEM_CATEGORIES))
    safeSet(STORAGE_KEYS.CATEGORIES, cats)
  }
  let bills = safeGet(STORAGE_KEYS.BILLS, [])
  if (!Array.isArray(bills)) {
    bills = []
    safeSet(STORAGE_KEYS.BILLS, bills)
  }
  return { categories: cats, bills }
}

function getBills() {
  return safeGet(STORAGE_KEYS.BILLS, [])
}

function setBills(bills) {
  return safeSet(STORAGE_KEYS.BILLS, bills)
}

function generateId(prefix) {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return prefix + '_' + crypto.randomUUID()
    }
  } catch (e) { }
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function addBill(bill) {
  const bills = getBills()
  const newBill = Object.assign({
    id: generateId('bill'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, bill)
  bills.unshift(newBill)
  setBills(bills)
  return newBill
}

function updateBill(id, updates) {
  const bills = getBills()
  const idx = bills.findIndex(b => b.id === id)
  if (idx === -1) return null
  bills[idx] = Object.assign({}, bills[idx], updates, { updatedAt: new Date().toISOString() })
  setBills(bills)
  return bills[idx]
}

function deleteBill(id) {
  let bills = getBills()
  bills = bills.filter(b => b.id !== id)
  setBills(bills)
}

function getCategories() {
  return safeGet(STORAGE_KEYS.CATEGORIES, JSON.parse(JSON.stringify(SYSTEM_CATEGORIES)))
}

function setCategories(cats) {
  return safeSet(STORAGE_KEYS.CATEGORIES, cats)
}

function addCategory(cat) {
  const cats = getCategories()
  const type = cat.type
  if (!cats[type]) cats[type] = []
  const newCat = Object.assign({
    id: generateId('cus_' + type),
    isSystem: false,
    sortOrder: cats[type].length + 1
  }, cat)
  cats[type].push(newCat)
  setCategories(cats)
  return newCat
}

function updateCategory(id, updates) {
  const cats = getCategories()
  for (const type of ['expense', 'income']) {
    const idx = cats[type].findIndex(c => c.id === id)
    if (idx !== -1) {
      if (cats[type][idx].isSystem) return null
      cats[type][idx] = Object.assign({}, cats[type][idx], updates)
      setCategories(cats)
      return cats[type][idx]
    }
  }
  return null
}

function deleteCategory(id) {
  const cats = getCategories()
  for (const type of ['expense', 'income']) {
    const idx = cats[type].findIndex(c => c.id === id)
    if (idx !== -1) {
      if (cats[type][idx].isSystem) return false
      cats[type].splice(idx, 1)
      setCategories(cats)
      return true
    }
  }
  return false
}

function getSyncCursor() {
  return safeGet(STORAGE_KEYS.SYNC_CURSOR, null)
}

function setSyncCursor(cursor) {
  return safeSet(STORAGE_KEYS.SYNC_CURSOR, cursor)
}

function getLastSyncTime() {
  return safeGet(STORAGE_KEYS.LAST_SYNC_TIME, null)
}

function setLastSyncTime(time) {
  return safeSet(STORAGE_KEYS.LAST_SYNC_TIME, time)
}

function getUserInfo() {
  return safeGet(STORAGE_KEYS.USER_INFO, null)
}

function setUserInfo(info) {
  return safeSet(STORAGE_KEYS.USER_INFO, info)
}

function getSettings() {
  return safeGet(STORAGE_KEYS.SETTINGS, {
    autoSync: true,
    syncInterval: 24,
    defaultSource: 'manual',
    currency: '¥',
    scope: 'personal',
    familyId: null,
    familyName: ''
  })
}

function updateSetting(key, value) {
  const s = getSettings()
  s[key] = value
  return safeSet(STORAGE_KEYS.SETTINGS, s)
}

function clearAllData() {
  try {
    Object.keys(STORAGE_KEYS).forEach(k => {
      if (k !== 'SETTINGS') wx.removeStorageSync(STORAGE_KEYS[k])
    })
    return true
  } catch (e) {
    console.error('[Storage] 清除数据失败:', e)
    return false
  }
}

module.exports = {
  STORAGE_KEYS,
  SYSTEM_CATEGORIES,
  initSystemData,
  getBills,
  setBills,
  addBill,
  updateBill,
  deleteBill,
  getCategories,
  setCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getSyncCursor,
  setSyncCursor,
  getLastSyncTime,
  setLastSyncTime,
  getUserInfo,
  setUserInfo,
  getSettings,
  updateSetting,
  clearAllData
}
