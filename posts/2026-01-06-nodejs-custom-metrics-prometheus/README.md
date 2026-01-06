# How to Add Custom Metrics to Node.js Applications with Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Metrics, Monitoring, Observability, Prometheus, DevOps

Description: Learn to implement custom business metrics in Node.js applications using Prometheus client libraries, including histograms, gauges, and best practices for metric design.

---

Prometheus metrics give you visibility into what your application is doing at scale. While default Node.js metrics cover memory and CPU, custom metrics reveal business-critical information: order completion rates, API response times by endpoint, queue depths, and cache hit ratios.

## Why Custom Metrics?

| Metric Type | Example | Business Value |
|-------------|---------|----------------|
| **Counter** | Orders placed | Revenue tracking |
| **Gauge** | Active users | Capacity planning |
| **Histogram** | Request duration | SLO monitoring |
| **Summary** | Response sizes | Bandwidth costs |

## Setting Up Prometheus Client

### Installation

```bash
npm install prom-client
```

### Basic Setup

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();

// Create a Registry
const register = new client.Registry();

// Add default Node.js metrics
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);
```

## Metric Types in Detail

### Counters

Counters only go up. Use them for counts of events:

```javascript
const client = require('prom-client');

// HTTP requests counter with labels
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Business metric
const ordersTotal = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders placed',
  labelNames: ['type', 'payment_method', 'region'],
  registers: [register],
});

// Usage
app.post('/orders', async (req, res) => {
  try {
    const order = await createOrder(req.body);

    ordersTotal.inc({
      type: order.type,
      payment_method: order.paymentMethod,
      region: order.region,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to track all requests
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  next();
});
```

### Gauges

Gauges can go up and down. Use them for current values:

```javascript
// Active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Queue depth
const queueDepth = new client.Gauge({
  name: 'job_queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// Cache size
const cacheSize = new client.Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_name'],
  registers: [register],
});

// Track active connections
app.use((req, res, next) => {
  activeConnections.inc();
  res.on('finish', () => activeConnections.dec());
  next();
});

// Periodic gauge update
setInterval(async () => {
  const queues = ['orders', 'emails', 'notifications'];

  for (const queueName of queues) {
    const depth = await getQueueDepth(queueName);
    queueDepth.set({ queue_name: queueName }, depth);
  }
}, 5000);
```

### Histograms

Histograms track distributions. Essential for latency and size metrics:

```javascript
// Request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Database query duration
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Response size histogram
const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  registers: [register],
});

// Request timing middleware
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationSec = Number(durationNs) / 1e9;

    const labels = {
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, durationSec);

    const contentLength = res.get('Content-Length');
    if (contentLength) {
      httpResponseSize.observe(
        { method: req.method, route: req.route?.path || 'unknown' },
        parseInt(contentLength)
      );
    }
  });

  next();
}

app.use(metricsMiddleware);

// Database wrapper with metrics
async function trackedQuery(operation, table, queryFn) {
  const timer = dbQueryDuration.startTimer({ operation, table });
  try {
    return await queryFn();
  } finally {
    timer();
  }
}

