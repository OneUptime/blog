# How to Create SLI Specification

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, SLI, Reliability, Monitoring

Description: Define Service Level Indicators (SLIs) with precise specifications for measuring availability, latency, and throughput in production systems.

---

## What is an SLI Specification?

An SLI (Service Level Indicator) specification is a formal document that defines exactly how you measure the reliability of a service. It removes ambiguity by answering four questions:

1. What counts as a valid event?
2. What counts as a good event?
3. Where do you measure it?
4. How do you calculate the ratio?

Without a clear specification, teams argue about whether a service is "up" or "down." With a specification, everyone agrees on the math.

---

## The SLI Formula

Every SLI follows the same structure:

```
SLI = (Good Events / Valid Events) * 100%
```

This formula is deceptively simple. The hard part is defining "good" and "valid" precisely.

Consider an API endpoint. You might think "good" means "returned 200 OK." But what about:
- A 200 response that took 30 seconds?
- A 404 for a resource that does not exist?
- A 429 rate limit response?
- A request from an internal health check?

Your specification must address each of these cases explicitly.

---

## The Four Types of SLIs

Most services need SLIs from these four categories:

| SLI Type | What It Measures | Typical Threshold |
|----------|------------------|-------------------|
| Availability | Did the request succeed? | 99.9% success rate |
| Latency | How fast did it respond? | P95 < 200ms |
| Throughput | How many requests per second? | > 1000 RPS sustained |
| Quality | Was the response correct and complete? | 99.5% valid responses |

Different services weight these differently. A real-time gaming API cares most about latency. A batch processing system cares most about throughput. An e-commerce checkout cares about all four.

---

## Availability SLI Specification

Availability answers: "Did the service respond successfully to valid requests?"

### Specification Template

```yaml
sli:
  name: api_availability
  type: availability
  description: Percentage of valid API requests that succeed

  valid_events:
    description: All HTTP requests to the API
    inclusion_criteria:
      - HTTP requests to /api/* endpoints
      - Requests from external clients (not health checks)
      - Requests that reach the application layer
    exclusion_criteria:
      - Health check requests from load balancers
      - Requests blocked by WAF before reaching the app
      - Internal service-to-service calls
      - Requests during planned maintenance windows

  good_events:
    description: Requests that return a successful response
    criteria:
      - HTTP status code in range 2xx or 3xx
      - HTTP status code 4xx (client errors are not service failures)
    exclusion_criteria:
      - HTTP status code 5xx (server errors)
      - Requests that timeout before responding
      - Requests that return malformed responses

  measurement:
    source: application_logs
    query: |
      count(status >= 200 AND status < 500) / count(*)
      WHERE endpoint LIKE '/api/%'
      AND source != 'health_check'
    window: 5 minutes
    aggregation: rolling_average
```

### Implementation Example

Here is how to implement availability tracking in a Node.js Express application. The middleware intercepts every request and records whether it succeeded or failed.

```javascript
// sli-middleware.js
// Records SLI metrics for every incoming request

const prometheus = require('prom-client');

// Counter for total valid requests
const validRequests = new prometheus.Counter({
  name: 'api_requests_total',
  help: 'Total number of valid API requests',
  labelNames: ['endpoint', 'method']
});

// Counter for successful requests (good events)
const goodRequests = new prometheus.Counter({
  name: 'api_requests_success_total',
  help: 'Total number of successful API requests',
  labelNames: ['endpoint', 'method']
});

function sliMiddleware(req, res, next) {
  // Skip health checks - they are not valid events
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  // Skip internal requests
  if (req.headers['x-internal-request'] === 'true') {
    return next();
  }

  // Record the request as a valid event
  const endpoint = normalizeEndpoint(req.path);
  validRequests.inc({ endpoint, method: req.method });

  // Capture the response to determine if it was good
  const originalEnd = res.end;
  res.end = function(...args) {
    // Good event: 2xx, 3xx, or 4xx status codes
    // 4xx is a client error, not a service failure
    if (res.statusCode < 500) {
      goodRequests.inc({ endpoint, method: req.method });
    }
    originalEnd.apply(res, args);
  };

  next();
}

// Normalize endpoints to avoid cardinality explosion
// /users/123 becomes /users/:id
function normalizeEndpoint(path) {
  return path
    .replace(/\/[0-9a-f-]{36}/g, '/:uuid')  // UUIDs
    .replace(/\/\d+/g, '/:id');              // Numeric IDs
}

module.exports = { sliMiddleware, validRequests, goodRequests };
```

