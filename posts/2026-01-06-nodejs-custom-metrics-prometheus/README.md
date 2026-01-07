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

Install the official Prometheus client library for Node.js which provides metric types, a registry, and an HTTP endpoint for scraping.

```bash
# Install the Prometheus client library
npm install prom-client
```

### Basic Setup

This code initializes Prometheus metrics collection with default Node.js metrics (memory, CPU, event loop) and exposes a /metrics endpoint for Prometheus to scrape.

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();

// Create a Registry to hold all metrics
// The registry is responsible for collecting and exposing metrics
const register = new client.Registry();

// Add default Node.js metrics (memory, CPU, event loop, etc.)
client.collectDefaultMetrics({
  register,                    // Use our custom registry
  prefix: 'nodejs_',           // Prefix all default metrics
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration buckets
});

// Metrics endpoint - Prometheus scrapes this URL
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);  // Required content type
  res.end(await register.metrics());              // Return all registered metrics
});

app.listen(3000);
```

## Metric Types in Detail

### Counters

Counters only go up. Use them for counts of events:

Counters track cumulative values that only increase over time, like total requests or orders. Use labels to break down counts by dimensions like HTTP method, route, or status code.

```javascript
const client = require('prom-client');

// HTTP requests counter with labels for detailed breakdown
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],  // Dimensions for filtering
  registers: [register],
});

// Business metric - track orders by type, payment method, and region
const ordersTotal = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders placed',
  labelNames: ['type', 'payment_method', 'region'],
  registers: [register],
});

// Usage - increment counter when order is created
app.post('/orders', async (req, res) => {
  try {
    const order = await createOrder(req.body);

    // Increment counter with label values for this specific order
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

// Middleware to track all requests automatically
app.use((req, res, next) => {
  // Record metric after response is sent
  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,  // Use route pattern if available
      status_code: res.statusCode,
    });
  });
  next();
});
```

### Gauges

Gauges can go up and down. Use them for current values:

Gauges represent point-in-time values that can increase or decrease, like active connections, queue depth, or cache size. They're ideal for measuring current state.

```javascript
// Track active HTTP connections - increments on request, decrements on response
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

// Track job queue depth by queue name
const queueDepth = new client.Gauge({
  name: 'job_queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// Track cache size in bytes
const cacheSize = new client.Gauge({
  name: 'cache_size_bytes',
  help: 'Current cache size in bytes',
  labelNames: ['cache_name'],
  registers: [register],
});

// Track active connections with middleware
app.use((req, res, next) => {
  activeConnections.inc();                    // Increment when request starts
  res.on('finish', () => activeConnections.dec());  // Decrement when response ends
  next();
});

// Periodic gauge update for async values (e.g., queue depths)
setInterval(async () => {
  const queues = ['orders', 'emails', 'notifications'];

  for (const queueName of queues) {
    const depth = await getQueueDepth(queueName);
    queueDepth.set({ queue_name: queueName }, depth);  // Set absolute value
  }
}, 5000);  // Update every 5 seconds
```

### Histograms

Histograms track distributions. Essential for latency and size metrics:

Histograms sample observations and count them in configurable buckets. They're essential for latency metrics because they let you calculate percentiles (p50, p95, p99) and set SLOs.

```javascript
// Request duration histogram with latency-focused buckets
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets from 1ms to 10s - adjust based on your SLOs
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Database query duration with tighter buckets for fast queries
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Response size histogram with byte-sized buckets
const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],  // 100B to 10MB
  registers: [register],
});

