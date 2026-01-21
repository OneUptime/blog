# How to Join Log Streams in LogQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Log Correlation, Distributed Tracing, Request Tracking, Microservices

Description: A comprehensive guide to correlating and joining log streams in LogQL, covering request ID tracking, distributed tracing integration, multi-service log correlation, and techniques for following requests across services.

---

In microservices architectures, a single user request often spans multiple services. Correlating logs across these services is essential for debugging and understanding system behavior. This guide covers techniques for joining and correlating log streams in Loki.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployed with logs from multiple services
- Applications instrumented with correlation IDs
- Understanding of distributed tracing concepts
- Grafana connected to Loki

## Understanding Log Correlation

### The Challenge

In distributed systems, a single request generates logs across:
- API Gateway
- Authentication Service
- Business Logic Services
- Database Services
- External API Calls

Without correlation, these logs are disconnected and difficult to trace.

### The Solution: Correlation IDs

```
Service A: [req-12345] Received request for /api/orders
Service B: [req-12345] Processing order validation
Service C: [req-12345] Checking inventory
Service B: [req-12345] Order validated successfully
Service A: [req-12345] Request completed in 234ms
```

## Implementing Correlation IDs

### Request ID Header

```javascript
// Node.js Express middleware
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Log with request ID
logger.info('Processing request', { requestId: req.requestId, path: req.path });
```

### Python FastAPI

```python
import uuid
from fastapi import Request
import structlog

logger = structlog.get_logger()

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(request_id=request_id)

    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response
```

### Go Gin Middleware

```go
func RequestIDMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        c.Set("request_id", requestID)
        c.Header("X-Request-ID", requestID)

        logger.Info("Request received",
            zap.String("request_id", requestID),
            zap.String("path", c.Request.URL.Path),
        )
        c.Next()
    }
}
```

## Querying Correlated Logs

### Basic Correlation Query

```logql
# Find all logs for a specific request
{job=~".*-service"} |= "req-12345"
```

### JSON Format Correlation

```logql
# Parse JSON and filter by request ID
{job=~".*-service"}
| json
| request_id = "req-12345"
```

### Multi-Service Query

```logql
# Query specific services
{job=~"(api-gateway|order-service|payment-service|inventory-service)"}
| json
| request_id = "req-12345"
| line_format "{{.job}} - {{.level}}: {{.message}}"
```

## Distributed Tracing Integration

### Trace ID Correlation

When using OpenTelemetry or Jaeger:

```logql
# Find logs by trace ID
{job=~".*-service"}
| json
| trace_id = "abc123def456"
```

### Span-Level Correlation

```logql
# Find logs for specific span
{job=~".*-service"}
| json
| trace_id = "abc123"
| span_id = "span456"
```

### Link Loki to Tempo

In Grafana, configure derived fields to link logs to traces:

```yaml
# Grafana Loki data source config
derivedFields:
  - name: TraceID
    matcherRegex: "trace_id=([a-f0-9]+)"
    url: "${__value.raw}"
    datasourceUid: tempo
    urlDisplayLabel: "View Trace"
```

## Advanced Correlation Techniques

### Following Request Flow

```logql
# Get chronological view of request
{job=~".*-service"}
| json
| request_id = "req-12345"
| line_format "{{.timestamp}} [{{.job}}] {{.level}}: {{.message}}"
| sort by (timestamp)
```

### Cross-Service Error Tracking

```logql
# Find where request failed
{job=~".*-service"}
| json
| request_id = "req-12345"
| level = "error"
```

### Request Timeline

```logql
# Calculate service timing
{job=~".*-service"}
| json
| request_id = "req-12345"
| line_format "{{.timestamp}} [{{.job}}] duration={{.duration_ms}}ms"
```

## User Session Correlation

### Session-Based Queries

```logql
# All logs for user session
{job=~".*-service"}
| json
| session_id = "sess-abc123"
```

### User Journey Tracking

```logql
# Track user across services
{job=~".*-service"}
| json
| user_id = "user-12345"
| line_format "{{.timestamp}} [{{.job}}] {{.action}}"
```

## Transaction Correlation

### Database Transaction Tracking

```logql
# Follow database transaction
{job=~"(app|database)"}
| json
| transaction_id = "txn-999"
```

### Payment Flow Tracking

```logql
# Track payment across services
{job=~"(api|payment|fraud|bank-integration)"}
| json
| payment_id = "pay-12345"
| line_format "{{.timestamp}} [{{.job}}] {{.status}}: {{.message}}"
```

## Correlation with Labels

### Using Promtail Labels

Configure Promtail to extract correlation IDs as labels:

```yaml
# promtail.yaml
scrape_configs:
  - job_name: app
    pipeline_stages:
      - json:
          expressions:
            request_id: request_id
      - labels:
          request_id:
```

Query with label:

```logql
{request_id="req-12345"}
```