The corresponding Prometheus query to calculate availability:

```promql
# Calculate availability SLI over the last 5 minutes
# Result is a percentage between 0 and 100

sum(rate(api_requests_success_total[5m]))
/
sum(rate(api_requests_total[5m]))
* 100
```

---

## Latency SLI Specification

Latency answers: "Did the service respond fast enough?"

Latency SLIs typically use percentiles (P50, P95, P99) rather than averages. Averages hide the pain of slow requests. If your P99 latency is 5 seconds, one in every hundred users waits 5 seconds or more.

### Specification Template

```yaml
sli:
  name: api_latency_p95
  type: latency
  description: 95th percentile response time for API requests

  valid_events:
    description: All completed HTTP requests to the API
    inclusion_criteria:
      - HTTP requests to /api/* endpoints
      - Requests that received a response (any status code)
    exclusion_criteria:
      - Health check requests
      - Requests that were cancelled by the client
      - Long-polling or streaming endpoints

  good_events:
    description: Requests that completed within the latency threshold
    criteria:
      - Response time <= 200ms (P95 threshold)
    note: Measured from first byte received to last byte sent

  measurement:
    source: application_metrics
    metric: http_request_duration_seconds
    percentile: 0.95
    threshold_ms: 200
    query: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket[5m]))
        by (le)
      ) <= 0.2
    window: 5 minutes
```

### Implementation Example

Here is how to track latency using a histogram in Python with the OpenTelemetry SDK. Histograms allow you to calculate any percentile after the fact.

```python
# sli_latency.py
# Tracks request latency using OpenTelemetry histograms

import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Initialize the meter provider
exporter = OTLPMetricExporter(endpoint="http://localhost:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# Create a meter for our application
meter = metrics.get_meter("api_service", "1.0.0")

# Create a histogram for request duration
# Bucket boundaries chosen to give good resolution around our 200ms threshold
request_duration = meter.create_histogram(
    name="http_request_duration_seconds",
    description="Time taken to process HTTP requests",
    unit="s"
)

# Track requests that meet our latency SLI
requests_within_sli = meter.create_counter(
    name="http_requests_within_latency_sli_total",
    description="Requests that completed within the latency SLI threshold"
)

requests_total = meter.create_counter(
    name="http_requests_for_latency_sli_total",
    description="Total requests counted for latency SLI"
)

# Constants
LATENCY_THRESHOLD_SECONDS = 0.2  # 200ms


class LatencySLIMiddleware:
    """
    ASGI middleware that tracks request latency for SLI calculation.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # Skip endpoints that should not count toward latency SLI
        if self._should_skip(path):
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()

        await self.app(scope, receive, send)

        # Calculate duration
        duration = time.perf_counter() - start_time

        # Record the duration in the histogram
        attributes = {
            "endpoint": self._normalize_path(path),
            "method": scope["method"]
        }
        request_duration.record(duration, attributes)

        # Track whether this request met the SLI
        requests_total.add(1, attributes)
        if duration <= LATENCY_THRESHOLD_SECONDS:
            requests_within_sli.add(1, attributes)

    def _should_skip(self, path: str) -> bool:
        """Skip health checks and internal endpoints."""
        skip_prefixes = ["/health", "/ready", "/metrics", "/_internal"]
        return any(path.startswith(prefix) for prefix in skip_prefixes)

    def _normalize_path(self, path: str) -> str:
        """Normalize path to prevent cardinality explosion."""
        import re
        # Replace UUIDs and numeric IDs with placeholders
        path = re.sub(r'/[0-9a-f-]{36}', '/:uuid', path)
        path = re.sub(r'/\d+', '/:id', path)
        return path
```

The Prometheus query to check if we are meeting our latency SLI:

```promql
# Calculate the percentage of requests meeting the 200ms latency threshold
# Uses the histogram to determine how many requests fell in buckets <= 0.2s

sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m]))
/
sum(rate(http_request_duration_seconds_count[5m]))
* 100
```

---

## Throughput SLI Specification

Throughput answers: "Can the service handle the expected load?"

Throughput SLIs are often used for batch processing systems, message queues, and data pipelines where the goal is processing volume rather than individual request success.

### Specification Template

