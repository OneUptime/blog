# How to Implement Custom Logging Framework in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Logging, Observability, Winston

Description: Build a production-ready logging framework in Node.js with structured output, log levels, transports, and correlation ID support using Winston and Pino.

---

Logging is one of those things that seems simple until your application hits production and you need to debug an issue at 3 AM. A well-designed logging framework can mean the difference between finding a bug in minutes versus hours. This guide walks through building a custom logging solution in Node.js that handles real-world scenarios.

## Why Build a Custom Logging Framework?

Console.log works fine for development, but production systems need:

- Structured JSON output for log aggregators
- Multiple log levels with filtering
- Request correlation across async operations
- Sensitive data redaction
- Log rotation to prevent disk exhaustion
- Performance that does not block the event loop

## Choosing Your Base: Winston vs Pino

Before writing code, let's compare the two major logging libraries in the Node.js ecosystem.

| Feature | Winston | Pino |
|---------|---------|------|
| Performance | Good | Excellent (5x faster) |
| Ecosystem | Large, mature | Growing |
| Custom formats | Highly flexible | JSON-focused |
| Transports | 30+ official | Fewer, uses separate process |
| Learning curve | Moderate | Lower |
| Best for | Complex formatting needs | High-throughput services |

For most applications, Winston provides the flexibility you need. For high-performance APIs handling thousands of requests per second, Pino is the better choice.

## Part 1: Winston Configuration

### Basic Setup

First, install the required packages.

```bash
npm install winston winston-daily-rotate-file
```

Here is a basic Winston configuration that sets up console output with colorized levels.

```javascript
// src/logger/winston-basic.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'my-service',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
```

### Custom Formats

Winston formats are composable functions that transform log entries. Here is how to create a custom format that adds contextual information.

```javascript
// src/logger/formats.js
const winston = require('winston');
const { format } = winston;

// Custom format that adds hostname and process ID
const serviceInfo = format((info) => {
  info.hostname = require('os').hostname();
  info.pid = process.pid;
  return info;
});

// Custom format for development with readable output
const devFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

  // Include stack trace for errors
  if (stack) {
    log += `\n${stack}`;
  }

  // Include metadata if present
  const metaKeys = Object.keys(meta).filter(
    key => !['service', 'version', 'hostname', 'pid'].includes(key)
  );

  if (metaKeys.length > 0) {
    const metaObj = {};
    metaKeys.forEach(key => { metaObj[key] = meta[key]; });
    log += ` ${JSON.stringify(metaObj)}`;
  }

  return log;
});

// Production format with structured JSON
const prodFormat = format.combine(
  serviceInfo(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.json()
);

// Development format with colors and readability
const developmentFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  devFormat
);

module.exports = {
  serviceInfo,
  devFormat,
  prodFormat,
  developmentFormat
};
```

### Environment-Based Configuration

This configuration switches between development and production formats based on the NODE_ENV variable.

```javascript
// src/logger/config.js
const winston = require('winston');
const { prodFormat, developmentFormat } = require('./formats');

const config = {
  development: {
    level: 'debug',
    format: developmentFormat,
    transports: [
      new winston.transports.Console()
    ]
  },
  production: {
    level: 'info',
    format: prodFormat,
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true
      })
    ]
  },
  test: {
    level: 'error',
    silent: process.env.SUPPRESS_LOGS === 'true',
    format: prodFormat,
    transports: [
      new winston.transports.Console()
    ]
  }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env] || config.development;
```

## Part 2: Multiple Transports

Real applications need to send logs to multiple destinations. Here is how to set up file-based logging alongside console output.

### File Transport with Rotation

Log rotation prevents your disk from filling up. The winston-daily-rotate-file package handles this automatically.

```javascript
// src/logger/transports.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Rotate files daily, keep 14 days of history
const fileRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: '%DATE%-app.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Separate file for errors only
const errorFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: '%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Handle rotation events
fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  console.log(`Log rotated from ${oldFilename} to ${newFilename}`);
});

fileRotateTransport.on('error', (error) => {
  console.error('Error in file transport:', error);
});

module.exports = {
  fileRotateTransport,
  errorFileTransport
};
```

### HTTP Transport for Log Aggregation

Send logs to external services like Elasticsearch, Loggly, or your own log aggregator.

```javascript
// src/logger/http-transport.js
const winston = require('winston');
const Transport = require('winston-transport');

class HttpTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.endpoint = opts.endpoint;
    this.headers = opts.headers || {};
    this.batchSize = opts.batchSize || 100;
    this.flushInterval = opts.flushInterval || 5000;
    this.buffer = [];

    // Flush buffer periodically
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    this.buffer.push(info);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }

    callback();
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        // Re-add logs to buffer on failure
        this.buffer = [...logs, ...this.buffer];
        console.error(`Failed to send logs: ${response.status}`);
      }
    } catch (error) {
      this.buffer = [...logs, ...this.buffer];
      console.error('Error sending logs:', error.message);
    }
  }

  close() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}

module.exports = HttpTransport;
```

