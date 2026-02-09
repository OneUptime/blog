# How to configure OpenTelemetry auto-instrumentation with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Observability, Tracing, Auto-instrumentation

Description: Learn how to configure OpenTelemetry auto-instrumentation with Node.js applications using the SDK auto-instrumentation packages for Express, Fastify, and other popular frameworks.

---

Node.js applications benefit from OpenTelemetry auto-instrumentation that automatically traces HTTP requests, database queries, and external service calls. The Node.js SDK provides instrumentation packages that work with popular frameworks without requiring code changes.

## Understanding Node.js Auto-instrumentation

OpenTelemetry for Node.js uses module interception to inject instrumentation automatically. The SDK intercepts `require()` and `import` calls, wrapping instrumented modules with telemetry collection code.

Auto-instrumentation works by registering instrumentation libraries before your application code loads. These libraries hook into framework and library internals, creating spans automatically for operations like HTTP requests and database queries.

## Installing Required Packages

Start by installing the OpenTelemetry SDK and auto-instrumentation packages. The Node.js ecosystem provides separate packages for each instrumented library.

```bash
# Install core SDK packages
npm install @opentelemetry/sdk-node \
            @opentelemetry/api \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-grpc

# Verify installation
npm list | grep opentelemetry
```

The `@opentelemetry/auto-instrumentations-node` package bundles instrumentations for popular libraries including Express, HTTP, MySQL, PostgreSQL, Redis, and many others.

## Setting Up Instrumentation

Create a separate instrumentation file that initializes OpenTelemetry before your application starts. This file configures the SDK and registers instrumentations.

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure OTLP exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});

// Initialize SDK with auto-instrumentations
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nodejs-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable all auto-instrumentations by default
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable filesystem instrumentation to reduce noise
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

This instrumentation file must load before any application code to ensure proper module interception.

## Express Application Example

Express applications work seamlessly with auto-instrumentation. The SDK automatically creates spans for incoming requests, middleware execution, and outbound calls.

```javascript
// app.js - Express application
const express = require('express');
const axios = require('axios');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp',
  waitForConnections: true,
  connectionLimit: 10,
});

// GET endpoint - automatically instrumented
app.get('/api/users/:id', async (req, res) => {
  try {
    // Database query is automatically traced
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint with external API call
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Insert order into database - automatically traced
    const [result] = await pool.execute(
      'INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)',
      [userId, productId, quantity]
    );

    // External API call - automatically instrumented with context propagation
    const paymentResponse = await axios.post('https://api.payment.com/charge', {
      orderId: result.insertId,
      amount: quantity * 29.99,
    });

    res.status(201).json({
      orderId: result.insertId,
      paymentStatus: paymentResponse.data.status,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Run the Express application with instrumentation by requiring the instrumentation file first.

```bash
# Run with instrumentation
node --require ./instrumentation.js app.js

# Or use environment variable
NODE_OPTIONS='--require ./instrumentation.js' node app.js
```

The `--require` flag ensures the instrumentation loads before Express, enabling automatic tracing.

## Fastify Integration

Fastify applications also work with OpenTelemetry auto-instrumentation. The SDK handles Fastify's plugin architecture and async route handlers.

```javascript
// server.js - Fastify application
const fastify = require('fastify')({ logger: true });
const axios = require('axios');

// Register routes
fastify.get('/products/:id', async (request, reply) => {
  const { id } = request.params;

  // External API call is automatically traced
  const response = await axios.get(`https://api.catalog.com/products/${id}`);

  return response.data;
});

