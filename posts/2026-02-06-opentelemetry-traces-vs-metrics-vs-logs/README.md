# How to Choose Between OpenTelemetry Signals: Traces vs Metrics vs Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Traces, Metrics, Logs, Observability, Signals

Description: A practical guide to understanding when to use traces, metrics, or logs in OpenTelemetry, with real examples and decision frameworks for each signal type.

OpenTelemetry provides three signal types: traces, metrics, and logs. Each serves a different purpose. Choosing the wrong signal leads to expensive storage, slow queries, or missing information when you need it most.

This guide explains what each signal does well, where it falls short, and how to decide which to use for specific scenarios. You'll learn practical patterns from real production systems.

## The Core Difference

Each signal answers a different question:

- **Metrics**: "What is happening across all requests?" (aggregated statistics)
- **Traces**: "What happened during this specific request?" (individual request lifecycle)
- **Logs**: "Why did this specific thing happen?" (detailed context and events)

The mistake many teams make is trying to answer all questions with one signal. You need all three, but for different purposes.

## Metrics: The 10,000 Foot View

Metrics are numerical measurements aggregated over time. They tell you system-level behavior: throughput, error rate, latency percentiles, resource utilization.

### What Metrics Are Good For

**Dashboards and real-time monitoring**: Metrics are cheap to store and fast to query. You can display millions of data points per second without performance issues.

**Alerting**: Metrics power most alerts. "Fire if p95 latency exceeds 500ms for 5 minutes" is a metric-based alert.

**Capacity planning**: Historical metric trends show when you'll need more resources.

**SLO tracking**: Service Level Objectives are built on metrics (uptime, latency, error rate).

### What Metrics Are Bad For

**Individual request analysis**: Metrics lose the details. You know p95 latency increased, but not which specific requests were slow.

**Root cause analysis**: Metrics tell you something is wrong, not why. You see error rate spiked, but not which error or what triggered it.

**Debugging**: You can't drill down from a metric into individual events.

### Metric Types in OpenTelemetry

**Counter**: Monotonically increasing value. Example: total requests processed, total errors.

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('payment-service');
const requestCounter = meter.createCounter('http.server.requests', {
  description: 'Total HTTP requests received',
});

// Increment counter on each request
app.use((req, res, next) => {
  requestCounter.add(1, {
    'http.method': req.method,
    'http.route': req.route?.path || 'unknown',
  });
  next();
});
```

**Histogram**: Distribution of values. Example: request duration, response sizes.

```javascript
const requestDuration = meter.createHistogram('http.server.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    requestDuration.record(duration, {
      'http.method': req.method,
      'http.status_code': res.statusCode,
    });
  });
  next();
});
```

**Gauge**: Current value that can go up or down. Example: active connections, queue depth, memory usage.

```javascript
const activeConnections = meter.createObservableGauge('http.server.active_connections', {
  description: 'Number of active HTTP connections',
});

let connectionCount = 0;

activeConnections.addCallback((observableResult) => {
  observableResult.observe(connectionCount);
});

server.on('connection', () => connectionCount++);
server.on('close', () => connectionCount--);
```

### Metric Attributes and Cardinality

Attributes (labels) let you slice metrics by dimension. But each unique attribute combination creates a new time series. This is called cardinality.

High cardinality kills metric systems. If you add `user_id` as an attribute and have 10 million users, you create 10 million time series. Storage explodes and queries slow down.

**Good attributes** (bounded cardinality):
- `http.method` (GET, POST, PUT, DELETE, etc.)
- `http.status_code` (200, 404, 500, etc.)
- `environment` (production, staging, development)
- `service.name`
- `region` (us-east, eu-west, etc.)

**Bad attributes** (unbounded cardinality):
- `user_id`
- `session_id`
- `request_id`
- `customer_email`
- Any timestamp or UUID

## Traces: The Request Journey

Traces show what happened during a single request as it flows through your system. Each trace contains spans representing operations (HTTP call, database query, cache lookup, etc.).

### What Traces Are Good For

**Debugging specific requests**: When a user reports an error, find their trace and see exactly what happened.

**Understanding dependencies**: Traces show which services and databases a request touches, and in what order.

**Identifying bottlenecks**: See which operation in a request took the longest.

**Distributed request flow**: Follow a request across multiple services with automatic context propagation.

**Latency breakdown**: Understand how much time each component contributed to total latency.

### What Traces Are Bad For

**System-wide patterns**: You can't aggregate all traces efficiently. Want to know p95 latency? Use metrics, not traces.

**Long-term retention**: Traces are expensive to store. Most systems keep them for days or weeks, not months.

**High-volume systems**: Tracing every request in a system handling millions of requests per second is cost-prohibitive. You need sampling.

### Creating Traces in OpenTelemetry

Auto-instrumentation captures HTTP, database, and framework operations automatically:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Manual spans capture business logic:

```javascript
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('payment-service');

