# How to Track API Version Usage Metrics Across v1/v2/v3 Endpoints with OpenTelemetry Custom Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Versioning, Metrics, Custom Attributes

Description: Track API version usage across multiple endpoint versions using OpenTelemetry custom attributes and metrics for migration planning.

When you maintain multiple API versions simultaneously, you need to know which versions your consumers are actually using. Without version-level metrics, you are guessing when it is safe to deprecate v1, or whether the v3 rollout is gaining traction. OpenTelemetry custom attributes and metrics give you precise usage data broken down by API version.

## Capturing API Version from the Request

API version can appear in different places depending on your versioning strategy: URL path, headers, or query parameters. Here is middleware that handles all three:

```typescript
// version-extraction.ts
import { trace, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api-versioning');

const versionRequestCounter = meter.createCounter('api.requests.by_version', {
  description: 'Request count broken down by API version',
});

const versionLatency = meter.createHistogram('api.latency.by_version', {
  description: 'Request latency broken down by API version',
  unit: 'ms',
});

// Extract version from URL path (/api/v1/users), header (Api-Version: 2),
// or query param (?version=3)
function extractApiVersion(req: any): string {
  // Check URL path first: /api/v1/..., /api/v2/...
  const pathMatch = req.path.match(/\/api\/v(\d+)\//);
  if (pathMatch) return `v${pathMatch[1]}`;

  // Check custom header
  const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
  if (headerVersion) return `v${headerVersion}`;

  // Check query parameter
  if (req.query.version) return `v${req.query.version}`;

  // Default version if none specified
  return 'v1';
}

export function versionTrackingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const version = extractApiVersion(req);

  // Set version as a span attribute on the current trace
  const span = trace.getActiveSpan();
  span?.setAttribute('api.version', version);

  // Also track the consumer if available
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    // Hash or truncate the key to avoid storing secrets in traces
    const consumerId = apiKey.substring(0, 8);
    span?.setAttribute('api.consumer.id', consumerId);
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || 'unknown';

    const attributes = {
      'api.version': version,
      'http.method': req.method,
      'http.route': route,
      'http.status_code': res.statusCode,
    };

    versionRequestCounter.add(1, attributes);
    versionLatency.record(duration, attributes);
  });

  next();
}
```

## Registering Versioned Routes

Here is how to structure your Express app to serve multiple API versions with full tracking:

```typescript
// app.ts
import express from 'express';
import { versionTrackingMiddleware } from './version-extraction';

const app = express();

// Apply version tracking to all API routes
app.use('/api', versionTrackingMiddleware);

// v1 routes
app.get('/api/v1/users', v1UserController.list);
app.get('/api/v1/users/:id', v1UserController.get);

// v2 routes - added pagination
app.get('/api/v2/users', v2UserController.list);
app.get('/api/v2/users/:id', v2UserController.get);

// v3 routes - switched to cursor-based pagination
app.get('/api/v3/users', v3UserController.list);
app.get('/api/v3/users/:id', v3UserController.get);
```

## Tracking Version-Specific Feature Usage

Different versions often have different features. Track which version-specific features are actually being used:

```typescript
// feature-tracking.ts
import { trace, metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api-features');

const featureUsage = meter.createCounter('api.feature.usage', {
  description: 'Usage count of version-specific features',
});

// v2 introduced field filtering
function trackFieldFiltering(req: any) {
  const fields = req.query.fields;
  if (fields) {
    featureUsage.add(1, {
      'api.version': 'v2',
      'api.feature': 'field_filtering',
    });

    const span = trace.getActiveSpan();
    span?.setAttribute('api.fields_requested', fields);
    span?.setAttribute('api.fields_count', fields.split(',').length);
  }
}

// v3 introduced cursor-based pagination
function trackCursorPagination(req: any) {
  const cursor = req.query.cursor;
  if (cursor) {
    featureUsage.add(1, {
      'api.version': 'v3',
      'api.feature': 'cursor_pagination',
    });
  } else if (req.query.page) {
    // Someone is using v3 but with the old pagination style
    featureUsage.add(1, {
      'api.version': 'v3',
      'api.feature': 'legacy_page_pagination',
    });
  }
}
```

## Building a Version Migration Dashboard

With the metrics flowing, build a dashboard that answers these questions:

```
# Queries for your metrics backend (PromQL examples)

# Traffic percentage by version
sum(rate(api_requests_by_version_total[5m])) by (api_version)
/ ignoring(api_version)
sum(rate(api_requests_by_version_total[5m]))

# Unique consumers per version (from trace data)
# Run this as a trace analytics query
count(distinct api.consumer.id) group by api.version

# Error rate comparison across versions
sum(rate(api_requests_by_version_total{http_status_code=~"5.."}[5m])) by (api_version)
/ sum(rate(api_requests_by_version_total[5m])) by (api_version)

# Latency comparison (P99) across versions
histogram_quantile(0.99, rate(api_latency_by_version_bucket[5m])) by (api_version)
```

## Tracking Consumer Migration Progress

For planned version deprecations, track individual consumer migration:

```typescript
const consumerVersionTracker = meter.createCounter('api.consumer.version_usage', {
  description: 'Per-consumer API version usage',
});

function trackConsumerVersion(consumerId: string, version: string) {
  consumerVersionTracker.add(1, {
    'api.consumer.id': consumerId,
    'api.version': version,
  });
}
```

This lets you generate a report like:

```
Consumer    | v1 calls | v2 calls | v3 calls | Migration status
-----------+-----------+----------+----------+-----------------
client-abc  | 0         | 1,200    | 45,000   | Migrating to v3
client-def  | 8,500     | 0        | 0        | Still on v1
client-ghi  | 0         | 0        | 32,000   | Fully on v3
```

## Setting Up Deprecation Alerts

Once you have version metrics, automate the deprecation process:

```typescript
// When v1 traffic drops below threshold, alert that it is safe to deprecate
// When a consumer suddenly increases v1 usage, they might be regressing

// Alert rule (pseudo-config):
// IF rate(api_requests_by_version{api_version="v1"}[1h]) < 10
// FOR 7d
// THEN notify("v1 traffic is below threshold, safe to deprecate")

// IF rate(api_consumer_version_usage{api_version="v1"}[1h]) > 0
//   AND rate(api_consumer_version_usage{api_version="v1"}[1h] offset 1d) == 0
// THEN notify("Consumer regressed to v1")
```

Version usage metrics are the foundation of data-driven API lifecycle management. Instead of guessing whether anyone still uses v1, you know exactly who uses what, and you can plan migrations with confidence.
