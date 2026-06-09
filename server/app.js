const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config')
const { initDB } = require('./models/db')
const { logger } = require('./utils/logger')
const authRoutes = require('./routes/auth')
const billRoutes = require('./routes/bills')
const categoryRoutes = require('./routes/categories')

const app = express()

app.use(cors())
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}))
app.use(express.json({ limit: '100kb' }))

app.use('/api/auth', authRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/categories', categoryRoutes)

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', service: 'billhub-server', version: '1.0.0' })
})

// 404 handler
app.use('/api', (_, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// Global error handler
app.use((err, _, res, _next) => {
  logger.error('未捕获异常', { error: err.message, stack: err.stack })
  res.status(500).json({ error: '服务器内部错误' })
})

initDB()

app.listen(config.port, () => {
  logger.info(`服务已启动 → http://localhost:${config.port}`)
})
