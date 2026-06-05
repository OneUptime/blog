# How to Troubleshoot the Unhandled Promise Rejection from OTLPExporterBase

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, DNS, Error Handling

Description: Fix the unhandled promise rejection that crashes your Node.js app when the OTLP exporter cannot resolve the Collector DNS name.

When the OpenTelemetry OTLP exporter cannot resolve the DNS name of your Collector, it can surface as an unhandled promise rejection in affected OpenTelemetry SDK/exporter versions. In Node.js, unhandled promise rejections are raised as uncaught exceptions by default when no `unhandledRejection` handler is installed (Node.js 15+). This means a temporary DNS issue can take down your entire application.

## The Error

```text
node:internal/process/promises:289
  triggerUncaughtException(err, true /* fromPromise */);
  ^

Error: getaddrinfo ENOTFOUND otel-collector.monitoring.svc.cluster.local
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:107:26)
```

This error happens when:
- The Collector hostname is misspelled
- DNS is temporarily unavailable
- The Collector service is not yet created in Kubernetes
- Network configuration changes affect DNS resolution

## Why It Crashes the Application

The current OpenTelemetry JavaScript `SpanExporter.export()` interface is callback-based, but OTLP exporters still perform asynchronous network work internally. In affected versions, when the BatchSpanProcessor calls the exporter and DNS resolution fails, the failure is not always converted into an export result by the exporter's internal error handling. The rejection can propagate to the Node.js event loop as an unhandled rejection.

## Fix 1: Add a Global Unhandled Rejection Handler

Add a last-resort handler for exporter DNS failures:

```javascript
// Add this at the top of your tracing.js
process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'ENOTFOUND' && String(reason.message).includes('otel-collector')) {
    console.error('Unhandled DNS rejection from OpenTelemetry exporter:', reason);
    // Do NOT call process.exit() for this exporter DNS failure - let the application continue
    return;
  }

  throw reason;
});
```

This keeps the application running if this exporter DNS failure escapes the SDK. Telemetry data is lost during the DNS outage, but the application continues serving requests. Do not use a global handler to hide unrelated application promise bugs.

## Fix 2: Update to the Latest SDK Version

This issue has been addressed in newer versions of the OpenTelemetry SDK. Update your packages:

```bash
npm install @opentelemetry/sdk-node@latest @opentelemetry/sdk-trace-base@latest @opentelemetry/exporter-trace-otlp-http@latest @opentelemetry/exporter-trace-otlp-grpc@latest
```

Newer versions of the BatchSpanProcessor catch export errors more reliably.

## Fix 3: Use an IP Address Instead of Hostname

If DNS is unreliable, use the IP address directly:

```javascript
const exporter = new OTLPTraceExporter({
  url: 'http://10.96.100.50:4318/v1/traces',  // IP instead of hostname
});
```

This is not ideal for dynamic environments where IPs change, but it eliminates the DNS dependency.

## Fix 4: Add Retry Logic at the Application Level

Wrap the SDK startup in retry logic:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const dns = require('node:dns');

async function startTracing(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
      const exporter = new OTLPTraceExporter({
        url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
      });

      // Test name resolution before starting, using the same OS lookup path as Node networking APIs
      const url = new URL(endpoint);
      await dns.promises.lookup(url.hostname);

      const sdk = new NodeSDK({
        traceExporter: exporter,
      });
      sdk.start();
      console.log('Tracing initialized successfully');
      return sdk;
    } catch (error) {
      console.warn(`Tracing init attempt ${i + 1} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 5000));  // Wait 5 seconds
      }
    }
  }
  console.warn('Could not initialize tracing after all retries. Continuing without tracing.');
  return null;
}

startTracing();
```

## Fix 5: Use the HTTP Exporter with Connection Timeout

The HTTP exporter supports an explicit per-export timeout and retry behavior:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces',
  timeoutMillis: 10000,  // 10-second timeout
  headers: {},
});
```

The timeout limits how long each export batch can wait. Current HTTP OTLP exporters also include retry behavior for transient export failures within the configured timeout.

## Kubernetes-Specific Fix

In Kubernetes, the Collector service might not be ready when your application starts. Use an init container or readiness probe:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      initContainers:
        - name: wait-for-collector
          image: busybox:1.36
          command: ['sh', '-c', 'until nc -z otel-collector 4318; do echo waiting for collector; sleep 2; done']
      containers:
        - name: my-app
          image: my-app:latest
```

This ensures the Collector is reachable before your application starts.

## Defensive Tracing Setup

Here is a complete defensive setup that handles DNS failures:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

// Catch exporter DNS failures without hiding unrelated application bugs
process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'ENOTFOUND') {
    diag.warn('OTLP exporter DNS resolution failed. Telemetry data may be lost.');
    return;
  }

  throw reason;
});

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    timeoutMillis: 10000,
  }),
});

sdk.start();
```

The key principle is that tracing should never crash your application. DNS failures, network outages, and Collector downtime should result in lost telemetry, not application outages.
