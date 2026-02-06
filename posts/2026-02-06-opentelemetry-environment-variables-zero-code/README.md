# How to Set Up OpenTelemetry with Environment Variables (Zero-Code Configuration)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Environment Variables, Zero-Code, Configuration, OTEL

Description: Configure OpenTelemetry instrumentation without writing code using standardized environment variables for exporters, sampling, resources, and more.

You can configure the entire OpenTelemetry SDK without touching a single line of application code. No imports, no initialization blocks, no if-else configuration logic. Just set environment variables, and the SDK reads them at startup.

This approach is called "zero-code configuration," and it's incredibly powerful. It lets you change backends, adjust sampling rates, toggle debug logging, and modify resource attributes without redeploying your application. Change the environment, restart the process, done.

This guide covers every environment variable that matters, what they do, and how to use them effectively. By the end, you'll be able to configure production-grade OpenTelemetry instrumentation through environment variables alone.

## Why Environment Variables?

**Portability**: The same application binary runs in dev, staging, and production with different observability configurations. No conditional compilation, no config file juggling.

**Security**: Sensitive values (API tokens, endpoints) stay out of source code. They live in secret managers (AWS Secrets Manager, Kubernetes Secrets, Vault).

**Flexibility**: Ops teams can tune telemetry settings (sampling, export intervals, debug logging) without coordinating with developers.

**Standardization**: OpenTelemetry defines a standard set of environment variables. They work across all languages (JavaScript, Python, Go, Java, .NET, etc.).

**12-Factor compliance**: The Twelve-Factor App methodology recommends environment-based configuration. OpenTelemetry follows this principle.

## Core Environment Variables

These variables control fundamental SDK behavior.

### OTEL_SDK_DISABLED

Disables the SDK entirely. Instrumentation becomes a no-op. Useful for local development when you don't want telemetry overhead.

```bash
export OTEL_SDK_DISABLED=true
```

Default: `false`

When disabled, spans are still created (API calls succeed), but they're not recorded or exported. Performance impact is negligible.

### OTEL_SERVICE_NAME

The name of your service. This appears in traces, metrics, and logs as `service.name`.

```bash
export OTEL_SERVICE_NAME=checkout-api
```

Default: `unknown_service` (not useful, always set this)

This is the most important environment variable. Every service should have a unique, descriptive name.

### OTEL_RESOURCE_ATTRIBUTES

Arbitrary key-value pairs attached to all telemetry. Use this for environment, version, region, team, etc.

```bash
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=2.1.3,cloud.region=us-east-1,team=payments"
```

Format: Comma-separated `key=value` pairs. Values with spaces must be quoted.

```bash
export OTEL_RESOURCE_ATTRIBUTES='service.name=my service,key=value with spaces'
```

These attributes appear on every span, metric, and log record. They're essential for filtering and grouping in your observability backend.

### OTEL_LOG_LEVEL

SDK logging verbosity. Useful for debugging export issues.

```bash
export OTEL_LOG_LEVEL=debug
```

Levels: `none`, `error`, `warn`, `info`, `debug`

Default: `info`

Set to `debug` when troubleshooting. You'll see export attempts, success/failure, and detailed error messages.

## Exporter Configuration

These variables control where and how telemetry is exported.

### OTEL_EXPORTER_OTLP_ENDPOINT

The base URL for OTLP exports. The SDK appends signal-specific paths (`/v1/traces`, `/v1/metrics`, `/v1/logs`).

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp
```

The SDK will export to:
- Traces: `https://oneuptime.com/otlp/v1/traces`
- Metrics: `https://oneuptime.com/otlp/v1/metrics`
- Logs: `https://oneuptime.com/otlp/v1/logs`

For gRPC, use a `grpc://` URL:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=grpc://oneuptime.com:4317
```

### OTEL_EXPORTER_OTLP_HEADERS

HTTP headers sent with every export request. Use this for authentication tokens.

```bash
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your_token_here,x-custom-header=value"
```

Format: Comma-separated `key=value` pairs.

For bearer tokens:

```bash
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### OTEL_EXPORTER_OTLP_PROTOCOL

The transport protocol to use: `grpc`, `http/protobuf`, or `http/json`.

