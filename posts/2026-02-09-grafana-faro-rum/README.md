# How to configure Grafana Faro for real-user monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Faro, Real-User Monitoring

Description: Learn how to implement Grafana Faro to capture real-user monitoring data from web applications including performance metrics, errors, and user sessions.

---

Backend monitoring tells you what's happening on your servers, but it doesn't show you what users actually experience in their browsers. Grafana Faro provides real-user monitoring that captures client-side performance, errors, and behavior directly from web applications. This visibility helps you understand and optimize the actual user experience.

## Understanding Grafana Faro

Faro is Grafana's solution for frontend observability. It collects performance metrics, JavaScript errors, console logs, and user interactions from browsers and sends them to your Grafana stack. Unlike synthetic monitoring that simulates users, Faro captures real data from actual users in production.

Faro integrates with Grafana's existing observability tools, sending metrics to Prometheus or Mimir, logs to Loki, and traces to Tempo.

## Setting Up Faro Collector

The Faro collector receives telemetry from instrumented web applications. Deploy it alongside your Grafana stack.

```yaml
# docker-compose.yml
version: '3.8'

services:
  faro-collector:
    image: grafana/faro-collector:latest
    ports:
      - "12345:12345"
    environment:
      - FARO_COLLECTOR_LOKI_URL=http://loki:3100/loki/api/v1/push
      - FARO_COLLECTOR_TEMPO_URL=http://tempo:4317
      - FARO_COLLECTOR_PROMETHEUS_URL=http://prometheus:9090/api/v1/write
    volumes:
      - ./faro-collector-config.yaml:/etc/faro/config.yaml
    command:
      - "--config.file=/etc/faro/config.yaml"
```

The collector processes incoming telemetry and forwards it to appropriate backends.

## Configuring Faro Collector

Create a configuration that defines how to handle different telemetry types.

```yaml
# faro-collector-config.yaml
server:
  http_listen_port: 12345
  http_listen_address: 0.0.0.0

  # Enable CORS for browser requests
  cors:
    allowed_origins:
      - "https://app.example.com"
      - "https://www.example.com"
    allowed_methods:
      - POST
      - GET
      - OPTIONS

receivers:
  faro:
    # Maximum payload size
    max_allowed_payload_size: 1048576  # 1MB

processors:
  # Filter out sensitive data
  attributes:
    actions:
      - key: user.email
        action: delete
      - key: user.ip
        action: hash

  # Add environment labels
  resource:
    attributes:
      - key: environment
        value: production
        action: insert

exporters:
  # Send logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      job: faro
      source: frontend

  # Send traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  # Send metrics to Prometheus
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    logs:
      receivers: [faro]
      processors: [attributes, resource]
      exporters: [loki]

    traces:
      receivers: [faro]
      processors: [resource]
      exporters: [otlp/tempo]

    metrics:
      receivers: [faro]
      processors: [resource]
      exporters: [prometheusremotewrite]
```

This configuration ensures sensitive data is filtered before export.

## Instrumenting Web Applications

Add Faro to your web application with the JavaScript SDK.

```javascript
// app.js
import { initializeFaro } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  url: 'https://faro-collector.example.com/collect',
  app: {
    name: 'my-web-app',
    version: '1.0.0',
    environment: 'production',
  },

  // Instrument specific features
  instrumentations: {
    // Track errors automatically
    errors: {
      enabled: true,
      // Ignore specific errors
      ignoreErrors: [
        /^Network request failed$/,
        /^Extension context invalidated$/,
      ],
    },

    // Track console logs
    console: {
      enabled: true,
      level: ['error', 'warn'],
    },

    // Track web vitals
    webVitals: {
      enabled: true,
    },

    // Track user interactions
    interactions: {
      enabled: true,
    },

    // Track XHR and fetch requests
    fetch: {
      enabled: true,
    },
  },

  // Add custom metadata
  user: {
    id: getCurrentUserId(),
    attributes: {
      plan: 'premium',
      region: 'us-east',
    },
  },

  // Session configuration
  session: {
    // Track session duration
    trackSession: true,
  },

  // Batching configuration
  batching: {
    enabled: true,
    sendTimeout: 5000,  // Send every 5 seconds
  },
});

// Track custom events
faro.api.pushEvent('checkout_completed', {
  order_id: '12345',
  amount: 99.99,
});
```

Faro automatically starts collecting telemetry once initialized.

## Tracking Custom Events

Capture application-specific events for business insights.

```javascript
// Track user actions
document.getElementById('submit-button').addEventListener('click', () => {
  faro.api.pushEvent('form_submitted', {
    form_name: 'contact',
    fields_completed: 5,
  });
});

// Track feature usage
function useFeature(featureName) {
  faro.api.pushEvent('feature_used', {
    feature: featureName,
    timestamp: Date.now(),
  });

  // Feature implementation
}

// Track errors with context
try {
  riskyOperation();
} catch (error) {
  faro.api.pushError(error, {
    context: 'payment_processing',
    user_action: 'checkout',
  });
}

// Track measurements
function trackPageLoad() {
  const loadTime = performance.now();
  faro.api.pushMeasurement({
    type: 'page_load',
    value: loadTime,
    attributes: {
      page: window.location.pathname,
    },
  });
}
```

These events appear in Grafana alongside automatically collected telemetry.

## Monitoring Web Vitals

Faro automatically tracks Core Web Vitals that impact user experience.

```javascript
// Faro tracks these automatically when enabled:
// - LCP (Largest Contentful Paint)
// - FID (First Input Delay)
// - CLS (Cumulative Layout Shift)
// - FCP (First Contentful Paint)
// - TTFB (Time to First Byte)

// Query web vitals in Grafana
// LCP metric
faro_web_vitals_lcp_seconds

// CLS metric
faro_web_vitals_cls

// FID metric
faro_web_vitals_fid_seconds
```

