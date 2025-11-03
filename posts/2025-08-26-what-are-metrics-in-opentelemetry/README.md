# What are metrics in OpenTelemetry: A Complete Guide

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: OpenTelemetry, Metrics, Observability, TypeScript, NodeJS, Monitoring

Description: A comprehensive guide to understanding metrics in OpenTelemetry. What they are, how they work, and how to implement them effectively with practical code examples.

---

> Metrics are the heartbeat of your application. They tell you **what** is happening, **when** it happened, and **how often** it occurs. In OpenTelemetry, metrics provide the foundation for monitoring system health, performance trends, and business KPIs.

Whether you're tracking request latency, counting errors, or monitoring business metrics like user signups, OpenTelemetry metrics give you the standardized, vendor-neutral way to collect and export this critical telemetry data.

---

## What are Metrics in OpenTelemetry?

Metrics in OpenTelemetry are **numerical measurements** collected over time that represent the state and behavior of your application. Unlike traces that show individual request flows or logs that capture discrete events, metrics provide **aggregated insights** into system performance patterns.

### Key Characteristics of OpenTelemetry Metrics:

- **Time-series data**: Values recorded over time intervals
- **Aggregated measurements**: Counts, sums, averages, percentiles
- **Dimensional**: Can be labeled with attributes for filtering and grouping
- **Efficient**: Low overhead, suitable for high-frequency collection
- **Standardized**: Consistent schema across different backends

---

## Types of Metrics in OpenTelemetry

OpenTelemetry defines several metric instrument types, each optimized for different use cases:

### 1. Counter
Monotonically increasing values that only go up (or reset to zero).

**Use cases**: Request counts, error counts, bytes processed
**Example**: `http.requests.total`, `database.connections.created`

### 2. UpDownCounter  
Values that can increase or decrease.

**Use cases**: Active connections, queue sizes, memory usage
**Example**: `http.active_requests`, `database.connections.active`

### 3. Histogram
Records distribution of values by automatically creating buckets to track how values are distributed across different ranges. Histograms are perfect for understanding percentiles (P50, P95, P99) and identifying performance patterns.

**How it works**: When you record a value, the histogram automatically places it into predefined buckets (e.g., 0-10ms, 10-50ms, 50-100ms, etc.) and tracks the count in each bucket. This allows you to calculate percentiles and understand the distribution of your data.

**Use cases**: 
- Request latencies and response times
- Response payload sizes  
- Processing times and queue wait times
- Database query durations
- File upload/download sizes
- Memory allocation sizes

**Key benefits**:
- Automatic percentile calculation (P50, P95, P99)
- Efficient storage compared to storing all individual values
- Works well with alerting on SLA thresholds
- Great for performance trend analysis

**Example metrics**: `http.request.duration`, `database.query.duration`, `file.upload.size`

**Practical example**:
```typescript
// Creating a histogram for request duration
const requestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  unit: 's',
});

// Recording values - histogram automatically buckets these
requestDuration.record(0.023, { method: 'GET', route: '/api/users' });    // Fast request
requestDuration.record(0.156, { method: 'POST', route: '/api/orders' });  // Slower request
requestDuration.record(1.234, { method: 'GET', route: '/api/reports' });  // Slow request

// The histogram will automatically track:
// - Total count of requests
// - Sum of all durations 
// - Distribution across buckets (e.g., 0-0.1s: 1, 0.1-0.5s: 1, 1-2.5s: 1)
// - This enables percentile calculations in your monitoring backend like OneUptime
```

### 4. Gauge
Represents a current value that can arbitrarily go up and down.

**Use cases**: CPU usage, memory usage, temperature readings
**Example**: `system.cpu.utilization`, `heap.memory.used`

---


### Gauge vs UpDownCounter (Key Differences)

These two instruments often get mixed up because both can reflect values that move up and down. The difference is about *how* you obtain the value and *what semantic meaning* you want to convey.

