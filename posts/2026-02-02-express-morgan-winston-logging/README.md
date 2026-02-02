# How to Implement Logging with Morgan and Winston in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Logging, Morgan, Winston

Description: Learn how to implement production-ready logging in Express using Morgan for HTTP requests and Winston for application logging with multiple transports.

---

Good logging is the difference between spending five minutes debugging an issue and spending five hours. In Express applications, you typically need two types of logging: HTTP request logs and application logs. Morgan handles the first, Winston handles the second, and together they give you complete visibility into what your application is doing.

Morgan is middleware that logs HTTP requests - the method, URL, status code, response time. Winston is a general-purpose logging library with support for multiple log levels, transports (where logs go), and formatting options. Most production Express apps use both.

## Setting Up Morgan

### Installation

```bash
npm install morgan
```

### Basic Configuration

Morgan comes with several predefined formats. Here's how to use them:

```javascript
const express = require('express');
const morgan = require('morgan');

const app = express();

// Use the 'combined' format - similar to Apache logs
app.use(morgan('combined'));

// Or use 'dev' format for colored output during development
app.use(morgan('dev'));

app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(3000);
```

### Morgan Log Formats

| Format | Output | Use Case |
|--------|--------|----------|
| `combined` | `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"` | Production - standard Apache format |
| `common` | `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]` | Production - simpler version |
| `dev` | `:method :url :status :response-time ms - :res[content-length]` | Development - colored, concise |
| `short` | `:remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms` | Development |
| `tiny` | `:method :url :status :res[content-length] - :response-time ms` | Minimal logging |

### Custom Tokens

You can define custom tokens to include additional information:

```javascript
const morgan = require('morgan');

// Add a request ID token
morgan.token('request-id', (req) => req.headers['x-request-id'] || '-');

// Add user ID from authentication
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

// Create a custom format using your tokens
const customFormat = ':request-id :user-id :method :url :status :response-time ms';

app.use(morgan(customFormat));
```

## Setting Up Winston

### Installation

```bash
npm install winston
```

### Basic Configuration

```javascript
const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  // Set the minimum log level
  level: process.env.LOG_LEVEL || 'info',

  // Use JSON format for structured logging
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  // Default metadata added to every log
  defaultMeta: { service: 'express-api' },

  // Where to send logs
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
```

### Winston Log Levels

Winston uses npm-style log levels by default:

| Level | Priority | Usage |
|-------|----------|-------|
| `error` | 0 | Application errors that need attention |
| `warn` | 1 | Warning conditions |
| `info` | 2 | General information about application state |
| `http` | 3 | HTTP request logging |
| `verbose` | 4 | Detailed information |
| `debug` | 5 | Debug information for development |
| `silly` | 6 | Everything else |

```javascript
// Only logs at or below the configured level are output
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit approaching', { current: 95, limit: 100 });
logger.info('User logged in', { userId: user.id });
logger.debug('Processing request', { body: req.body });
```

### Multiple Transports

Transports define where your logs go. You can have multiple transports with different configurations:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File transport for errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

module.exports = logger;
```

| Transport | Description |
|-----------|-------------|
| `Console` | Outputs to stdout/stderr |
| `File` | Writes to a file |
| `Http` | Sends logs via HTTP |
| `Stream` | Writes to any Node.js stream |

## Log Rotation

In production, you need to rotate log files to prevent them from growing indefinitely. Use `winston-daily-rotate-file`:

```bash
npm install winston-daily-rotate-file
```

```javascript
const winston = require('winston');
require('winston-daily-rotate-file');

// Configure rotating file transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',        // Keep logs for 14 days
  maxSize: '20m',         // Rotate when file reaches 20MB
  zippedArchive: true,    // Compress old log files
});

// Listen to rotation events
fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  console.log(`Log rotated from ${oldFilename} to ${newFilename}`);
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    fileRotateTransport,
  ],
});

module.exports = logger;
```

## Combining Morgan with Winston

The real power comes from piping Morgan's HTTP logs through Winston. This gives you a single logging system with consistent formatting and routing:

```javascript
const express = require('express');
const morgan = require('morgan');
const winston = require('winston');

// Create Winston logger
const logger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/http.log' }),
  ],
});

// Create a stream object for Morgan to write to
const morganStream = {
  write: (message) => {
    // Remove trailing newline from Morgan
    logger.http(message.trim());
  },
};

const app = express();

// Use Morgan with Winston as the output stream
app.use(morgan('combined', { stream: morganStream }));

// Now use logger for application logs
app.get('/api/users', (req, res) => {
  logger.info('Fetching users list');
  res.json([{ id: 1, name: 'Alice' }]);
});
```

### Structured HTTP Logs

For better queryability, parse Morgan output into structured JSON:

```javascript
const morgan = require('morgan');

// Create custom Morgan format that outputs JSON-friendly data
morgan.token('body', (req) => JSON.stringify(req.body));

const morganStream = {
  write: (message) => {
    // Parse the message and log as structured data
    const parts = message.trim().split(' ');
    logger.http('HTTP Request', {
      method: parts[0],
      url: parts[1],
      status: parseInt(parts[2]),
      responseTime: parseFloat(parts[3]),
      contentLength: parts[4],
    });
  },
};

// Custom format: method url status responseTime contentLength
app.use(morgan(':method :url :status :response-time :res[content-length]', {
  stream: morganStream,
}));
```

## Complete Production Setup

Here's a complete logging setup you can use in production:

```javascript
// logger.js
const winston = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Create transports array
const transports = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), json())
      : combine(colorize(), simple()),
  }),
];

// Add file transports in production
if (isProduction) {
  transports.push(
    // Rotating file for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '50m',
      zippedArchive: true,
    }),
    // Separate file for errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '50m',
      zippedArchive: true,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'express-api',
    version: process.env.npm_package_version,
  },
  transports,
});

module.exports = logger;
```

```javascript
// app.js
const express = require('express');
const morgan = require('morgan');
const logger = require('./logger');

const app = express();
app.use(express.json());

// Create Morgan stream
const morganStream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging for health checks to reduce noise
const skipHealthChecks = (req) => req.url === '/health';

app.use(morgan('combined', {
  stream: morganStream,
  skip: skipHealthChecks,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Example route with logging
app.post('/api/orders', async (req, res) => {
  logger.info('Creating order', { customerId: req.body.customerId });

  try {
    const order = await createOrder(req.body);
    logger.info('Order created', { orderId: order.id });
    res.status(201).json(order);
  } catch (error) {
    logger.error('Failed to create order', {
      error: error.message,
      stack: error.stack,
      customerId: req.body.customerId,
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  logger.info('Server started', { port: 3000 });
});
```

## Summary

A solid logging setup in Express combines Morgan for HTTP request logs and Winston for application logs. The key points:

- Use Morgan's `combined` format in production for standard HTTP logs
- Configure Winston with multiple transports - console for development, files for production
- Always include timestamps and use JSON format for easier parsing
- Implement log rotation to manage disk space
- Pipe Morgan through Winston for unified logging
- Skip logging health check endpoints to reduce noise
- Include relevant context (user IDs, request IDs) in your logs

With this setup, you will have the visibility needed to debug issues, monitor application health, and understand how your application behaves in production.
