# How to Use OpenTelemetry Trace Waterfalls to Debug Slow API Responses in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Traces, Debugging, Performance

Description: Use OpenTelemetry trace waterfalls to systematically identify and fix the root cause of slow API responses in production environments.

Your monitoring dashboard shows that the P99 latency for the `/api/v1/orders` endpoint spiked from 800ms to 4.2 seconds. Customers are complaining. You need to find the bottleneck, and you need to find it fast. This is exactly what trace waterfalls are designed for.

## What a Trace Waterfall Shows

A trace waterfall is a visual representation of all the spans in a single request, arranged by time. Each bar represents a span (a unit of work), and the width of the bar represents its duration. Child spans are nested under their parent. The longest bar is usually your bottleneck.

## Step 1: Find a Slow Trace

Start by querying your trace backend for slow requests. You want to find a representative trace, not just the absolute worst one:

```
# Tempo/Grafana TraceQL - find traces between 3s and 6s
{
  resource.service.name = "order-service"
  && name = "HTTP POST /api/v1/orders"
  && duration > 3s
  && duration < 6s
}
```

```bash
# Jaeger API query - find traces with min duration
curl "http://jaeger:16686/api/traces?service=order-service&operation=HTTP%20POST%20/api/v1/orders&minDuration=3000000&limit=10" \
  | jq '.data[0].traceID'
```

Pick a trace that is representative of the slow behavior. If latency varies wildly, look at a few traces to identify the common pattern.

## Step 2: Read the Waterfall Top to Bottom

Open the trace in your UI. Here is how to interpret what you see:

```
Trace: abc123 (total: 4.2s)

[========================================] HTTP POST /api/v1/orders     4200ms
  [===]                                    order.validate                 350ms
  [=]                                      inventory.check_stock          120ms
       [============================]      payment.process_charge        2800ms
         [==]                              HTTP POST payment-svc/charge   180ms
              [========================]   payment.fraud_check           2400ms
                [=====================]    HTTP POST fraud-svc/analyze   2200ms
                                     [=]  order.save_to_db               150ms
                                      [=] notification.send               80ms
```

In this waterfall, the bottleneck is obvious: `payment.fraud_check` takes 2.4 seconds, and within that, the HTTP call to the fraud service takes 2.2 seconds. The fraud service is your problem, not the order service.

## Step 3: Classify the Bottleneck

Slow spans generally fall into one of these categories:

**External service calls**: An HTTP or gRPC call to another service is slow. Look at the `http.response.status_code` and the server-side span in the downstream service.

```python
# Check the downstream service's trace to understand why it is slow
# Look for the server-side span that matches the client span
# The server span will have its own child spans showing internal work

# Query for the downstream service's perspective
# Tempo TraceQL:
# { resource.service.name = "fraud-service" && span.http.route = "/analyze" && duration > 2s }
```

**Database queries**: A database span shows a slow query. Check the `db.statement` attribute for the query text.

```sql
-- If you see a span like: postgresql SELECT orders (duration: 3.5s)
-- Check the db.statement attribute for the actual query
-- Common causes:
--   Missing index on a WHERE clause column
--   Full table scan on a large table
--   Lock contention from concurrent transactions
```

**In-process computation**: A span with no child spans but a long duration means the work is happening inside the service. This could be CPU-intensive computation, blocking I/O, or waiting on a lock.

**Sequential calls that should be parallel**: Look for spans that execute one after another when they have no data dependency:

```
# Bad: sequential calls to independent services
[=========] inventory.check       1000ms
            [=========] pricing.calculate  1000ms
                        [=====] tax.compute     500ms
Total: 2500ms

# Good: parallel calls where possible
[=========] inventory.check       1000ms
[=========] pricing.calculate     1000ms
[=====]     tax.compute            500ms
Total: 1000ms
```

## Step 4: Drill Into the Problem Span

Once you identify the bottleneck span, examine its attributes for clues:

```python
# Useful attributes to check on a slow span

# For HTTP spans:
# http.request.method - GET, POST, etc.
# url.full - the complete URL being called
# http.response.status_code - did it succeed?
# server.address - which host handled the request?

# For database spans:
# db.system - postgresql, mysql, redis, etc.
# db.statement - the actual query
# db.operation - SELECT, INSERT, UPDATE
# db.sql.table - which table

# For custom spans:
# Look at any domain-specific attributes your team added
# These often contain the business context needed to understand the issue
```

## Step 5: Check for Patterns

One slow trace might be an outlier. Before you start optimizing, verify the pattern is consistent:

```promql
# Check if the slow downstream call is a pattern or a one-off
# Query the latency distribution of calls to the fraud service
histogram_quantile(0.99,
  sum(rate(http_client_request_duration_seconds_bucket{
    service_name="order-service",
    server_address="fraud-service"
  }[15m])) by (le)
)

# Compare with the previous day
histogram_quantile(0.99,
  sum(rate(http_client_request_duration_seconds_bucket{
    service_name="order-service",
    server_address="fraud-service"
  }[15m] offset 1d)) by (le)
)
```

If the P99 was 200ms yesterday and is 2200ms today, you have confirmed a regression in the fraud service.

## Step 6: Communicate the Finding

When you have identified the root cause, document it clearly for the team:

```markdown
## Finding: /api/v1/orders latency spike

**Symptom**: P99 latency increased from 800ms to 4.2s starting at 14:30 UTC
**Root cause**: The fraud-service /analyze endpoint latency increased from 180ms to 2200ms
**Evidence**: Trace abc123 shows payment.fraud_check span at 2400ms, with HTTP call to fraud-service at 2200ms
**Impact**: Checkout completion rate dropped 12%
**Next step**: Investigate fraud-service deployment at 14:15 UTC
```

## Practical Tips

When looking at a waterfall, resist the urge to optimize everything. Focus on the critical path. If a span takes 500ms but runs in parallel with a 3-second span, fixing the 500ms span will not improve the overall trace duration.

Use span events (annotations) to mark key moments within a span. If you see a long span with no children, adding events at key checkpoints will help you narrow down where the time is spent on the next occurrence.

Compare a slow trace with a fast trace for the same operation. The structural differences between the two often point directly to the issue. Maybe the slow trace has an extra database query, or a cache miss that triggers a fallback path.

Trace waterfalls are the single most powerful debugging tool in your observability toolkit. Learn to read them fluently, and production performance issues become solvable problems instead of mysteries.
