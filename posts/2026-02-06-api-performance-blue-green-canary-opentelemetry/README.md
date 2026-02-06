# How to Use OpenTelemetry to Compare API Performance Across Blue-Green and Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Deployment, Canary, Performance Comparison

Description: Compare API performance metrics between blue-green and canary deployment versions using OpenTelemetry attributes and trace analysis.

Deploying a new version of your API is always a gamble. Blue-green and canary deployments reduce the blast radius, but they only help if you can actually compare the performance of the old and new versions in real time. Without metrics, you are making rollback decisions based on gut feeling.

OpenTelemetry lets you tag every request with its deployment version so you can compare latency, error rates, and behavior side by side.

## Tagging Requests with Deployment Info

The foundation is adding deployment metadata to every span and metric. Set this up as a resource attribute so it applies to all telemetry:

```typescript
// tracing-with-deployment.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'order-api',
    'service.version': process.env.APP_VERSION || 'unknown',
    'deployment.environment': process.env.DEPLOYMENT_ENV || 'production',
    // Custom attributes for deployment tracking
    'deployment.id': process.env.DEPLOYMENT_ID || 'unknown',
    'deployment.color': process.env.DEPLOYMENT_COLOR || 'unknown', // blue or green
    'deployment.canary': process.env.CANARY === 'true',
  }),
  traceExporter: new OTLPTraceExporter(),
});

sdk.start();
```

Set these environment variables in your deployment manifests:

```yaml
# kubernetes deployment for the canary version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-api-canary
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: order-api
          image: order-api:2.1.0
          env:
            - name: APP_VERSION
              value: "2.1.0"
            - name: DEPLOYMENT_COLOR
              value: "green"
            - name: CANARY
              value: "true"
            - name: DEPLOYMENT_ID
              value: "deploy-2026-02-06-001"
```

## Adding Per-Request Deployment Context

Resource attributes apply globally. For finer granularity, add deployment info to individual spans:

```typescript
// deployment-middleware.ts
import { trace } from '@opentelemetry/api';

export function deploymentContextMiddleware(req: any, res: any, next: any) {
  const span = trace.getActiveSpan();

  if (span) {
    // Record which instance handled this request
    span.setAttribute('deployment.version', process.env.APP_VERSION || 'unknown');
    span.setAttribute('deployment.color', process.env.DEPLOYMENT_COLOR || 'unknown');
    span.setAttribute('deployment.pod', process.env.HOSTNAME || 'unknown');

    // If the load balancer sets a header indicating canary routing
    const routedTo = req.headers['x-routed-to'];
    if (routedTo) {
      span.setAttribute('deployment.routed_to', routedTo);
    }
  }

  next();
}
```

## Metrics for Comparison

Create metrics that include version as an attribute so you can compare side by side:

```typescript
// deployment-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('deployment-comparison');

const requestDuration = meter.createHistogram('api.request.duration', {
  description: 'Request duration by deployment version',
  unit: 'ms',
});

const requestErrors = meter.createCounter('api.request.errors', {
  description: 'Error count by deployment version',
});

const requestCount = meter.createCounter('api.request.count', {
  description: 'Request count by deployment version',
});

export function deploymentMetricsMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const version = process.env.APP_VERSION || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || 'unknown';

    const attrs = {
      'deployment.version': version,
      'deployment.color': process.env.DEPLOYMENT_COLOR || 'unknown',
      'http.route': route,
      'http.method': req.method,
    };

    requestDuration.record(duration, attrs);
    requestCount.add(1, { ...attrs, 'http.status_code': res.statusCode });

    if (res.statusCode >= 500) {
      requestErrors.add(1, attrs);
    }
  });

  next();
}
```

## PromQL Queries for Side-by-Side Comparison

With version-tagged metrics, write queries that compare the two versions:

```promql
# Latency comparison: P99 by version
histogram_quantile(0.99,
  sum(rate(api_request_duration_bucket[5m])) by (le, deployment_version)
)

# Error rate comparison
sum(rate(api_request_errors_total[5m])) by (deployment_version)
/
sum(rate(api_request_count_total[5m])) by (deployment_version)

# Throughput comparison
sum(rate(api_request_count_total[5m])) by (deployment_version)
```

## Automated Canary Analysis

Instead of watching dashboards manually, automate the comparison:

```typescript
// canary-analyzer.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('canary-analysis');

// Track comparison results as metrics
const canaryHealthGauge = meter.createObservableGauge('canary.health_score', {
  description: 'Canary health score from 0 (bad) to 1 (good)',
});

interface VersionMetrics {
  p99Latency: number;
  errorRate: number;
  requestCount: number;
}

function compareVersions(stable: VersionMetrics, canary: VersionMetrics): number {
  let score = 1.0;

  // Latency check: canary should not be more than 20% slower
  if (canary.p99Latency > stable.p99Latency * 1.2) {
    const degradation = (canary.p99Latency - stable.p99Latency) / stable.p99Latency;
    score -= Math.min(0.5, degradation);
  }

  // Error rate check: canary error rate should not be higher
  if (canary.errorRate > stable.errorRate * 1.5) {
    const increase = (canary.errorRate - stable.errorRate) / Math.max(stable.errorRate, 0.001);
    score -= Math.min(0.5, increase * 0.1);
  }

  return Math.max(0, score);
}

// Run this comparison periodically
setInterval(async () => {
  const stableMetrics = await fetchVersionMetrics('stable');
  const canaryMetrics = await fetchVersionMetrics('canary');
  const healthScore = compareVersions(stableMetrics, canaryMetrics);

  // The health score is exported as a metric
  // Alert when it drops below 0.7 to trigger rollback
}, 60000);
```

## Trace-Level Comparison

Beyond aggregate metrics, compare individual trace patterns between versions:

```typescript
// Look for new error types in the canary
// In your trace analytics backend, query:

// Errors in canary that do not appear in stable:
// deployment.version = "2.1.0"
//   AND span.status = ERROR
//   AND error.type NOT IN (
//     SELECT DISTINCT error.type
//     FROM spans
//     WHERE deployment.version = "2.0.0"
//     AND span.status = ERROR
//   )
```

## Rollback Decision Making

Create a simple decision framework based on your metrics:

```typescript
function shouldRollback(healthScore: number, minutesSinceDeployment: number): string {
  // Give the canary at least 10 minutes before judging
  if (minutesSinceDeployment < 10) return 'monitoring';

  if (healthScore < 0.5) return 'rollback-immediately';
  if (healthScore < 0.7) return 'rollback-recommended';
  if (healthScore < 0.9) return 'investigate';
  return 'healthy';
}
```

The key insight is that deployment comparison is just a filtering problem. If every piece of telemetry carries a version tag, you can slice your existing dashboards by version and see exactly how the new code behaves compared to the old. OpenTelemetry resource attributes make this trivial to implement.
