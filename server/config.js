/**
 * 后端服务配置
 * 生产环境通过环境变量覆盖
 */
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET 环境变量必须在生产环境设置')
}
if (isProduction && !process.env.WECHAT_SECRET) {
  throw new Error('WECHAT_SECRET 环境变量必须在生产环境设置')
}

module.exports = {
  port: process.env.PORT || 3000,

  jwtSecret: process.env.JWT_SECRET || 'billhub-dev-secret-key',
  jwtExpiresIn: '30d',
  logLevel: process.env.LOG_LEVEL || 'info',

  wechat: {
    appid: process.env.WECHAT_APPID || 'wx0000000000000000',
    secret: process.env.WECHAT_SECRET || '',
    loginUrl: 'https://api.weixin.qq.com/sns/jscode2session',
  },

  alipay: {
    appid: process.env.ALIPAY_APPID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  },

  db: {
    path: process.env.DB_PATH || './data/billhub.db',
  },
}
