const path = require('path')
const fs = require('fs')
const config = require('../config')
const { createChildLogger } = require('../utils/logger')

const log = createChildLogger('DB')

/**
 * 轻量级 JSON 文件数据库
 * 单文件存储，开发/小规模场景使用，生产环境可替换为 SQL
 * 使用写队列避免并发写入竞态
 */

let data = null
let dbPath = ''
let writeQueue = Promise.resolve()

const DEFAULT_DATA = {
  users: [],
  bills: [],
  categories: [],
  syncCursors: [],
  families: [],
  _nextUserId: 1,
}

function initDB(testPath) {
  dbPath = testPath || config.db.path
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, 'utf-8')
    data = JSON.parse(raw)
  } else {
    data = JSON.parse(JSON.stringify(DEFAULT_DATA))
    save()
  }

  log.info('数据库初始化完成', { path: dbPath })
  return data
}

function save() {
  const writeData = JSON.stringify(data, null, 2)
  writeQueue = writeQueue.then(() => {
    return new Promise((resolve, reject) => {
      fs.writeFile(dbPath, writeData, 'utf-8', (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
  return writeQueue
}

function getDB() {
  if (!data) throw new Error('数据库未初始化')
  return data
}

/**
 * 基础 CRUD 辅助方法
 */

function findOne(collection, predicate) {
  return data[collection].find(predicate) || null
}

function find(collection, predicate) {
  return data[collection].filter(predicate)
}

function insert(collection, item) {
  data[collection].push(item)
  save()
  return item
}

function update(collection, predicate, updates) {
  const idx = data[collection].findIndex(predicate)
  if (idx === -1) return null
  data[collection][idx] = { ...data[collection][idx], ...updates }
  save()
  return data[collection][idx]
}

function remove(collection, predicate) {
  const len = data[collection].length
  data[collection] = data[collection].filter(item => !predicate(item))
  const removed = len - data[collection].length
  if (removed > 0) save()
  return removed
}

function nextUserId() {
  return data._nextUserId++
}

async function flush() {
  await writeQueue
}

function closeDB() {
  if (data) {
    save()
    return flush()
  }
}

async function resetDB() {
  data = JSON.parse(JSON.stringify(DEFAULT_DATA))
  save()
  await flush()
}

module.exports = { initDB, getDB, save, flush, findOne, find, insert, update, remove, nextUserId, closeDB, resetDB }