```bash
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Default: `http/protobuf` (most compatible)

Options:
- `grpc`: Use gRPC transport (efficient, requires gRPC infrastructure)
- `http/protobuf`: HTTP with protobuf encoding (efficient, compatible)
- `http/json`: HTTP with JSON encoding (human-readable, debugging only)

Related reading: [How to Choose Between OTLP/gRPC and OTLP/HTTP for Your Application](https://oneuptime.com/blog/post/2026-02-06-otlp-grpc-vs-http-comparison/view)

### Signal-Specific Endpoints

Override the endpoint for a specific signal type.

```bash
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://traces-backend.com/v1/traces
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://metrics-backend.com/v1/metrics
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://logs-backend.com/v1/logs
```

Useful when you want to send different signals to different backends (e.g., traces to Jaeger, metrics to Prometheus, logs to Loki).

### Signal-Specific Headers

Override headers for a specific signal type.

```bash
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="x-trace-token=abc123"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="x-metric-token=def456"
```

### OTEL_EXPORTER_OTLP_TIMEOUT

Timeout for export requests, in milliseconds.

```bash
export OTEL_EXPORTER_OTLP_TIMEOUT=10000
```

Default: `10000` (10 seconds)

If an export takes longer than this, it's considered failed and may be retried.

### OTEL_EXPORTER_OTLP_COMPRESSION

Compression algorithm for exports. Always use `gzip` in production.

```bash
export OTEL_EXPORTER_OTLP_COMPRESSION=gzip
```

Default: `none` (uncompressed)

Options: `none`, `gzip`

Compression reduces bandwidth by 5-10x. There's no reason not to enable it.

## Trace-Specific Configuration

### OTEL_TRACES_EXPORTER

Which trace exporter to use.

```bash
export OTEL_TRACES_EXPORTER=otlp
```

Default: `otlp`

Options: `otlp`, `jaeger`, `zipkin`, `console`, `none`

Use `otlp` for modern backends. Use `console` for debugging (prints spans to stdout). Use `none` to disable trace export.

### OTEL_TRACES_SAMPLER

The sampling strategy for traces.

```bash
export OTEL_TRACES_SAMPLER=traceidratio
```

Default: `parentbased_always_on` (sample everything)

Common options:
- `always_on`: Sample 100% of traces (useful for low-volume dev environments)
- `always_off`: Sample 0% of traces (disable tracing)
- `traceidratio`: Sample a percentage of traces
- `parentbased_always_on`: Sample everything, respect parent sampling decision
- `parentbased_traceidratio`: Sample a percentage, respect parent decision

### OTEL_TRACES_SAMPLER_ARG

Argument for the sampler. For `traceidratio`, this is the sampling probability (0.0 to 1.0).

```bash
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

This samples 10% of traces. Use this to control telemetry volume in high-traffic environments.

### OTEL_BSP_SCHEDULE_DELAY

How often the BatchSpanProcessor exports batches, in milliseconds.

```bash
export OTEL_BSP_SCHEDULE_DELAY=5000
```

Default: `5000` (5 seconds)

Lower values export more frequently (lower latency, higher network overhead). Higher values batch more spans (higher latency, better throughput).

### OTEL_BSP_MAX_QUEUE_SIZE

Maximum number of spans queued for export.

```bash
export OTEL_BSP_MAX_QUEUE_SIZE=2048
```

Default: `2048`

If your application generates spans faster than the exporter can send them, spans are queued. If the queue fills, new spans are dropped (with a warning logged).

Increase this if you see "queue full" warnings. But also investigate why export is slow.

### OTEL_BSP_MAX_EXPORT_BATCH_SIZE

Maximum number of spans sent in a single export request.

```bash
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
```

Default: `512`

Larger batches are more efficient (fewer network requests) but increase memory usage and latency (spans wait longer for a full batch).

### OTEL_BSP_EXPORT_TIMEOUT

Timeout for a single export operation, in milliseconds.

```bash
export OTEL_BSP_EXPORT_TIMEOUT=30000
```

Default: `30000` (30 seconds)

If a batch takes longer than this to export, it's considered failed.

## Metric-Specific Configuration

### OTEL_METRICS_EXPORTER

Which metric exporter to use.

```bash
export OTEL_METRICS_EXPORTER=otlp
```

Default: `otlp`

Options: `otlp`, `prometheus`, `console`, `none`

