const winston = require('winston')
const path = require('path')
const config = require('../config')

const logDir = path.join(__dirname, '..', 'logs')

const dailyRotateTransport = new (require('winston-daily-rotate-file'))({
  filename: path.join(logDir, 'billhub-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '30d',
  append: true,
})

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
      return `${timestamp} [${level}]: ${message} ${metaStr}`
    })
  ),
})

const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
      const stackStr = stack ? `\n${stack}` : ''
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}${stackStr}`
    })
  ),
  transports: [
    dailyRotateTransport,
    consoleTransport,
  ],
})

function createChildLogger(context) {
  return {
    info: (message, meta) => logger.info(message, { ...meta, context }),
    warn: (message, meta) => logger.warn(message, { ...meta, context }),
    error: (message, meta) => logger.error(message, { ...meta, context }),
    debug: (message, meta) => logger.debug(message, { ...meta, context }),
    log: (level, message, meta) => logger.log(level, message, { ...meta, context }),
  }
}

module.exports = { logger, createChildLogger }