```yaml
sli:
  name: message_processing_throughput
  type: throughput
  description: Rate of messages processed per second

  valid_events:
    description: Messages submitted to the processing queue
    inclusion_criteria:
      - Messages with valid schema
      - Messages within size limits (< 1MB)
    exclusion_criteria:
      - Duplicate messages (same message ID)
      - Messages from test/staging environments

  good_events:
    description: Messages successfully processed
    criteria:
      - Message acknowledged by consumer
      - Processing completed without error
      - Result written to destination store

  measurement:
    source: queue_metrics
    target_rate: 1000  # messages per second
    query: |
      rate(messages_processed_total[1m]) >= 1000
    window: 1 minute
    sustained_period: 5 minutes
```

### Implementation Example

Here is a Go implementation for tracking throughput in a message processing service. It uses counters to track messages received and processed.

```go
// sli_throughput.go
// Tracks message processing throughput for SLI calculation

package sli

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// ThroughputTracker tracks message processing throughput
type ThroughputTracker struct {
    messagesReceived  metric.Int64Counter
    messagesProcessed metric.Int64Counter
    messagesFailed    metric.Int64Counter
    processingTime    metric.Float64Histogram
}

// NewThroughputTracker creates a new throughput tracker
func NewThroughputTracker() (*ThroughputTracker, error) {
    meter := otel.Meter("message_processor")

    received, err := meter.Int64Counter(
        "messages_received_total",
        metric.WithDescription("Total messages received from queue"),
    )
    if err != nil {
        return nil, err
    }

    processed, err := meter.Int64Counter(
        "messages_processed_total",
        metric.WithDescription("Total messages successfully processed"),
    )
    if err != nil {
        return nil, err
    }

    failed, err := meter.Int64Counter(
        "messages_failed_total",
        metric.WithDescription("Total messages that failed processing"),
    )
    if err != nil {
        return nil, err
    }

    processingTime, err := meter.Float64Histogram(
        "message_processing_seconds",
        metric.WithDescription("Time to process a message"),
    )
    if err != nil {
        return nil, err
    }

    return &ThroughputTracker{
        messagesReceived:  received,
        messagesProcessed: processed,
        messagesFailed:    failed,
        processingTime:    processingTime,
    }, nil
}

// RecordReceived records a message being received from the queue
func (t *ThroughputTracker) RecordReceived(ctx context.Context, queueName string) {
    attrs := attribute.String("queue", queueName)
    t.messagesReceived.Add(ctx, 1, metric.WithAttributes(attrs))
}

// RecordProcessed records a message being successfully processed
func (t *ThroughputTracker) RecordProcessed(ctx context.Context, queueName string, duration time.Duration) {
    attrs := attribute.String("queue", queueName)
    t.messagesProcessed.Add(ctx, 1, metric.WithAttributes(attrs))
    t.processingTime.Record(ctx, duration.Seconds(), metric.WithAttributes(attrs))
}

// RecordFailed records a message that failed processing
func (t *ThroughputTracker) RecordFailed(ctx context.Context, queueName string, reason string) {
    attrs := []attribute.KeyValue{
        attribute.String("queue", queueName),
        attribute.String("failure_reason", reason),
    }
    t.messagesFailed.Add(ctx, 1, metric.WithAttributes(attrs...))
}

// Example usage in a message consumer
func (t *ThroughputTracker) ProcessMessage(ctx context.Context, msg Message) error {
    queueName := msg.Queue

    // Record that we received the message
    t.RecordReceived(ctx, queueName)

    startTime := time.Now()

    // Process the message
    err := processMessageLogic(msg)

    duration := time.Since(startTime)

    if err != nil {
        t.RecordFailed(ctx, queueName, categorizeError(err))
        return err
    }

    t.RecordProcessed(ctx, queueName, duration)
    return nil
}
```

Prometheus query to check throughput SLI:

```promql
# Calculate current throughput rate
# Alert if sustained throughput drops below target

avg_over_time(
  rate(messages_processed_total[1m])[5m:]
) >= 1000
```

---

## Quality SLI Specification

Quality answers: "Was the response correct and complete?"

Quality SLIs catch issues that availability misses. A service might return 200 OK but with stale data, missing fields, or incorrect calculations. Quality SLIs require domain-specific validation.

### Specification Template