Use `otlp` for push-based backends. Use `prometheus` if you're running a Prometheus scraper. Use `console` for debugging.

### OTEL_METRIC_EXPORT_INTERVAL

How often metrics are exported, in milliseconds.

```bash
export OTEL_METRIC_EXPORT_INTERVAL=60000
```

Default: `60000` (60 seconds)

Lower values give you higher resolution metrics but increase network traffic. Higher values reduce traffic but lose granularity.

For production, 60 seconds is standard. For debugging, 10-15 seconds is useful.

### OTEL_METRIC_EXPORT_TIMEOUT

Timeout for a single metric export operation, in milliseconds.

```bash
export OTEL_METRIC_EXPORT_TIMEOUT=30000
```

Default: `30000` (30 seconds)

### OTEL_EXPORTER_PROMETHEUS_HOST and OTEL_EXPORTER_PROMETHEUS_PORT

If using the Prometheus exporter, configure the scrape endpoint.

```bash
export OTEL_METRICS_EXPORTER=prometheus
export OTEL_EXPORTER_PROMETHEUS_HOST=0.0.0.0
export OTEL_EXPORTER_PROMETHEUS_PORT=9464
```

This exposes metrics at `http://0.0.0.0:9464/metrics` for Prometheus to scrape.

## Log-Specific Configuration

### OTEL_LOGS_EXPORTER

Which log exporter to use.

```bash
export OTEL_LOGS_EXPORTER=otlp
```

Default: `otlp`

Options: `otlp`, `console`, `none`

Most logging frameworks (Pino, Winston, Logback, Log4j) have OpenTelemetry integrations that automatically export logs via OTLP.

## Propagation Configuration

Context propagation determines how trace context is passed between services (via HTTP headers, message metadata, etc.).

### OTEL_PROPAGATORS

Which context propagation formats to use.

```bash
export OTEL_PROPAGATORS=tracecontext,baggage
```

Default: `tracecontext,baggage` (W3C Trace Context and W3C Baggage)

Common options:
- `tracecontext`: W3C Trace Context (standard, use this)
- `baggage`: W3C Baggage (key-value context propagation)
- `b3`: Zipkin B3 single-header format
- `b3multi`: Zipkin B3 multi-header format
- `jaeger`: Jaeger propagation format
- `xray`: AWS X-Ray propagation format
- `ottrace`: OpenTracing propagation format

You can specify multiple propagators (comma-separated). The SDK will try them in order.

For maximum compatibility, use:

```bash
export OTEL_PROPAGATORS=tracecontext,baggage,b3
```

This supports W3C and Zipkin B3 formats, covering most systems.

## Complete Real-World Example

Here's a production-ready configuration for a Node.js microservice exporting to OneUptime.

```bash
#!/bin/bash

# Service identity
export OTEL_SERVICE_NAME=checkout-api

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=2.1.3,cloud.provider=aws,cloud.region=us-east-1,team=payments"

# OTLP export configuration
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=${ONEUPTIME_TOKEN}"
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_COMPRESSION=gzip
export OTEL_EXPORTER_OTLP_TIMEOUT=10000

# Trace configuration
export OTEL_TRACES_EXPORTER=otlp
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.2  # Sample 20% of traces

# Batch span processor tuning
export OTEL_BSP_SCHEDULE_DELAY=5000
export OTEL_BSP_MAX_QUEUE_SIZE=2048
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
export OTEL_BSP_EXPORT_TIMEOUT=30000

# Metric configuration
export OTEL_METRICS_EXPORTER=otlp
export OTEL_METRIC_EXPORT_INTERVAL=60000
export OTEL_METRIC_EXPORT_TIMEOUT=30000

# Log configuration
export OTEL_LOGS_EXPORTER=otlp

# Propagation (support W3C and Zipkin B3)
export OTEL_PROPAGATORS=tracecontext,baggage,b3

# SDK logging (set to 'debug' for troubleshooting)
export OTEL_LOG_LEVEL=info

# Start the application
node --require @opentelemetry/auto-instrumentations-node/register app.js
```

This configuration:
- Identifies the service and environment
- Exports all signals to OneUptime via OTLP/HTTP with compression
- Samples 20% of traces (reduces volume while keeping visibility)
- Batches spans efficiently
- Exports metrics every 60 seconds
- Supports multiple propagation formats for cross-service compatibility

