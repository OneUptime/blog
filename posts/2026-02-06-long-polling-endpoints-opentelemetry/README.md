# How to Monitor Long-Polling API Endpoints with OpenTelemetry Span Duration Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Long Polling, Latency, API Monitoring

Description: Monitor long-polling API endpoints with OpenTelemetry by tracking span durations, timeout patterns, and response delivery timing.

Long polling is the technique where a client sends a request and the server holds the connection open until new data is available or a timeout expires. It is still widely used for real-time updates in environments where WebSockets are not practical. But long polling creates a monitoring blind spot: requests that take 30 seconds to complete are normal, not slow. Standard latency alerting does not work here.

OpenTelemetry lets you distinguish between "waiting for data" time and "processing" time, so you can monitor long-polling endpoints properly.

## The Long-Polling Pattern

Here is a typical long-polling endpoint:

```typescript
// long-polling-endpoint.ts
import express from 'express';
import { trace, metrics, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer('long-polling');
const meter = metrics.getMeter('long-polling');

const app = express();

// Metrics specific to long polling
const pollDuration = meter.createHistogram('api.long_poll.duration_ms', {
  description: 'Total duration of long-poll requests',
  unit: 'ms',
  advice: {
    // Custom buckets for long-polling (seconds, not milliseconds)
    explicitBucketBoundaries: [100, 500, 1000, 5000, 10000, 15000, 20000, 25000, 30000],
  },
});

const pollOutcome = meter.createCounter('api.long_poll.outcome', {
  description: 'Long-poll outcomes: data_available, timeout, or error',
});

const waitDuration = meter.createHistogram('api.long_poll.wait_duration_ms', {
  description: 'Time spent waiting for data before responding',
  unit: 'ms',
});

const activePollsGauge = meter.createUpDownCounter('api.long_poll.active', {
  description: 'Number of currently active long-poll connections',
});

app.get('/api/notifications/poll', async (req, res) => {
  const span = tracer.startSpan('long_poll.notifications', {
    kind: SpanKind.SERVER,
    attributes: {
      'long_poll.timeout_ms': 30000,
      'long_poll.last_event_id': req.query.since as string || 'none',
      'long_poll.consumer_id': req.headers['x-api-key']?.toString().substring(0, 8) || 'unknown',
    },
  });

  activePollsGauge.add(1);
  const startTime = Date.now();
  const timeoutMs = 30000;
  const lastEventId = req.query.since as string;

  try {
    // First, check if there is already data available (no waiting needed)
    const immediateData = await checkForNewData(lastEventId);

    if (immediateData.length > 0) {
      const duration = Date.now() - startTime;

      span.setAttribute('long_poll.outcome', 'immediate');
      span.setAttribute('long_poll.wait_ms', duration);
      span.setAttribute('long_poll.results_count', immediateData.length);

      pollOutcome.add(1, { outcome: 'immediate' });
      waitDuration.record(duration);
      pollDuration.record(duration);

      res.json({ data: immediateData, hasMore: false });
      span.end();
      activePollsGauge.add(-1);
      return;
    }

    // No immediate data - wait for new data or timeout
    span.addEvent('long_poll.waiting_started');

    const result = await waitForData(lastEventId, timeoutMs);
    const waitTime = Date.now() - startTime;

    span.setAttribute('long_poll.wait_ms', waitTime);

    if (result.timedOut) {
      // Timeout - return empty response, client will retry
      span.setAttribute('long_poll.outcome', 'timeout');
      span.setAttribute('long_poll.results_count', 0);

      pollOutcome.add(1, { outcome: 'timeout' });
      waitDuration.record(waitTime);
      pollDuration.record(waitTime);

      res.status(200).json({ data: [], timedOut: true });
    } else {
      // Data arrived during the wait
      span.setAttribute('long_poll.outcome', 'data_available');
      span.setAttribute('long_poll.results_count', result.data.length);

      pollOutcome.add(1, { outcome: 'data_available' });
      waitDuration.record(waitTime);
      pollDuration.record(waitTime);

      res.json({ data: result.data, hasMore: result.hasMore });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;

    span.setAttribute('long_poll.outcome', 'error');
    span.recordException(error);

    pollOutcome.add(1, { outcome: 'error' });
    pollDuration.record(duration);

    res.status(500).json({ error: 'Internal error' });
  } finally {
    span.end();
    activePollsGauge.add(-1);
  }
});
```