| Aspect | UpDownCounter | Gauge (Observable Gauge) |
|--------|---------------|--------------------------|
| How it's updated | You call `add(+/-N)` on every event that changes the total (delta-based updates). | You provide a callback that reports the *current* value when the SDK collects metrics (point-in-time observation). |
| What it represents | A running total that can increase or decrease as things happen. | An instantaneous measurement / snapshot right now. |
| Typical semantics | Tracking the net change over time (open minus closed, allocated minus freed). | Sampling a value that already exists (current memory, queue length read from a data structure, temperature). |
| Implementation style | Synchronous: you must be present at every change event. | Asynchronous: you don't need to hook each event; you just read current state periodically. |
| Aggregation | Produces a sum (can go up or down). | Produces the last observed value per collection interval (no summing). |
| Good examples | Active HTTP connections (you know exactly when they open/close). | Process RSS memory (you only sample current usage), CPU utilization %, current queue depth. |
| Bad / awkward usage | Sampling something periodically (you'd miss changes if you rely on deltas you don't have). | Trying to count events (you'd overwrite rather than accumulate). |

#### Mental model
Ask yourself: Do I observe a current state? Use a Gauge. Do I react to discrete events that change a count up or down? Use an UpDownCounter.

#### Example Comparison

```typescript
// UpDownCounter: we see every connection open/close event
const activeConnections = meter.createUpDownCounter('http_active_connections');

server.on('connection', (sock) => {
  activeConnections.add(1);
  sock.on('close', () => activeConnections.add(-1));
});

// Gauge: we just sample queue length when metrics are collected
const queueSize = meter.createObservableGauge('job_queue_size');
queueSize.addCallback((result) => {
  result.observe(jobQueue.length, { queue: 'email' });
});
```

#### Another Example: Memory
You usually DO NOT use an UpDownCounter for memory because you do not reliably intercept every allocation/free. Instead you sample the *current* heap or RSS value with a Gauge.

```typescript
const memoryGauge = meter.createObservableGauge('process_memory_heap_used_bytes');
memoryGauge.addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed);
});
```

#### Anti-Patterns
1. Using a Gauge to represent a cumulative total (you'll lose historical increments). Use a Counter / UpDownCounter instead.
2. Using an UpDownCounter when you cannot observe all change events- your value will drift and become wrong; prefer a Gauge snapshot.
3. Emitting high-cardinality labels on Gauges each collection cycle (same caution as any metric type).

#### Quick Decision Cheat Sheet
| If... | Choose |
|-------|--------|
| You can hook every increment AND decrement event | UpDownCounter |
| You only know the current state when polled | Gauge |
| You need a strictly increasing total | Counter |
| You need distribution / percentiles | Histogram |

---


## Setting Up OpenTelemetry Metrics in Node.js

Let's start with a practical implementation. First, install the required dependencies:

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-otlp-http
```

### Basic Setup

```typescript
// telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Create an OTLP HTTP exporter for OneUptime
const otlpExporter = new OTLPMetricExporter({
  url: 'https://oneuptime.com/otlp/v1/metrics',
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,
  },
});

// Create a metric reader with the OTLP exporter
const metricReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 30000, // Export every 30 seconds
});

// Initialize the SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-node-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  metricReader: metricReader,
});

// Start the SDK
sdk.start();

console.log('OpenTelemetry started successfully with OneUptime OTLP exporter');
```

### Creating Custom Metrics

```typescript
// metrics.ts
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

// Get a meter instance
const meter = metrics.getMeter('my-app-meter', '1.0.0');

// Create different types of metrics
export class AppMetrics {
  // Counter: Track total requests
  private requestsTotal = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
    unit: '1',
  });

  // Histogram: Track request durations
  private requestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'Duration of HTTP requests in seconds',
    unit: 's',
  });

  // UpDownCounter: Track active connections
  private activeConnections = meter.createUpDownCounter('http_active_connections', {
    description: 'Number of active HTTP connections',
    unit: '1',
  });

  // Gauge: Track memory usage (observed asynchronously)
  private memoryUsage = meter.createObservableGauge('process_memory_usage_bytes', {
    description: 'Process memory usage in bytes',
    unit: 'byte',
  });

  constructor() {
    // Set up memory usage observation
    this.memoryUsage.addCallback((result) => {
      const memUsage = process.memoryUsage();
      result.observe(memUsage.heapUsed, { type: 'heap_used' });
      result.observe(memUsage.heapTotal, { type: 'heap_total' });
      result.observe(memUsage.rss, { type: 'rss' });
    });
  }

  // Record a request
  recordRequest(method: string, route: string, statusCode: number, duration: number) {
    const labels = { method, route, status_code: statusCode.toString() };
    
    // Increment request counter
    this.requestsTotal.add(1, labels);
    
    // Record request duration
    this.requestDuration.record(duration, labels);
  }

  // Track connection changes
  connectionOpened() {
    this.activeConnections.add(1);
  }

  connectionClosed() {
    this.activeConnections.add(-1);
  }
}
```

---

## Advanced Metrics Patterns

### 1. Business Metrics Tracking

```typescript
// business-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('business-metrics', '1.0.0');

