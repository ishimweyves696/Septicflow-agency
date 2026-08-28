const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  AUDIT: 'AUDIT'
};

class Logger {
  constructor() {
    this.logFile = path.join(__dirname, '../../enterprise.log');
  }

  format(level, message, metadata = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
      env: process.env.NODE_ENV || 'development'
    });
  }

  log(level, message, metadata = {}) {
    const entry = this.format(level, message, metadata);
    console.log(entry);
    
    // In enterprise, we'd pipe this to a stream or service, 
    // for now we'll write to a local file for persistence check.
    try {
      fs.appendFileSync(this.logFile, entry + '\n');
    } catch (e) {
      console.error('Failed to write to log file', e);
    }
  }

  info(msg, meta) { this.log(LOG_LEVELS.INFO, msg, meta); }
  warn(msg, meta) { this.log(LOG_LEVELS.WARN, msg, meta); }
  error(msg, meta) { this.log(LOG_LEVELS.ERROR, msg, meta); }
  audit(msg, meta) { this.log(LOG_LEVELS.AUDIT, msg, meta); }
}

module.exports = new Logger();
