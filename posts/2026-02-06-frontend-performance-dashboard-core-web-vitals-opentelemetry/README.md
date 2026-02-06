# How to Create a Frontend Performance Dashboard with Core Web Vitals from OpenTelemetry Browser SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Core Web Vitals, Frontend Performance, Browser SDK, RUM

Description: Track Core Web Vitals like LCP, FID, and CLS using OpenTelemetry Browser SDK and build a frontend performance dashboard.

Core Web Vitals are the metrics Google uses to evaluate user experience on the web - Largest Contentful Paint (LCP), First Input Delay (FID, now replaced by Interaction to Next Paint - INP), and Cumulative Layout Shift (CLS). Most teams rely on third-party RUM tools to track these, but you can collect them directly with OpenTelemetry's Browser SDK and pipe them into your existing observability stack.

This gives you full control over the data, no sampling limits imposed by a vendor, and the ability to correlate frontend performance with backend traces end-to-end.

## Setting Up the OpenTelemetry Browser SDK

Install the required packages in your frontend project.

```bash
npm install @opentelemetry/sdk-trace-web \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-user-interaction \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  web-vitals
```

Initialize the SDK early in your application entry point. This configures tracing and sets up the OTLP exporter to send spans to your collector.

```javascript
// telemetry.js - Initialize OpenTelemetry in the browser
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const resource = new Resource({
  [ATTR_SERVICE_NAME]: 'frontend-app',
  'deployment.environment': 'production',
});

const provider = new WebTracerProvider({ resource });

// Send spans to the OTel Collector via OTLP/HTTP
const exporter = new OTLPTraceExporter({
  url: 'https://otel-collector.example.com/v1/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Auto-instrument page loads and user clicks
registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation(),
  ],
});
```

## Capturing Core Web Vitals

The `web-vitals` library provides a clean API for measuring CWV. We will wrap each metric in an OpenTelemetry span with the measured value as an attribute.

```javascript
// web-vitals-instrumentation.js
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('web-vitals');

function reportMetric(metricName, entry) {
  // Create a span for each Web Vital measurement
  const span = tracer.startSpan(`web-vital.${metricName}`, {
    attributes: {
      'web_vital.name': metricName,
      'web_vital.value': entry.value,
      'web_vital.rating': entry.rating,  // "good", "needs-improvement", "poor"
      'web_vital.delta': entry.delta,
      'page.url': window.location.pathname,
      'user_agent.browser': navigator.userAgent,
      'connection.effective_type': navigator.connection?.effectiveType || 'unknown',
    },
  });
  span.end();
}

// Register callbacks for each Core Web Vital
onLCP((entry) => reportMetric('LCP', entry));
onINP((entry) => reportMetric('INP', entry));
onCLS((entry) => reportMetric('CLS', entry));
onFCP((entry) => reportMetric('FCP', entry));
onTTFB((entry) => reportMetric('TTFB', entry));
```

## Collector Configuration for Frontend Data

The collector needs to accept browser traffic (CORS headers) and extract useful attributes. Here is a configuration that processes frontend spans and exports them.

```yaml
# otel-collector-frontend.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        # Allow browser origins to send data
        cors:
          allowed_origins:
            - "https://app.example.com"
            - "https://staging.example.com"
          allowed_headers:
            - "Content-Type"
            - "X-Requested-With"

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  # Filter out spans from bots and crawlers
  filter:
    spans:
      exclude:
        match_type: regexp
        attributes:
          - key: user_agent.browser
            value: ".*(bot|crawl|spider).*"

  # Convert span attributes to metrics for dashboard aggregation
  spanmetrics:
    metrics_exporter: prometheusremotewrite
    dimensions:
      - name: web_vital.name
      - name: web_vital.rating
      - name: page.url
      - name: connection.effective_type

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

  otlp/traces:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, filter]
      exporters: [otlp/traces]
    metrics:
      receivers: [otlp]
      processors: [batch, spanmetrics]
      exporters: [prometheusremotewrite]
```

## Dashboard Queries

Once the data lands in Prometheus, you can query it to build the panels you need. These PromQL queries give you the core panels.

```promql
# LCP p75 by page - Google uses p75 as the threshold
histogram_quantile(0.75,
  sum(rate(web_vital_LCP_bucket[1h])) by (le, page_url)
)

# Percentage of page loads with "good" LCP (under 2.5s)
sum(rate(web_vital_LCP_count{web_vital_rating="good"}[1d]))
/
sum(rate(web_vital_LCP_count[1d]))

# INP by connection type - helps identify mobile performance issues
histogram_quantile(0.75,
  sum(rate(web_vital_INP_bucket[1h])) by (le, connection_effective_type)
)

# CLS score distribution
histogram_quantile(0.75,
  sum(rate(web_vital_CLS_bucket[1h])) by (le, page_url)
)
```

## What the Dashboard Should Show

Structure your dashboard into three sections:

**Overview panel** - A single row showing current p75 values for LCP, INP, and CLS with color coding (green for good, yellow for needs improvement, red for poor). Use the thresholds Google publishes: LCP < 2.5s, INP < 200ms, CLS < 0.1.

**Trend panels** - Time series charts for each metric over the past 30 days. Look for regressions that correlate with deployments. Since your backend traces also flow through OpenTelemetry, you can overlay deployment markers from your CI/CD pipeline.

**Breakdown panels** - Tables showing the worst-performing pages, the impact of connection type on performance, and geographic distribution if you have that data from your CDN logs.

## Connecting Frontend and Backend Traces

The real power of using OpenTelemetry for frontend performance - instead of a standalone RUM tool - is trace context propagation. When the browser makes fetch requests, the OpenTelemetry SDK automatically injects `traceparent` headers. This means a slow LCP caused by a slow API call shows up as a single connected trace from the browser all the way to the database query.

To enable this, make sure your fetch instrumentation is configured.

```javascript
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      // Propagate trace context to your API domains
      propagateTraceHeaderCorsUrls: [
        /https:\/\/api\.example\.com\/.*/,
      ],
    }),
  ],
});
```

With this setup, when a user reports that a page is slow, you can find the exact trace - from the browser paint event through the API gateway to the database - and pinpoint the bottleneck. No more guessing whether it is a frontend rendering issue or a backend latency problem.
