/**
 * API接口对接模块
 * 封装后端服务的所有HTTP请求
 * 支持 JWT token 自动注入、错误统一处理
 */

const CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  TIMEOUT: 10000,
}

let _token = null

function getToken() {
  if (_token) return _token
  try { _token = wx.getStorageSync('billhub_token') } catch (e) {  }
  return _token
}

function setToken(token) {
  _token = token
  try { wx.setStorageSync('billhub_token', token) } catch (e) {  }
}

function clearToken() {
  _token = null
  try { wx.removeStorageSync('billhub_token') } catch (e) {  }
}

function request(url, data = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) header['Authorization'] = 'Bearer ' + token

    wx.request({
      url: CONFIG.BASE_URL + url,
      method,
      data,
      header,
      timeout: CONFIG.TIMEOUT,
      success(res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          clearToken()
          wx.showToast({ title: '登录已过期，请重新授权', icon: 'none' })
          reject(new Error('UNAUTHORIZED'))
        } else {
          reject(new Error(res.data?.error || `请求失败(${res.statusCode})`))
        }
      },
      fail(err) {
        reject(new Error('网络请求失败: ' + err.errMsg))
      },
    })
  })
}

/**
 * 微信登录 -> 后端换取 JWT
 */
function loginWithWechat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) return reject(new Error('微信登录失败'))
        request('/auth/login', { code: loginRes.code }, 'POST')
          .then(data => {
            setToken(data.token)
            resolve(data)
          })
          .catch(reject)
      },
      fail: reject,
    })
  })
}

/**
 * 更新用户资料
 */
function updateProfile(nickname, avatarUrl) {
  return request('/auth/update-profile', { nickname, avatarUrl }, 'POST')
}

/**
 * 获取账单列表
 */
function getBills(params = {}) {
  const qs = Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  return request('/bills' + (qs ? '?' + qs : ''))
}

/**
 * 新增账单
 */
function addBill(data) {
  return request('/bills', data, 'POST')
}

/**
 * 更新账单
 */
function updateBill(id, data) {
  return request('/bills/' + id, data, 'PUT')
}

/**
 * 删除账单
 */
function deleteBill(id) {
  return request('/bills/' + id, {}, 'DELETE')
}

/**
 * 批量操作账单
 */
function batchBills(ids, action, categoryData) {
  return request('/bills/batch', { ids, action, ...categoryData }, 'POST')
}

/**
 * 同步微信/支付宝账单
 */
function syncBills(source) {
  return request('/bills/sync', { source }, 'POST')
}

/**
 * 获取分类
 */
function getCategories() {
  return request('/categories')
}

/**
 * 新增分类
 */
function addCategory(data) {
  return request('/categories', data, 'POST')
}

/**
 * 修改分类
 */
function updateCategory(id, data) {
  return request('/categories/' + id, data, 'PUT')
}

/**
 * 删除分类
 */
function deleteCategory(id) {
  return request('/categories/' + id, {}, 'DELETE')
}

/**
 * 重新排序分类
 */
function reorderCategories(ids) {
  return request('/categories/reorder/batch', { ids }, 'PUT')
}

module.exports = {
  CONFIG,
  loginWithWechat,
  updateProfile,
  getToken,
  setToken,
  clearToken,
  getBills,
  addBill,
  updateBill,
  deleteBill,
  batchBills,
  syncBills,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
}
