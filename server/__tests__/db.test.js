const path = require('path')
const os = require('os')
const fs = require('fs')
const db = require('../models/db')

let testDbPath = ''

beforeEach(() => {
  testDbPath = path.join(os.tmpdir(), `billhub_test_${Date.now()}.json`)
  db.initDB(testDbPath)
})

afterEach(async () => {
  await db.closeDB()
  try { fs.unlinkSync(testDbPath) } catch (e) {  }
})

describe('数据库初始化', () => {
  test('initDB 创建默认数据结构', () => {
    const data = db.getDB()
    expect(data.users).toEqual([])
    expect(data.bills).toEqual([])
    expect(data.categories).toEqual([])
    expect(data.syncCursors).toEqual([])
    expect(data._nextUserId).toBe(1)
  })

  test('initDB 从已有文件加载数据', async () => {
    db.insert('users', { id: 1, name: 'test' })
    await db.closeDB()

    db.initDB(testDbPath)
    const users = db.find('users', () => true)
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('test')
  })

  test('resetDB 重置为初始状态', async () => {
    db.insert('users', { id: 1 })
    await db.resetDB()
    expect(db.find('users', () => true)).toHaveLength(0)
    expect(db.getDB()._nextUserId).toBe(1)
  })
})

describe('CRUD 操作', () => {
  test('findOne 返回匹配的第一个记录', () => {
    db.insert('users', { id: 1, name: 'a' })
    db.insert('users', { id: 2, name: 'b' })
    expect(db.findOne('users', u => u.id === 1).name).toBe('a')
    expect(db.findOne('users', u => u.id === 99)).toBeNull()
  })

  test('find 返回所有匹配记录', () => {
    db.insert('users', { id: 1, type: 'x' })
    db.insert('users', { id: 2, type: 'y' })
    db.insert('users', { id: 3, type: 'x' })
    expect(db.find('users', u => u.type === 'x')).toHaveLength(2)
    expect(db.find('users', u => u.type === 'z')).toHaveLength(0)
  })

  test('insert 添加记录并持久化', async () => {
    const item = { id: 1, name: 'new' }
    const result = db.insert('users', item)
    expect(result).toEqual(item)
    expect(db.find('users', () => true)).toHaveLength(1)

    await db.closeDB()
    db.initDB(testDbPath)
    expect(db.find('users', () => true)).toHaveLength(1)
  })

  test('update 修改已有记录', () => {
    db.insert('users', { id: 1, name: 'old', val: 10 })
    const updated = db.update('users', u => u.id === 1, { name: 'new', val: 20 })
    expect(updated.name).toBe('new')
    expect(updated.val).toBe(20)
  })

  test('update 不存在的记录返回 null', () => {
    expect(db.update('users', u => u.id === 999, { name: 'x' })).toBeNull()
  })

  test('remove 删除匹配记录', () => {
    db.insert('users', { id: 1 })
    db.insert('users', { id: 2 })
    const removed = db.remove('users', u => u.id === 1)
    expect(removed).toBe(1)
    expect(db.find('users', () => true)).toHaveLength(1)
  })

  test('remove 无匹配返回 0', () => {
    expect(db.remove('users', u => u.id === 999)).toBe(0)
  })

  test('nextUserId 递增', () => {
    expect(db.nextUserId()).toBe(1)
    expect(db.nextUserId()).toBe(2)
    expect(db.nextUserId()).toBe(3)
  })
})

describe('边界与异常', () => {
  test('initDB 自动创建不存在的目录', async () => {
    const nestedPath = path.join(os.tmpdir(), 'billhub_test_nested', 'sub', 'test.db')
    db.initDB(nestedPath)
    await db.flush()
    expect(db.getDB()).toBeTruthy()
    expect(fs.existsSync(nestedPath)).toBe(true)
    await db.closeDB()
    try { fs.unlinkSync(nestedPath) } catch (e) {  }
    try { fs.rmdirSync(path.join(os.tmpdir(), 'billhub_test_nested', 'sub')) } catch (e) {  }
    try { fs.rmdirSync(path.join(os.tmpdir(), 'billhub_test_nested')) } catch (e) {  }
    db.initDB(testDbPath)
  })

  test('插入复杂对象', () => {
    const obj = { id: 1, data: { nested: [1, 2, 3] }, date: new Date('2026-01-01').toISOString() }
    db.insert('users', obj)
    const found = db.findOne('users', u => u.id === 1)
    expect(found.data.nested).toEqual([1, 2, 3])
  })
})
