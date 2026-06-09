const storage = require('../../utils/storage')
const util = require('../../utils/util')
const api = require('../../utils/api')

Page({
  data: {
    userInfo: null,
    wechatBound: false,
    alipayBound: false,
    autoSync: true,
    syncInterval: 24,
    totalBills: 0,
    storageSize: '0 KB',
    appVersion: '1.0.0'
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const user = storage.getUserInfo()
    const settings = storage.getSettings()
    const bills = storage.getBills()
    this.setData({
      userInfo: user,
      wechatBound: settings.wechatBound || false,
      alipayBound: settings.alipayBound || false,
      autoSync: settings.autoSync !== false,
      syncInterval: settings.syncInterval || 24,
      totalBills: bills.length
    })
    this.calcStorageSize()
  },

  calcStorageSize() {
    try {
      const info = wx.getStorageInfoSync()
      const size = (info.currentSize || 0) / 1024
      this.setData({
        storageSize: size < 1024 ? size.toFixed(1) + ' KB' : (size / 1024).toFixed(1) + ' MB'
      })
    } catch (e) {
      this.setData({ storageSize: '未知' })
    }
  },

  onWechatAuth() {
    const self = this
    wx.showModal({
      title: '微信授权',
      content: '授权后自动同步微信支付账单记录',
      success(res) {
        if (res.confirm) {
          util.showLoading('登录授权中...')
          api.loginWithWechat()
            .then(data => {
              util.hideLoading()
              const user = data.user || {}
              storage.setUserInfo({ nickname: user.nickname, avatarUrl: user.avatarUrl })
              storage.updateSetting('wechatBound', true)
              self.setData({ wechatBound: true, userInfo: { nickname: user.nickname, avatarUrl: user.avatarUrl } })
              util.showSuccess('微信授权成功')
            })
            .catch(err => {
              util.hideLoading()
              util.showError('授权失败: ' + err.message)
            })
        }
      }
    })
  },

  onAlipayAuth() {
    const self = this
    wx.showModal({
      title: '支付宝授权',
      content: '授权后自动同步支付宝账单记录',
      success(res) {
        if (res.confirm) {
          util.showLoading('授权中...')
          api.updateProfile('', '').then(() => {
            storage.updateSetting('alipayBound', true)
            self.setData({ alipayBound: true })
            util.hideLoading()
            util.showSuccess('支付宝授权成功')
          }).catch(err => {
            util.hideLoading()
            util.showError('授权失败: ' + (err.message || '网络错误'))
          })
        }
      }
    })
  },

  onToggleAutoSync(e) {
    const val = e.detail.value
    storage.updateSetting('autoSync', val)
    this.setData({ autoSync: val })
  },

  onSyncIntervalChange(e) {
    const intervals = [12, 24, 48, 168]
    const val = intervals[e.detail.value]
    storage.updateSetting('syncInterval', val)
    this.setData({ syncInterval: val })
  },

  onSyncNow() {
    const self = this
    util.showLoading('正在同步...')
    api.syncBills('wechat')
      .then(r1 => api.syncBills('alipay').then(r2 => ({ r1, r2 })))
      .then(({ r1, r2 }) => {
        util.hideLoading()
        const total = (r1?.synced || 0) + (r2?.synced || 0)
        util.showSuccess(total > 0 ? `同步完成，新增${total}条` : '没有新账单')
        self.loadData()
      })
      .catch(err => {
        util.hideLoading()
        util.showError('同步失败: ' + err.message)
      })
  },

  onClearData() {
    const self = this
    wx.showModal({
      title: '清除数据',
      content: '将清除所有本地账单和分类数据（系统分类将恢复默认），此操作不可恢复！',
      confirmText: '确认清除',
      confirmColor: '#FF4D4F',
      success(res) {
        if (res.confirm) {
          storage.clearAllData()
          storage.initSystemData()
          util.showSuccess('已清除所有数据')
          self.loadData()
        }
      }
    })
  },

  onExportData() {
    const bills = storage.getBills()
    if (bills.length === 0) {
      util.showToast('没有数据可导出')
      return
    }
    const data = JSON.stringify({
      bills: bills,
      categories: storage.getCategories(),
      exportTime: new Date().toISOString(),
      version: this.data.appVersion
    }, null, 2)

    const fs = wx.getFileSystemManager()
    const fileName = `BillHub_export_${Date.now()}.json`
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    try {
      fs.writeFileSync(filePath, data, 'utf8')
      wx.openDocument({
        filePath: filePath,
        fileType: 'json',
        success() {
          util.showSuccess('导出成功')
        },
        fail() {
          wx.setClipboardData({
            data: data,
            success() {
              util.showToast('数据已复制到剪贴板')
            }
          })
        }
      })
    } catch (e) {
      util.showError('导出失败')
    }
  },

  onAbout() {
    wx.showModal({
      title: '关于账单通',
      content: `账单通 BillHub v${this.data.appVersion}\n\n一款便捷的微信记账小程序，支持微信/支付宝账单自动同步、自定义分类管理、收支统计分析。\n\n数据仅存储在本地，安全可靠。`,
      showCancel: false
    })
  },

  onContact() {
    wx.showToast({ title: '请联系开发者: support@billhub.app', icon: 'none', duration: 3000 })
  }
})
