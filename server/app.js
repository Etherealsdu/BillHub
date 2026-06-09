const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./config')
const { initDB } = require('./models/db')
const authRoutes = require('./routes/auth')
const billRoutes = require('./routes/bills')
const categoryRoutes = require('./routes/categories')

const app = express()

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/categories', categoryRoutes)

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', service: 'billhub-server', version: '1.0.0' })
})

initDB()

app.listen(config.port, () => {
  console.log(`[BillHub] 服务已启动 → http://localhost:${config.port}`)
})
