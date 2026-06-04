# How to configure Grafana Faro for real-user monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Faro, Real-User Monitoring

Description: Learn how to implement Grafana Faro to capture real-user monitoring data from web applications including performance metrics, errors, and user sessions.

---

Backend monitoring tells you what's happening on your servers, but it doesn't show you what users actually experience in their browsers. Grafana Faro provides real-user monitoring that captures client-side performance, errors, and behavior directly from web applications. This visibility helps you understand and optimize the actual user experience.

## Understanding Grafana Faro

Faro is Grafana's solution for frontend observability. It collects performance metrics, JavaScript errors, console logs, and user interactions from browsers and sends them to your Grafana stack. Unlike synthetic monitoring that simulates users, Faro captures real data from actual users in production.

Faro integrates with Grafana's observability tools by sending frontend logs, events, exceptions, and measurements to Loki and frontend traces to Tempo. Grafana Cloud Frontend Observability also creates dashboards and alerting rules from the collected Faro data.

## Setting Up Grafana Alloy for Faro

For self-managed Grafana stacks, Grafana Alloy can receive telemetry from instrumented web applications with the Faro receiver. Deploy it alongside your Grafana stack.

```yaml
# docker-compose.yml

services:
  alloy:
    image: grafana/alloy:latest
    ports:
      - "12345:12345"  # Alloy UI
      - "12347:12347"  # Faro receiver
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy
    command:
      - run
      - --server.http.listen-addr=0.0.0.0:12345
      - --storage.path=/var/lib/alloy/data
      - /etc/alloy/config.alloy
```

Alloy processes incoming telemetry and forwards it to the configured backends.

## Configuring the Faro Receiver

Create a configuration that defines how to handle different telemetry types.

```alloy
# config.alloy
faro.receiver "frontend" {
  extra_log_labels = {
    job    = "faro",
    source = "frontend",
  }

  server {
    listen_address           = "0.0.0.0"
    listen_port              = 12347
    cors_allowed_origins     = ["https://app.example.com", "https://www.example.com"]
    max_allowed_payload_size = "1MiB"
  }

  output {
    logs   = [loki.write.local.receiver]
    traces = [otelcol.processor.batch.default.input]
  }
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}

otelcol.processor.batch "default" {
  output {
    traces = [otelcol.exporter.otlp.tempo.input]
  }
}

otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo:4317"

    tls {
      insecure = true
    }
  }
}
```

This configuration accepts Faro telemetry, sends logs and measurements to Loki, and forwards traces to Tempo.

## Instrumenting Web Applications

Add Faro to your web application with the JavaScript SDK.

```javascript
// app.js
import {
  FetchTransport,
  LogLevel,
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  app: {
    name: 'my-web-app',
    version: '1.0.0',
    environment: 'production',
  },

  transports: [
    new FetchTransport({
      url: 'https://faro-collector.example.com/collect',
    }),
  ],

  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: true,
      enablePerformanceInstrumentation: true,
    }),
    new TracingInstrumentation(),
  ],

  ignoreErrors: [/^Network request failed$/, /^Extension context invalidated$/],

  consoleInstrumentation: {
    disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG],
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
  sessionTracking: {
    enabled: true,
    persistent: true,
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
  amount: '99.99',
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
    fields_completed: '5',
  });
});

// Track feature usage
function useFeature(featureName) {
  faro.api.pushEvent('feature_used', {
    feature: featureName,
    timestamp: String(Date.now()),
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
    values: {
      load_time_ms: loadTime,
    },
  }, {
    context: {
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
// - INP (Interaction to Next Paint)
// - CLS (Cumulative Layout Shift)
// - FCP (First Contentful Paint)
// - TTFB (Time to First Byte)
```

In Grafana Cloud Frontend Observability, Web Vitals alerts are created from Loki-based recording rules. The built-in alerting rules cover LCP, CLS, INP, FCP, TTFB, and other frontend signals.

Use the Frontend Observability alerting settings to enable these rules and adjust thresholds for your application.

## Tracking Single Page Application Navigation

For SPAs, track route changes and navigation timing.

```javascript
// React Router integration
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { faro } from '@grafana/faro-react';

function App() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    // Track navigation
    faro.api.pushEvent('route_change', {
      from: previousPath.current,
      to: location.pathname,
    });

    // Track page view
    faro.api.setView({
      name: location.pathname,
    });

    previousPath.current = location.pathname;
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
  transports: [
    new FetchTransport({
      url: 'https://faro-collector.example.com/collect',
    }),
  ],

  // Filter before sending
  beforeSend: (item) => {
    // Remove sensitive attributes
    if (item.meta.user) {
      delete item.meta.user.email;
      delete item.meta.user.fullName;
    }

    // Redact sensitive URLs
    if (item.meta.page?.url) {
      item.meta.page.url = item.meta.page.url.replace(/token=([^&]+)/, 'token=REDACTED');
    }

    // Filter console logs
    if (item.type === 'log' && item.payload.message.includes('password')) {
      return null;
    }

    return item;
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
    if (traceId) {
      faro.api.setUser({
        attributes: {
          last_trace_id: traceId,
        },
      });
    }

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
      "title": "Faro Logs",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"faro\"}",
          "refId": "A"
        }
      ]
    },
    {
      "title": "Frontend Errors",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"faro\"} |= \"exception\"",
          "refId": "B"
        }
      ]
    },
    {
      "title": "Web Vitals Measurements",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"faro\"} |= \"web-vitals\"",
          "refId": "C"
        }
      ]
    }
  ]
}
```

These panels provide a starting point for exploring Faro data in Loki. In Grafana Cloud Frontend Observability, the built-in dashboards and alerting rules provide the Web Vitals and error-rate views without manually creating Prometheus metrics.

## Implementing Session Replay

Faro doesn't include built-in session replay, but you can export custom events to add context around errors and performance issues.

```javascript
const faro = initializeFaro({
  transports: [
    new FetchTransport({
      url: 'https://faro-collector.example.com/collect',
    }),
  ],

  sessionTracking: {
    enabled: true,
    session: {
      attributes: {
        // Add page state
        viewport_width: String(window.innerWidth),
        viewport_height: String(window.innerHeight),
        user_agent: navigator.userAgent,
      },
    },
  },
});

// Manually track key interactions
document.addEventListener('click', (event) => {
  faro.api.pushEvent('click', {
    target: event.target.tagName,
    x: String(event.clientX),
    y: String(event.clientY),
  });
});
```

Combine interaction events with error logs to understand the user actions that led to issues.

## Monitoring API Performance

Track frontend API call performance and errors.

```javascript
const faro = initializeFaro({
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation({
      instrumentationOptions: {
        fetchInstrumentationOptions: {
          applyCustomAttributesOnSpan: (span, request, result) => {
            if (result instanceof Response) {
              span.setAttribute('http.response.header.x_trace_id', result.headers.get('X-Trace-ID') ?? '');
            }
          },
        },
      },
    }),
  ],
});

// Faro automatically tracks:
// - Request duration
// - Response status
// - URLs
// - Related frontend traces
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