// Request timing middleware - measures request duration
function metricsMiddleware(req, res, next) {
  // Use high-resolution time for accurate measurement
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    // Calculate duration in seconds from nanoseconds
    const durationNs = process.hrtime.bigint() - start;
    const durationSec = Number(durationNs) / 1e9;

    const labels = {
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode,
    };

    // Record the observation in the histogram
    httpRequestDuration.observe(labels, durationSec);

    // Also record response size if available
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

// Database wrapper with metrics - tracks query duration
async function trackedQuery(operation, table, queryFn) {
  // startTimer returns a function that records duration when called
  const timer = dbQueryDuration.startTimer({ operation, table });
  try {
    return await queryFn();
  } finally {
    timer();  // Records the duration automatically
  }
}

// Usage - wrap database queries with metrics
const users = await trackedQuery('select', 'users', () =>
  db.query('SELECT * FROM users WHERE active = true')
);
```

### Summaries

Summaries calculate quantiles client-side. Use when you need exact percentiles:

Summaries are similar to histograms but calculate percentiles on the client side. They provide exact percentile values but cannot be aggregated across instances.

```javascript
// Summary for precise percentile calculation
const requestSummary = new client.Summary({
  name: 'http_request_duration_summary',
  help: 'HTTP request duration summary',
  labelNames: ['method', 'route'],
  percentiles: [0.5, 0.9, 0.95, 0.99],  // p50, p90, p95, p99
  maxAgeSeconds: 600,   // Sliding window of 10 minutes
  ageBuckets: 5,        // Number of buckets in the sliding window
  registers: [register],
});
```

> **Note**: Histograms are generally preferred over Summaries because they can be aggregated across instances and allow server-side percentile calculation.

## Business Metrics Examples

### E-commerce Metrics

These business-focused metrics help track revenue, conversion rates, and customer behavior. Order value histograms enable analysis of order size distribution and customer segments.

```javascript
// Revenue tracking - histogram of order values in USD
const orderValue = new client.Histogram({
  name: 'order_value_usd',
  help: 'Order value in USD',
  labelNames: ['order_type', 'customer_segment'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],  // Dollar buckets
  registers: [register],
});

// Track cart abandonment at different stages
const cartAbandonment = new client.Counter({
  name: 'cart_abandonment_total',
  help: 'Number of abandoned carts',
  labelNames: ['stage'],  // 'cart', 'shipping', 'payment', etc.
  registers: [register],
});

// Conversion funnel tracking
const conversionFunnel = new client.Counter({
  name: 'conversion_funnel_events_total',
  help: 'Conversion funnel events',
  labelNames: ['step', 'result'],  // step: 'view', 'cart', 'checkout'; result: 'success', 'failure'
  registers: [register],
});

// Track order with metrics
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Record order value for revenue analysis
  orderValue.observe(
    {
      order_type: order.type,
      customer_segment: order.customer.segment,
    },
    order.totalUsd
  );

  // Track successful checkout in conversion funnel
  conversionFunnel.inc({ step: 'checkout', result: 'success' });

  res.json(order);
});
```

### API Performance Metrics

Track external API calls to monitor third-party service reliability. These metrics help identify slow integrations and calculate error budgets for dependencies.

```javascript
// External API call metrics - track latency and reliability of third-party services
const externalApiDuration = new client.Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'External API request duration',
  labelNames: ['service', 'endpoint', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],  // External calls are often slower
  registers: [register],
});

// Track external API errors by service and error type
const externalApiErrors = new client.Counter({
  name: 'external_api_errors_total',
  help: 'External API errors',
  labelNames: ['service', 'error_type'],
  registers: [register],
});

// Wrapper for external calls - adds metrics automatically
async function callExternalApi(service, endpoint, requestFn) {
  const timer = externalApiDuration.startTimer({ service, endpoint });

  try {
    const response = await requestFn();
    timer({ status: 'success' });  // Record success with duration
    return response;
  } catch (error) {
    timer({ status: 'error' });    // Record error with duration
    externalApiErrors.inc({
      service,
      error_type: error.code || 'unknown',
    });
    throw error;
  }
}

// Usage - wrap Stripe API calls
const paymentResult = await callExternalApi(
  'stripe',
  '/charges',
  () => stripe.charges.create(chargeData)
);
```

### Cache Metrics

Cache hit/miss ratios are crucial for performance optimization. These metrics help identify cache effectiveness and tune cache sizes and TTLs.

```javascript
// Cache operation metrics - track hits, misses, and operation latency
const cacheOperations = new client.Counter({
  name: 'cache_operations_total',
  help: 'Cache operations',
  labelNames: ['operation', 'result', 'cache_name'],
  registers: [register],
});

// Cache operation latency - important for cache performance tuning
const cacheDuration = new client.Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation duration',
  labelNames: ['operation', 'cache_name'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],  // Very fast operations
  registers: [register],
});

