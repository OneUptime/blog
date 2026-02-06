# How to Set Up OpenTelemetry Quickly with the OTEL_* Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Environment Variables, Configuration, OTEL, Quick Start

Description: Master OpenTelemetry configuration using environment variables for fast, flexible setup without hardcoding values in your application code.

Environment variables provide the fastest way to configure OpenTelemetry. Instead of writing configuration code, you set variables before starting your application. This approach keeps configuration separate from code, makes it easy to change settings between environments, and works consistently across all OpenTelemetry language implementations.

## Why Use Environment Variables

Configuration through environment variables offers several advantages over code-based configuration:

**Environment independence**: Use the same application binary across development, staging, and production. Only the environment variables change.

**No code changes**: Adjust exporter endpoints, sampling rates, or resource attributes without touching source code.

**Container and orchestration friendly**: Kubernetes, Docker Compose, and other orchestration tools have built-in support for environment variables.

**Zero-code instrumentation**: Automatic instrumentation agents rely heavily on environment variable configuration since you're not writing any code.

**Security**: Keep sensitive values like API keys and endpoints out of your codebase. Load them from secret management systems at runtime.

## Core Environment Variables

Every OpenTelemetry SDK recognizes a standard set of environment variables defined in the specification. These work across all languages.

**OTEL_SERVICE_NAME**: Identifies your service in traces and metrics.

```bash
export OTEL_SERVICE_NAME=payment-service
```

This is the most important variable. It appears in every trace, metric, and log, allowing you to filter and group telemetry by service.

**OTEL_RESOURCE_ATTRIBUTES**: Additional attributes describing your service.

```bash
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.2.3,team=payments,region=us-east-1"
```

Resource attributes attach to every telemetry item. Use them for:
- Environment identification (production, staging, dev)
- Version information
- Cloud provider and region
- Team ownership
- Deployment metadata

**OTEL_TRACES_EXPORTER**: Which exporter to use for traces.

```bash
export OTEL_TRACES_EXPORTER=otlp
```

Common values:
- `otlp`: OpenTelemetry Protocol (recommended)
- `jaeger`: Jaeger-native format
- `zipkin`: Zipkin format
- `console`: Print to stdout (debugging)
- `none`: Disable trace export

**OTEL_METRICS_EXPORTER**: Which exporter to use for metrics.

```bash
export OTEL_METRICS_EXPORTER=otlp
```

Values match trace exporters: `otlp`, `prometheus`, `console`, `none`.

**OTEL_LOGS_EXPORTER**: Which exporter to use for logs.

```bash
export OTEL_LOGS_EXPORTER=otlp
```

Log export is less mature than traces and metrics, but follows the same pattern.

**OTEL_EXPORTER_OTLP_ENDPOINT**: The endpoint for OTLP exporters.

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector.example.com:4317
```

This sets the endpoint for traces, metrics, and logs. For gRPC (default), use port 4317. For HTTP, use port 4318.

You can also set signal-specific endpoints:
```bash
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://traces.example.com:4317
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://metrics.example.com:4317
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://logs.example.com:4317
```

## Complete Quick Setup Example

Here's a complete configuration for a production service:

```bash
# Service identification
export OTEL_SERVICE_NAME=checkout-service
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=2.1.0,team=ecommerce,cloud.provider=aws,cloud.region=us-east-1"

# Exporter configuration
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp

# OTLP endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Headers for authentication
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=abc123def456"

# Sampling (10% of traces)
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1

# Propagation format
export OTEL_PROPAGATORS=tracecontext,baggage

# SDK configuration
export OTEL_SDK_DISABLED=false

