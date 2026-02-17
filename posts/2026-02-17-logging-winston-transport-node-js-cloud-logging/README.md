# How to Use the google-cloud/logging-winston Transport to Send Node.js Logs to Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Winston, Node.js, Observability, Google Cloud

Description: Learn how to configure the google-cloud/logging-winston transport to send structured Node.js logs to Google Cloud Logging with severity levels and metadata.

---

Winston is the most popular logging library for Node.js, and if you are running your application on GCP, you want those logs to show up in Cloud Logging with proper severity levels, structured data, and correlation with other GCP services. The `@google-cloud/logging-winston` transport bridges Winston and Cloud Logging seamlessly.

In this guide, I will show you how to set up the transport, configure severity levels, add structured metadata, and handle common scenarios like request logging and error tracking.

## Installing the Dependencies

```bash
# Install Winston and the Cloud Logging transport
npm install winston @google-cloud/logging-winston
```

## Basic Setup

The simplest configuration creates a Winston logger with the Cloud Logging transport.

```javascript
// logger.js - Basic Winston setup with Cloud Logging transport
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

// Create the Cloud Logging transport
const cloudLogging = new LoggingWinston({
  projectId: 'your-project-id',
  // Log name appears in Cloud Logging under this identifier
  logName: 'my-application',
  // The resource type - auto-detected on Cloud Run, GKE, etc.
  // Set manually for local development
  resource: {
    type: 'global',
  },
});

// Create the Winston logger with both console and Cloud Logging transports
const logger = winston.createLogger({
  level: 'info',
  transports: [
    // Console transport for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Cloud Logging transport for production
    cloudLogging,
  ],
});

module.exports = logger;
```

When running on Cloud Run, GKE, or other GCP services, the transport automatically detects the environment and sets the correct resource labels. You do not need to specify the `projectId` or `resource` in those environments.

## Severity Level Mapping

Winston log levels map to Cloud Logging severity levels. The transport handles this automatically.

```javascript
// Winston levels map to Cloud Logging severities
const logger = require('./logger');

// Winston level    -> Cloud Logging severity
logger.error('Database connection failed');  // ERROR
logger.warn('Rate limit approaching');       // WARNING
logger.info('Server started on port 8080');  // INFO
logger.debug('Query executed in 45ms');      // DEBUG
logger.verbose('Entering function X');       // DEBUG
```

You can customize the level mapping if your application uses different levels.

```javascript
// Custom level mapping
const cloudLogging = new LoggingWinston({
  levels: winston.config.npm.levels,
  // Map Winston levels to Cloud Logging severities
  levelToSeverity: {
    error: 'ERROR',
    warn: 'WARNING',
    info: 'INFO',
    http: 'NOTICE',
    verbose: 'DEBUG',
    debug: 'DEBUG',
    silly: 'DEFAULT',
  },
});
```

## Structured Logging with Metadata

Cloud Logging supports structured log entries, which let you add searchable fields to your logs. Pass metadata as the second argument to any Winston log method.

```javascript
// Add structured metadata to log entries
logger.info('Order processed successfully', {
  orderId: 'ORD-12345',
  customerId: 'CUST-789',
  amount: 99.99,
  processingTime: 234,
  // These fields become searchable in Cloud Logging
});

// Log an error with stack trace and context
logger.error('Payment processing failed', {
  orderId: 'ORD-12345',
  errorCode: 'CARD_DECLINED',
  // Include the error object for stack trace
  error: new Error('Card was declined'),
  metadata: {
    gateway: 'stripe',
    retryCount: 3,
  },
});
```

In the Cloud Logging console, you can filter on these structured fields using advanced queries like `jsonPayload.orderId="ORD-12345"`.

## Request Logging with Express

A common pattern is to log every HTTP request that hits your Express application. The `@google-cloud/logging-winston` package includes an Express middleware for this.