### Complete Transport Configuration

Combine all transports into a single logger configuration.

```javascript
// src/logger/index.js
const winston = require('winston');
const { prodFormat, developmentFormat } = require('./formats');
const { fileRotateTransport, errorFileTransport } = require('./transports');
const HttpTransport = require('./http-transport');

const isProduction = process.env.NODE_ENV === 'production';

const transports = [
  new winston.transports.Console({
    format: isProduction ? prodFormat : developmentFormat
  })
];

// Add file transports in production
if (isProduction) {
  transports.push(fileRotateTransport);
  transports.push(errorFileTransport);
}

// Add HTTP transport if endpoint is configured
if (process.env.LOG_AGGREGATOR_URL) {
  transports.push(new HttpTransport({
    endpoint: process.env.LOG_AGGREGATOR_URL,
    headers: {
      'Authorization': `Bearer ${process.env.LOG_AGGREGATOR_TOKEN}`
    },
    batchSize: 50,
    flushInterval: 3000
  }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

module.exports = logger;
```

## Part 3: Request Context and Correlation IDs

Tracking requests across async operations is essential for debugging. Node.js AsyncLocalStorage makes this possible without passing context through every function call.

### Setting Up AsyncLocalStorage

```javascript
// src/logger/context.js
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

// Get current context
function getContext() {
  return asyncLocalStorage.getStore() || {};
}

// Run function with context
function runWithContext(context, fn) {
  return asyncLocalStorage.run(context, fn);
}

// Add to current context
function addToContext(key, value) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store[key] = value;
  }
}

module.exports = {
  asyncLocalStorage,
  getContext,
  runWithContext,
  addToContext
};
```

### Context-Aware Logger

Wrap the base logger to automatically include context from AsyncLocalStorage.

```javascript
// src/logger/context-logger.js
const baseLogger = require('./index');
const { getContext } = require('./context');

// Create a proxy that injects context into every log call
const contextLogger = new Proxy(baseLogger, {
  get(target, prop) {
    const value = target[prop];

    // Intercept logging methods
    if (['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(prop)) {
      return function(message, meta = {}) {
        const context = getContext();
        return value.call(target, message, {
          ...context,
          ...meta
        });
      };
    }

    return value;
  }
});

module.exports = contextLogger;
```

### Express Middleware for Request Tracking

This middleware generates a correlation ID for each request and stores it in AsyncLocalStorage.

```javascript
// src/middleware/request-logger.js
const { v4: uuidv4 } = require('uuid');
const { runWithContext } = require('../logger/context');
const logger = require('../logger/context-logger');

function requestLogger(options = {}) {
  const {
    headerName = 'x-correlation-id',
    logRequests = true,
    logResponses = true
  } = options;

  return (req, res, next) => {
    // Use existing correlation ID or generate new one
    const correlationId = req.headers[headerName] || uuidv4();

    // Set correlation ID on response header
    res.setHeader(headerName, correlationId);

    const context = {
      correlationId,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    // Add user ID if authenticated
    if (req.user && req.user.id) {
      context.userId = req.user.id;
    }

    const startTime = Date.now();

    // Log request
    if (logRequests) {
      logger.info('Request received', {
        query: req.query,
        body: options.logBody ? req.body : undefined
      });
    }

    // Capture response
    const originalEnd = res.end;
    res.end = function(...args) {
      if (logResponses) {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
          statusCode: res.statusCode,
          duration: `${duration}ms`
        });
      }
      originalEnd.apply(res, args);
    };

    // Run the rest of the request in context
    runWithContext(context, () => {
      next();
    });
  };
}

module.exports = requestLogger;
```

## Part 4: Child Loggers

Child loggers inherit configuration from the parent but can add their own metadata. This is useful for adding module-specific context.

```javascript
// src/logger/child.js
const baseLogger = require('./index');
const { getContext } = require('./context');

// Factory function for creating module-specific loggers
function createModuleLogger(moduleName, defaultMeta = {}) {
  const child = baseLogger.child({
    module: moduleName,
    ...defaultMeta
  });

  // Wrap child to include async context
  return {
    error: (message, meta = {}) => child.error(message, { ...getContext(), ...meta }),
    warn: (message, meta = {}) => child.warn(message, { ...getContext(), ...meta }),
    info: (message, meta = {}) => child.info(message, { ...getContext(), ...meta }),
    debug: (message, meta = {}) => child.debug(message, { ...getContext(), ...meta }),

    // Create a sub-child with additional context
    child: (additionalMeta) => createModuleLogger(moduleName, {
      ...defaultMeta,
      ...additionalMeta
    })
  };
}

module.exports = { createModuleLogger };
```

