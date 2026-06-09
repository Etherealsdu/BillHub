/**
 * 通用工具函数
 */

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function formatMoney(amount, currency = '¥') {
  const num = Number(amount)
  if (isNaN(num)) return `${currency}0.00`
  return `${currency}${Math.abs(num).toFixed(2)}`
}

function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

function isThisWeek(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  return d >= weekStart && d < weekEnd
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
}

function isSameDay(d1, d2) {
  const a = new Date(d1)
  const b = new Date(d2)
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function getDateRange(days) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return { start: start.toISOString(), end: now.toISOString() }
}

function getMonthDateRange(year, month) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

function showSuccess(title) {
  showToast(title, 'success')
}

function showError(title) {
  showToast(title, 'error')
}

function showModal(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success(res) { resolve(res.confirm) }
    })
  })
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

function navigateTo(url) {
  wx.navigateTo({ url })
}

function navigateBack(delta = 1) {
  wx.navigateBack({ delta })
}

function throttle(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) return
    timer = setTimeout(() => { timer = null }, delay)
    fn.apply(this, args)
  }
}

function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  formatMoney,
  isToday,
  isThisWeek,
  isThisMonth,
  isSameDay,
  getDateRange,
  getMonthDateRange,
  showToast,
  showSuccess,
  showError,
  showModal,
  showLoading,
  hideLoading,
  navigateTo,
  navigateBack,
  throttle,
  debounce
}