```javascript
// app.js - Express application with request logging
const express = require('express');
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');
const expressWinston = require('express-winston');

const app = express();

const cloudLogging = new LoggingWinston({ logName: 'my-app' });

// Log all requests with Cloud Logging
app.use(expressWinston.logger({
  transports: [cloudLogging],
  // Include request metadata in the log entry
  meta: true,
  // Custom message format
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  // Do not log the request body (might contain sensitive data)
  requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
  // Include response time
  expressFormat: false,
}));

// Your routes go here
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error logging middleware (after routes)
app.use(expressWinston.errorLogger({
  transports: [cloudLogging],
}));
```

Note: You will also need to install `express-winston` for this middleware.

```bash
npm install express-winston
```

## Correlating Logs with Cloud Trace

If you are using Cloud Trace for distributed tracing, you can correlate logs with traces.

```javascript
// Correlate logs with Cloud Trace
const cloudLogging = new LoggingWinston({
  logName: 'my-app',
  // Automatically extract trace context from request headers
  // Works with Cloud Run and other GCP services
  serviceContext: {
    service: 'my-service',
    version: process.env.K_REVISION || '1.0.0',
  },
});

// When logging within a request handler, include the trace header
app.get('/api/orders/:id', (req, res) => {
  // Extract trace context from the incoming request
  const traceHeader = req.headers['x-cloud-trace-context'];

  logger.info('Fetching order', {
    orderId: req.params.id,
    // This links the log entry to the trace in Cloud Trace
    'logging.googleapis.com/trace': traceHeader
      ? `projects/your-project-id/traces/${traceHeader.split('/')[0]}`
      : undefined,
  });

  res.json({ orderId: req.params.id });
});
```

## Child Loggers for Request Context

Create child loggers to automatically include context in every log entry within a request.

```javascript
// Middleware to create a request-scoped child logger
app.use((req, res, next) => {
  // Generate a request ID
  const requestId = req.headers['x-request-id'] ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create a child logger with request context baked in
  req.logger = logger.child({
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
  });

  req.logger.info('Request started');

  // Log when the response finishes
  res.on('finish', () => {
    req.logger.info('Request completed', {
      statusCode: res.statusCode,
    });
  });

  next();
});

// Use the request-scoped logger in your handlers
app.get('/api/users/:id', async (req, res) => {
  req.logger.info('Looking up user', { userId: req.params.id });

  try {
    const user = await findUser(req.params.id);
    req.logger.info('User found', { userId: user.id, email: user.email });
    res.json(user);
  } catch (error) {
    req.logger.error('User lookup failed', { userId: req.params.id, error });
    res.status(500).json({ error: 'Failed to find user' });
  }
});
```

## Environment-Based Configuration

Use different transports based on the environment.

```javascript
// Configure logging based on the environment
const isProduction = process.env.NODE_ENV === 'production';
const isGCP = process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT;

const transports = [];

if (isGCP) {
  // On GCP - use Cloud Logging transport
  transports.push(new LoggingWinston({
    logName: process.env.K_SERVICE || 'my-app',
  }));
} else {
  // Local development - use console with pretty formatting
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
      })
    ),
  }));
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports,
});
```

## Flushing Logs Before Shutdown

The Cloud Logging transport batches log entries for efficiency. Make sure to flush pending logs before your process exits.

```javascript
// Flush logs on shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down, flushing logs...');

  // Wait for all pending log entries to be sent
  await new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });

  process.exit(0);
});
```

## Querying Your Logs

Once logs are flowing to Cloud Logging, you can query them using the `gcloud` CLI or the console.

```bash
# View recent logs for your application
gcloud logging read 'resource.type="cloud_run_revision" AND logName="projects/your-project/logs/my-app"' \
  --limit 20 \
  --format json

# Filter by severity
gcloud logging read 'severity>=ERROR AND logName="projects/your-project/logs/my-app"' \
  --limit 10

# Search for a specific order
gcloud logging read 'jsonPayload.orderId="ORD-12345"' \
  --limit 10
```

The `@google-cloud/logging-winston` transport is the easiest way to get proper structured logging from a Node.js application into Cloud Logging. It handles severity mapping, structured metadata, batching, and environment detection automatically. Combined with child loggers for request context and trace correlation, you get a production-grade logging setup with minimal configuration.
