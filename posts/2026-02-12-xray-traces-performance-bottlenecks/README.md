# How to Analyze Traces and Find Performance Bottlenecks with X-Ray

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, X-Ray, Performance, Tracing, Debugging

Description: Learn practical techniques for analyzing AWS X-Ray traces to identify performance bottlenecks, slow database queries, and latency issues in distributed applications.

---

Collecting traces is step one. The real value comes from analyzing them to find out why your application is slow. X-Ray gives you a wealth of data, but you need to know what to look for and how to filter through thousands of traces to find the ones that matter.

This guide covers practical techniques for using X-Ray to hunt down performance bottlenecks. We'll go from broad patterns (which services are slowest?) to specific traces (why did this one request take 12 seconds?) and show you how to make this a repeatable process.

## Starting Broad: The Service Map

Every performance investigation should start with the [X-Ray service map](https://oneuptime.com/blog/post/xray-service-map-application-dependencies/view). It gives you an instant overview of where time is being spent.

Look for:

- **Red or yellow nodes** - services with elevated error rates or latency
- **Thick edges** - high-traffic connections where even small latency improvements have big impact
- **Deep call chains** - requests that touch many services are inherently slower and more fragile

The service map gives you a hypothesis: "The order service is slow because it's waiting on the payment service." Now you need to validate that with trace data.

## Filtering Traces

X-Ray lets you filter traces with a query language called filter expressions. This is the fastest way to find problematic traces.

### Finding Slow Requests

```bash
# Find traces where total response time exceeded 5 seconds
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'responsetime > 5'
```

### Finding Error Traces

```bash
# Find traces that resulted in faults (5xx errors)
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'fault = true'
```

### Filtering by Service

```bash
# Find slow traces specifically for the order service
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'service("order-service") AND responsetime > 3'
```

### Filtering by Annotation

If you've added custom annotations (and you should), you can filter on them:

```bash
# Find slow traces for a specific customer
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'annotation.customerId = "cust-12345" AND responsetime > 2'

# Find all failed payment traces
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'annotation.paymentStatus = "failed"'
```

### Combining Filters

```bash
# Complex filter: slow requests to a specific endpoint with errors
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --filter-expression 'service("api-gateway") AND http.url CONTAINS "/api/orders" AND responsetime > 5 AND error = true'
```

## Analyzing Individual Traces

Once you've found interesting traces, dig into the details:

```bash
# Get the full trace details
aws xray batch-get-traces \
  --trace-ids "1-67abcdef-1234567890abcdef"
```

A trace contains a timeline of segments and subsegments. Here's what to look for:

### The Waterfall View

In the X-Ray console, traces are displayed as a waterfall chart. Each bar represents a segment or subsegment, with the width showing duration.

```
|-- API Gateway (5ms) ------|
   |-- Order Service (4850ms) ------------------------------------------|
      |-- DynamoDB GetItem (15ms) -|
      |-- Payment Service (4500ms) ---------------------------------|
         |-- Stripe API (4200ms) -------------------------------|
      |-- SNS Publish (30ms) --|
```

In this example, it's immediately clear that the Stripe API call (4200ms) is the bottleneck. The order service spends almost all its time waiting for the payment service, which spends almost all its time waiting for Stripe.

### Sequential vs. Parallel Calls

Look at whether downstream calls are sequential or parallel:

```
Sequential (slower):
|-- Service A -----------------------------------------|
   |-- DB Query 1 (500ms) -----|
                                |-- DB Query 2 (500ms) -----|
                                                             |-- HTTP Call (500ms) -----|

Parallel (faster):
|-- Service A ----------------------|
   |-- DB Query 1 (500ms) -----|
   |-- DB Query 2 (500ms) -----|
   |-- HTTP Call (500ms) ------|
```

If you see sequential calls that could be parallelized, that's a quick win.

## Common Bottleneck Patterns

### Pattern 1: N+1 Queries

You'll see this as many small, sequential database calls:

```
|-- List Orders (2500ms) -----------------------------------|
   |-- DynamoDB Query (50ms) -|
   |-- DynamoDB Get (20ms) |
   |-- DynamoDB Get (20ms) |
   |-- DynamoDB Get (20ms) |
   |-- DynamoDB Get (20ms) |
   ... (50 more Get calls)
```

**Fix:** Use batch operations (`BatchGetItem`) or restructure your data access to fetch everything in one query.

### Pattern 2: Cold Start Latency

Lambda functions show an initialization segment:

```
|-- Lambda (3200ms) -----------------------------------------|
   |-- Initialization (2800ms) --------------------------------|
   |-- Invocation (400ms) -----|
```

**Fix:** Use provisioned concurrency, reduce package size, or use a language with faster startup (Python/Node over Java).

### Pattern 3: Connection Establishment

Repeated TCP/TLS handshakes show up as time before the actual request:

```
|-- HTTP Call (800ms) ----------|
   |-- Connect (600ms) ------|
   |-- Response (200ms) --|
```

**Fix:** Use connection pooling and keep-alive connections.

### Pattern 4: Retry Storms

Failed calls followed by retries:

```
|-- Service Call (9500ms) ------------------------------------------------|
   |-- Attempt 1 (3000ms) FAIL ------|
                                      |-- Attempt 2 (3000ms) FAIL ------|
                                                                         |-- Attempt 3 (3000ms) OK ------|
```

**Fix:** Review timeout settings, add circuit breakers, and address the root cause of failures.

## Programmatic Trace Analysis

For systematic analysis, use the X-Ray APIs to process traces programmatically:

```python
# Analyze trace latency distribution for a service
import boto3
from datetime import datetime, timedelta
import statistics

def analyze_latency(service_name, hours=1):
    xray = boto3.client('xray')

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)

    # Get trace summaries for the service
    response = xray.get_trace_summaries(
        StartTime=start_time,
        EndTime=end_time,
        FilterExpression=f'service("{service_name}")',
        Sampling=False  # Get all traces, not just sampled
    )

    latencies = []
    for trace in response.get('TraceSummaries', []):
        duration = trace.get('Duration', 0)
        latencies.append(duration)

    if not latencies:
        print(f'No traces found for {service_name}')
        return

    latencies.sort()

    print(f'Latency analysis for {service_name}:')
    print(f'  Trace count: {len(latencies)}')
    print(f'  Min:  {min(latencies)*1000:.0f}ms')
    print(f'  P50:  {latencies[len(latencies)//2]*1000:.0f}ms')
    print(f'  P90:  {latencies[int(len(latencies)*0.9)]*1000:.0f}ms')
    print(f'  P99:  {latencies[int(len(latencies)*0.99)]*1000:.0f}ms')
    print(f'  Max:  {max(latencies)*1000:.0f}ms')
    print(f'  Mean: {statistics.mean(latencies)*1000:.0f}ms')

    # Flag outliers (> 3 standard deviations from mean)
    mean = statistics.mean(latencies)
    stdev = statistics.stdev(latencies) if len(latencies) > 1 else 0
    outliers = [l for l in latencies if l > mean + 3 * stdev]

    if outliers:
        print(f'  Outliers (>3 stdev): {len(outliers)} traces')
        print(f'  Outlier threshold: {(mean + 3 * stdev)*1000:.0f}ms')

# Run the analysis
analyze_latency('order-service')
```

## Finding the Slowest Subsegments

This script identifies which subsegments consistently contribute the most latency:

```python
# Find the slowest subsegments across multiple traces
import boto3
from datetime import datetime, timedelta
from collections import defaultdict

def find_slow_subsegments(service_name, min_duration_ms=500):
    xray = boto3.client('xray')

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)

    # Get slow trace IDs
    summaries = xray.get_trace_summaries(
        StartTime=start_time,
        EndTime=end_time,
        FilterExpression=f'service("{service_name}") AND responsetime > {min_duration_ms/1000}'
    )

    trace_ids = [t['Id'] for t in summaries.get('TraceSummaries', [])[:50]]

    if not trace_ids:
        print('No slow traces found')
        return

    # Get full trace details
    traces = xray.batch_get_traces(TraceIds=trace_ids)

    subsegment_times = defaultdict(list)

    for trace in traces.get('Traces', []):
        for segment in trace.get('Segments', []):
            import json
            doc = json.loads(segment['Document'])
            process_subsegments(doc.get('subsegments', []), subsegment_times)

    # Print the slowest subsegments by average duration
    print(f'Slowest subsegments in {service_name}:')
    for name, durations in sorted(subsegment_times.items(),
                                   key=lambda x: sum(x[1])/len(x[1]),
                                   reverse=True)[:10]:
        avg_ms = (sum(durations) / len(durations)) * 1000
        print(f'  {name}: avg={avg_ms:.0f}ms, count={len(durations)}')


def process_subsegments(subsegments, times):
    for sub in subsegments:
        name = sub.get('name', 'unknown')
        start = sub.get('start_time', 0)
        end = sub.get('end_time', 0)
        duration = end - start

        if duration > 0:
            times[name].append(duration)

        # Recurse into nested subsegments
        if 'subsegments' in sub:
            process_subsegments(sub['subsegments'], times)


find_slow_subsegments('order-service', min_duration_ms=1000)
```

## Setting Up Latency Alarms

Once you know your baseline, set up alarms for when latency degrades:

```bash
# Alarm on P99 latency using X-Ray metrics
aws cloudwatch put-metric-alarm \
  --alarm-name "OrderService-P99-Latency" \
  --namespace "AWS/X-Ray" \
  --metric-name "ResponseTime" \
  --dimensions Name=ServiceName,Value=order-service \
  --extended-statistic p99 \
  --period 300 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:perf-alerts
```

## Best Practices for Performance Analysis

**Compare slow and fast traces.** Don't just look at the slow ones. Compare a slow trace to a fast one for the same endpoint. The differences will jump out.

**Look at the time between subsegments.** If there's a gap between one subsegment ending and the next one starting, that's time spent in your application code (CPU work, serialization, etc.) rather than waiting for an external call.

**Check during peak hours.** Performance issues often only appear under load. Analyze traces from your busiest hours, not from 3 AM when traffic is minimal.

**Track improvement over time.** After you fix a bottleneck, compare the latency distribution before and after. This validates your fix and gives you data for future prioritization.

**Use [sampling rules](https://oneuptime.com/blog/post/xray-sampling-rules/view) strategically.** For performance analysis, you might want higher sampling rates on specific endpoints you're investigating. Adjust sampling temporarily during investigation periods.

## Wrapping Up

X-Ray trace analysis is a skill that gets easier with practice. The key workflow is: start at the service map, identify suspect services, filter traces to find examples, then drill into the waterfall view to pinpoint the bottleneck. Once you find the pattern, look at multiple traces to confirm it's consistent, then fix it and verify with new trace data. It's a feedback loop that, over time, makes your application measurably faster.
