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

The following code demonstrates how to create and use a histogram to track HTTP request durations. Histograms are ideal for latency measurements because they automatically bucket values, enabling percentile calculations (P50, P95, P99) that are essential for understanding your application's performance distribution.

```typescript
// Import the meter from OpenTelemetry SDK to create metric instruments
// Creating a histogram for request duration - histograms are ideal for latency/duration metrics
const requestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',  // Human-readable description for documentation
  unit: 's',  // Specify the unit of measurement for proper display in backends
});

// Recording values - histogram automatically buckets these into predefined ranges
// Each record call increments the appropriate bucket count and adds to the sum
requestDuration.record(0.023, { method: 'GET', route: '/api/users' });    // Fast request - goes into 0-0.1s bucket
requestDuration.record(0.156, { method: 'POST', route: '/api/orders' });  // Slower request - goes into 0.1-0.5s bucket
requestDuration.record(1.234, { method: 'GET', route: '/api/reports' });  // Slow request - goes into 1-2.5s bucket

// The histogram will automatically track:
// - Total count of requests (sum of all bucket counts)
// - Sum of all durations (for calculating averages)
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

This comparison shows when to use UpDownCounter versus Gauge. Use UpDownCounter when you can hook into every event that changes the value (like connection open/close). Use Gauge when you only sample the current state periodically without tracking individual changes.

```typescript
// UpDownCounter: we see every connection open/close event
// Use this when you can intercept every change event (open and close)
const activeConnections = meter.createUpDownCounter('http_active_connections');

// Hook into connection lifecycle events to track the running total
server.on('connection', (sock) => {
  activeConnections.add(1);  // Increment when a new connection is established
  sock.on('close', () => activeConnections.add(-1));  // Decrement when connection closes
});

// Gauge: we just sample queue length when metrics are collected
// Use this when you only know the current value at collection time
const queueSize = meter.createObservableGauge('job_queue_size');
// The callback is invoked periodically by the SDK when metrics are exported
queueSize.addCallback((result) => {
  // Simply observe the current queue length - no need to track individual changes
  result.observe(jobQueue.length, { queue: 'email' });
});
```

#### Another Example: Memory
You usually DO NOT use an UpDownCounter for memory because you do not reliably intercept every allocation/free. Instead you sample the *current* heap or RSS value with a Gauge.

The code below shows how to monitor memory usage with a Gauge. Since you cannot track every memory allocation and deallocation event, a Gauge that samples the current heap usage at collection intervals is the appropriate choice.

```typescript
// Create an observable gauge for memory monitoring
// Observable gauges use callbacks that are invoked during metric collection
const memoryGauge = meter.createObservableGauge('process_memory_heap_used_bytes');