Create alerts when these metrics exceed thresholds:

```promql
# Alert when LCP is too slow
histogram_quantile(0.75, rate(faro_web_vitals_lcp_seconds_bucket[5m])) > 2.5

# Alert when CLS is too high
histogram_quantile(0.75, rate(faro_web_vitals_cls_bucket[5m])) > 0.1
```

## Tracking Single Page Application Navigation

For SPAs, track route changes and navigation timing.

```javascript
// React Router integration
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { faro } from '@grafana/faro-react';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Track navigation
    faro.api.pushEvent('route_change', {
      from: previousPath,
      to: location.pathname,
    });

    // Track page view
    faro.api.setView({
      name: location.pathname,
    });
  }, [location]);

  return <Router />;
}

// Vue Router integration
router.afterEach((to, from) => {
  faro.api.pushEvent('route_change', {
    from: from.path,
    to: to.path,
  });
});
```

This provides visibility into navigation patterns and route-specific performance.

## Filtering Sensitive Data

Prevent sensitive information from being sent to Faro.

```javascript
const faro = initializeFaro({
  url: 'https://faro-collector.example.com/collect',

  // Filter before sending
  beforeSend: (payload) => {
    // Remove sensitive attributes
    if (payload.user) {
      delete payload.user.email;
      delete payload.user.phone;
    }

    // Redact sensitive URLs
    if (payload.url) {
      payload.url = payload.url.replace(/token=([^&]+)/, 'token=REDACTED');
    }

    // Filter console logs
    if (payload.logs) {
      payload.logs = payload.logs.filter(log => {
        return !log.message.includes('password');
      });
    }

    return payload;
  },

  // Ignore specific URLs
  ignoreUrls: [
    /https:\/\/analytics\.example\.com/,
    /chrome-extension:\/\//,
  ],
});
```

Always filter sensitive data at the client before transmission.

## Correlating Frontend and Backend

Connect frontend errors to backend traces for complete request visibility.

```javascript
// Capture backend trace ID in frontend
fetch('/api/data')
  .then(response => {
    const traceId = response.headers.get('X-Trace-Id');

    // Add trace ID to Faro context
    faro.api.setUser({
      attributes: {
        last_trace_id: traceId,
      },
    });

    return response.json();
  })
  .catch(error => {
    // Error includes trace ID for correlation
    faro.api.pushError(error);
  });
```

Query Tempo using the trace ID to see the full request flow from browser to backend.

## Creating Faro Dashboards in Grafana

Build dashboards that visualize frontend performance and errors.

```json
{
  "panels": [
    {
      "title": "Web Vitals - LCP",
      "targets": [
        {
          "expr": "histogram_quantile(0.75, sum(rate(faro_web_vitals_lcp_seconds_bucket[5m])) by (le))",
          "legendFormat": "75th percentile"
        }
      ]
    },
    {
      "title": "JavaScript Errors",
      "targets": [
        {
          "expr": "sum(rate(faro_errors_total[5m])) by (error_type)",
          "legendFormat": "{{error_type}}"
        }
      ]
    },
    {
      "title": "Page Load Time",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(faro_page_load_seconds_bucket[5m]))",
          "legendFormat": "95th percentile"
        }
      ]
    },
    {
      "title": "Error Logs",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"faro\"} |= \"error\"",
          "refId": "A"
        }
      ]
    }
  ]
}
```

These panels provide real-time visibility into user experience.

## Implementing Session Replay

While Faro doesn't include built-in session replay, you can export events for reconstruction.

```javascript
const faro = initializeFaro({
  url: 'https://faro-collector.example.com/collect',

  instrumentations: {
    interactions: {
      enabled: true,
      // Capture detailed interaction data
      captureType: 'detailed',
    },
  },

  // Track DOM mutations for replay
  session: {
    trackSession: true,
    attributes: {
      // Add page state
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      user_agent: navigator.userAgent,
    },
  },
});

// Manually track key interactions
document.addEventListener('click', (event) => {
  faro.api.pushEvent('click', {
    target: event.target.tagName,
    x: event.clientX,
    y: event.clientY,
  });
});
```

Combine interaction events with error logs to understand the user actions that led to issues.

## Monitoring API Performance

Track frontend API call performance and errors.

```javascript
const faro = initializeFaro({
  instrumentations: {
    fetch: {
      enabled: true,
      // Add custom attributes
      requestHeaders: ['X-Request-ID'],
      responseHeaders: ['X-Trace-ID'],
    },
  },
});

// Faro automatically tracks:
// - Request duration
// - Response status
// - URL patterns
// - Error rates

// Query in Grafana
// API call duration
faro_http_request_duration_seconds

// API error rate
rate(faro_http_requests_total{status_code=~"5.."}[5m])
/ rate(faro_http_requests_total[5m])
```

## Best Practices for Real-User Monitoring

Enable Faro in production, not just development. Real user behavior differs significantly from testing scenarios.

Filter sensitive data before it leaves the browser. Never send passwords, tokens, or personal information.

Set appropriate sampling rates for high-traffic applications to control data volume and costs.

Monitor Web Vitals and set alerts based on business impact thresholds, not arbitrary values.

Correlate frontend errors with backend traces to understand complete failure scenarios.

Segment metrics by user attributes like plan tier or region to identify experience variations.

Review error logs regularly to identify and fix common issues impacting users.

Track custom events for business-critical user journeys like signup and checkout flows.

Test Faro configuration in staging before deploying to production to ensure data quality.

Grafana Faro transforms frontend monitoring from guesswork into data-driven understanding. It reveals what users actually experience, not what you think they experience, enabling you to optimize the aspects of your application that matter most to real users.
