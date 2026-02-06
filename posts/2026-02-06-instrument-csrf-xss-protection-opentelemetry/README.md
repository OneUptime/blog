# How to Instrument CSRF and XSS Protection Layers with OpenTelemetry for Security Event Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Security, CSRF, XSS

Description: Learn how to instrument your CSRF and XSS protection middleware with OpenTelemetry to track and alert on security events in real time.

Cross-Site Request Forgery (CSRF) and Cross-Site Scripting (XSS) remain two of the most common web application vulnerabilities. While most modern frameworks include built-in protections, the problem is visibility. You know the protections exist, but do you know how often they fire? Which endpoints get targeted the most? Are the attacks coming from authenticated sessions or anonymous traffic?

By instrumenting your CSRF and XSS protection layers with OpenTelemetry, you can answer all of these questions. This post walks through practical examples of adding tracing and metrics to your security middleware in a Node.js Express application.

## Setting Up the OpenTelemetry SDK

Before instrumenting anything, make sure you have the OpenTelemetry SDK configured in your application:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 15000,
  }),
});

sdk.start();
```

## Instrumenting CSRF Protection

Most Express apps use the `csurf` middleware or a custom CSRF token validator. Here is how to wrap that layer with OpenTelemetry spans and metrics:

```javascript
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('security-middleware');
const meter = metrics.getMeter('security-middleware');

// Create counters for CSRF events
const csrfBlockedCounter = meter.createCounter('security.csrf.blocked', {
  description: 'Number of requests blocked by CSRF protection',
});

const csrfValidatedCounter = meter.createCounter('security.csrf.validated', {
  description: 'Number of requests that passed CSRF validation',
});

function csrfProtectionMiddleware(req, res, next) {
  return tracer.startActiveSpan('csrf.validation', (span) => {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.route', req.route?.path || req.path);
    span.setAttribute('security.check_type', 'csrf');

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || token !== sessionToken) {
      // CSRF validation failed
      span.setAttribute('security.csrf.result', 'blocked');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'CSRF token mismatch' });

      // Record a span event with details about the blocked request
      span.addEvent('csrf.blocked', {
        'request.ip': req.ip,
        'request.user_agent': req.headers['user-agent'],
        'token.present': !!token,
      });

      csrfBlockedCounter.add(1, {
        'http.method': req.method,
        'http.route': req.route?.path || req.path,
      });

      span.end();
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    // CSRF validation passed
    span.setAttribute('security.csrf.result', 'passed');
    csrfValidatedCounter.add(1, {
      'http.method': req.method,
      'http.route': req.route?.path || req.path,
    });

    span.end();
    next();
  });
}
```

## Instrumenting XSS Protection

XSS protection typically involves sanitizing input and setting the right response headers. Here is a middleware that checks incoming request bodies for suspicious patterns and records those events:

```javascript
// A basic set of XSS patterns to detect
const xssPatterns = [
  /<script\b[^>]*>/i,
  /on\w+\s*=\s*["']/i,
  /javascript\s*:/i,
  /<iframe\b/i,
  /<object\b/i,
];

const xssDetectedCounter = meter.createCounter('security.xss.detected', {
  description: 'Number of requests with detected XSS payloads',
});

const xssCleanCounter = meter.createCounter('security.xss.clean', {
  description: 'Number of requests that passed XSS scanning',
});

function xssProtectionMiddleware(req, res, next) {
  return tracer.startActiveSpan('xss.scan', (span) => {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.route', req.route?.path || req.path);
    span.setAttribute('security.check_type', 'xss');

    // Collect all string values from the request body
    const valuesToCheck = extractStringValues(req.body);
    const detectedPatterns = [];

    for (const value of valuesToCheck) {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          detectedPatterns.push(pattern.source);
        }
      }
    }

    if (detectedPatterns.length > 0) {
      span.setAttribute('security.xss.result', 'detected');
      span.setAttribute('security.xss.pattern_count', detectedPatterns.length);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'XSS payload detected' });

      span.addEvent('xss.detected', {
        'patterns.matched': detectedPatterns.join(', '),
        'request.ip': req.ip,
        'request.content_type': req.headers['content-type'],
      });

      xssDetectedCounter.add(1, {
        'http.route': req.route?.path || req.path,
      });

      span.end();
      return res.status(400).json({ error: 'Potentially unsafe content detected' });
    }

    span.setAttribute('security.xss.result', 'clean');
    xssCleanCounter.add(1);
    span.end();
    next();
  });
}

// Helper to recursively pull string values from nested objects
function extractStringValues(obj, values = []) {
  if (typeof obj === 'string') {
    values.push(obj);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      extractStringValues(obj[key], values);
    }
  }
  return values;
}
```

## Wiring It All Together

Apply both middlewares to your Express app:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Apply security middlewares to all POST/PUT/PATCH routes
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    csrfProtectionMiddleware(req, res, (err) => {
      if (err) return next(err);
      xssProtectionMiddleware(req, res, next);
    });
  } else {
    next();
  }
});
```

## Querying the Data

Once the telemetry is flowing into your backend (OneUptime, Jaeger, or any OTLP-compatible system), you can build dashboards that answer critical questions:

- **Rate of CSRF blocks over time** - a sudden spike could indicate an active attack campaign.
- **XSS detection by route** - helps you identify which endpoints are being probed most frequently.
- **Correlation with user sessions** - if you add a `user.id` attribute to the spans, you can see whether attacks come from authenticated users or bots.

You can also set up alerts. For example, if `security.csrf.blocked` exceeds 50 events in a 5-minute window, that is worth investigating immediately.

## Summary

Instrumenting your CSRF and XSS protection layers with OpenTelemetry gives you the visibility that static security configurations lack. You get real-time data about attack frequency, targeted endpoints, and the effectiveness of your defenses. The investment is minimal since you are adding a few spans and counters to middleware you already have, but the observability payoff is significant.