export class BusinessMetrics {
  // Track user signups
  private userSignups = meter.createCounter('user_signups_total', {
    description: 'Total number of user signups',
  });

  // Track order values
  private orderValue = meter.createHistogram('order_value_dollars', {
    description: 'Value of orders in dollars',
    unit: 'USD',
  });

  // Track subscription changes
  private activeSubscriptions = meter.createUpDownCounter('active_subscriptions', {
    description: 'Number of active subscriptions',
  });

  recordSignup(plan: string, source: string) {
    this.userSignups.add(1, { plan, source });
  }

  recordOrder(value: number, category: string, userId: string) {
    this.orderValue.record(value, { category, user_tier: this.getUserTier(userId) });
  }

  subscriptionActivated(plan: string) {
    this.activeSubscriptions.add(1, { plan });
  }

  subscriptionCancelled(plan: string) {
    this.activeSubscriptions.add(-1, { plan });
  }

  private getUserTier(userId: string): string {
    // Logic to determine user tier
    return 'premium'; // placeholder
  }
}
```

### 2. Database Metrics

```typescript
// database-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('database-metrics', '1.0.0');

export class DatabaseMetrics {
  private queryDuration = meter.createHistogram('db_query_duration_seconds', {
    description: 'Database query duration in seconds',
  });

  private connectionPool = meter.createObservableGauge('db_connection_pool_size', {
    description: 'Database connection pool metrics',
  });

  private queryCount = meter.createCounter('db_queries_total', {
    description: 'Total database queries executed',
  });

  constructor(private pool: any) { // Your DB pool instance
    this.connectionPool.addCallback((result) => {
      result.observe(this.pool.size, { state: 'total' });
      result.observe(this.pool.available, { state: 'available' });
      result.observe(this.pool.pending, { state: 'pending' });
    });
  }

  async executeQuery<T>(
    query: string, 
    params: any[], 
    operation: string,
    table: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(query, params);
      
      const duration = (Date.now() - startTime) / 1000;
      const labels = { operation, table, status: 'success' };
      
      this.queryDuration.record(duration, labels);
      this.queryCount.add(1, labels);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const labels = { operation, table, status: 'error' };
      
      this.queryDuration.record(duration, labels);
      this.queryCount.add(1, labels);
      
      throw error;
    }
  }
}
```

### 3. Express.js Middleware Integration

```typescript
// middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { AppMetrics } from '../metrics';

const appMetrics = new AppMetrics();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Track connection opened
  appMetrics.connectionOpened();
  
  // Clean up when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || 'unknown';
    
    appMetrics.recordRequest(
      req.method,
      route,
      res.statusCode,
      duration
    );
    
    appMetrics.connectionClosed();
  });
  
  next();
}

// app.ts
import express from 'express';
import { metricsMiddleware } from './middleware/metrics';

const app = express();

// Apply metrics middleware globally
app.use(metricsMiddleware);

// Your routes here
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Metrics being sent to OneUptime via OTLP');
});
```

---

## Metrics vs Other Signals

Understanding when to use metrics versus traces or logs is crucial:

### Use Metrics When:
- **Monitoring trends** over time (error rates, latency percentiles)
- **Creating dashboards** and alerts for SLI/SLO monitoring  
- **Tracking business KPIs** (revenue, user growth, conversion rates)
- **Resource utilization** monitoring (CPU, memory, disk)
- **High-frequency data** that needs efficient storage

### Use Traces When:
- **Debugging specific requests** or investigating issues
- **Understanding request flow** across microservices
- **Performance profiling** at the individual request level
- **Root cause analysis** for specific incidents

### Use Logs When:
- **Capturing detailed context** about specific events
- **Debugging application logic** and business flows
- **Compliance and audit** requirements
- **Unstructured data** that doesn't fit metric patterns

---

## Best Practices

### 1. Naming Conventions
Follow OpenTelemetry semantic conventions:

```typescript
// Good: Descriptive, standardized names
'http.request.duration'
'database.connection.pool.size'
'user.session.active'

// Avoid: Vague or inconsistent names
'response_time'
'db_stuff'
'users'
```

### 2. Cardinality Management
Be careful with metric labels to avoid cardinality explosion:

```typescript
// Good: Limited, meaningful labels
recordRequest(method: 'GET', route: '/api/users', status: '200')