// Instrumented cache wrapper - adds metrics to any cache implementation
class InstrumentedCache {
  constructor(name, cache) {
    this.name = name;
    this.cache = cache;
  }

  async get(key) {
    const timer = cacheDuration.startTimer({ operation: 'get', cache_name: this.name });

    try {
      const value = await this.cache.get(key);
      // Track hit or miss based on whether value was found
      const result = value !== undefined ? 'hit' : 'miss';

      cacheOperations.inc({
        operation: 'get',
        result,
        cache_name: this.name,
      });

      return value;
    } finally {
      timer();  // Record operation duration
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

// Usage - wrap your existing cache with instrumentation
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

Labels provide dimensionality but high-cardinality labels can cause performance issues. Avoid unbounded values like user IDs or request IDs in labels.

```javascript
// BAD: High cardinality (unbounded values) - will cause memory issues
const badMetric = new client.Counter({
  name: 'api_requests_total',
  labelNames: ['user_id', 'request_id'], // DON'T DO THIS - millions of unique values!
});

// GOOD: Bounded label values - predictable cardinality
const goodMetric = new client.Counter({
  name: 'api_requests_total',
  labelNames: ['method', 'route', 'status_code', 'user_type'],  // Limited, predictable values
});

// Normalize routes to avoid cardinality explosion from path parameters
function normalizeRoute(req) {
  // Convert /users/123 to /users/:id - keeps cardinality low
  if (req.route) {
    return req.route.path;  // Express already provides the pattern
  }

  // Fallback pattern matching for when route isn't available
  return req.path
    // Replace UUIDs with placeholder
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    // Replace numeric IDs with placeholder
    .replace(/\/\d+/g, '/:id');
}
```

## Aggregating Metrics with pushgateway (For Jobs)

For batch jobs that don't run long enough for Prometheus to scrape:

Batch jobs and cron tasks often complete before Prometheus can scrape them. The Pushgateway accepts metrics pushed from these short-lived jobs.

```javascript
const client = require('prom-client');

// Create a Pushgateway client
const gateway = new client.Pushgateway(
  process.env.PUSHGATEWAY_URL || 'http://pushgateway:9091',
  {},
  register
);

async function runBatchJob() {
  // Create job-specific metrics
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

    // Record success metrics
    jobSuccess.set({ job_name: 'daily_report' }, 1);
    jobDuration.set({ job_name: 'daily_report' }, (Date.now() - start) / 1000);
  } catch (error) {
    // Record failure
    jobSuccess.set({ job_name: 'daily_report' }, 0);
    throw error;
  } finally {
    // Push metrics to gateway before job exits
    // Use pushAdd to add to existing metrics (push would replace all)
    await gateway.pushAdd({ jobName: 'daily_report' });
  }
}
```

## Production Setup

### Separate Metrics Port

Expose metrics on a separate port to keep them internal and prevent accidental exposure to the public internet. This also allows different access controls.

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();
const metricsApp = express();  // Separate app for metrics

// Business logic on main app (public)
app.get('/api/users', async (req, res) => {
  res.json(await getUsers());
});

// Metrics on separate port (internal only - not exposed to internet)
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);         // Public port - exposed through load balancer
metricsApp.listen(9090);  // Internal port - only accessible within cluster
```

### Kubernetes Service Monitor

The ServiceMonitor CRD (from Prometheus Operator) automatically configures Prometheus to discover and scrape your application's metrics endpoint.

```yaml
# servicemonitor.yaml - Tells Prometheus how to scrape your app
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nodejs-app
  labels:
    app: nodejs-app
spec:
  selector:
    matchLabels:
      app: nodejs-app      # Match services with this label
  endpoints:
    - port: metrics        # Port name from Service definition
      path: /metrics       # Path to metrics endpoint
      interval: 15s        # Scrape every 15 seconds
```

## Summary

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| **Counter** | Events, requests | `http_requests_total` |
| **Gauge** | Current value | `active_connections` |
| **Histogram** | Latency, sizes | `http_request_duration_seconds` |
| **Summary** | Precise percentiles | `request_latency_summary` |

Custom Prometheus metrics transform your Node.js application from a black box into a fully observable system. By tracking business metrics alongside technical ones, you gain insights that directly impact product decisions and reliability improvements.
