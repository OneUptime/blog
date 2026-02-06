# How to Track API Consumer Usage Patterns (Top Endpoints, Heavy Users) with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Analytics, Usage Tracking, Consumer Metrics

Description: Track API consumer usage patterns including top endpoints, heavy users, and access trends using OpenTelemetry metrics and attributes.

Understanding how your API consumers behave is critical for capacity planning, pricing, and identifying abuse. Which endpoints get the most traffic? Which consumers are hammering your API? Are usage patterns shifting over time? OpenTelemetry metrics give you answers without building a separate analytics pipeline.

## Identifying Consumers

The first step is reliably identifying who is making each request. Most APIs use API keys, OAuth tokens, or some form of client identification:

```typescript
// consumer-identification.ts
import { trace } from '@opentelemetry/api';

interface ConsumerInfo {
  id: string;
  tier: string;
  organization: string;
}

function identifyConsumer(req: any): ConsumerInfo {
  // Try API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const consumer = apiKeyLookup.get(apiKey);
    if (consumer) {
      return {
        id: consumer.id,
        tier: consumer.tier,       // e.g., "free", "pro", "enterprise"
        organization: consumer.org,
      };
    }
  }

  // Try OAuth token
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const decoded = decodeToken(authHeader.slice(7));
    if (decoded) {
      return {
        id: decoded.clientId,
        tier: decoded.tier || 'unknown',
        organization: decoded.org || 'unknown',
      };
    }
  }

  // Fallback to IP-based identification
  return {
    id: `ip:${req.ip}`,
    tier: 'anonymous',
    organization: 'unknown',
  };
}

export function consumerTrackingMiddleware(req: any, res: any, next: any) {
  const consumer = identifyConsumer(req);

  // Attach to request for downstream use
  req.consumer = consumer;

  // Add to the active span
  const span = trace.getActiveSpan();
  span?.setAttribute('api.consumer.id', consumer.id);
  span?.setAttribute('api.consumer.tier', consumer.tier);
  span?.setAttribute('api.consumer.organization', consumer.organization);

  next();
}
```

## Recording Usage Metrics

Create metrics that capture per-consumer usage patterns:

```typescript
// usage-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api-usage');

// Request count by consumer, endpoint, and method
const requestsByConsumer = meter.createCounter('api.usage.requests', {
  description: 'API requests by consumer and endpoint',
});

// Data transfer by consumer
const responseSize = meter.createHistogram('api.usage.response_size_bytes', {
  description: 'Response body size in bytes by consumer',
  unit: 'bytes',
});

// Request latency by consumer tier
const latencyByTier = meter.createHistogram('api.usage.latency_by_tier', {
  description: 'Request latency grouped by consumer tier',
  unit: 'ms',
});

// Unique endpoints accessed per consumer (tracked via spans, queried from trace backend)
const endpointBreadth = meter.createCounter('api.usage.endpoint_access', {
  description: 'Tracks which endpoints each consumer accesses',
});

export function usageMetricsMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const consumer = req.consumer;

  // Track response size
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const bodyStr = JSON.stringify(body);
    responseSize.record(bodyStr.length, {
      'api.consumer.id': consumer.id,
      'api.consumer.tier': consumer.tier,
      'http.route': req.route?.path || 'unknown',
    });
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || 'unknown';

    requestsByConsumer.add(1, {
      'api.consumer.id': consumer.id,
      'api.consumer.tier': consumer.tier,
      'api.consumer.organization': consumer.organization,
      'http.route': route,
      'http.method': req.method,
      'http.status_code': res.statusCode,
    });

    latencyByTier.record(duration, {
      'api.consumer.tier': consumer.tier,
      'http.route': route,
    });

    endpointBreadth.add(1, {
      'api.consumer.id': consumer.id,
      'http.route': route,
    });
  });

  next();
}
```

## Queries for Consumer Analytics

With the metrics in place, run queries to answer common questions:

```promql
# Top 10 consumers by request volume (last 24 hours)
topk(10,
  sum(increase(api_usage_requests_total[24h])) by (api_consumer_id)
)

# Top endpoints overall
topk(10,
  sum(rate(api_usage_requests_total[1h])) by (http_route)
)

# Request distribution by consumer tier
sum(rate(api_usage_requests_total[1h])) by (api_consumer_tier)

# Consumers with the highest error rates
topk(5,
  sum(rate(api_usage_requests_total{http_status_code=~"5.."}[1h])) by (api_consumer_id)
  /
  sum(rate(api_usage_requests_total[1h])) by (api_consumer_id)
)

# Average response size by consumer (identify data-heavy consumers)
avg(api_usage_response_size_bytes) by (api_consumer_id)
```

## Detecting Usage Anomalies

Track normal patterns and alert when behavior changes:

```typescript
// anomaly-detection.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('usage-anomalies');

const anomalyCounter = meter.createCounter('api.usage.anomalies', {
  description: 'Detected usage anomalies',
});

// Simple rate change detection
class UsageTracker {
  private hourlyRates: Map<string, number[]> = new Map();

  recordRequest(consumerId: string) {
    const rates = this.hourlyRates.get(consumerId) || [];
    const currentHour = Math.floor(Date.now() / 3600000);

    // Keep last 168 hours (1 week) of hourly rates
    // This is simplified - in production use a proper time series
    rates.push(currentHour);
    this.hourlyRates.set(consumerId, rates.slice(-168));
  }

  checkForAnomaly(consumerId: string, currentRate: number): boolean {
    const rates = this.hourlyRates.get(consumerId) || [];
    if (rates.length < 24) return false; // Need at least 24 hours of data

    // Calculate average and standard deviation
    const avg = rates.length; // Simplified
    const threshold = avg * 3; // Alert at 3x normal

    if (currentRate > threshold) {
      anomalyCounter.add(1, {
        'api.consumer.id': consumerId,
        'anomaly.type': 'spike',
        'anomaly.ratio': currentRate / avg,
      });
      return true;
    }

    return false;
  }
}
```

## Building a Consumer Usage Report

Combine metrics to generate periodic usage reports:

```typescript
// Usage report structure (generated from metrics queries)
interface ConsumerUsageReport {
  consumerId: string;
  tier: string;
  period: string;
  totalRequests: number;
  topEndpoints: { route: string; count: number }[];
  errorRate: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  totalDataTransferBytes: number;
  peakRequestsPerMinute: number;
}

// This report is built by querying your metrics backend
// Example: weekly usage report per consumer for billing or review
```

## Cardinality Management

Consumer-level metrics can create cardinality problems if you have thousands of consumers. Manage this by:

```typescript
// Option 1: Only track top N consumers individually, group the rest
function getMetricConsumerId(consumerId: string, isTopConsumer: boolean): string {
  return isTopConsumer ? consumerId : 'other';
}

// Option 2: Use consumer tier instead of individual ID for high-cardinality metrics
// This reduces cardinality from thousands to a handful
requestsByTier.add(1, {
  'api.consumer.tier': consumer.tier, // "free", "pro", "enterprise"
  'http.route': route,
});

// Option 3: Record individual consumer IDs only in spans (traces),
// not in metrics. Use trace analytics for per-consumer queries.
```

Consumer usage tracking is not just for billing. It tells you who depends on which endpoints, who will be affected by breaking changes, and who is pushing your infrastructure to its limits. OpenTelemetry makes this data available without building a separate analytics system.