// Usage
const users = await trackedQuery('select', 'users', () =>
  db.query('SELECT * FROM users WHERE active = true')
);
```

### Summaries

Summaries calculate quantiles client-side. Use when you need exact percentiles:

```javascript
const requestSummary = new client.Summary({
  name: 'http_request_duration_summary',
  help: 'HTTP request duration summary',
  labelNames: ['method', 'route'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [register],
});
```

> **Note**: Histograms are generally preferred over Summaries because they can be aggregated across instances and allow server-side percentile calculation.

## Business Metrics Examples

### E-commerce Metrics

```javascript
// Revenue tracking
const orderValue = new client.Histogram({
  name: 'order_value_usd',
  help: 'Order value in USD',
  labelNames: ['order_type', 'customer_segment'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

const cartAbandonment = new client.Counter({
  name: 'cart_abandonment_total',
  help: 'Number of abandoned carts',
  labelNames: ['stage'],
  registers: [register],
});

const conversionFunnel = new client.Counter({
  name: 'conversion_funnel_events_total',
  help: 'Conversion funnel events',
  labelNames: ['step', 'result'],
  registers: [register],
});

// Track order
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  orderValue.observe(
    {
      order_type: order.type,
      customer_segment: order.customer.segment,
    },
    order.totalUsd
  );

  conversionFunnel.inc({ step: 'checkout', result: 'success' });

  res.json(order);
});
```

### API Performance Metrics

```javascript
// External API call metrics
const externalApiDuration = new client.Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'External API request duration',
  labelNames: ['service', 'endpoint', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const externalApiErrors = new client.Counter({
  name: 'external_api_errors_total',
  help: 'External API errors',
  labelNames: ['service', 'error_type'],
  registers: [register],
});

// Wrapper for external calls
async function callExternalApi(service, endpoint, requestFn) {
  const timer = externalApiDuration.startTimer({ service, endpoint });

  try {
    const response = await requestFn();
    timer({ status: 'success' });
    return response;
  } catch (error) {
    timer({ status: 'error' });
    externalApiErrors.inc({
      service,
      error_type: error.code || 'unknown',
    });
    throw error;
  }
}

// Usage
const paymentResult = await callExternalApi(
  'stripe',
  '/charges',
  () => stripe.charges.create(chargeData)
);
```

### Cache Metrics

```javascript
const cacheOperations = new client.Counter({
  name: 'cache_operations_total',
  help: 'Cache operations',
  labelNames: ['operation', 'result', 'cache_name'],
  registers: [register],
});

const cacheDuration = new client.Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation duration',
  labelNames: ['operation', 'cache_name'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [register],
});

class InstrumentedCache {
  constructor(name, cache) {
    this.name = name;
    this.cache = cache;
  }

  async get(key) {
    const timer = cacheDuration.startTimer({ operation: 'get', cache_name: this.name });

    try {
      const value = await this.cache.get(key);
      const result = value !== undefined ? 'hit' : 'miss';

      cacheOperations.inc({
        operation: 'get',
        result,
        cache_name: this.name,
      });

      return value;
    } finally {
      timer();
    }
  }

  async set(key, value, ttl) {
    const timer = cacheDuration.startTimer({ operation: 'set', cache_name: this.name });

    try {
      await this.cache.set(key, value, ttl);
      cacheOperations.inc({
        operation: 'set',
        result: 'success',
        cache_name: this.name,
      });
    } finally {
      timer();
    }
  }
}

// Usage
const userCache = new InstrumentedCache('users', redisCache);
const user = await userCache.get(`user:${userId}`);
```

## Metric Naming Best Practices

| Convention | Example | Why |
|------------|---------|-----|
| **Prefix with service** | `myapp_http_requests_total` | Avoid collisions |
| **Use snake_case** | `http_request_duration` | Prometheus convention |
| **Include unit suffix** | `_seconds`, `_bytes`, `_total` | Clarity |
| **Use _total for counters** | `requests_total` | Convention |
| **Descriptive names** | `order_processing_duration_seconds` | Self-documenting |

## Label Best Practices

```javascript
// BAD: High cardinality (unbounded values)
const badMetric = new client.Counter({
  name: 'api_requests_total',
  labelNames: ['user_id', 'request_id'], // DON'T DO THIS
});

// GOOD: Bounded label values
const goodMetric = new client.Counter({
  name: 'api_requests_total',
  labelNames: ['method', 'route', 'status_code', 'user_type'],
});

// Normalize routes to avoid cardinality explosion
function normalizeRoute(req) {
  // Convert /users/123 to /users/:id
  if (req.route) {
    return req.route.path;
  }

  // Fallback pattern matching
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id');
}
```

## Aggregating Metrics with pushgateway (For Jobs)

For batch jobs that don't run long enough for Prometheus to scrape:

```javascript
const client = require('prom-client');

const gateway = new client.Pushgateway(
  process.env.PUSHGATEWAY_URL || 'http://pushgateway:9091',
  {},
  register
);

async function runBatchJob() {
  const jobDuration = new client.Gauge({
    name: 'batch_job_duration_seconds',
    help: 'Batch job duration',
    labelNames: ['job_name'],
    registers: [register],
  });

  const jobSuccess = new client.Gauge({
    name: 'batch_job_success',
    help: 'Batch job success (1) or failure (0)',
    labelNames: ['job_name'],
    registers: [register],
  });

  const start = Date.now();

  try {
    await performBatchWork();

    jobSuccess.set({ job_name: 'daily_report' }, 1);
    jobDuration.set({ job_name: 'daily_report' }, (Date.now() - start) / 1000);
  } catch (error) {
    jobSuccess.set({ job_name: 'daily_report' }, 0);
    throw error;
  } finally {
    // Push metrics to gateway
    await gateway.pushAdd({ jobName: 'daily_report' });
  }
}
```

## Production Setup

### Separate Metrics Port

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();
const metricsApp = express();

// Business logic on main app
app.get('/api/users', async (req, res) => {
  res.json(await getUsers());
});

// Metrics on separate port (internal only)
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000); // Public
metricsApp.listen(9090); // Internal only, for Prometheus
```

### Kubernetes Service Monitor

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nodejs-app
  labels:
    app: nodejs-app
spec:
  selector:
    matchLabels:
      app: nodejs-app
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

## Summary

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| **Counter** | Events, requests | `http_requests_total` |
| **Gauge** | Current value | `active_connections` |
| **Histogram** | Latency, sizes | `http_request_duration_seconds` |
| **Summary** | Precise percentiles | `request_latency_summary` |

Custom Prometheus metrics transform your Node.js application from a black box into a fully observable system. By tracking business metrics alongside technical ones, you gain insights that directly impact product decisions and reliability improvements.