**Caution**: High-cardinality labels can impact performance.

### Selective Label Extraction

```yaml
# Only label recent/important requests
pipeline_stages:
  - json:
      expressions:
        level: level
        request_id: request_id
  - match:
      selector: '{level="error"}'
      stages:
        - labels:
            request_id:
```

## Grafana Dashboard Techniques

### Variable-Based Correlation

Create a dashboard variable:

```
Variable: request_id
Query: {job=~".*-service"} |~ "request_id" | json | line_format "{{.request_id}}" | dedup
```

Use in panel:

```logql
{job=~".*-service"}
| json
| request_id = "$request_id"
```

### Multi-Panel Correlation

Create separate panels for each service:

```logql
# Panel 1: API Gateway
{job="api-gateway"} | json | request_id = "$request_id"

# Panel 2: Order Service
{job="order-service"} | json | request_id = "$request_id"

# Panel 3: Payment Service
{job="payment-service"} | json | request_id = "$request_id"
```

### Timeline View

Use Grafana's Logs panel with:
- Sort by time
- Show timestamp column
- Colorize by service

## Correlation Metrics

### Request Flow Metrics

```logql
# Count logs per service for request
sum by (job) (
  count_over_time(
    {job=~".*-service"}
    | json
    | request_id = "req-12345"
    [24h]
  )
)
```

### Error Rate by Request Path

```logql
# Correlation of errors with request types
sum by (path) (
  rate(
    {job="api-gateway"}
    | json
    | level = "error"
    [5m]
  )
)
```

## Best Practices

### Correlation ID Standards

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Order processed",
  "request_id": "req-12345",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "user_id": "user-001",
  "session_id": "sess-xyz"
}
```

### ID Generation

Use UUIDs or sortable IDs:

```javascript
// UUID v4
const requestId = uuid.v4();  // 550e8400-e29b-41d4-a716-446655440000

// ULID (sortable)
const requestId = ulid();  // 01ARZ3NDEKTSV4RRFFQ69G5FAV

// Custom format
const requestId = `req-${Date.now()}-${randomString(8)}`;
```

### Propagation Headers

Standard headers to propagate:

```
X-Request-ID: req-12345
X-Correlation-ID: corr-67890
X-Trace-ID: abc123
traceparent: 00-abc123-def456-01
```

### Service Naming

Use consistent, descriptive names:

```yaml
# Good
job: order-service
job: payment-gateway
job: user-authentication

# Avoid
job: svc1
job: app
job: backend
```

## Troubleshooting Correlation

### Missing Correlation IDs

```logql
# Find logs without request_id
{job="order-service"}
| json
| request_id = ""
```

### Broken Correlation Chain

```logql
# Find where correlation breaks
{job=~".*-service"}
|= "req-12345"
| json
| line_format "{{.job}}: has_request_id={{if .request_id}}yes{{else}}no{{end}}"
```

### Timing Issues

```logql
# Check for timestamp ordering issues
{job=~".*-service"}
| json
| request_id = "req-12345"
| line_format "{{.timestamp}} {{.job}}"
```

## Example: Full Request Flow

### Setup

```javascript
// API Gateway
logger.info('Request received', {
  request_id: 'req-12345',
  method: 'POST',
  path: '/api/orders',
  user_id: 'user-001'
});

// Order Service
logger.info('Creating order', {
  request_id: 'req-12345',
  order_id: 'order-789',
  items: 3
});

// Inventory Service
logger.info('Checking inventory', {
  request_id: 'req-12345',
  order_id: 'order-789',
  status: 'available'
});

// Payment Service
logger.info('Processing payment', {
  request_id: 'req-12345',
  order_id: 'order-789',
  amount: 99.99
});

// API Gateway
logger.info('Request completed', {
  request_id: 'req-12345',
  duration_ms: 234,
  status: 'success'
});
```

### Query

```logql
{job=~"(api-gateway|order-service|inventory-service|payment-service)"}
| json
| request_id = "req-12345"
| line_format "{{.timestamp}} [{{.job}}] {{.message}}"
```

### Result

```
2024-01-15T10:30:00.000Z [api-gateway] Request received
2024-01-15T10:30:00.050Z [order-service] Creating order
2024-01-15T10:30:00.100Z [inventory-service] Checking inventory
2024-01-15T10:30:00.150Z [payment-service] Processing payment
2024-01-15T10:30:00.234Z [api-gateway] Request completed
```

## Conclusion

Correlating logs across services is essential for debugging distributed systems. Key takeaways:

- Implement correlation IDs in all services
- Use consistent log formats with JSON
- Propagate correlation headers between services
- Integrate with distributed tracing (Tempo/Jaeger)
- Build Grafana dashboards for correlated views
- Avoid high-cardinality labels for correlation IDs

With proper log correlation, you can effectively debug complex distributed systems and understand request flows across your microservices architecture.
