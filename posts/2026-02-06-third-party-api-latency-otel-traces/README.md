# How to Track Third-Party API Dependency Latency Impact on Your Application with OpenTelemetry Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Third-Party APIs, Dependency Tracking, Latency, Distributed Tracing

Description: Track and analyze the latency impact of third-party API dependencies on your application using OpenTelemetry traces and span attributes.

Your application's performance is only as good as its slowest dependency. If the payment gateway takes 3 seconds to respond, your checkout flow takes at least 3 seconds, no matter how optimized your code is. Tracking third-party API latency with OpenTelemetry traces gives you visibility into which dependencies are hurting your performance and how much.

## Instrumenting HTTP Clients for Third-Party Calls

Most OpenTelemetry HTTP client instrumentation libraries automatically create spans for outbound requests. But for third-party calls, you want richer attributes. Here is how to wrap your HTTP client in Node.js:

```javascript
// instrumented-http-client.js
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const axios = require('axios');

const tracer = trace.getTracer('third-party-tracker');

// Registry of known third-party services
const DEPENDENCY_REGISTRY = {
  'api.stripe.com': { name: 'stripe', category: 'payment' },
  'api.sendgrid.com': { name: 'sendgrid', category: 'email' },
  'maps.googleapis.com': { name: 'google-maps', category: 'geocoding' },
  'api.twilio.com': { name: 'twilio', category: 'sms' },
  's3.amazonaws.com': { name: 'aws-s3', category: 'storage' },
};

function identifyDependency(url) {
  const hostname = new URL(url).hostname;
  return DEPENDENCY_REGISTRY[hostname] || { name: hostname, category: 'unknown' };
}

async function trackedRequest(method, url, options = {}) {
  const dep = identifyDependency(url);
  const spanName = `${dep.name}.${method.toUpperCase()}`;

  return tracer.startActiveSpan(spanName, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method.toUpperCase(),
      'http.url': url,
      'dependency.name': dep.name,
      'dependency.category': dep.category,
      'dependency.is_third_party': true,
      // Do not log auth headers or sensitive params
      'http.request.body_size': options.data ? JSON.stringify(options.data).length : 0,
    },
  }, async (span) => {
    const startTime = Date.now();

    try {
      const response = await axios({ method, url, ...options });
      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.status_code': response.status,
        'http.response.body_size': JSON.stringify(response.data).length,
        'dependency.response_time_ms': duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.status_code': error.response?.status || 0,
        'dependency.response_time_ms': duration,
        'dependency.error': true,
        'dependency.error_type': error.code || 'unknown',
      });

      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

module.exports = { trackedRequest };
```

## Usage in Your Application Code

Replace direct HTTP calls with the instrumented client:

```javascript
// order-service.js
const { trackedRequest } = require('./instrumented-http-client');

async function processOrder(order) {
  // Each of these creates a child span tagged with dependency info
  const paymentResult = await trackedRequest('post', 'https://api.stripe.com/v1/charges', {
    data: { amount: order.total, currency: 'usd', source: order.paymentToken },
    headers: { Authorization: `Bearer ${process.env.STRIPE_KEY}` },
  });

  const emailResult = await trackedRequest('post', 'https://api.sendgrid.com/v3/mail/send', {
    data: buildConfirmationEmail(order),
    headers: { Authorization: `Bearer ${process.env.SENDGRID_KEY}` },
  });

  const geoResult = await trackedRequest('get',
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(order.address)}&key=${process.env.GOOGLE_MAPS_KEY}`
  );

  return { paymentResult, emailResult, geoResult };
}
```

## Converting Dependency Spans to Metrics

Use the Span Metrics Connector to create time-series metrics from dependency spans:

```yaml
# otel-collector-config.yaml
connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s, 10s]
    dimensions:
      - name: dependency.name
      - name: dependency.category
      - name: dependency.is_third_party
      - name: http.status_code

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [spanmetrics, otlp/tempo]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Analyzing Dependency Impact

Query your metrics to understand how each dependency affects your application:

```promql
# P95 latency per third-party dependency
histogram_quantile(0.95,
  sum(rate(duration_milliseconds_bucket{dependency_is_third_party="true"}[5m])) by (le, dependency_name)
)

# Error rate per dependency
sum(rate(duration_milliseconds_count{dependency_is_third_party="true", http_status_code=~"5.."}[5m])) by (dependency_name)
/
sum(rate(duration_milliseconds_count{dependency_is_third_party="true"}[5m])) by (dependency_name)

# Percentage of total request time spent in third-party calls
sum(rate(duration_milliseconds_sum{dependency_is_third_party="true"}[5m])) by (dependency_name)
/
sum(rate(http_server_duration_milliseconds_sum[5m]))

# Dependency latency as percentage of parent span
avg(dependency_response_time_ms) by (dependency_name)
/
avg(http_server_duration_milliseconds)
```

## Building a Dependency Health Dashboard

```json
{
  "panels": [
    {
      "title": "Third-Party Dependency Latency (P95)",
      "type": "bargauge",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(duration_milliseconds_bucket{dependency_is_third_party='true'}[5m])) by (le, dependency_name))",
        "legendFormat": "{{dependency_name}}"
      }]
    },
    {
      "title": "Dependency Error Rate",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(duration_milliseconds_count{dependency_is_third_party='true', http_status_code=~'5..'}[5m])) by (dependency_name) / sum(rate(duration_milliseconds_count{dependency_is_third_party='true'}[5m])) by (dependency_name) * 100",
        "legendFormat": "{{dependency_name}}"
      }]
    },
    {
      "title": "Time Spent in Dependencies (% of total request)",
      "type": "piechart",
      "targets": [{
        "expr": "sum(rate(duration_milliseconds_sum{dependency_is_third_party='true'}[5m])) by (dependency_name)",
        "legendFormat": "{{dependency_name}}"
      }]
    }
  ]
}
```

## Setting Up Dependency SLOs

Define expectations for each dependency and alert when they degrade:

```yaml
# dependency-slos.yaml
groups:
  - name: dependency-health
    rules:
      - alert: StripeLateP95
        expr: |
          histogram_quantile(0.95,
            sum(rate(duration_milliseconds_bucket{dependency_name="stripe"}[5m])) by (le))
          > 2000
        for: 5m
        annotations:
          summary: "Stripe API P95 latency exceeds 2 seconds"

      - alert: DependencyErrorSpike
        expr: |
          sum(rate(duration_milliseconds_count{dependency_is_third_party="true", http_status_code=~"5.."}[5m])) by (dependency_name)
          /
          sum(rate(duration_milliseconds_count{dependency_is_third_party="true"}[5m])) by (dependency_name)
          > 0.05
        for: 5m
        annotations:
          summary: "{{ $labels.dependency_name }} error rate above 5%"
```

## Wrapping Up

Third-party dependencies are a significant and often undertracked source of latency in modern applications. By instrumenting outbound HTTP calls with rich OpenTelemetry attributes and converting those spans into metrics, you get continuous visibility into how each dependency performs. When Stripe's P95 creeps from 500ms to 2 seconds, you will know about it before your users start complaining about slow checkout times. And with the trace data, you can show the exact spans that prove the dependency is the bottleneck.
