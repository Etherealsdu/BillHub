const LOG_DIR = 'billhub_logs'
const MAX_LOG_DAYS = 30
const MAX_FILE_SIZE = 5 * 1024 * 1024

let fs = null

function getFS() {
  if (!fs) {
    try { fs = wx.getFileSystemManager() } catch (e) { return null }
  }
  return fs
}

function ensureLogDir() {
  const f = getFS()
  if (!f) return false
  const dirPath = wx.env.USER_DATA_PATH + '/' + LOG_DIR
  try { f.accessSync(dirPath); return true } catch (e) { }
  try { f.mkdirSync(dirPath, true); return true } catch (e) { return false }
}

function getDateStr(d) {
  d = d || new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getLogFilePath(dateStr) {
  return wx.env.USER_DATA_PATH + '/' + LOG_DIR + '/billhub-' + dateStr + '.log'
}

function formatLog(levelMsg, data) {
  var time = new Date().toISOString()
  var dataStr = data ? ' ' + JSON.stringify(data) : ''
  return '[' + time + '] [' + levelMsg + '] ' + dataStr + '\n'
}

function appendLog(level, message, data) {
  var f = getFS()
  if (!f) { console.log(formatLog(level, message, data).trim()); return }
  ensureLogDir()
  var dateStr = getDateStr()
  var filePath = getLogFilePath(dateStr)
  var logLine = formatLog(level, message, data)

  try {
    var stat = f.statSync(filePath)
    if (stat.size > MAX_FILE_SIZE) {
      var backupPath = filePath.replace('.log', '_' + Date.now() + '.log')
      try { f.renameSync(filePath, backupPath) } catch (e) { }
    }
  } catch (e) { }

  try { f.appendFileSync(filePath, logLine, 'utf8') } catch (e) { console.log(logLine.trim()) }
}

function cleanOldLogs() {
  var f = getFS()
  if (!f) return
  var dirPath = wx.env.USER_DATA_PATH + '/' + LOG_DIR
  try {
    var files = f.readdirSync(dirPath)
    var now = Date.now()
    files.forEach(function (file) {
      if (file.indexOf('billhub-') !== 0) return
      var datePart = file.replace('billhub-', '').replace('.log', '').split('_')[0]
      var fileDate = new Date(datePart).getTime()
      if (now - fileDate > MAX_LOG_DAYS * 86400000) {
        try { f.unlinkSync(dirPath + '/' + file) } catch (e) { }
      }
    })
  } catch (e) { }
}

module.exports = {
  debug: function (message, data) { appendLog('DEBUG', message, data) },
  info: function (message, data) { appendLog('INFO', message, data) },
  warn: function (message, data) { appendLog('WARN', message, data) },
  error: function (message, data) { appendLog('ERROR', message, data) },
  cleanOldLogs: cleanOldLogs,
}
