const path = require('path')
const fs = require('fs')
const config = require('../config')

/**
 * 轻量级 JSON 文件数据库
 * 单文件存储，开发/小规模场景使用，生产环境可替换为 SQL
 */

let data = null
let dbPath = ''

const DEFAULT_DATA = {
  users: [],
  bills: [],
  categories: [],
  syncCursors: [],
  _nextUserId: 1,
}

function initDB() {
  dbPath = config.db.path
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

  console.log('[BillHub] 数据库初始化完成, 路径:', dbPath)
  return data
}

function save() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
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
  data[collection] = data[collection].filter(predicate)
  const removed = len - data[collection].length
  if (removed > 0) save()
  return removed
}

function nextUserId() {
  return data._nextUserId++
}

function closeDB() {
  if (data) save()
}

module.exports = { initDB, getDB, save, findOne, find, insert, update, remove, nextUserId, closeDB }
