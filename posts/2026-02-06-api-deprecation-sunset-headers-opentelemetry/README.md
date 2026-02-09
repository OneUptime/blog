# How to Monitor API Deprecation Warnings and Sunset Headers Using OpenTelemetry Span Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Deprecation, Sunset Headers, Monitoring

Description: Track API deprecation warnings and Sunset headers using OpenTelemetry span events to manage the full API lifecycle gracefully.

Deprecating an API endpoint is not just about removing code. You need to warn consumers, track who is still using the old endpoints, and eventually shut them down without breaking anyone. The HTTP `Sunset` header and `Deprecation` header are standards for communicating this, but headers alone are not enough. You need monitoring to verify that consumers are paying attention to the warnings.

OpenTelemetry span events are a great fit for tracking deprecation signals on both the server and client side.

## Adding Deprecation Headers to Responses

First, set up middleware that adds standard deprecation headers to responses from deprecated endpoints:

```typescript
// deprecation-middleware.ts
import { trace } from '@opentelemetry/api';

interface DeprecationConfig {
  route: string;
  method: string;
  deprecatedSince: string;    // ISO date when the endpoint was deprecated
  sunsetDate: string;         // ISO date when the endpoint will be removed
  replacement?: string;       // URL of the replacement endpoint
  message?: string;
}

// Registry of deprecated endpoints
const deprecatedEndpoints: DeprecationConfig[] = [
  {
    route: '/api/v1/users',
    method: 'GET',
    deprecatedSince: '2026-01-15',
    sunsetDate: '2026-06-01',
    replacement: '/api/v2/users',
    message: 'Use v2 endpoint with cursor-based pagination',
  },
  {
    route: '/api/v1/orders/:id',
    method: 'GET',
    deprecatedSince: '2026-02-01',
    sunsetDate: '2026-07-01',
    replacement: '/api/v2/orders/:id',
  },
];

export function deprecationMiddleware(req: any, res: any, next: any) {
  const matchedRoute = req.route?.path || req.path;
  const config = deprecatedEndpoints.find(
    (d) => d.route === matchedRoute && d.method === req.method
  );

  if (!config) {
    next();
    return;
  }

  // Set standard HTTP headers
  res.setHeader('Deprecation', config.deprecatedSince);
  res.setHeader('Sunset', new Date(config.sunsetDate).toUTCString());

  if (config.replacement) {
    res.setHeader('Link', `<${config.replacement}>; rel="successor-version"`);
  }

  // Record in OpenTelemetry
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('api.deprecated', true);
    span.setAttribute('api.sunset_date', config.sunsetDate);

    span.addEvent('api.deprecation_warning', {
      'api.deprecated_since': config.deprecatedSince,
      'api.sunset_date': config.sunsetDate,
      'api.replacement': config.replacement || 'none',
      'api.deprecation_message': config.message || 'This endpoint is deprecated',
    });
  }

  next();
}
```

## Tracking Deprecation Metrics

Span events give you trace-level data. For dashboards and alerts, add counters:

```typescript
// deprecation-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('api-deprecation');

const deprecatedCallsCounter = meter.createCounter('api.deprecated.requests', {
  description: 'Requests to deprecated API endpoints',
});

const daysUntilSunsetHistogram = meter.createHistogram('api.deprecated.days_until_sunset', {
  description: 'Days remaining until the deprecated endpoint is removed',
  unit: 'days',
});

export function recordDeprecationMetrics(config: DeprecationConfig, consumerId: string) {
  deprecatedCallsCounter.add(1, {
    'api.route': config.route,
    'api.method': config.method,
    'api.consumer.id': consumerId,
    'api.sunset_date': config.sunsetDate,
  });

  // Track how close we are to the sunset date
  const daysUntilSunset = Math.ceil(
    (new Date(config.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  daysUntilSunsetHistogram.record(daysUntilSunset, {
    'api.route': config.route,
  });
}
```

## Client-Side: Detecting Deprecation Warnings

If you control the API client (e.g., an SDK or internal service), instrument it to detect and report deprecation headers:

```typescript
// http-client-deprecation-detector.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('http-client');

async function instrumentedFetch(url: string, options: RequestInit = {}) {
  return tracer.startActiveSpan(`HTTP ${options.method || 'GET'}`, async (span) => {
    const response = await fetch(url, options);

    // Check for deprecation headers
    const deprecation = response.headers.get('Deprecation');
    const sunset = response.headers.get('Sunset');
    const link = response.headers.get('Link');

    if (deprecation) {
      span.setAttribute('api.deprecated', true);
      span.setAttribute('api.deprecated_since', deprecation);

      span.addEvent('api.deprecation_detected', {
        'api.deprecated_since': deprecation,
        'api.sunset': sunset || 'unknown',
        'api.url': url,
      });

      // Log a warning so developers notice during development
      console.warn(
        `WARNING: ${url} is deprecated since ${deprecation}. ` +
        `Sunset date: ${sunset || 'unknown'}. ` +
        `${link ? 'Replacement: ' + link : ''}`
      );
    }

    if (sunset) {
      const sunsetDate = new Date(sunset);
      const daysLeft = Math.ceil((sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      span.setAttribute('api.sunset_days_remaining', daysLeft);

      // Add urgent warning if sunset is approaching
      if (daysLeft < 30) {
        span.addEvent('api.sunset_approaching', {
          'api.days_remaining': daysLeft,
          'api.url': url,
          'severity': daysLeft < 7 ? 'critical' : 'warning',
        });
      }
    }

    span.end();
    return response;
  });
}
```

## Building a Deprecation Dashboard

With metrics and span events flowing, create a dashboard that shows:

```
# Which deprecated endpoints still have traffic
sum(rate(api_deprecated_requests_total[1h])) by (api_route)

# Which consumers are still using deprecated endpoints
topk(10, sum(rate(api_deprecated_requests_total[24h])) by (api_consumer_id, api_route))

# How many days until each endpoint's sunset date
# (from the histogram or a simple gauge)
api_deprecated_days_until_sunset by (api_route)
```

## Automated Sunset Enforcement

When the sunset date arrives, do not just delete the endpoint. Replace it with a 410 Gone response that still reports metrics:

```typescript
function sunsetEnforcementMiddleware(req: any, res: any, next: any) {
  const matchedRoute = req.route?.path || req.path;
  const config = deprecatedEndpoints.find(
    (d) => d.route === matchedRoute && d.method === req.method
  );

  if (!config) {
    next();
    return;
  }

  const sunsetDate = new Date(config.sunsetDate);
  if (Date.now() >= sunsetDate.getTime()) {
    const span = trace.getActiveSpan();
    span?.addEvent('api.sunset_enforced', {
      'api.route': config.route,
      'api.sunset_date': config.sunsetDate,
    });

    res.status(410).json({
      error: 'Gone',
      message: `This endpoint was removed on ${config.sunsetDate}`,
      replacement: config.replacement,
    });
    return;
  }

  next();
}
```

A well-monitored deprecation process gives consumers time to migrate, gives you confidence in the timeline, and prevents surprises on both sides. OpenTelemetry turns the deprecation lifecycle from guesswork into a data-driven process.