// Register a callback that will be called when metrics are collected
memoryGauge.addCallback((result) => {
  // Sample the current heap memory usage from Node.js process
  // This gives us a point-in-time snapshot, not a running total
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

The following command installs all the necessary OpenTelemetry packages: the core API for instrumentation, the Node.js SDK for runtime integration, auto-instrumentation for automatic library tracing, and the OTLP HTTP exporter to send telemetry to backends like OneUptime.

```bash
# Install OpenTelemetry core packages for Node.js metrics collection
# @opentelemetry/api - Core API for creating metrics and spans
# @opentelemetry/sdk-node - Node.js SDK that ties everything together
# @opentelemetry/auto-instrumentations-node - Automatic instrumentation for common libraries
# @opentelemetry/exporter-otlp-http - OTLP exporter to send data to observability backends
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-otlp-http
```

### Basic Setup

This configuration file sets up the complete OpenTelemetry SDK for Node.js with metric collection. It configures an OTLP exporter to send metrics to OneUptime, defines service resource attributes for identification, and enables automatic instrumentation of common Node.js libraries. This file should be imported at the very beginning of your application before any other modules.

```typescript
// telemetry.ts
// Import all necessary OpenTelemetry SDK components
import { NodeSDK } from '@opentelemetry/sdk-node';  // Main SDK for Node.js applications
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';  // Auto-instruments HTTP, Express, etc.
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';  // Sends metrics via OTLP protocol
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';  // Periodically collects and exports metrics
import { Resource } from '@opentelemetry/resources';  // Defines service metadata
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';  // Standard attribute names

// Create an OTLP HTTP exporter for OneUptime
// This exporter sends metric data to the OneUptime observability platform
const otlpExporter = new OTLPMetricExporter({
  url: 'https://oneuptime.com/otlp/v1/metrics',  // OneUptime's OTLP metrics endpoint
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,  // Authentication token from environment variable
  },
});

// Create a metric reader with the OTLP exporter
// The metric reader collects metrics at regular intervals and sends them to the exporter
const metricReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 30000, // Export metrics every 30 seconds - adjust based on your needs
});

// Initialize the SDK with all configuration options
const sdk = new NodeSDK({
  // Resource attributes help identify your service in the observability backend
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-node-app',  // Unique name for your service
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',  // Version helps track deployments
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',  // Distinguish between instances
  }),
  instrumentations: [getNodeAutoInstrumentations()],  // Enable automatic instrumentation for common libraries
  metricReader: metricReader,  // Attach the metric reader to collect and export metrics
});

// Start the SDK - this must happen before your application code runs
sdk.start();

console.log('OpenTelemetry started successfully with OneUptime OTLP exporter');
```

### Creating Custom Metrics

This class demonstrates how to create and use all four types of OpenTelemetry metrics in a single, reusable module. It shows the Counter for request counting, Histogram for latency distribution, UpDownCounter for tracking active connections, and Observable Gauge for memory monitoring. This pattern encapsulates all metric logic in one place for cleaner application code.

```typescript
// metrics.ts
// Import OpenTelemetry metrics API for creating and recording metrics
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

// Get a meter instance - the meter is the entry point for creating metric instruments
// The name and version help identify the source of metrics in your backend
const meter = metrics.getMeter('my-app-meter', '1.0.0');

// Create different types of metrics encapsulated in a class for better organization
export class AppMetrics {
  // Counter: Track total requests - monotonically increasing, never decreases
  // Use counters for counting events like requests, errors, or completed tasks
  private requestsTotal = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
    unit: '1',  // Unit '1' indicates a dimensionless count
  });

  // Histogram: Track request durations - records distribution of values
  // Use histograms when you need percentiles (P50, P95, P99)
  private requestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'Duration of HTTP requests in seconds',
    unit: 's',
  });

  // UpDownCounter: Track active connections - can increase or decrease
  // Use when you can hook into both increment and decrement events
  private activeConnections = meter.createUpDownCounter('http_active_connections', {
    description: 'Number of active HTTP connections',
    unit: '1',
  });

  // Gauge: Track memory usage (observed asynchronously)
  // Use for values that are sampled at collection time, not tracked per-event
  private memoryUsage = meter.createObservableGauge('process_memory_usage_bytes', {
    description: 'Process memory usage in bytes',
    unit: 'byte',
  });

  constructor() {
    // Set up memory usage observation with a callback
    // This callback is invoked by the SDK during each metric collection cycle
    this.memoryUsage.addCallback((result) => {
      const memUsage = process.memoryUsage();  // Get current Node.js memory stats
      // Record multiple memory metrics with different type labels
      result.observe(memUsage.heapUsed, { type: 'heap_used' });   // Actual heap memory in use
      result.observe(memUsage.heapTotal, { type: 'heap_total' }); // Total heap allocated
      result.observe(memUsage.rss, { type: 'rss' });              // Resident Set Size (total memory)
    });
  }

  // Record a request - call this after each HTTP request completes
  recordRequest(method: string, route: string, statusCode: number, duration: number) {
    // Create labels object for dimensional filtering in your backend
    const labels = { method, route, status_code: statusCode.toString() };

    // Increment request counter - adds 1 to the total count with these labels
    this.requestsTotal.add(1, labels);

    // Record request duration - adds the value to histogram buckets
    this.requestDuration.record(duration, labels);
  }

  // Track connection opened - increment the active connections counter
  connectionOpened() {
    this.activeConnections.add(1);
  }

  // Track connection closed - decrement the active connections counter
  connectionClosed() {
    this.activeConnections.add(-1);
  }
}
```

---

## Advanced Metrics Patterns

### 1. Business Metrics Tracking

Business metrics help you track key performance indicators (KPIs) that matter to your organization beyond technical performance. This class shows how to track user signups, order values, and subscription lifecycle events. These metrics enable product and business teams to monitor growth, revenue, and customer behavior directly from your observability platform.

```typescript
// business-metrics.ts
// Import the metrics API to create business-level metric instruments
import { metrics } from '@opentelemetry/api';

// Create a separate meter for business metrics to keep them organized
const meter = metrics.getMeter('business-metrics', '1.0.0');

export class BusinessMetrics {
  // Track user signups - a counter because signups only increase
  // Labels allow filtering by acquisition source and plan type
  private userSignups = meter.createCounter('user_signups_total', {
    description: 'Total number of user signups',
  });

  // Track order values - a histogram to understand revenue distribution
  // Enables analysis of average order value, high-value outliers, etc.
  private orderValue = meter.createHistogram('order_value_dollars', {
    description: 'Value of orders in dollars',
    unit: 'USD',  // Unit helps backends display values correctly
  });

  // Track subscription changes - UpDownCounter for net active count
  // Increases on activation, decreases on cancellation
  private activeSubscriptions = meter.createUpDownCounter('active_subscriptions', {
    description: 'Number of active subscriptions',
  });

  // Record a new user signup with acquisition metadata
  recordSignup(plan: string, source: string) {
    // Labels enable filtering: "Show signups from 'google_ads' source"
    this.userSignups.add(1, { plan, source });
  }

  // Record an order with value and categorization
  recordOrder(value: number, category: string, userId: string) {
    // Include user tier for segmented analysis without storing PII
    this.orderValue.record(value, { category, user_tier: this.getUserTier(userId) });
  }

  // Track subscription activation - increment active count
  subscriptionActivated(plan: string) {
    this.activeSubscriptions.add(1, { plan });  // +1 for new subscription
  }

  // Track subscription cancellation - decrement active count
  subscriptionCancelled(plan: string) {
    this.activeSubscriptions.add(-1, { plan });  // -1 for cancelled subscription
  }

  // Helper method to determine user tier without exposing user ID
  private getUserTier(userId: string): string {
    // Logic to determine user tier based on userId
    return 'premium'; // placeholder - implement based on your business logic
  }
}
```

### 2. Database Metrics

Database performance is often a critical bottleneck in applications. This class provides a wrapper around your database operations to automatically track query durations, connection pool health, and query counts. The Observable Gauge monitors pool state at collection time, while the histogram and counter track individual query performance and volume.

```typescript
// database-metrics.ts
// Import metrics API for database performance monitoring
import { metrics } from '@opentelemetry/api';

// Create a dedicated meter for database metrics
const meter = metrics.getMeter('database-metrics', '1.0.0');

export class DatabaseMetrics {
  // Histogram for query durations - enables percentile analysis of DB performance
  private queryDuration = meter.createHistogram('db_query_duration_seconds', {
    description: 'Database query duration in seconds',
  });

  // Observable Gauge for connection pool - sampled at collection time
  // Pool size can't be tracked per-event, so we observe current state
  private connectionPool = meter.createObservableGauge('db_connection_pool_size', {
    description: 'Database connection pool metrics',
  });

  // Counter for total queries - useful for throughput monitoring
  private queryCount = meter.createCounter('db_queries_total', {
    description: 'Total database queries executed',
  });

  // Constructor receives the database pool instance to monitor
  constructor(private pool: any) { // Your DB pool instance (e.g., pg.Pool, mysql.Pool)
    // Register callback to observe pool state during metric collection
    this.connectionPool.addCallback((result) => {
      // Record multiple dimensions of pool health with 'state' label
      result.observe(this.pool.size, { state: 'total' });         // Total connections in pool
      result.observe(this.pool.available, { state: 'available' }); // Idle connections ready to use
      result.observe(this.pool.pending, { state: 'pending' });     // Requests waiting for a connection
    });
  }

  // Wrapper method that executes queries and records metrics automatically
  async executeQuery<T>(
    query: string,
    params: any[],
    operation: string,  // e.g., 'SELECT', 'INSERT', 'UPDATE'
    table: string       // e.g., 'users', 'orders'
  ): Promise<T> {
    const startTime = Date.now();  // Record start time before query execution

    try {
      // Execute the actual database query
      const result = await this.pool.query(query, params);

      // Calculate duration in seconds for histogram recording
      const duration = (Date.now() - startTime) / 1000;
      const labels = { operation, table, status: 'success' };

      // Record successful query metrics
      this.queryDuration.record(duration, labels);  // Add to latency distribution
      this.queryCount.add(1, labels);               // Increment query counter

      return result;
    } catch (error) {
      // Calculate duration even for failed queries - important for error analysis
      const duration = (Date.now() - startTime) / 1000;
      const labels = { operation, table, status: 'error' };

      // Record failed query metrics - helps identify problematic queries
      this.queryDuration.record(duration, labels);
      this.queryCount.add(1, labels);

      throw error;  // Re-throw to maintain error handling behavior
    }
  }
}
```

### 3. Express.js Middleware Integration

This middleware automatically instruments all Express.js routes with OpenTelemetry metrics. It tracks active connections using an UpDownCounter and records request duration and status using the histogram and counter from our AppMetrics class. By applying this middleware globally, every HTTP request is automatically measured without modifying individual route handlers.

```typescript
// middleware/metrics.ts
// Import Express types for middleware signature
import { Request, Response, NextFunction } from 'express';
import { AppMetrics } from '../metrics';

// Create a singleton instance of AppMetrics for the middleware
const appMetrics = new AppMetrics();

// Middleware function that wraps every request with metric collection
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();  // Capture request start time

  // Track connection opened - increment active connections counter
  appMetrics.connectionOpened();

  // Register a listener for when the response finishes
  // This ensures we capture metrics even if the request fails
  res.on('finish', () => {
    // Calculate request duration in seconds
    const duration = (Date.now() - startTime) / 1000;
    // Get the route path, defaulting to 'unknown' if not available
    const route = req.route?.path || 'unknown';

    // Record request metrics with HTTP method, route, status code, and duration
    appMetrics.recordRequest(
      req.method,       // GET, POST, PUT, DELETE, etc.
      route,            // The matched route pattern
      res.statusCode,   // HTTP status code (200, 404, 500, etc.)
      duration          // Request duration in seconds
    );

    // Track connection closed - decrement active connections counter
    appMetrics.connectionClosed();
  });

  next();  // Continue to the next middleware/route handler
}

// app.ts
// Main Express application setup with metrics middleware
import express from 'express';
import { metricsMiddleware } from './middleware/metrics';

const app = express();

// Apply metrics middleware globally - this instruments ALL routes
// Must be added before route definitions to capture all requests
app.use(metricsMiddleware);

// Your routes here - metrics are automatically collected
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// Start the server with confirmation messages
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

Good metric names are descriptive, hierarchical, and follow a consistent pattern. The OpenTelemetry semantic conventions provide standard names for common metrics. Using these conventions ensures your metrics are recognizable across different tools and teams.

```typescript
// Good: Descriptive, standardized names following semantic conventions
// Format: <domain>.<entity>.<measurement>
'http.request.duration'              // Clear: HTTP request latency measurement
'database.connection.pool.size'      // Clear: DB pool size metric
'user.session.active'                // Clear: Active user session count

// Avoid: Vague or inconsistent names that lack context
'response_time'  // Bad: What kind of response? HTTP? Database? Cache?
'db_stuff'       // Bad: What aspect of the database? Vague and unhelpful
'users'          // Bad: Count? Active? Total? No measurement context
```

### 2. Cardinality Management
Be careful with metric labels to avoid cardinality explosion:

Cardinality refers to the number of unique label combinations for a metric. High cardinality (like unique user IDs or timestamps) creates millions of time series, causing storage costs to explode and query performance to degrade. Stick to low-cardinality labels with bounded value sets.

```typescript
// Good: Limited, meaningful labels with bounded cardinality
// These labels have a finite, small set of possible values
recordRequest(method: 'GET', route: '/api/users', status: '200')
// method: ~5 values (GET, POST, PUT, DELETE, PATCH)
// route: ~50 values (your API endpoints)
// status: ~5 values (200, 400, 401, 404, 500)

// Bad: High cardinality labels that explode storage and slow queries
// Each unique value creates a new time series!
recordRequest(userId: 'user123456', timestamp: '2025-08-26T10:30:45Z')
// userId: millions of possible values (unbounded)
// timestamp: infinite values (each second is unique)
```

### 3. Efficient Collection
Use appropriate collection intervals:

Collection interval affects both metric resolution and overhead. High-frequency collection (5 seconds) provides more granular data but increases network traffic and backend storage. Low-frequency collection (60 seconds) reduces overhead but may miss short-lived anomalies. Choose intervals based on your alerting and analysis needs.

```typescript
// For high-frequency metrics that need fast alerting (e.g., error rates, latency)
// Shorter intervals provide better resolution for detecting issues quickly
const highFreqReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 5000, // Export every 5 seconds for near-real-time monitoring
});