### Using Child Loggers in Your Application

```javascript
// src/services/user-service.js
const { createModuleLogger } = require('../logger/child');

const logger = createModuleLogger('user-service');

async function createUser(userData) {
  logger.info('Creating new user', { email: userData.email });

  try {
    const user = await db.users.create(userData);
    logger.info('User created successfully', { userId: user.id });
    return user;
  } catch (error) {
    logger.error('Failed to create user', {
      error: error.message,
      email: userData.email
    });
    throw error;
  }
}

// Create a child logger for a specific operation
async function processUserBatch(users) {
  const batchLogger = logger.child({
    operation: 'batch-import',
    totalUsers: users.length
  });

  batchLogger.info('Starting batch user import');

  for (const [index, user] of users.entries()) {
    batchLogger.debug('Processing user', { index, email: user.email });
    await createUser(user);
  }

  batchLogger.info('Batch import completed');
}
```

## Part 5: Redacting Sensitive Data

Production logs must never contain passwords, tokens, or personal information. Here is how to implement automatic redaction.

### Redaction Format

```javascript
// src/logger/redact.js
const { format } = require('winston');

// Fields to redact (case-insensitive)
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'creditCard',
  'ssn',
  'socialSecurityNumber'
];

// Patterns to redact
const SENSITIVE_PATTERNS = [
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, replacement: 'Bearer [REDACTED]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD_REDACTED]' }
];

function redactValue(value) {
  if (typeof value === 'string') {
    let redacted = value;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }
  return value;
}

function redactObject(obj, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return obj;

  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field name is sensitive
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = redactObject(value, depth + 1);
      } else {
        redacted[key] = redactValue(value);
      }
    }
    return redacted;
  }

  return redactValue(obj);
}

const redactFormat = format((info) => {
  return redactObject(info);
});

module.exports = {
  redactFormat,
  redactObject,
  SENSITIVE_FIELDS
};
```

### Applying Redaction to Logger

```javascript
// src/logger/secure-logger.js
const winston = require('winston');
const { redactFormat } = require('./redact');
const { prodFormat } = require('./formats');

const secureLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    redactFormat(),
    prodFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Example usage showing redaction in action
secureLogger.info('User login', {
  email: 'user@example.com',
  password: 'secret123',
  headers: {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
  }
});

// Output:
// {
//   "level": "info",
//   "message": "User login",
//   "email": "[EMAIL_REDACTED]",
//   "password": "[REDACTED]",
//   "headers": {
//     "authorization": "Bearer [REDACTED]"
//   }
// }

module.exports = secureLogger;
```

## Part 6: Pino for High Performance

When you need maximum throughput, Pino is significantly faster than Winston because it uses a separate process for formatting.

### Basic Pino Setup

```bash
npm install pino pino-pretty pino-http
```

```javascript
// src/logger/pino-logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Base context added to every log
  base: {
    service: process.env.SERVICE_NAME || 'api',
    version: process.env.npm_package_version,
    pid: process.pid,
    hostname: require('os').hostname()
  },

  // Custom serializers for common objects
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,

    // Custom user serializer that redacts sensitive fields
    user: (user) => ({
      id: user.id,
      role: user.role
      // Explicitly omit email, password, etc.
    })
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.apiKey'
    ],
    censor: '[REDACTED]'
  },

  // Use pino-pretty in development
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

module.exports = logger;
```

### Pino HTTP Middleware

```javascript
// src/middleware/pino-http.js
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger/pino-logger');

const httpLogger = pinoHttp({
  logger,

  // Generate request ID
  genReqId: (req) => req.headers['x-correlation-id'] || uuidv4(),

  // Customize what gets logged for requests
  customProps: (req, res) => ({
    correlationId: req.id,
    userAgent: req.headers['user-agent']
  }),

  // Customize log level based on response status
  customLogLevel: (req, res, error) => {
    if (res.statusCode >= 500 || error) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Customize success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },

  // Customize error message
  customErrorMessage: (req, res, error) => {
    return `${req.method} ${req.url} failed: ${error.message}`;
  },

  // Do not log health check endpoints
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/ready'
  }
});

module.exports = httpLogger;
```

### Pino Child Loggers

Pino child loggers are extremely efficient because they share the same output stream.

