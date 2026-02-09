# How to Configure SDK Shutdown Procedures in Node.js with SIGTERM and SIGINT Trapping for Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Node.js, Kubernetes, Graceful Shutdown

Description: Configure OpenTelemetry SDK shutdown in Node.js with SIGTERM and SIGINT signal handling for proper Kubernetes pod termination.

When Kubernetes terminates a pod, it sends SIGTERM and waits for the terminationGracePeriodSeconds (default 30 seconds) before sending SIGKILL. During this window, your Node.js application needs to stop accepting new requests, finish in-flight work, and flush all pending OpenTelemetry data. Node.js does not handle SIGTERM by default in all scenarios, so you need explicit signal trapping.

## Node.js Signal Handling Basics

Node.js does not exit on SIGTERM by default when there are active event loop handles (like an HTTP server). You must explicitly handle the signal:

```javascript
// Without signal handling, the process keeps running
// until Kubernetes sends SIGKILL after the grace period

// With signal handling, you can flush data and exit cleanly
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  // Clean up and exit
});
```

## Complete Implementation

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'my-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  'deployment.environment': process.env.NODE_ENV || 'production',
  'k8s.pod.name': process.env.HOSTNAME || 'unknown',
  'k8s.namespace.name': process.env.POD_NAMESPACE || 'default',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000,
  }),
});

// Start the SDK
sdk.start();

module.exports = { sdk };
```

```javascript
// server.js
const express = require('express');
const { sdk } = require('./tracing');
const { trace } = require('@opentelemetry/api');

const app = express();
const tracer = trace.getTracer('my-service');

app.get('/api/orders', (req, res) => {
  const span = tracer.startSpan('get_orders');
  // ... business logic ...
  span.end();
  res.json({ orders: [] });
});

const server = app.listen(8080, () => {
  console.log('Server listening on port 8080');
});

// Track whether shutdown is already in progress
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log(`${signal}: Shutdown already in progress`);
    return;
  }
  isShuttingDown = true;
  console.log(`${signal}: Starting graceful shutdown...`);

  // Set a hard deadline for the entire shutdown
  const shutdownTimeout = setTimeout(() => {
    console.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, 25000); // Leave 5s buffer before Kubernetes SIGKILL

  // Do not let the timeout keep the process alive
  shutdownTimeout.unref();

  try {
    // Step 1: Stop accepting new connections
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('Error closing HTTP server:', err);
          reject(err);
        } else {
          console.log('HTTP server closed');
          resolve();
        }
      });
    });

    // Step 2: Shut down OpenTelemetry SDK
    // This flushes all pending spans and metrics
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down');

    // Step 3: Exit cleanly
    console.log('Graceful shutdown complete');
    process.exit(0);

  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle SIGTERM (from Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (from Ctrl+C during development)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions - flush before crashing
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  try {
    await sdk.shutdown();
  } catch (shutdownError) {
    console.error('Error during emergency shutdown:', shutdownError);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  // In Node.js 15+, this will terminate the process
  // Flush telemetry before that happens
  try {
    await sdk.shutdown();
  } catch (shutdownError) {
    console.error('Error during emergency shutdown:', shutdownError);
  }
  process.exit(1);
});
```

## Kubernetes Pod Configuration

Configure your pod to give enough time for graceful shutdown:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      # Allow 30 seconds for graceful shutdown
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          image: my-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: OTEL_SERVICE_NAME
              value: "my-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          # Optional: preStop hook gives time for load balancer updates
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
```

## Health Check with Shutdown Awareness

Add a health endpoint that reflects the shutdown state:

```javascript
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    // Return unhealthy during shutdown so the load balancer
    // stops sending new requests
    res.status(503).json({ status: 'shutting_down' });
  } else {
    res.json({ status: 'healthy' });
  }
});
```

## The preStop Hook and Timing

The Kubernetes shutdown sequence is:

1. Pod marked as Terminating
2. `preStop` hook runs (if configured)
3. SIGTERM sent to the container
4. Wait for `terminationGracePeriodSeconds`
5. SIGKILL sent

The `preStop: sleep 5` gives the Kubernetes load balancer time to remove the pod from its endpoint list. Without this, new requests might arrive during shutdown.

Your shutdown timeout should be:

```
shutdown_timeout = terminationGracePeriodSeconds - preStop_duration - safety_margin
shutdown_timeout = 30 - 5 - 5 = 20 seconds
```

This gives you 20 seconds to close the HTTP server and flush the OpenTelemetry SDK.

## Testing the Shutdown Locally

Simulate SIGTERM:

```bash
# Start your service
node server.js &

# Send SIGTERM
kill -TERM $!

# Watch the logs - you should see:
# SIGTERM: Starting graceful shutdown...
# HTTP server closed
# OpenTelemetry SDK shut down
# Graceful shutdown complete
```

Proper signal handling in Node.js is essential for Kubernetes deployments. Without it, the last few seconds of telemetry data from each pod restart is lost, creating blind spots in exactly the moments you need visibility the most.