// Bad: High cardinality labels
recordRequest(userId: 'user123456', timestamp: '2025-08-26T10:30:45Z')
```

### 3. Efficient Collection
Use appropriate collection intervals:

```typescript
// For high-frequency metrics
const highFreqReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 5000, // 5 seconds
});

// For low-frequency metrics  
const lowFreqReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 60000, // 1 minute
});
```

### 4. Testing Metrics

```typescript
// metrics.test.ts
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { AppMetrics } from '../src/metrics';

describe('AppMetrics', () => {
  let appMetrics: AppMetrics;

  beforeEach(() => {
    // Use in-memory meter for testing
    const meterProvider = new MeterProvider();
    metrics.setGlobalMeterProvider(meterProvider);
    appMetrics = new AppMetrics();
  });

  it('should record request metrics', () => {
    // Record a request
    appMetrics.recordRequest('GET', '/api/users', 200, 0.150);
    
    // Add assertions based on your metric export format
    // This depends on your specific testing setup
  });
});
```

---

## Integration with Monitoring Backends

### OneUptime Integration
OneUptime provides native OpenTelemetry support with OTLP:

```typescript
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Basic OTLP exporter configuration
const otlpExporter = new OTLPMetricExporter({
  url: 'https://oneuptime.com/otlp/v1/metrics',
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,
  },
});

// Create metric reader with custom export interval
const metricReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 15000, // Export every 15 seconds
  exportTimeoutMillis: 5000,   // Timeout after 5 seconds
});
```

### Error Handling and Retry Logic

```typescript
// telemetry-with-error-handling.ts
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

class RobustOTLPSetup {
  private static createExporter(): OTLPMetricExporter {
    return new OTLPMetricExporter({
      url: process.env.ONEUPTIME_OTLP_ENDPOINT || 'https://oneuptime.com/otlp/v1/metrics',
      headers: {
        'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN!,
      },
      timeoutMillis: 10000,
      // Optional: Add custom retry configuration
      retryConfig: {
        maxRetries: 3,
        initialInterval: 1000,
        maxInterval: 5000,
      },
    });
  }

  static createMetricReader(): PeriodicExportingMetricReader {
    const exporter = this.createExporter();
    
    return new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 30000,
      exportTimeoutMillis: 5000,
    });
  }

  static validateConfiguration(): void {
    if (!process.env.ONEUPTIME_OTLP_TOKEN) {
      throw new Error('ONEUPTIME_OTLP_TOKEN environment variable is required');
    }
    
    console.log('✅ OneUptime OTLP configuration validated');
  }
}

// Usage
try {
  RobustOTLPSetup.validateConfiguration();
  const metricReader = RobustOTLPSetup.createMetricReader();
  // Use metricReader in your NodeSDK configuration
} catch (error) {
  console.error('Failed to initialize OneUptime OTLP:', error);
  process.exit(1);
}
```

---

## Common Pitfalls to Avoid

1. **Over-instrumenting**: Don't create metrics for every possible measurement
2. **High cardinality**: Avoid labels with unbounded values (user IDs, timestamps)
3. **Wrong metric types**: Don't use counters for values that can decrease
4. **Missing context**: Always include relevant labels for filtering and grouping
5. **Blocking operations**: Metric recording should be non-blocking and fast

---

## Final Thoughts

OpenTelemetry metrics provide a powerful, standardized way to monitor your Node.js applications. By understanding the different metric types and implementing them thoughtfully, you can build robust observability into your systems.

Remember:
- **Metrics tell you WHAT is happening** in your system
- **Choose the right metric type** for your use case  
- **Keep cardinality manageable** to avoid performance issues
- **Follow naming conventions** for consistency
- **Test your metrics** to ensure they work as expected

Start with the basics- request counts, error rates, and response times- then expand to business metrics and more sophisticated patterns as your observability needs grow.

> Metrics are not just about monitoring system performance- they're about understanding your users, your business, and the health of your entire application ecosystem.

---

*Want to see your OpenTelemetry metrics in action? [OneUptime](https://oneuptime.com) provides a complete observability platform with native OpenTelemetry support, helping you visualize, alert on, and correlate your metrics with traces and logs.*

**Related Reading:**

- [How to collect internal metrics from OpenTelemetry Collector?](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)
- [Traces vs Metrics in Software Observability](https://oneuptime.com/blog/post/2025-08-21-traces-vs-metrics-in-opentelemetry/view)
- [Logs, Metrics & Traces: Turning Three Noisy Streams into One Story](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)