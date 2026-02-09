# How to Troubleshoot the Unhandled Promise Rejection from OTLPExporterBase on DNS Resolution Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, DNS, Error Handling

Description: Fix the unhandled promise rejection that crashes your Node.js app when the OTLP exporter cannot resolve the Collector DNS name.

When the OpenTelemetry OTLP exporter cannot resolve the DNS name of your Collector, it throws an error that can surface as an unhandled promise rejection. In Node.js, unhandled promise rejections crash the process by default (Node.js 15+). This means a temporary DNS issue can take down your entire application.

## The Error

```
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

The OTLP exporter's `export()` method returns a Promise. When the BatchSpanProcessor calls `export()` and the DNS resolution fails, the rejection is not always caught by the BatchSpanProcessor's internal error handling (depending on the version). The rejection propagates to the Node.js event loop as an unhandled rejection.

## Fix 1: Add a Global Unhandled Rejection Handler

Prevent crashes from any unhandled rejection:

```javascript
// Add this at the top of your tracing.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection from OpenTelemetry exporter:', reason);
  // Do NOT call process.exit() - let the application continue
});
```

This keeps the application running even if the exporter fails. Telemetry data is lost during the DNS outage, but the application continues serving requests.

## Fix 2: Update to the Latest SDK Version

This issue has been addressed in newer versions of the OpenTelemetry SDK. Update your packages:

```bash
npm install @opentelemetry/exporter-trace-otlp-http@latest
npm install @opentelemetry/exporter-trace-otlp-grpc@latest
npm install @opentelemetry/sdk-trace-base@latest
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

async function startTracing(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const exporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
      });

      // Test DNS resolution before starting
      const url = new URL(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
      const dns = require('dns');
      await dns.promises.resolve(url.hostname);

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

The HTTP exporter handles connection errors more gracefully than the gRPC exporter:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces',
  timeoutMillis: 10000,  // 10-second timeout
  headers: {},
});
```

The HTTP exporter catches network errors internally and returns them as export failures rather than unhandled rejections.

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

// Catch all unhandled rejections from the exporter
process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'ENOTFOUND') {
    diag.warn('OTLP exporter DNS resolution failed. Telemetry data may be lost.');
  }
});

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    timeoutMillis: 10000,
  }),
});

sdk.start();
```

The key principle is that tracing should never crash your application. DNS failures, network outages, and Collector downtime should result in lost telemetry, not application outages.
