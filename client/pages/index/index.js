const storage = require('../../utils/storage')
const util = require('../../utils/util')
const api = require('../../utils/api')
const mock = require('../../utils/mock')
const logger = require('../../utils/logger')

Page({
  data: {
    todayIncome: 0,
    todayExpense: 0,
    weekIncome: 0,
    weekExpense: 0,
    monthIncome: 0,
    monthExpense: 0,
    recentBills: [],
    lastSyncTime: '',
    showChart: false,
    chartData: [],
    totalBills: 0,
    loading: true,
    loginRetryCount: 0,
    lastSyncSource: '',
    scope: 'personal',
    hasFamily: false
  },

  onLoad() {
    mock.initMockData()
    logger.info('首页加载', { totalBills: storage.getBills().length })
  },

  onShow() {
    this.loadData()
    const syncTime = storage.getLastSyncTime()
    if (syncTime) {
      this.setData({ lastSyncTime: util.formatDateTime(syncTime) })
    }
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  loadData() {
    const settings = storage.getSettings()
    const hasFamily = !!(settings.familyId)
    const scope = settings.scope || 'personal'

    this.setData({ hasFamily: hasFamily, scope: scope })

    if (scope === 'family' && hasFamily) {
      this.setData({ loading: true })
      api.getBills({ scope: 'family' })
        .then(data => {
          const bills = data.bills || []
          this.calcStats(bills)
          this.calcRecentBills(bills)
          this.calcChartData(bills)
          this.setData({ loading: false, totalBills: bills.length })
        })
        .catch(() => {
          this.setData({ loading: false })
        })
    } else {
      const bills = storage.getBills()
      this.calcStats(bills)
      this.calcRecentBills(bills)
      this.calcChartData(bills)
      this.setData({ loading: false, totalBills: bills.length })
    }
  },

  calcStats(bills) {
    let todayInc = 0, todayExp = 0
    let weekInc = 0, weekExp = 0
    let monthInc = 0, monthExp = 0

    bills.forEach(b => {
      const isExpense = b.type === 'expense'
      const absAmt = Math.abs(b.amount)

      if (util.isToday(b.date)) {
        isExpense ? (todayExp += absAmt) : (todayInc += absAmt)
      }
      if (util.isThisWeek(b.date)) {
        isExpense ? (weekExp += absAmt) : (weekInc += absAmt)
      }
      if (util.isThisMonth(b.date)) {
        isExpense ? (monthExp += absAmt) : (monthInc += absAmt)
      }
    })

    this.setData({
      todayIncome: todayInc, todayExpense: todayExp,
      weekIncome: weekInc, weekExpense: weekExp,
      monthIncome: monthInc, monthExpense: monthExp
    })
  },

  calcRecentBills(bills) {
    const recent = bills.slice(0, 5)
    this.setData({ recentBills: recent })
  },

  calcChartData(bills) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const chartData = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      let inc = 0, exp = 0
      bills.forEach(b => {
        if (util.isSameDay(b.date, dayStr)) {
          if (b.type === 'expense') exp += Math.abs(b.amount)
          else inc += Math.abs(b.amount)
        }
      })
      chartData.push({ day: d, income: inc, expense: exp })
    }
    const maxExpense = Math.max(...chartData.map(d => d.expense), 100)
    const maxIncome = Math.max(...chartData.map(d => d.income), 100)
    this.setData({ chartData, maxExpense, maxIncome })
  },

  onSyncTap() {
    const self = this
    wx.showActionSheet({
      itemList: ['同步微信账单', '同步支付宝账单'],
      success(res) {
        const source = res.tapIndex === 0 ? 'wechat' : 'alipay'
        self.setData({ lastSyncSource: source })
        self._doSync(source)
      }
    })
  },

  _doSync(source) {
    const self = this
    util.showLoading('正在同步' + (source === 'wechat' ? '微信' : '支付宝') + '账单...')
    api.syncBills(source)
      .then(result => {
        util.hideLoading()
        if (result.synced > 0) {
          storage.setLastSyncTime(new Date().toISOString())
          util.showSuccess(`同步成功，新增${result.synced}条账单`)
          logger.info('同步成功', { source: source, synced: result.synced, total: result.total })
        } else {
          util.showToast('没有新账单需要同步', 'none')
          logger.info('同步完成无新数据', { source: source })
        }
        self.setData({ loginRetryCount: 0 })
        self.loadData()
        self.setData({ lastSyncTime: util.formatDateTime(new Date().toISOString()) })
      })
      .catch(err => {
        util.hideLoading()
        if (err.message === 'UNAUTHORIZED') {
          logger.warn('同步需重新登录', { loginRetry: self.data.loginRetryCount })
          self.onLoginFirst()
        } else {
          util.showError('同步失败: ' + err.message)
          logger.error('同步失败', { source: source, error: err.message })
        }
      })
  },

  onLoginFirst() {
    const self = this
    const retryCount = self.data.loginRetryCount
    if (retryCount >= 3) {
      util.showError('登录重试次数过多，请稍后再试')
      return
    }
    wx.showModal({
      title: '需要登录',
      content: '请先授权微信登录后再同步账单',
      success(res) {
        if (res.confirm) {
          util.showLoading('登录中...')
          api.loginWithWechat()
            .then(data => {
              util.hideLoading()
              util.showSuccess('登录成功')
              logger.info('登录成功', { userId: data.user?.id })
              self.setData({ loginRetryCount: 0 })
              const source = self.data.lastSyncSource || 'wechat'
              self._doSync(source)
            })
            .catch(err => {
              util.hideLoading()
              util.showError('登录失败')
              logger.error('登录失败', { retryCount: retryCount, error: err.message })
              self.setData({ loginRetryCount: retryCount + 1 })
            })
        }
      }
    })
  },

  onAddBill() {
    util.navigateTo('/pages/bill-edit/bill-edit')
  },

  onViewAllBills() {
    wx.switchTab({ url: '/pages/bills/bills' })
  },

  onBillClick(e) {
    const bill = e.detail.bill
    util.navigateTo(`/pages/bill-edit/bill-edit?id=${bill.id}`)
  },

  onToggleChart() {
    this.setData({ showChart: !this.data.showChart })
  },

  onToggleScope() {
    const newScope = this.data.scope === 'personal' ? 'family' : 'personal'
    storage.updateSetting('scope', newScope)
    this.setData({ scope: newScope })
    this.loadData()
    logger.info('切换首页范围', { scope: newScope })
  }
})
