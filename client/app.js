const storage = require('./utils/storage')
const api = require('./utils/api')

App({
  onLaunch() {
    storage.initSystemData()
    this.autoLogin()
    console.log('[BillHub] 应用启动，系统数据初始化完成')
  },

  autoLogin() {
    const token = api.getToken()
    if (token) {
      console.log('[BillHub] 检测到已有登录 token')
    }
  },

  globalData: {
    isLoggedIn: false,
    user: null
  }
})