## Auto-Instrumentation with Environment Variables

Many languages support auto-instrumentation that's configured entirely via environment variables. You don't write any SDK initialization code.

### Node.js auto-instrumentation

Install the auto-instrumentation package:

```bash
npm install @opentelemetry/auto-instrumentations-node
```

Run your application with the auto-instrumentation registration:

```bash
node --require @opentelemetry/auto-instrumentations-node/register app.js
```

The SDK reads environment variables and automatically instruments HTTP, database, messaging, and framework libraries.

### Python auto-instrumentation

Install the auto-instrumentation package:

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
```

Use the `opentelemetry-instrument` wrapper:

```bash
opentelemetry-instrument python app.py
```

It reads environment variables and instruments Flask, Django, SQLAlchemy, requests, etc.

### Java auto-instrumentation

Download the Java agent:

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Run your application with the agent:

```bash
java -javaagent:opentelemetry-javaagent.jar -jar app.jar
```

The agent reads environment variables and instruments JDBC, Servlets, Spring, Hibernate, etc.

### Go (no auto-instrumentation)

Go doesn't have auto-instrumentation (due to language limitations). You must import and configure the SDK in code. But you can still use environment variables for configuration.

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/resource"
)

// Use environment variables for configuration
// The SDK reads OTEL_* variables automatically when you call resource.New()
res, _ := resource.New(context.Background())
```

## Kubernetes and Docker Configuration

Environment variables are perfect for containerized deployments.

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: checkout-api:2.1.3
        env:
        - name: OTEL_SERVICE_NAME
          value: checkout-api
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: deployment.environment=production,cloud.provider=aws
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: http://otel-collector.observability.svc.cluster.local:4318
        - name: OTEL_EXPORTER_OTLP_PROTOCOL
          value: http/protobuf
        - name: OTEL_TRACES_SAMPLER
          value: parentbased_traceidratio
        - name: OTEL_TRACES_SAMPLER_ARG
          value: "0.1"
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: observability-secrets
              key: oneuptime-token
        - name: OTEL_EXPORTER_OTLP_HEADERS
          value: x-oneuptime-token=$(ONEUPTIME_TOKEN)
```

This exports to a Collector running in the cluster. The Collector forwards to OneUptime.

### Docker Compose

```yaml
version: '3.8'
services:
  checkout-api:
    image: checkout-api:2.1.3
    environment:
      OTEL_SERVICE_NAME: checkout-api
      OTEL_RESOURCE_ATTRIBUTES: deployment.environment=staging
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
      OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf
      OTEL_TRACES_SAMPLER: parentbased_always_on
      OTEL_LOG_LEVEL: debug
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    command: ["--config=/etc/otel-collector-config.yaml"]
    ports:
      - "4318:4318"
```

## ConfigMap Pattern for Kubernetes

Store common configuration in a ConfigMap, override per-service as needed.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.observability.svc.cluster.local:4318"
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf"
  OTEL_EXPORTER_OTLP_COMPRESSION: "gzip"
  OTEL_TRACES_SAMPLER: "parentbased_traceidratio"
  OTEL_TRACES_SAMPLER_ARG: "0.1"
  OTEL_METRICS_EXPORTER: "otlp"
  OTEL_METRIC_EXPORT_INTERVAL: "60000"
  OTEL_PROPAGATORS: "tracecontext,baggage,b3"
  OTEL_LOG_LEVEL: "info"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: otel-config
        env:
        - name: OTEL_SERVICE_NAME
          value: checkout-api
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: team=payments
```

This pattern keeps configuration DRY across multiple services.

## Debugging with Environment Variables

When telemetry isn't working, crank up the verbosity.

```bash
export OTEL_LOG_LEVEL=debug
export OTEL_TRACES_EXPORTER=console
```

Run your application. You'll see spans printed to stdout, plus detailed SDK logs about export attempts, errors, and retries.

Once you've confirmed spans are being created, switch back to OTLP export and check network connectivity:

```bash
export OTEL_LOG_LEVEL=debug
export OTEL_TRACES_EXPORTER=otlp
```

Look for log messages like:

