# How to Build API SLO Dashboards (Availability, Latency P99, Error Budget) from OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SLO, Error Budget, API Monitoring

Description: Build SLO dashboards for API availability, latency P99, and error budget consumption using OpenTelemetry metrics and histograms.

Service Level Objectives (SLOs) turn vague reliability goals into measurable targets. Instead of saying "our API should be fast," you say "99.9% of requests to /api/orders should complete within 500ms." OpenTelemetry metrics give you the raw data to calculate SLO compliance, track error budgets, and build dashboards that tell you whether you are meeting your promises.

## Defining Your SLOs

Start with concrete definitions. Here are three common API SLOs:

- **Availability**: 99.95% of requests return a non-5xx response over a 30-day window
- **Latency**: 99% of requests complete within 500ms (P99 latency target)
- **Error Rate**: Less than 0.1% of requests return a 5xx error over a rolling 7-day window

## Setting Up the OpenTelemetry Metrics

You need two core instruments: a histogram for latency and a counter for request outcomes:

```typescript
// slo-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api-slo');

// Histogram with custom bucket boundaries aligned to SLO targets
// If your latency SLO is 500ms, you need buckets around that value
const requestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [
      5, 10, 25, 50, 100, 200, 300, 400, 500, 750, 1000, 2000, 5000,
    ],
  },
});

// Counter for total requests, broken down by status category
const requestTotal = meter.createCounter('http.server.request.total', {
  description: 'Total HTTP requests',
});

// Counter specifically for errors
const requestErrors = meter.createCounter('http.server.request.errors', {
  description: 'HTTP requests resulting in server errors',
});

export function sloMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    const attrs = {
      'http.method': method,
      'http.route': route,
    };

    requestDuration.record(duration, attrs);
    requestTotal.add(1, { ...attrs, 'http.status_code': statusCode });

    if (statusCode >= 500) {
      requestErrors.add(1, attrs);
    }
  });

  next();
}
```

## Calculating SLO Compliance with PromQL

Once your metrics land in a Prometheus-compatible backend, calculate SLO compliance:

### Availability SLO (99.95% target)

```promql
# Current availability over the last 30 days
1 - (
  sum(increase(http_server_request_errors_total[30d]))
  /
  sum(increase(http_server_request_total_total[30d]))
)

# Result: 0.9997 means 99.97% availability - within SLO
```

### Latency SLO (99% within 500ms)

```promql
# Percentage of requests completing within 500ms over the last 7 days
sum(increase(http_server_request_duration_bucket{le="500"}[7d]))
/
sum(increase(http_server_request_duration_count[7d]))

# Result: 0.993 means 99.3% of requests are within 500ms - within SLO
```

## Error Budget Calculation

The error budget is how much unreliability you can tolerate before violating your SLO. For a 99.95% availability target over 30 days:

```promql
# Total error budget (in requests)
# If you serve 1,000,000 requests per 30 days with a 99.95% SLO,
# your error budget is 500 errors (0.05% of 1,000,000)

# Remaining error budget percentage
1 - (
  sum(increase(http_server_request_errors_total[30d]))
  /
  (sum(increase(http_server_request_total_total[30d])) * (1 - 0.9995))
)

# Result: 0.6 means 60% of error budget remains
```

## Building the Dashboard Programmatically

Here is how to set up error budget tracking in your application:

```typescript
// error-budget-tracker.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('slo-budget');

// Observable gauge that reports current error budget status
const errorBudgetRemaining = meter.createObservableGauge('slo.error_budget.remaining', {
  description: 'Remaining error budget as a percentage (0-1)',
});

// Rolling window tracker
class ErrorBudgetTracker {
  private windowMs: number;
  private sloTarget: number;
  private requests: { timestamp: number; isError: boolean }[] = [];

  constructor(windowDays: number, sloTarget: number) {
    this.windowMs = windowDays * 24 * 60 * 60 * 1000;
    this.sloTarget = sloTarget;
  }

  record(isError: boolean) {
    const now = Date.now();
    this.requests.push({ timestamp: now, isError });
    // Prune old entries
    this.requests = this.requests.filter((r) => now - r.timestamp < this.windowMs);
  }

  getRemainingBudget(): number {
    const total = this.requests.length;
    if (total === 0) return 1;

    const errors = this.requests.filter((r) => r.isError).length;
    const allowedErrors = total * (1 - this.sloTarget);
    const budgetUsed = errors / allowedErrors;

    return Math.max(0, 1 - budgetUsed);
  }
}

const availabilityBudget = new ErrorBudgetTracker(30, 0.9995);

// Register the observable gauge callback
errorBudgetRemaining.addCallback((result) => {
  result.observe(availabilityBudget.getRemainingBudget(), {
    'slo.name': 'availability',
    'slo.target': '99.95%',
    'slo.window': '30d',
  });
});
```

## Alert Thresholds for Error Budget

Set up multi-level alerts based on error budget burn rate:

```typescript
// Alert configurations for error budget consumption
const alertThresholds = [
  {
    name: 'error_budget_75_percent_consumed',
    threshold: 0.25, // 75% consumed, 25% remaining
    severity: 'warning',
    message: 'Error budget is 75% consumed for the current window',
  },
  {
    name: 'error_budget_90_percent_consumed',
    threshold: 0.10, // 90% consumed, 10% remaining
    severity: 'critical',
    message: 'Error budget is 90% consumed - consider freezing deployments',
  },
  {
    name: 'error_budget_exhausted',
    threshold: 0.0,
    severity: 'page',
    message: 'Error budget is fully exhausted - SLO is violated',
  },
];
```

## Burn Rate Alerts

Rather than waiting until the budget is consumed, alert on the rate of consumption:

```promql
# Fast burn: consuming error budget 14x faster than sustainable
# This catches severe incidents quickly (alerts in ~1 hour)
sum(rate(http_server_request_errors_total[1h]))
/
sum(rate(http_server_request_total_total[1h]))
> (1 - 0.9995) * 14

# Slow burn: consuming error budget 3x faster than sustainable
# This catches gradual degradation (alerts in ~6 hours)
sum(rate(http_server_request_errors_total[6h]))
/
sum(rate(http_server_request_total_total[6h]))
> (1 - 0.9995) * 3
```

SLO dashboards built from OpenTelemetry metrics transform reliability from a feeling into a number. When the error budget is healthy, you can deploy with confidence. When it is burning fast, you know to slow down and investigate. The key is choosing histogram bucket boundaries that align with your latency targets and setting burn rate alerts that catch problems before the budget runs out.