```yaml
sli:
  name: search_result_quality
  type: quality
  description: Percentage of search requests returning relevant results

  valid_events:
    description: Search requests that return results
    inclusion_criteria:
      - Search queries with at least one result
      - Queries from logged-in users (have relevance feedback)
    exclusion_criteria:
      - Queries with zero results (different SLI)
      - Bot traffic
      - Test queries

  good_events:
    description: Search results where user engaged with results
    criteria:
      - User clicked on at least one result within 30 seconds
      - OR user did not perform a refined search within 60 seconds
    note: Engagement proxy for result relevance

  measurement:
    source: clickstream_events
    query: |
      count(searches WHERE has_click OR no_refinement_within_60s)
      / count(searches)
    window: 1 hour
    aggregation: rolling_average
```

### Quality Validation Examples

Different domains have different quality criteria. Here are examples for common scenarios.

For an API returning user profiles:

```javascript
// quality_validator.js
// Validates response quality for SLI tracking

const qualityChecks = new Map();

// Define quality checks for different endpoints
qualityChecks.set('/api/users/:id', {
  validate: (response) => {
    const checks = [];

    // Required fields must be present
    checks.push({
      name: 'has_required_fields',
      pass: response.id && response.email && response.created_at
    });

    // Data must be fresh (updated within last 24 hours for active users)
    if (response.last_active) {
      const lastActive = new Date(response.last_active);
      const updatedAt = new Date(response.updated_at);
      const hoursSinceUpdate = (Date.now() - updatedAt) / (1000 * 60 * 60);

      checks.push({
        name: 'data_freshness',
        pass: hoursSinceUpdate < 24
      });
    }

    // Email format validation
    checks.push({
      name: 'valid_email_format',
      pass: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(response.email)
    });

    return checks.every(c => c.pass);
  }
});

qualityChecks.set('/api/orders/:id', {
  validate: (response) => {
    const checks = [];

    // Order total must match line items
    const calculatedTotal = response.line_items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    checks.push({
      name: 'total_matches_items',
      pass: Math.abs(calculatedTotal - response.total) < 0.01
    });

    // Status must be valid
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    checks.push({
      name: 'valid_status',
      pass: validStatuses.includes(response.status)
    });

    // Timestamps must be logical
    if (response.shipped_at && response.created_at) {
      checks.push({
        name: 'logical_timestamps',
        pass: new Date(response.shipped_at) > new Date(response.created_at)
      });
    }

    return checks.every(c => c.pass);
  }
});

function validateResponseQuality(endpoint, response) {
  // Normalize the endpoint
  const normalizedEndpoint = endpoint
    .replace(/\/[0-9a-f-]{36}/g, '/:uuid')
    .replace(/\/\d+/g, '/:id');

  const checker = qualityChecks.get(normalizedEndpoint);
  if (!checker) {
    // No quality checks defined for this endpoint
    return true;
  }

  return checker.validate(response);
}

module.exports = { validateResponseQuality };
```

---

## Complete SLI Specification Document

Here is a full SLI specification document for a hypothetical e-commerce API. Use this as a template for your own services.

