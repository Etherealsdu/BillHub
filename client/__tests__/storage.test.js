let storage
const mockStore = {}

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key]

  global.wx = {
    getStorageSync(key) {
      return mockStore[key] !== undefined ? mockStore[key] : ''
    },
    setStorageSync(key, val) {
      mockStore[key] = val
    },
    removeStorageSync(key) {
      delete mockStore[key]
    },
  }

  jest.resetModules()
  storage = require('../utils/storage')
})

afterEach(() => {
  delete global.wx
})

describe('系统数据初始化', () => {
  test('initSystemData 创建默认分类', () => {
    const result = storage.initSystemData()
    expect(result.categories.expense).toHaveLength(11)
    expect(result.categories.income).toHaveLength(5)
    expect(result.categories.expense[0].name).toBe('餐饮')
    expect(result.categories.expense[0].isSystem).toBe(true)
    expect(result.categories.income[0].name).toBe('工资')
  })

  test('initSystemData 不覆盖已有数据', () => {
    storage.initSystemData()
    mockStore[storage.STORAGE_KEYS.CATEGORIES].expense[0].name = '已修改'
    storage.initSystemData()
    const cats = storage.getCategories()
    expect(cats.expense[0].name).toBe('已修改')
  })

  test('initSystemData 初始化空账单数组', () => {
    storage.initSystemData()
    const bills = storage.getBills()
    expect(Array.isArray(bills)).toBe(true)
    expect(bills).toHaveLength(0)
  })
})

describe('账单 CRUD', () => {
  beforeEach(() => {
    storage.initSystemData()
  })

  test('addBill 添加账单并生成 id', () => {
    const bill = storage.addBill({ type: 'expense', amount: -100, category: 'c1', date: new Date().toISOString() })
    expect(bill.id).toBeTruthy()
    expect(bill.id).toContain('bill_')
    expect(bill.createdAt).toBeTruthy()
    expect(storage.getBills()).toHaveLength(1)
  })

  test('updateBill 修改账单', () => {
    const bill = storage.addBill({ type: 'expense', amount: -100, remark: '原备注' })
    const updated = storage.updateBill(bill.id, { amount: -200, remark: '新备注' })
    expect(updated.remark).toBe('新备注')
    expect(updated.amount).toBe(-200)
    expect(updated.updatedAt).toBeTruthy()
    expect(updated.updatedAt >= bill.updatedAt).toBe(true)
  })

  test('updateBill 不存在的 id 返回 null', () => {
    expect(storage.updateBill('nonexistent', { amount: 0 })).toBeNull()
  })

  test('deleteBill 删除账单', () => {
    const b1 = storage.addBill({ type: 'expense', amount: -50 })
    const b2 = storage.addBill({ type: 'income', amount: 100 })
    storage.deleteBill(b1.id)
    expect(storage.getBills()).toHaveLength(1)
    expect(storage.getBills()[0].id).toBe(b2.id)
  })

  test('setBills 整体替换', () => {
    storage.setBills([{ id: 'test1' }, { id: 'test2' }])
    expect(storage.getBills()).toHaveLength(2)
  })

  test('账单按添加顺序排列', () => {
    const b1 = storage.addBill({ amount: -10 })
    const b2 = storage.addBill({ amount: -20 })
    expect(storage.getBills()[0].amount).toBe(-20)
    expect(storage.getBills()[1].amount).toBe(-10)
  })
})

describe('分类管理', () => {
  beforeEach(() => {
    storage.initSystemData()
  })

  test('getCategories 返回分类', () => {
    const cats = storage.getCategories()
    expect(cats.expense).toBeDefined()
    expect(cats.income).toBeDefined()
  })

  test('addCategory 新增自定义分类', () => {
    const cat = storage.addCategory({ name: '新分类', type: 'expense' })
    expect(cat.id).toContain('cus_')
    expect(cat.isSystem).toBe(false)
    expect(storage.getCategories().expense).toHaveLength(12)
  })

  test('updateCategory 修改自定义分类', () => {
    const cat = storage.addCategory({ name: '旧名', type: 'income' })
    const updated = storage.updateCategory(cat.id, { name: '新名' })
    expect(updated.name).toBe('新名')
  })

  test('updateCategory 系统分类不可修改', () => {
    const result = storage.updateCategory('sys_exp_01', { name: '改了' })
    expect(result).toBeNull()
  })

  test('deleteCategory 删除自定义分类', () => {
    const cat = storage.addCategory({ name: '待删', type: 'expense' })
    expect(storage.deleteCategory(cat.id)).toBe(true)
    expect(storage.getCategories().expense).toHaveLength(11)
  })

  test('deleteCategory 系统分类不可删除', () => {
    expect(storage.deleteCategory('sys_exp_01')).toBe(false)
  })
})

describe('同步游标管理', () => {
  test('getSyncCursor 默认 null', () => {
    expect(storage.getSyncCursor()).toBeNull()
  })

  test('setSyncCursor 保存并读取', () => {
    storage.setSyncCursor('12345')
    expect(storage.getSyncCursor()).toBe('12345')
  })

  test('getLastSyncTime 默认 null', () => {
    expect(storage.getLastSyncTime()).toBeNull()
  })

  test('setLastSyncTime 保存并读取', () => {
    const t = new Date().toISOString()
    storage.setLastSyncTime(t)
    expect(storage.getLastSyncTime()).toBe(t)
  })
})

describe('用户信息与设置', () => {
  test('getUserInfo 默认 null', () => {
    expect(storage.getUserInfo()).toBeNull()
  })

  test('setUserInfo 保存', () => {
    storage.setUserInfo({ nickname: 'test', avatarUrl: 'url' })
    expect(storage.getUserInfo().nickname).toBe('test')
  })

  test('getSettings 返回默认设置', () => {
    const s = storage.getSettings()
    expect(s.autoSync).toBe(true)
    expect(s.syncInterval).toBe(24)
  })

  test('updateSetting 更新单字段', () => {
    storage.updateSetting('autoSync', false)
    expect(storage.getSettings().autoSync).toBe(false)
  })
})

describe('clearAllData', () => {
  test('清除所有存储', () => {
    storage.addBill({ type: 'expense', amount: -10 })
    storage.setUserInfo({ nickname: 'test' })
    storage.clearAllData()
    expect(storage.getBills()).toEqual([])
    expect(storage.getUserInfo()).toBeNull()
  })
})