// For low-frequency metrics where trends matter more than instant values
// Longer intervals reduce network/storage overhead for less time-sensitive data
const lowFreqReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 60000, // Export every 1 minute for capacity planning metrics
});
```

### 4. Testing Metrics

Testing your metrics ensures they are recorded correctly and with the expected labels. This example shows how to set up an in-memory meter provider for unit tests, allowing you to verify metric behavior without sending data to a real backend. In production tests, you may want to use a test exporter that captures metrics for assertion.

```typescript
// metrics.test.ts
// Import testing dependencies and the metrics class to test
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { AppMetrics } from '../src/metrics';

describe('AppMetrics', () => {
  let appMetrics: AppMetrics;

  beforeEach(() => {
    // Use in-memory meter for testing - no real export happens
    // This isolates tests from external dependencies
    const meterProvider = new MeterProvider();
    // Set this as the global meter provider for the test
    metrics.setGlobalMeterProvider(meterProvider);
    // Create a fresh instance of AppMetrics for each test
    appMetrics = new AppMetrics();
  });

  it('should record request metrics', () => {
    // Record a request with sample data
    // This verifies the method doesn't throw and accepts valid parameters
    appMetrics.recordRequest('GET', '/api/users', 200, 0.150);

    // Add assertions based on your metric export format
    // Options for assertions:
    // 1. Use a TestMetricReader to capture and inspect recorded metrics
    // 2. Use a mock exporter and verify it received the expected data
    // 3. Integrate with your observability backend's test utilities
  });
});
```

---

## Integration with Monitoring Backends

### OneUptime Integration
OneUptime provides native OpenTelemetry support with OTLP:

This configuration shows how to send your OpenTelemetry metrics to OneUptime's observability platform. The OTLP exporter uses HTTP to transmit metrics, with authentication via the x-oneuptime-token header. The metric reader controls how often metrics are collected and exported, with a timeout to prevent hanging exports from blocking your application.

```typescript
// Import the OTLP exporter and metric reader from OpenTelemetry SDK
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Basic OTLP exporter configuration for OneUptime
const otlpExporter = new OTLPMetricExporter({
  url: 'https://oneuptime.com/otlp/v1/metrics',  // OneUptime's OTLP metrics ingestion endpoint
  headers: {
    // Authentication token - store securely in environment variables, never commit to code
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,
  },
});