## Implementing the Wait Mechanism

The actual waiting logic needs its own instrumentation:

```typescript
// wait-for-data.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('long-polling');

interface WaitResult {
  timedOut: boolean;
  data: any[];
  hasMore: boolean;
}

async function waitForData(lastEventId: string, timeoutMs: number): Promise<WaitResult> {
  return tracer.startActiveSpan('long_poll.wait', async (span) => {
    span.setAttribute('wait.timeout_ms', timeoutMs);

    return new Promise((resolve) => {
      // Set up a listener for new data
      const listener = (newData: any[]) => {
        clearTimeout(timer);
        span.setAttribute('wait.resolved_by', 'data');
        span.end();
        resolve({ timedOut: false, data: newData, hasMore: false });
      };

      // Set up timeout
      const timer = setTimeout(() => {
        dataEmitter.removeListener('new-data', listener);
        span.setAttribute('wait.resolved_by', 'timeout');
        span.end();
        resolve({ timedOut: true, data: [], hasMore: false });
      }, timeoutMs);

      // Listen for new data events
      dataEmitter.once('new-data', listener);
    });
  });
}
```

## Separating Wait Time from Processing Time

The key metric distinction for long polling is wait time versus processing time:

```typescript
// In your handler, track both phases separately:

// Phase 1: Data check (should be fast)
const checkStart = Date.now();
const immediateData = await checkForNewData(lastEventId);
const checkDuration = Date.now() - checkStart;
span.setAttribute('long_poll.check_duration_ms', checkDuration);

// Phase 2: Wait for data (intentionally slow)
const waitStart = Date.now();
const result = await waitForData(lastEventId, timeoutMs);
const actualWaitTime = Date.now() - waitStart;
span.setAttribute('long_poll.actual_wait_ms', actualWaitTime);

// Phase 3: Serialize and send response (should be fast)
const sendStart = Date.now();
res.json(result.data);
const sendDuration = Date.now() - sendStart;
span.setAttribute('long_poll.send_duration_ms', sendDuration);
```

## Alerting for Long-Polling Endpoints

Standard latency alerts do not apply. Instead, alert on these conditions:

```yaml
# Alert when the data check phase is slow (it should be instant)
- alert: LongPollCheckSlow
  expr: |
    histogram_quantile(0.99,
      rate(api_long_poll_check_duration_ms_bucket[5m])
    ) > 500
  annotations:
    summary: "Long-poll data availability check is slow"

# Alert when too many active polls (connection exhaustion risk)
- alert: TooManyActivePolls
  expr: api_long_poll_active > 1000
  annotations:
    summary: "Over 1000 active long-poll connections"

# Alert when the timeout-to-data ratio is too high
# If most polls are timing out, consumers are not getting data
- alert: HighPollTimeoutRate
  expr: |
    sum(rate(api_long_poll_outcome_total{outcome="timeout"}[10m]))
    /
    sum(rate(api_long_poll_outcome_total[10m]))
    > 0.95
  annotations:
    summary: "95% of long-poll requests are timing out"
```

## Dashboard Panels

Build a long-polling specific dashboard:

- **Active connections**: Real-time gauge of open long-poll connections
- **Outcome distribution**: Pie chart of immediate/data_available/timeout/error
- **Wait time distribution**: Histogram showing how long clients wait before getting data
- **Data freshness**: Time between event creation and delivery via long poll

Long polling looks like a simple HTTP request, but it behaves like a persistent connection. OpenTelemetry span attributes let you see the internal phases and monitor what actually matters: how fast data reaches consumers, not how long the HTTP request lasted.
