const storage = require('../../utils/storage')
const util = require('../../utils/util')
const api = require('../../utils/api')
const mock = require('../../utils/mock')

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
    loading: true
  },

  onLoad() {
    mock.initMockData()
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
    const bills = storage.getBills()
    this.calcStats(bills)
    this.calcRecentBills(bills)
    this.calcChartData(bills)
    this.setData({ loading: false, totalBills: bills.length })
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
        const cursor = storage.getSyncCursor()
        if (res.tapIndex === 0) {
          api.syncWechatBills(cursor).then(bills => self.handleSyncResult(bills, 'wechat'))
        } else {
          api.syncAlipayBills(cursor).then(bills => self.handleSyncResult(bills, 'alipay'))
        }
      }
    })
  },

  handleSyncResult(newBills, source) {
    if (!newBills || newBills.length === 0) {
      util.showToast('没有新账单需要同步', 'none')
      return
    }
    const existing = storage.getBills()
    const merged = [...newBills, ...existing]
    merged.sort((a, b) => new Date(b.date) - new Date(a.date))
    storage.setBills(merged)
    storage.setSyncCursor(String(Date.now()))
    storage.setLastSyncTime(new Date().toISOString())
    util.showSuccess(`同步成功，新增${newBills.length}条账单`)
    this.loadData()
    this.setData({ lastSyncTime: util.formatDateTime(new Date().toISOString()) })
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
  }
})