```javascript
// src/services/order-service.js
const baseLogger = require('../logger/pino-logger');

const logger = baseLogger.child({ module: 'order-service' });

async function processOrder(order) {
  // Create a child logger for this specific order
  const orderLogger = logger.child({
    orderId: order.id,
    customerId: order.customerId
  });

  orderLogger.info('Processing order');

  try {
    await validateOrder(order);
    orderLogger.debug('Order validated');

    await chargePayment(order);
    orderLogger.info('Payment processed');

    await fulfillOrder(order);
    orderLogger.info('Order fulfilled');

  } catch (error) {
    orderLogger.error({ err: error }, 'Order processing failed');
    throw error;
  }
}
```

## Part 7: Putting It All Together

Here is a complete logging framework that combines everything discussed above.

### Project Structure

```
src/
  logger/
    index.js          # Main logger export
    config.js         # Environment configuration
    formats.js        # Custom Winston formats
    transports.js     # File and HTTP transports
    context.js        # AsyncLocalStorage utilities
    redact.js         # Sensitive data redaction
    child.js          # Child logger factory
  middleware/
    request-logger.js # Express middleware
```

### Main Logger Export

```javascript
// src/logger/index.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');

// Async context storage
const asyncLocalStorage = new AsyncLocalStorage();

// Sensitive field redaction
const REDACT_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization'];

const redactFormat = winston.format((info) => {
  const redact = (obj, depth = 0) => {
    if (depth > 5 || !obj || typeof obj !== 'object') return obj;

    const result = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (REDACT_FIELDS.some(f => key.toLowerCase().includes(f))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = redact(value, depth + 1);
      } else {
        result[key] = value;
      }
    }
    return result;
  };
  return redact(info);
});

// Format configuration
const isProduction = process.env.NODE_ENV === 'production';

const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat(),
  winston.format.json()
);

// Transport configuration
const transports = [
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat
  })
];

if (isProduction) {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

  transports.push(new DailyRotateFile({
    dirname: logDir,
    filename: '%DATE%-app.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  }));

  transports.push(new DailyRotateFile({
    dirname: logDir,
    filename: '%DATE%-error.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error'
  }));
}

// Create base logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: prodFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// Context-aware logger proxy
const logger = new Proxy(baseLogger, {
  get(target, prop) {
    const value = target[prop];

    if (['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(prop)) {
      return function(message, meta = {}) {
        const context = asyncLocalStorage.getStore() || {};
        return value.call(target, message, { ...context, ...meta });
      };
    }

    if (prop === 'child') {
      return function(defaultMeta) {
        const childLogger = target.child(defaultMeta);
        return new Proxy(childLogger, this);
      }.bind(this);
    }

    return value;
  }
});

// Export utilities
module.exports = logger;
module.exports.asyncLocalStorage = asyncLocalStorage;
module.exports.runWithContext = (context, fn) => asyncLocalStorage.run(context, fn);
module.exports.getContext = () => asyncLocalStorage.getStore() || {};
module.exports.createModuleLogger = (moduleName) => logger.child({ module: moduleName });
```

### Express Integration Example

```javascript
// src/app.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { runWithContext, createModuleLogger } = require('./logger');

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const startTime = Date.now();

  res.setHeader('x-correlation-id', correlationId);

  const context = {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip
  };

  runWithContext(context, () => {
    logger.info('Request started');

    res.on('finish', () => {
      logger.info('Request completed', {
        statusCode: res.statusCode,
        duration: `${Date.now() - startTime}ms`
      });
    });

    next();
  });
});

// Example route using module logger
const userLogger = createModuleLogger('users');

app.post('/users', async (req, res) => {
  try {
    userLogger.info('Creating user', { email: req.body.email });

    // Simulate user creation
    const user = { id: uuidv4(), ...req.body };

    userLogger.info('User created', { userId: user.id });
    res.status(201).json(user);

  } catch (error) {
    userLogger.error('Failed to create user', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack
  });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
});
```

## Best Practices Summary

1. **Use structured logging** - JSON output with consistent fields makes parsing easier
2. **Include correlation IDs** - Essential for tracing requests across services
3. **Redact sensitive data** - Never log passwords, tokens, or PII
4. **Set appropriate log levels** - Debug in development, info in production
5. **Rotate log files** - Prevent disk exhaustion in production
6. **Use child loggers** - Add module context without repetition
7. **Log at boundaries** - Entry and exit points of services and functions
8. **Include timing information** - Duration helps identify slow operations
9. **Handle errors properly** - Include stack traces and error context
10. **Test your logging** - Verify redaction and format in staging before production

## Conclusion

A well-implemented logging framework provides visibility into your application's behavior without sacrificing performance or security. Start with Winston for flexibility or Pino for performance, add context propagation with AsyncLocalStorage, implement proper redaction, and configure multiple transports for different environments. The code examples in this guide give you a solid foundation to build upon for your specific needs.