fastify.post('/checkout', async (request, reply) => {
  const { cartId, paymentMethod } = request.body;

  // Multiple external calls maintain trace context
  const cartResponse = await axios.get(`https://api.cart.com/carts/${cartId}`);

  const paymentResponse = await axios.post('https://api.payment.com/process', {
    items: cartResponse.data.items,
    paymentMethod: paymentMethod,
  });

  return {
    orderId: paymentResponse.data.orderId,
    status: 'confirmed',
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

Run the Fastify application with the same instrumentation approach.

```bash
# Run Fastify with instrumentation
NODE_OPTIONS='--require ./instrumentation.js' node server.js
```

The auto-instrumentation handles Fastify's async nature correctly, ensuring spans nest properly.

## Database Instrumentation

Popular Node.js database libraries get instrumented automatically. This includes MySQL, PostgreSQL, MongoDB, and Redis clients.

```javascript
// database-service.js
const { MongoClient } = require('mongodb');
const redis = require('redis');

// MongoDB operations are automatically traced
async function getUserFromMongo(userId) {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('myapp');
    const users = db.collection('users');

    // This query is automatically instrumented
    const user = await users.findOne({ _id: userId });
    return user;
  } finally {
    await client.close();
  }
}

// Redis operations are automatically traced
async function cacheUser(userId, userData) {
  const client = redis.createClient({
    url: 'redis://localhost:6379'
  });

  try {
    await client.connect();

    // Redis operations are automatically instrumented
    await client.setEx(
      `user:${userId}`,
      3600,
      JSON.stringify(userData)
    );
  } finally {
    await client.quit();
  }
}

// PostgreSQL with connection pool
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  password: 'password',
  port: 5432,
});

async function getOrderHistory(userId) {
  // PostgreSQL queries are automatically traced
  const result = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

module.exports = {
  getUserFromMongo,
  cacheUser,
  getOrderHistory,
};
```

The instrumentation captures query text, connection details, and timing information automatically.

## Custom Configuration

Fine-tune auto-instrumentation behavior by configuring individual instrumentations. Each instrumentation accepts configuration options.

```javascript
// instrumentation-custom.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    // HTTP instrumentation with custom configuration
    new HttpInstrumentation({
      // Add custom attributes to HTTP spans
      requestHook: (span, request) => {
        span.setAttribute('custom.user_agent', request.headers['user-agent']);
      },
      // Ignore specific URLs
      ignoreIncomingRequestHook: (request) => {
        return request.url === '/health';
      },
    }),

    // Express instrumentation with layer tracking
    new ExpressInstrumentation({
      // Track individual middleware as spans
      requestHook: (span, info) => {
        span.setAttribute('express.route', info.route);
      },
    }),

    // MongoDB instrumentation with enhanced monitoring
    new MongoDBInstrumentation({
      // Capture command details
      enhancedDatabaseReporting: true,
      // Add response attributes
      responseHook: (span, result) => {
        if (result.result && result.result.n !== undefined) {
          span.setAttribute('db.mongodb.documents_affected', result.result.n);
        }
      },
    }),
  ],
});

sdk.start();
```

This custom configuration provides more control over instrumentation behavior and captured data.

## Environment Variables Configuration

Configure auto-instrumentation using environment variables for easier deployment management.

```bash
# .env file
OTEL_SERVICE_NAME=nodejs-api
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_RESOURCE_ATTRIBUTES=environment=production,team=backend
NODE_OPTIONS=--require ./instrumentation.js
```

Load environment variables and start your application normally.

```bash
# Load environment variables and run
export $(cat .env | xargs)
node app.js
```

Environment variables provide a deployment-friendly configuration approach.

## Docker Deployment

Deploy Node.js applications with auto-instrumentation in Docker containers.

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set instrumentation to load automatically
ENV NODE_OPTIONS="--require ./instrumentation.js"

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "app.js"]
```

Configure the container using docker-compose.

```yaml
# docker-compose.yml
version: '3.8'
services:
  nodejs-app:
    build: .
    environment:
      - OTEL_SERVICE_NAME=nodejs-app
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_RESOURCE_ATTRIBUTES=environment=docker,version=1.0.0
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yml"]
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    ports:
      - "4317:4317"
```

This setup ensures automatic instrumentation in containerized deployments.

## Troubleshooting

When auto-instrumentation doesn't work correctly, check these common issues.

First, verify the instrumentation file loads before application code. If spans don't appear, the instrumentation likely loaded too late.

```bash
# Add debug logging
export OTEL_LOG_LEVEL=debug
node --require ./instrumentation.js app.js
```

Second, check for conflicting instrumentation libraries. Multiple instrumentation packages for the same library can cause issues.

Third, verify the OTLP endpoint is reachable. Network connectivity problems prevent telemetry export.

```bash
# Test collector connectivity
curl http://localhost:4317
```

Fourth, ensure you're using compatible versions of instrumented libraries. Some instrumentations require specific library versions.

OpenTelemetry auto-instrumentation for Node.js provides comprehensive observability with minimal code changes. The SDK handles popular frameworks and libraries automatically, making it easy to add distributed tracing to existing applications.
