const storage = require('./utils/storage')
const api = require('./utils/api')
const logger = require('./utils/logger')

App({
  onLaunch() {
    storage.initSystemData()
    this.autoLogin()
    logger.cleanOldLogs()
    logger.info('应用启动', { version: '1.0.0' })
  },

  autoLogin() {
    const token = api.getToken()
    if (token) {
      this.globalData.isLoggedIn = true
      const user = storage.getUserInfo()
      if (user) this.globalData.user = user
      logger.info('自动登录成功', { hasUser: !!user })
    }
  },

  globalData: {
    isLoggedIn: false,
    user: null
  }
})