# Run your application
python app.py
```

This configuration gives you:
- Service identification with environment and version
- OTLP export to a collector
- 10% trace sampling to control costs
- W3C Trace Context propagation for distributed tracing
- Authentication via API key

## Sampling Configuration

Sampling reduces data volume by only capturing a percentage of traces. Configure it with environment variables:

**Always-on sampling** (capture everything):
```bash
export OTEL_TRACES_SAMPLER=always_on
```

Use this in development or for critical low-traffic services.

**Always-off sampling** (capture nothing):
```bash
export OTEL_TRACES_SAMPLER=always_off
```

Useful for temporarily disabling tracing without redeploying.

**Ratio-based sampling** (capture a percentage):
```bash
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling
```

This captures 1% of traces. The sampling decision is deterministic based on trace ID, ensuring complete traces are captured or dropped together.

**Parent-based sampling** (follow the parent's decision):
```bash
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.05  # 5% sampling
```

If the incoming request has a sampling decision, this sampler respects it. For new traces, it samples at the specified rate.

## Propagation Configuration

Propagation determines how trace context passes between services. Configure propagators with OTEL_PROPAGATORS:

```bash
# W3C Trace Context (recommended)
export OTEL_PROPAGATORS=tracecontext,baggage

# Multiple propagators for compatibility
export OTEL_PROPAGATORS=tracecontext,baggage,b3,b3multi

# Just B3 (for Zipkin compatibility)
export OTEL_PROPAGATORS=b3multi
```

Common propagators:
- `tracecontext`: W3C Trace Context (standard)
- `baggage`: W3C Baggage for cross-cutting concerns
- `b3`: Zipkin B3 single header
- `b3multi`: Zipkin B3 multiple headers
- `jaeger`: Jaeger propagation format
- `xray`: AWS X-Ray propagation

Most systems should use `tracecontext,baggage`. Add other propagators if you're integrating with existing tracing systems.

## Authentication and Headers

Many backends require authentication. Pass headers through environment variables:

```bash
# Single header
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer token123"

# Multiple headers (comma-separated)
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer token123,X-Custom-Header=value"

# Signal-specific headers
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="X-Trace-Token=abc123"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="X-Metrics-Token=def456"
```

For complex authentication schemes, use environment variable substitution:

```bash
# Load from file or secret manager
export API_KEY=$(cat /run/secrets/otel_api_key)
export OTEL_EXPORTER_OTLP_HEADERS="X-API-Key=${API_KEY}"
```

## Protocol Selection

OTLP supports both gRPC and HTTP protocols. Specify which to use:

```bash
# Use gRPC (default, more efficient)
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317

# Use HTTP (better firewall compatibility)
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
```

gRPC is more efficient but HTTP might be necessary if your network filters gRPC traffic.

## Batch Processor Configuration

Control how spans are batched before export:

```bash
# Maximum queue size
export OTEL_BSP_MAX_QUEUE_SIZE=2048

# Maximum batch size
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512

# Export delay in milliseconds
export OTEL_BSP_SCHEDULE_DELAY=5000

# Export timeout in milliseconds
export OTEL_BSP_EXPORT_TIMEOUT=30000
```

These settings balance latency and efficiency:
- Larger batches reduce network overhead but increase memory usage
- Longer delays reduce exports but increase latency
- Larger queues prevent data loss during traffic spikes

Default values work well for most applications. Tune these if you're seeing performance issues or dropped spans.

## Language-Specific Setup

While core variables work everywhere, each language has specific setup steps.

**Java with agent**:
```bash
#!/bin/bash
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp

java -javaagent:opentelemetry-javaagent.jar -jar app.jar
```

**Python with auto-instrumentation**:
```bash
#!/bin/bash
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
export OTEL_TRACES_EXPORTER=otlp

opentelemetry-instrument python app.py
```

**Node.js**:
```bash
#!/bin/bash
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
export OTEL_TRACES_EXPORTER=otlp

node --require ./tracing.js app.js
```

**.NET**:
```bash
#!/bin/bash
export CORECLR_ENABLE_PROFILING=1
export CORECLR_PROFILER={918728DD-259F-4A6A-AC2B-B85E1B658318}
export CORECLR_PROFILER_PATH=/path/to/OpenTelemetry.AutoInstrumentation.Native.so
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317

dotnet app.dll
```

**Go** (with manual SDK setup):
```go
// Go reads environment variables through the SDK
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
)