```yaml
# sli-specification.yaml
# E-Commerce API SLI Specification
# Version: 1.2.0
# Last Updated: 2026-01-30
# Owner: Platform Team

service:
  name: ecommerce-api
  description: Core API for product catalog, cart, and checkout
  tier: critical
  owner: platform-team@company.com

---

slis:
  - name: api_availability
    type: availability
    description: Percentage of API requests that succeed
    target: 99.9%

    valid_events:
      source: nginx_access_logs
      filter: |
        request_uri LIKE '/api/%'
        AND user_agent NOT LIKE '%HealthCheck%'
        AND user_agent NOT LIKE '%monitoring%'
        AND status != 499  # Client closed connection

    good_events:
      filter: |
        status >= 200 AND status < 500

    exclusions:
      - description: Planned maintenance windows
        filter: during_maintenance_window = true
      - description: Load balancer health checks
        filter: request_uri = '/health'
      - description: Requests blocked by rate limiting
        filter: status = 429
        reason: Rate limiting is intentional protection

    measurement:
      window: 5m
      query: |
        SELECT
          count_if(status >= 200 AND status < 500) AS good,
          count(*) AS valid,
          good / valid * 100 AS sli_value
        FROM nginx_logs
        WHERE {{ valid_events_filter }}
          AND {{ exclusions }}
        GROUP BY time_bucket('5 minutes', timestamp)

  - name: checkout_latency_p95
    type: latency
    description: 95th percentile latency for checkout flow
    target: 500ms

    valid_events:
      source: application_traces
      filter: |
        span_name = 'POST /api/checkout'
        AND span_kind = 'server'
        AND status_code != 'cancelled'

    good_events:
      filter: |
        duration_ms <= 500

    measurement:
      window: 5m
      query: |
        SELECT
          percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
          CASE WHEN p95 <= 500 THEN 1 ELSE 0 END AS meets_sli
        FROM traces
        WHERE {{ valid_events_filter }}
        GROUP BY time_bucket('5 minutes', timestamp)

  - name: search_latency_p99
    type: latency
    description: 99th percentile latency for product search
    target: 200ms

    valid_events:
      source: application_traces
      filter: |
        span_name LIKE 'GET /api/products/search%'
        AND span_kind = 'server'

    good_events:
      filter: |
        duration_ms <= 200

    measurement:
      window: 5m
      percentile: 0.99

  - name: order_processing_throughput
    type: throughput
    description: Orders processed per minute
    target: 100 orders/minute sustained

    valid_events:
      source: order_events
      filter: |
        event_type = 'order_submitted'
        AND NOT is_test_order

    good_events:
      filter: |
        event_type = 'order_confirmed'
        AND processing_time_ms < 30000

    measurement:
      window: 1m
      sustained_window: 5m
      query: |
        SELECT
          count(*) AS orders_processed,
          CASE WHEN orders_processed >= 100 THEN 1 ELSE 0 END AS meets_sli
        FROM order_events
        WHERE {{ good_events_filter }}
        GROUP BY time_bucket('1 minute', timestamp)

  - name: inventory_accuracy
    type: quality
    description: Percentage of inventory counts matching physical stock
    target: 99.5%

    valid_events:
      source: inventory_audits
      filter: |
        audit_type = 'spot_check'
        AND product_status = 'active'

    good_events:
      filter: |
        abs(system_count - physical_count) <= 1
        OR (system_count = 0 AND physical_count = 0)

    measurement:
      window: 24h
      query: |
        SELECT
          count_if(abs(system_count - physical_count) <= 1) AS accurate,
          count(*) AS total,
          accurate / total * 100 AS accuracy_percentage
        FROM inventory_audits
        WHERE {{ valid_events_filter }}

---

alerting:
  burn_rate_alerts:
    - name: api_availability_fast_burn
      sli: api_availability
      short_window: 5m
      long_window: 1h
      burn_rate: 14.4
      severity: critical

    - name: api_availability_slow_burn
      sli: api_availability
      short_window: 6h
      long_window: 3d
      burn_rate: 1
      severity: warning

---

review_schedule:
  frequency: quarterly
  participants:
    - Platform Team
    - Product Engineering
    - Customer Success
  agenda:
    - Review SLI accuracy (do they reflect user experience?)
    - Adjust targets based on business needs
    - Identify gaps in coverage
    - Update exclusions as needed
```

---

## Best Practices for SLI Specification

### 1. Start With User Journeys

Do not start with system metrics. Start with what users do:
- "User logs in" becomes an availability + latency SLI
- "User searches for products" becomes a latency + quality SLI
- "User completes checkout" becomes an availability + latency SLI

### 2. Define Exclusions Explicitly

Every SLI specification should list what is excluded and why:

| Exclusion | Reason |
|-----------|--------|
| Health check requests | Not user traffic |
| Requests during maintenance | Expected downtime |
| Rate-limited requests (429) | Intentional protection |
| Client-cancelled requests (499) | Not a server failure |
| Bot traffic | Not representative of user experience |
| Test/staging traffic | Would skew production metrics |

### 3. Choose Measurement Points Carefully

Where you measure affects what you see:

| Measurement Point | Pros | Cons |
|-------------------|------|------|
| Load balancer | Sees all traffic | Misses application-level issues |
| Application code | Most accurate for business logic | Misses infrastructure issues |
| Client-side | True user experience | Hard to collect, noisy |
| Synthetic monitors | Consistent, controlled | Not real user traffic |

For most SLIs, measure at the application layer and supplement with synthetic monitoring.

### 4. Handle Edge Cases

Your specification should address these scenarios:

