const storage = require('./utils/storage')

App({
  onLaunch() {
    const initData = storage.initSystemData()
    this.globalData = {
      initData
    }
    console.log('[BillHub] 应用启动，系统数据初始化完成')
  },

  globalData: {
    initData: null
  }
})
