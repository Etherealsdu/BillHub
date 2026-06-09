const util = require('../utils/util')

describe('日期格式化', () => {
  test('formatDate 格式化为 YYYY-MM-DD', () => {
    expect(util.formatDate('2026-06-09T12:00:00Z')).toBe('2026-06-09')
    expect(util.formatDate('')).toBe('')
    expect(util.formatDate(null)).toBe('')
  })

  test('formatDateTime 格式化为 YYYY-MM-DD HH:mm', () => {
    expect(util.formatDateTime('2026-06-09T08:05:00')).toBe('2026-06-09 08:05')
  })

  test('formatTime 格式化为 HH:mm', () => {
    expect(util.formatTime('2026-06-09T14:30:00')).toBe('14:30')
    expect(util.formatTime('')).toBe('')
  })
})

describe('金额格式化', () => {
  test('formatMoney 正常金额', () => {
    expect(util.formatMoney(123.45)).toBe('¥123.45')
    expect(util.formatMoney(0)).toBe('¥0.00')
    expect(util.formatMoney(-50.5)).toBe('¥50.50')
  })

  test('formatMoney 自定义货币符号', () => {
    expect(util.formatMoney(100, '$')).toBe('$100.00')
  })

  test('formatMoney 非数字返回 0.00', () => {
    expect(util.formatMoney('abc')).toBe('¥0.00')
  })
})

describe('日期判断', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-09T10:00:00'))
  })
  afterEach(() => jest.useRealTimers())

  test('isToday 判断今天', () => {
    expect(util.isToday('2026-06-09T08:00:00')).toBe(true)
    expect(util.isToday('2026-06-08T23:00:00')).toBe(false)
  })

  test('isThisWeek 判断本周', () => {
    expect(util.isThisWeek('2026-06-09T00:00:00')).toBe(true)
    expect(util.isThisWeek('2026-05-01T00:00:00')).toBe(false)
  })

  test('isThisMonth 判断本月', () => {
    expect(util.isThisMonth('2026-06-01T00:00:00')).toBe(true)
    expect(util.isThisMonth('2026-05-31T23:59:59')).toBe(false)
  })

  test('isSameDay 判断同一天', () => {
    expect(util.isSameDay('2026-06-09T08:00:00', '2026-06-09T20:00:00')).toBe(true)
    expect(util.isSameDay('2026-06-09T00:00:00', '2026-06-10T00:00:00')).toBe(false)
  })
})

describe('工具函数', () => {
  test('getDateRange 返回正确范围', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-09T12:00:00'))
    const range = util.getDateRange(7)
    expect(new Date(range.start) <= new Date(range.end)).toBe(true)
    jest.useRealTimers()
  })

  test('throttle 限制调用频率', () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const throttled = util.throttle(fn, 300)
    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(300)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  test('debounce 延迟执行', () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const debounced = util.debounce(fn, 300)
    debounced()
    debounced()
    debounced()
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})

describe('Toast / Modal 封装', () => {
  beforeAll(() => {
    global.wx = {
      showToast: jest.fn(),
      showModal: jest.fn(({ success }) => success && success({ confirm: true })),
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      navigateTo: jest.fn(),
      navigateBack: jest.fn(),
    }
  })

  afterAll(() => { delete global.wx })

  test('showToast 调用 wx.showToast', () => {
    util.showToast('测试消息', 'none', 2000)
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '测试消息', icon: 'none', duration: 2000 })
  })

  test('showSuccess 调用 wx.showToast 带 success', () => {
    util.showSuccess('成功')
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '成功', icon: 'success', duration: 2000 })
  })

  test('showError 调用 wx.showToast 带 error', () => {
    util.showError('出错了')
    expect(global.wx.showToast).toHaveBeenCalledWith({ title: '出错了', icon: 'error', duration: 2000 })
  })

  test('showModal 返回用户确认结果', async () => {
    const result = await util.showModal('标题', '内容')
    expect(result).toBe(true)
  })

  test('navigateTo 导航', () => {
    util.navigateTo('/pages/test/test')
    expect(global.wx.navigateTo).toHaveBeenCalledWith({ url: '/pages/test/test' })
  })

  test('navigateBack 返回', () => {
    util.navigateBack()
    expect(global.wx.navigateBack).toHaveBeenCalledWith({ delta: 1 })
  })
})