```
[OTLP Trace Exporter] Sending 42 spans to https://oneuptime.com/otlp/v1/traces
[OTLP Trace Exporter] Export succeeded (HTTP 200)
```

Or errors:

```
[OTLP Trace Exporter] Export failed: HTTP 401 Unauthorized
```

This tells you if the problem is instrumentation (no spans created), network (can't reach backend), or authentication (bad token).

## Environment Variable Precedence

Some variables override others. Understand the precedence to avoid confusion.

**Signal-specific variables override general variables:**

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://default-backend.com
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://trace-backend.com
```

Traces go to `trace-backend.com`. Metrics and logs go to `default-backend.com`.

**Command-line arguments override environment variables:**

If you initialize the SDK in code and pass explicit configuration, it takes precedence over environment variables. This is language-dependent, so check your SDK docs.

## Security Best Practices

**Never hardcode secrets in environment variables in source code or Dockerfiles.**

Bad:

```dockerfile
ENV OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=abc123xyz"
```

Good:

```dockerfile
# No hardcoded secrets
ENV OTEL_SERVICE_NAME=checkout-api
```

Pass secrets at runtime via orchestration platforms (Kubernetes Secrets, AWS Secrets Manager, etc.).

**Use secret references in Kubernetes:**

```yaml
env:
- name: ONEUPTIME_TOKEN
  valueFrom:
    secretKeyRef:
      name: observability-secrets
      key: oneuptime-token
- name: OTEL_EXPORTER_OTLP_HEADERS
  value: x-oneuptime-token=$(ONEUPTIME_TOKEN)
```

**Rotate tokens periodically.** If a token leaks, change it in your secret manager and restart pods. No code changes needed.

## Common Pitfalls

**Setting OTEL_SERVICE_NAME after SDK initialization**: The SDK reads this variable during initialization. Changing it after won't affect telemetry. Restart the process.

**Forgetting to enable compression**: Always set `OTEL_EXPORTER_OTLP_COMPRESSION=gzip` in production. You'll save 5-10x bandwidth.

**Using JSON encoding in production**: `OTEL_EXPORTER_OTLP_PROTOCOL=http/json` is for debugging only. Use `http/protobuf` in production.

**Not setting OTEL_RESOURCE_ATTRIBUTES**: At minimum, set `deployment.environment`. Without it, you can't distinguish staging from production telemetry.

**Overly aggressive sampling**: `OTEL_TRACES_SAMPLER_ARG=0.01` (1% sampling) is often too low. You'll miss rare errors. Start with 10-20% and adjust based on volume.

**Ignoring SDK logs**: If exports are failing, you'll only know by checking logs. Enable `OTEL_LOG_LEVEL=debug` temporarily to diagnose issues.

## Key Takeaways

Environment variables are the cleanest way to configure OpenTelemetry. They separate configuration from code, enable portable deployments, and follow industry best practices.

**Essential variables to always set:**
- `OTEL_SERVICE_NAME`: Identify your service
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Where to send telemetry
- `OTEL_EXPORTER_OTLP_HEADERS`: Authentication tokens
- `OTEL_RESOURCE_ATTRIBUTES`: Environment, version, region, team
- `OTEL_EXPORTER_OTLP_COMPRESSION`: Always use `gzip`
- `OTEL_TRACES_SAMPLER` and `OTEL_TRACES_SAMPLER_ARG`: Control trace volume

**For debugging:**
- `OTEL_LOG_LEVEL=debug`: See what the SDK is doing
- `OTEL_TRACES_EXPORTER=console`: Print spans to stdout

**For production:**
- Use secrets management for tokens
- Store common config in ConfigMaps (Kubernetes) or parameter stores (AWS)
- Test configuration changes in staging before production
- Monitor export success rates and latency

With environment variables, you can instrument once and configure everywhere. No code changes, no redeploys, just operational flexibility. That's the power of zero-code configuration.

**Related Reading:**
- [How to Understand OTLP (OpenTelemetry Protocol) and Why It Matters](https://oneuptime.com/blog/post/2026-02-06-otlp-opentelemetry-protocol-explained/view)
- [How to Choose Between OTLP/gRPC and OTLP/HTTP for Your Application](https://oneuptime.com/blog/post/2026-02-06-otlp-grpc-vs-http-comparison/view)
- [What is OpenTelemetry Collector and why use one?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
