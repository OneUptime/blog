# How to Use Winston for Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Logging, Winston, Observability, DevOps

Description: Set up professional logging in Node.js applications with Winston including log levels, formatters, transports, log rotation, and production best practices.

---

Console.log works for debugging, but production applications need structured logging with levels, timestamps, and the ability to send logs to different destinations. Winston is the most popular logging library for Node.js, and here is how to set it up properly.

## Basic Setup

Install Winston:

```bash
npm install winston
```

Create a basic logger:

```javascript
// src/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' })
    ]
});

module.exports = logger;
```

Use it in your application:

```javascript
const logger = require('./logger');

logger.info('Application started');
logger.warn('This is a warning');
logger.error('Something went wrong', { errorCode: 500 });

// With metadata
logger.info('User logged in', { userId: 123, email: 'user@example.com' });
```

## Log Levels

Winston uses npm log levels by default (from most to least severe):

| Level | Value | Use Case |
|-------|-------|----------|
| error | 0 | Runtime errors, exceptions |
| warn | 1 | Deprecated features, potential issues |
| info | 2 | General operational events |
| http | 3 | HTTP request logging |
| verbose | 4 | Detailed operational info |
| debug | 5 | Debug information |
| silly | 6 | Extremely verbose |

```javascript
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',  // Only logs at this level and above
    // ...
});

// These will be logged (if level is 'info')
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');

// These will NOT be logged (below 'info' level)
logger.debug('Debug message');
logger.verbose('Verbose message');
```

## Custom Formats

### Pretty Console Output for Development

```javascript
const { format } = winston;

const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
);

const prodFormat = format.combine(
    format.timestamp(),
    format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [new winston.transports.Console()]
});
```

### Adding Request Context

```javascript
const format = winston.format;

const contextFormat = format((info) => {
    // Add application context
    info.app = 'my-api';
    info.env = process.env.NODE_ENV;
    info.pid = process.pid;
    return info;
});

const logger = winston.createLogger({
    format: format.combine(
        contextFormat(),
        format.timestamp(),
        format.json()
    ),
    transports: [new winston.transports.Console()]
});
```

## Multiple Transports

Send logs to different destinations:

```javascript
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Console for development
        new winston.transports.Console({
            level: 'debug',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),

        // All logs to combined file
        new winston.transports.File({
            filename: 'logs/combined.log',
            level: 'info'
        }),

        // Error logs to separate file
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        })
    ]
});
```

## Log Rotation

Prevent log files from growing indefinitely:

```bash
npm install winston-daily-rotate-file
```

```javascript
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
    transports: [
        new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',  // Keep logs for 14 days
            level: 'info'
        }),
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error'
        })
    ]
});
```

## Express.js Integration

Log HTTP requests:

```javascript
// middleware/requestLogger.js
const logger = require('../logger');

function requestLogger(req, res, next) {
    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        logger.http('HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });

    next();
}

module.exports = requestLogger;
```

Use in Express:

```javascript
const express = require('express');
const requestLogger = require('./middleware/requestLogger');

const app = express();
app.use(requestLogger);
```

Or use morgan with Winston:

```bash
npm install morgan
```

```javascript
const morgan = require('morgan');
const logger = require('./logger');

// Create a stream for morgan to write to
const stream = {
    write: (message) => logger.http(message.trim())
};

app.use(morgan('combined', { stream }));
```

## Child Loggers

Create loggers with persistent metadata:

```javascript
// Create child logger for a specific module
const userLogger = logger.child({ module: 'users' });
userLogger.info('User created', { userId: 123 });
// Output: { module: 'users', message: 'User created', userId: 123, ... }

// In request handling
function createRequestLogger(req) {
    return logger.child({
        requestId: req.id,
        userId: req.user?.id,
        path: req.path
    });
}

app.use((req, res, next) => {
    req.log = createRequestLogger(req);
    next();
});

// In route handler
app.get('/users/:id', (req, res) => {
    req.log.info('Fetching user');  // Automatically includes requestId, userId, path
});
```

## Error Logging

Log errors with full stack traces:

```javascript
const logger = require('./logger');

// Error formatting
const errorFormat = winston.format((info) => {
    if (info.error instanceof Error) {
        info.error = {
            message: info.error.message,
            stack: info.error.stack,
            name: info.error.name
        };
    }
    return info;
});

// Usage
try {
    throw new Error('Something broke');
} catch (error) {
    logger.error('Operation failed', {
        error,
        operation: 'userCreation',
        input: { email: 'test@example.com' }
    });
}

// Express error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: {
            message: err.message,
            stack: err.stack
        },
        request: {
            method: req.method,
            url: req.url,
            body: req.body
        }
    });

    res.status(500).json({ error: 'Internal server error' });
});
```

## Production Configuration

```javascript
// src/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const isProduction = process.env.NODE_ENV === 'production';

// Sanitize sensitive data
const sanitize = winston.format((info) => {
    if (info.password) info.password = '[REDACTED]';
    if (info.token) info.token = '[REDACTED]';
    if (info.authorization) info.authorization = '[REDACTED]';
    return info;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: winston.format.combine(
        sanitize(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: process.env.SERVICE_NAME || 'my-app',
        version: process.env.npm_package_version
    },
    transports: []
});

if (isProduction) {
    // Production: JSON logs to files
    logger.add(new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '14d'
    }));
} else {
    // Development: Pretty console output
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const metaStr = Object.keys(meta).length
                    ? '\n' + JSON.stringify(meta, null, 2)
                    : '';
                return `${timestamp} ${level}: ${message}${metaStr}`;
            })
        )
    }));
}

// Handle uncaught exceptions
logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Handle unhandled promise rejections
logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
);

module.exports = logger;
```

## Async Logging and Shutdown

Ensure logs are written before process exits:

```javascript
const logger = require('./logger');

async function gracefulShutdown() {
    logger.info('Shutting down gracefully');

    // Wait for logs to be written
    await new Promise((resolve) => {
        logger.on('finish', resolve);
        logger.end();
    });

    process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Summary

Winston provides flexible, production-ready logging for Node.js. Configure different log levels for different environments, use JSON format in production for parsing by log aggregators, implement log rotation to manage disk space, create child loggers for contextual logging, and always sanitize sensitive data before logging. Structured logs make debugging and monitoring much easier than plain text console output.
