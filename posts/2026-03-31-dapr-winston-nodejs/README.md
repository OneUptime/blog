# How to Use Dapr with Winston in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Winston, Node.js, Logging, Observability

Description: Set up Winston structured logging in Dapr Node.js microservices to capture distributed trace context, pub/sub events, and service invocation logs.

---

## Winston and Dapr in Node.js

Winston is the most popular logging library for Node.js. When paired with the Dapr JavaScript SDK, it provides structured logging with transport flexibility - console, file, HTTP, and cloud logging services. The key is propagating Dapr's W3C trace headers into every log entry.

```bash
# Install dependencies
npm install @dapr/dapr winston express
```

## Create a Shared Logger Module

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.DAPR_APP_ID || 'unknown-service',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

module.exports = logger;
```

## Dapr Express App with Winston

```javascript
// app.js
const express = require('express');
const { DaprClient } = require('@dapr/dapr');
const logger = require('./logger');

const app = express();
const daprClient = new DaprClient();
app.use(express.json());

// Middleware to extract Dapr trace context
app.use((req, res, next) => {
  req.daprContext = {
    traceParent: req.headers['traceparent'] || '',
    callerAppId: req.headers['dapr-app-id'] || '',
    requestId: req.headers['x-request-id'] || ''
  };
  next();
});

// Service invocation endpoint
app.post('/api/orders', async (req, res) => {
  const { traceParent, callerAppId } = req.daprContext;
  const { orderId, customerId, items } = req.body;

  const log = logger.child({
    orderId,
    customerId,
    traceParent,
    callerAppId
  });

  log.info('Processing order request');

  try {
    // Save order to Dapr state store
    await daprClient.state.save('statestore', [
      { key: `order-${orderId}`, value: { orderId, customerId, items, status: 'pending' } }
    ]);

    log.info('Order saved to state store');

    // Publish order event
    await daprClient.pubsub.publish('pubsub', 'order-created', {
      orderId,
      customerId,
      timestamp: new Date().toISOString()
    });

    log.info('Order event published to pub/sub');
    res.status(201).json({ orderId, status: 'created' });
  } catch (err) {
    log.error('Failed to process order', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Order processing failed' });
  }
});
```

## Dapr Server for Pub/Sub Subscriptions

```javascript
// subscriber.js
const { DaprServer } = require('@dapr/dapr');
const logger = require('./logger');

const server = new DaprServer({ serverPort: '3001' });

server.pubsub.subscribe('pubsub', 'order-created', async (data, headers) => {
  const log = logger.child({
    eventId: headers['ce-id'] || 'unknown',
    eventType: headers['ce-type'] || 'unknown',
    orderId: data.orderId,
    traceParent: headers['traceparent'] || ''
  });

  log.info('Received order-created event');

  try {
    // Process the order
    await processOrder(data);
    log.info('Order event processed successfully');
  } catch (err) {
    log.error('Failed to process order event', {
      error: err.message,
      orderId: data.orderId
    });
    throw err; // Causes Dapr to retry
  }
});

server.start();
```

## Winston Format for Production

```javascript
// production-logger.js
const winston = require('winston');
const { combine, timestamp, json, errors } = winston.format;

const productionLogger = winston.createLogger({
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = productionLogger;
```

## Summary

Winston integrates naturally with Dapr Node.js services through child loggers that carry request-scoped context including trace identifiers and Dapr app IDs. The middleware pattern for extracting Dapr headers ensures consistent context propagation across service invocations and pub/sub subscribers. Using JSON format in production enables log aggregation in Elasticsearch, Loki, or any centralized logging platform.