```yaml
edge_cases:
  - scenario: Partial success
    example: Batch API returns 200 but 3 of 10 items failed
    decision: Count as partial failure, weight by items

  - scenario: Slow success
    example: Request succeeds but takes 30 seconds
    decision: Good for availability, bad for latency

  - scenario: Fast failure
    example: Request fails in 5ms
    decision: Bad for availability, neutral for latency

  - scenario: Retry success
    example: First attempt fails, retry succeeds
    decision: Count both attempts for availability

  - scenario: Cached response
    example: Response served from CDN cache
    decision: Include in SLI (still user experience)
```

### 5. Version Your Specifications

SLI definitions change over time. Track versions:

```yaml
changelog:
  - version: 1.2.0
    date: 2026-01-30
    changes:
      - Added inventory_accuracy quality SLI
      - Changed checkout latency target from 1s to 500ms
      - Excluded 429 responses from availability calculation

  - version: 1.1.0
    date: 2025-10-15
    changes:
      - Added search_latency_p99 SLI
      - Refined bot detection exclusion rules

  - version: 1.0.0
    date: 2025-06-01
    changes:
      - Initial specification
```

---

## Common SLI Specification Mistakes

### Mistake 1: Using Averages for Latency

Averages hide outliers. A P99 of 10 seconds can hide behind a 100ms average.

```yaml
# Bad
latency_sli:
  good_events:
    criteria: average_response_time < 200ms

# Good
latency_sli:
  good_events:
    criteria: p95_response_time < 200ms
```

### Mistake 2: Counting Everything as Valid

Not all requests represent user experience.

```yaml
# Bad - includes health checks and bots
valid_events:
  filter: all HTTP requests

# Good - focuses on real user traffic
valid_events:
  filter: |
    HTTP requests
    AND NOT health_check
    AND NOT internal_service
    AND NOT known_bot_user_agent
```

### Mistake 3: Treating All Errors the Same

A 404 (not found) is different from a 500 (server error).

```yaml
# Bad - treats 404 as failure
good_events:
  criteria: status = 200

# Good - only server errors are failures
good_events:
  criteria: status < 500
```

### Mistake 4: Missing Timeout Handling

Requests that timeout are often not counted at all.

```yaml
# Make sure to include timeouts as failures
good_events:
  criteria: |
    status < 500
    AND response_received = true
    AND NOT timed_out
```

### Mistake 5: No Exclusion for Planned Maintenance

Planned maintenance should not burn error budget.

```yaml
exclusions:
  - name: planned_maintenance
    filter: |
      timestamp BETWEEN maintenance_start AND maintenance_end
    documentation: Maintenance windows are published 48 hours in advance
```

---

## SLI Specification Checklist

Before finalizing your SLI specification, verify:

**Clarity**
- [ ] Can a new team member understand the specification without asking questions?
- [ ] Are all terms defined (what is a "valid" request, what is "success")?
- [ ] Are edge cases documented?

**Accuracy**
- [ ] Does the SLI reflect actual user experience?
- [ ] Have you validated the measurement matches reality?
- [ ] Are exclusions justified and documented?

**Operability**
- [ ] Can you query this SLI in under 30 seconds?
- [ ] Is the data source reliable and available?
- [ ] Do you have alerts configured for SLI degradation?

**Governance**
- [ ] Is there an owner for this SLI specification?
- [ ] Is there a review schedule?
- [ ] Is there a changelog?

---

## Tools for SLI Implementation

| Tool | Use Case | Notes |
|------|----------|-------|
| OpenTelemetry | Instrumentation | Standard for metrics, logs, traces |
| Prometheus | Metrics storage | Good for high-cardinality SLIs |
| OneUptime | SLO management | Built-in error budget tracking |
| Grafana | Visualization | Dashboards for SLI trends |
| Sloth | SLO generation | Generates Prometheus rules from specs |

---

## Putting It All Together

A well-written SLI specification is the foundation of your reliability practice. It transforms vague notions of "the service should be reliable" into precise, measurable commitments.

Start with one SLI for your most critical user journey. Define it precisely. Implement measurement. Set up alerting. Then expand to cover more journeys.

Remember: the goal is not to have the most SLIs. The goal is to have SLIs that accurately reflect whether your users are happy.

Your future self, debugging an incident at 2 AM, will thank you for the clarity.

---

**Related Reading:**

- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [The Ultimate SRE Reliability Checklist](https://oneuptime.com/blog/post/2025-09-10-sre-checklist/view)
- [18 SRE Metrics Worth Tracking](https://oneuptime.com/blog/post/2025-11-28-sre-metrics-to-track/view)