// SDK automatically reads OTEL_* environment variables
```

```bash
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
./app
```

## Docker and Container Configuration

Environment variables map naturally to container configuration.

**Docker run**:
```bash
docker run \
  -e OTEL_SERVICE_NAME=my-service \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4317 \
  -e OTEL_TRACES_EXPORTER=otlp \
  -e OTEL_RESOURCE_ATTRIBUTES="deployment.environment=staging" \
  my-image:latest
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    image: my-app:latest
    environment:
      OTEL_SERVICE_NAME: my-service
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      OTEL_TRACES_EXPORTER: otlp
      OTEL_METRICS_EXPORTER: otlp
      OTEL_RESOURCE_ATTRIBUTES: deployment.environment=production,service.version=1.0.0
      OTEL_EXPORTER_OTLP_HEADERS: x-api-key=${API_KEY}
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"
```

**Kubernetes**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
      - name: app
        image: my-app:latest
        env:
        - name: OTEL_SERVICE_NAME
          value: "my-service"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector.observability.svc.cluster.local:4317"
        - name: OTEL_TRACES_EXPORTER
          value: "otlp"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "deployment.environment=production,k8s.namespace.name=$(K8S_NAMESPACE),k8s.pod.name=$(K8S_POD_NAME)"
        - name: K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: OTEL_EXPORTER_OTLP_HEADERS
          value: "x-api-key=$(API_KEY)"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: otel-secrets
              key: api-key
```

## Environment-Specific Configuration

Use different settings per environment:

**Development**:
```bash
export OTEL_SERVICE_NAME=my-service
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=development"
export OTEL_TRACES_EXPORTER=console  # Print to stdout for debugging
export OTEL_TRACES_SAMPLER=always_on  # Capture everything
export OTEL_LOG_LEVEL=debug  # Verbose SDK logs
```

**Staging**:
```bash
export OTEL_SERVICE_NAME=my-service
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=staging,service.version=${VERSION}"
export OTEL_EXPORTER_OTLP_ENDPOINT=http://staging-collector:4317
export OTEL_TRACES_EXPORTER=otlp
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
```

**Production**:
```bash
export OTEL_SERVICE_NAME=my-service
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=${VERSION},region=${AWS_REGION}"
export OTEL_EXPORTER_OTLP_ENDPOINT=http://prod-collector:4317
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=${API_KEY}"
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling
export OTEL_LOG_LEVEL=info
```

## Debugging Configuration

When things don't work, enable SDK logging:

```bash
export OTEL_LOG_LEVEL=debug
```

This makes the SDK print detailed logs about initialization, span creation, and export attempts.

For even more detail:

```bash
# Python
export OTEL_PYTHON_LOG_LEVEL=debug

# Java
export OTEL_JAVAAGENT_DEBUG=true

# Node.js
export OTEL_LOG_LEVEL=debug
```

Test configuration with the console exporter:

```bash
export OTEL_TRACES_EXPORTER=console
export OTEL_METRICS_EXPORTER=console
```

This prints all telemetry to stdout so you can verify spans are being created correctly.

## Complete Reference

Here's a comprehensive list of commonly used environment variables:

```bash
# Service identification
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=key1=value1,key2=value2

# General SDK
OTEL_SDK_DISABLED=false
OTEL_LOG_LEVEL=info

# Traces
OTEL_TRACES_EXPORTER=otlp
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_PROPAGATORS=tracecontext,baggage

# Metrics
OTEL_METRICS_EXPORTER=otlp

# Logs
OTEL_LOGS_EXPORTER=otlp

# OTLP general
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_HEADERS=key1=value1,key2=value2
OTEL_EXPORTER_OTLP_TIMEOUT=10000

# OTLP traces specific
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_TRACES_HEADERS=key=value
OTEL_EXPORTER_OTLP_TRACES_TIMEOUT=10000

# OTLP metrics specific
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://collector:4317
OTEL_EXPORTER_OTLP_METRICS_HEADERS=key=value
OTEL_EXPORTER_OTLP_METRICS_TIMEOUT=10000

# Batch processor
OTEL_BSP_SCHEDULE_DELAY=5000
OTEL_BSP_MAX_QUEUE_SIZE=2048
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
OTEL_BSP_EXPORT_TIMEOUT=30000
```

Environment variables provide the fastest path to OpenTelemetry configuration. Set a handful of variables and your application starts exporting telemetry. This approach keeps configuration flexible, environment-independent, and compatible with modern deployment practices. Start with the basics (service name, exporter, endpoint), then refine with sampling, resource attributes, and performance tuning as your needs grow.