// Create metric reader with custom export settings
const metricReader = new PeriodicExportingMetricReader({
  exporter: otlpExporter,
  exportIntervalMillis: 15000, // Export metrics every 15 seconds (balance between freshness and overhead)
  exportTimeoutMillis: 5000,   // Timeout export attempts after 5 seconds to prevent blocking
});
```

### Error Handling and Retry Logic

Production telemetry setups need robust error handling. This class encapsulates OTLP configuration with validation, timeouts, and retry logic. It validates required environment variables at startup, preventing silent failures. The retry configuration ensures temporary network issues don't result in lost metrics.

```typescript
// telemetry-with-error-handling.ts
// Production-ready OTLP setup with error handling and validation
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Encapsulate OTLP setup in a class for better organization and testability
class RobustOTLPSetup {
  // Private method to create the exporter with all configuration
  private static createExporter(): OTLPMetricExporter {
    return new OTLPMetricExporter({
      // Use environment variable with fallback to default endpoint
      url: process.env.ONEUPTIME_OTLP_ENDPOINT || 'https://oneuptime.com/otlp/v1/metrics',
      headers: {
        // Non-null assertion (!) because we validate this in validateConfiguration()
        'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN!,
      },
      timeoutMillis: 10000,  // 10 second timeout for export requests
      // Optional: Add custom retry configuration for resilience
      retryConfig: {
        maxRetries: 3,          // Retry up to 3 times on failure
        initialInterval: 1000,  // Start with 1 second delay between retries
        maxInterval: 5000,      // Cap retry delay at 5 seconds (exponential backoff)
      },
    });
  }

  // Public method to create a fully configured metric reader
  static createMetricReader(): PeriodicExportingMetricReader {
    const exporter = this.createExporter();

    return new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 30000,  // Collect and export every 30 seconds
      exportTimeoutMillis: 5000,    // Timeout individual exports after 5 seconds
    });
  }

  // Validate all required configuration before starting
  // Call this early in application startup to fail fast
  static validateConfiguration(): void {
    // Check for required authentication token
    if (!process.env.ONEUPTIME_OTLP_TOKEN) {
      throw new Error('ONEUPTIME_OTLP_TOKEN environment variable is required');
    }

    console.log('✅ OneUptime OTLP configuration validated');
  }
}

// Usage - validate and create with proper error handling
try {
  // Validate configuration first - fail fast if misconfigured
  RobustOTLPSetup.validateConfiguration();
  // Create the metric reader for use in NodeSDK
  const metricReader = RobustOTLPSetup.createMetricReader();
  // Use metricReader in your NodeSDK configuration
} catch (error) {
  // Log the error and exit - don't run the app without observability
  console.error('Failed to initialize OneUptime OTLP:', error);
  process.exit(1);  // Exit with error code to signal failure to orchestrators
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