async function processPayment(orderId, amount) {
  const span = tracer.startSpan('payment.process', {
    attributes: {
      'order.id': orderId,
      'payment.amount': amount,
    }
  });

  try {
    await validateOrder(orderId);
    await chargeCard(amount);
    await sendConfirmation(orderId);

    span.setStatus({ code: 1 }); // OK
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}
```

### Span Attributes vs Span Events

Attributes describe the span (user tier, payment method, region). Events mark points in time during the span (cache miss, retry attempt, validation failure).

```javascript
const span = tracer.startSpan('order.create');

// Attributes describe the operation
span.setAttribute('order.type', 'subscription');
span.setAttribute('customer.tier', 'enterprise');

// Events mark significant moments
span.addEvent('inventory_checked', { available: true });
span.addEvent('payment_attempted', { gateway: 'stripe' });
span.addEvent('confirmation_sent', { channel: 'email' });

span.end();
```

Attributes are indexed and queryable. Events are stored with the span but typically not indexed.

## Logs: The Detailed Context

Logs are timestamped text records with structured fields. They provide detailed context about specific events.

### What Logs Are Good For

**Debugging**: Logs contain the full context (variables, state, stack traces) when something goes wrong.

**Audit trails**: Track who did what and when.

**Business events**: Record domain-specific events (order placed, user registered, payment failed).

**Unstructured data**: When you need to record arbitrary text that doesn't fit a predefined schema.

### What Logs Are Bad For

**Aggregation**: Logs are expensive to aggregate. "How many 500 errors in the last hour?" should be a metric, not a log query.

**Real-time dashboards**: Log queries are slower than metric queries. Don't build dashboards from logs.

**System-wide statistics**: Computing percentiles or averages from logs is slow and expensive.

### Structured Logging with OpenTelemetry Context

The key to effective logging is structure and correlation. Every log should be JSON with a schema, and should include trace context.

```javascript
const pino = require('pino');
const { trace, context } = require('@opentelemetry/api');

const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

function logWithTrace(level, message, extra = {}) {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();

  logger[level]({
    message,
    trace_id: spanContext?.traceId,
    span_id: spanContext?.spanId,
    service: 'payment-service',
    ...extra,
  });
}

// Usage
app.post('/payments', async (req, res) => {
  logWithTrace('info', 'Payment initiated', {
    order_id: req.body.orderId,
    amount: req.body.amount,
  });

  try {
    const result = await processPayment(req.body);
    logWithTrace('info', 'Payment succeeded', { payment_id: result.id });
    res.json(result);
  } catch (error) {
    logWithTrace('error', 'Payment failed', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Payment processing failed' });
  }
});
```

The `trace_id` and `span_id` fields let you jump from a trace to related logs, or from a log to the full trace.

### Log Levels and Sampling

Not all logs are equally important. Use levels appropriately and sample aggressively.

**ERROR**: Something failed that requires attention. Keep 100%.

**WARN**: Something unexpected but handled. Keep 100% or sample 50%.

**INFO**: Normal operations. Sample heavily (5-10%) in production.

**DEBUG**: Verbose details for development. Disable in production or use feature flags to enable temporarily.

```javascript
const sampleRate = process.env.INFO_LOG_SAMPLE_RATE || 0.05;

function shouldSampleInfo() {
  return Math.random() < sampleRate;
}

function logInfo(message, extra) {
  if (shouldSampleInfo()) {
    logWithTrace('info', message, extra);
  }
}
```

## Decision Framework: Which Signal to Use

Here's how to decide for common scenarios:

### Scenario: Track Total Requests

**Use**: Metric (Counter)

**Why**: You need aggregated counts, not individual request details. Metrics are cheap and fast.

```javascript
requestCounter.add(1, { 'http.method': req.method });
```

### Scenario: Alert on High Error Rate

**Use**: Metric (Counter with error status)

**Why**: Alerting requires real-time aggregation. Metrics excel at this.

```javascript
requestCounter.add(1, {
  'http.method': req.method,
  'http.status_code': res.statusCode,
  'error': res.statusCode >= 500,
});
```

Alert when `sum(rate(requests{error=true})) > threshold`.

### Scenario: Debug Why a Specific Request Failed

**Use**: Trace + Logs

**Why**: You need the full request lifecycle and detailed error context.

Start with the trace to see which operation failed and how long each step took. Then use the trace ID to query logs for detailed error messages and stack traces.

### Scenario: Understand Which Database Query is Slow

**Use**: Trace

**Why**: Traces show individual query durations and parameters.

```javascript
const span = tracer.startSpan('db.query', {
  attributes: {
    'db.system': 'postgresql',
    'db.statement': 'SELECT * FROM users WHERE id = $1',
    'db.user': 'app_readonly',
  }
});

const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
span.end();
```

Auto-instrumentation for popular databases does this automatically.

### Scenario: Monitor Average Response Time Over 24 Hours

**Use**: Metric (Histogram)

**Why**: You need percentiles (p50, p95, p99) over time. Metrics aggregate efficiently.

```javascript
requestDuration.record(durationMs, {
  'http.method': req.method,
  'http.route': req.route.path,
});
```

Query for `histogram_quantile(0.95, http_server_duration)` to get p95.

### Scenario: Record Detailed Audit Trail for Compliance

**Use**: Logs

**Why**: You need detailed, queryable records of who did what, including context that doesn't fit structured telemetry.

```javascript
logWithTrace('info', 'User data accessed', {
  accessed_by: req.user.id,
  target_user: targetUserId,
  fields: ['email', 'phone', 'address'],
  reason: 'customer_support_request',
  ticket_id: ticketId,
});
```

### Scenario: See Request Flow Across Multiple Services

**Use**: Traces

**Why**: Traces automatically propagate context across service boundaries via HTTP headers.

Service A:

```javascript
// OpenTelemetry automatically injects trace context into outgoing HTTP headers
const response = await fetch('http://service-b/api/users', {
  headers: {
    'X-User-Id': userId,
  }
});
```

Service B:

```javascript
// OpenTelemetry automatically extracts trace context from incoming headers
app.get('/api/users', (req, res) => {
  // This span is automatically a child of the span in Service A
  const user = await getUserFromDatabase(req.headers['x-user-id']);
  res.json(user);
});
```

The trace spans both services, showing the full request path.

### Scenario: Track Business KPIs (Revenue, Signups, etc.)

**Use**: Metric (Counter or Gauge)

**Why**: Business metrics need aggregation and trending over time.

```javascript
const revenueCounter = meter.createCounter('business.revenue', {
  description: 'Total revenue in cents',
  unit: 'cents',
});

const activeSubscriptions = meter.createObservableGauge('business.subscriptions.active', {
  description: 'Current number of active subscriptions',
});

// On successful payment
revenueCounter.add(amountInCents, {
  'payment.method': 'credit_card',
  'customer.tier': 'enterprise',
});
```

### Scenario: Debug Memory Leak

**Use**: Metrics + Traces + Logs

**Why**: You need multiple signals working together.

1. **Metrics**: Show memory growing over time
2. **Traces**: Identify which requests correlate with memory increase
3. **Logs**: Provide detailed context about what those requests did

This is an example of signal correlation. Start broad with metrics, narrow down with traces, get details from logs.

## Combining Signals: Correlation

The real power comes from linking signals together.

### Metrics to Traces (Exemplars)

When a metric value is recorded, attach an exemplar: a sample trace ID representing that data point.

If p95 latency spikes, the exemplar gives you a trace ID for a slow request. Jump directly from the metric graph to a specific trace showing what was slow.

OpenTelemetry supports this automatically:

```javascript
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const meterProvider = new MeterProvider({
  // Exemplars are enabled by default with trace-based sampling
});
```

### Traces to Logs (Context Injection)

Every log should include `trace_id` and `span_id` from the active span:

```javascript
function logWithTrace(level, message, extra) {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();

  logger[level]({
    message,
    trace_id: spanContext?.traceId,
    span_id: spanContext?.spanId,
    ...extra,
  });
}
```

When investigating a trace, query logs by `trace_id` to see all log events during that request.

### Logs to Metrics (Aggregation)

Don't query logs to compute metrics in real-time. Instead, parse logs and emit metrics.

```javascript
app.use((req, res, next) => {
  res.on('finish', () => {
    requestCounter.add(1, {
      'http.status_code': res.statusCode,
      'http.method': req.method,
    });

    if (res.statusCode >= 500) {
      logWithTrace('error', 'Server error', {
        status_code: res.statusCode,
        path: req.path,
      });
    }
  });
  next();
});
```

You get both: a metric for alerting and dashboards, and a log for debugging individual errors.

## Cost and Storage Considerations

Different signals have different costs:

**Metrics**: Cheapest. Fixed storage per time series regardless of traffic volume.

**Logs**: Moderate to expensive. Cost scales with log volume. Use sampling and retention policies.

**Traces**: Most expensive. Cost scales with request volume and span count. Requires aggressive sampling in production.

### Sampling Strategies

**Metrics**: Never sample. Always record all metric values.

**Logs**: Sample INFO and DEBUG logs heavily. Keep ERROR and WARN logs.

**Traces**: Use head sampling (probabilistic) or tail sampling (keep interesting traces).

```yaml
# Collector tail sampling config
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 500 }
      - name: sample
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

Keep all error traces, all slow traces, and 5% of normal traces.

## Practical Patterns

### Pattern: Metrics for Alerting, Traces for Debugging

Alert on metrics (cheap, fast, aggregated). When an alert fires, jump to traces to debug.

```javascript
// Metric for alerting
errorCounter.add(1, { 'error.type': 'payment_failure' });

// Trace for debugging
const span = tracer.startSpan('payment.charge');
span.recordException(error);
span.setStatus({ code: 2 });
span.end();
```

### Pattern: Logs for Audit, Metrics for Monitoring

Use logs for compliance and audit trails. Use metrics for operational monitoring.

```javascript
// Log for audit trail (who did what)
logWithTrace('info', 'PII accessed', {
  accessed_by: userId,
  resource: 'customer_email',
  customer_id: customerId,
});

// Metric for monitoring (how many times)
piiAccessCounter.add(1, {
  'resource.type': 'customer_email',
  'user.role': userRole,
});
```

### Pattern: Traces for Request Flow, Metrics for Throughput

Use traces to understand individual request execution. Use metrics to monitor system-wide throughput.

```javascript
// Trace shows request flow
const span = tracer.startSpan('order.process');
await validateInventory();
await chargePayment();
await shipOrder();
span.end();

// Metric shows throughput
ordersProcessedCounter.add(1, { 'order.type': 'subscription' });
```

## Common Anti-Patterns

**Anti-Pattern**: Using logs for alerting

Don't query logs to compute error rates. Slow, expensive, unreliable.

**Fix**: Emit a metric when logging errors.

**Anti-Pattern**: Tracing every request in production

At scale, 100% tracing is expensive and unnecessary.

**Fix**: Sample traces (keep errors, slow requests, and a percentage of normal requests).

**Anti-Pattern**: High-cardinality metric labels

Adding `user_id` or `request_id` to metrics creates unbounded time series.

**Fix**: Use traces or logs for high-cardinality data.

**Anti-Pattern**: Computing percentiles from logs

Querying millions of logs to compute p95 latency is slow and expensive.

**Fix**: Use histogram metrics for latency percentiles.

## Key Takeaways

Choose the right signal for the job:
- **Metrics** for aggregation, alerting, and dashboards
- **Traces** for request-level debugging and distributed flow
- **Logs** for detailed context, audit trails, and unstructured data

Combine signals through correlation (exemplars, trace context in logs).

Sample expensive signals (traces and logs) aggressively, but never sample metrics.

Start with metrics for alerting, use traces to narrow down issues, use logs for detailed debugging.

Understanding when to use each signal saves money, improves performance, and makes debugging faster.

## Related Reading

- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [Monitoring vs Observability for SRE](https://oneuptime.com/blog/post/2025-11-28-monitoring-vs-observability-sre/view)
