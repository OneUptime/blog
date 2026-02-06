# How to Avoid the Anti-Pattern of Hardcoding Exporter Endpoints Instead of Using OTEL Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Configuration, Environment Variables, Best Practices

Description: Stop hardcoding exporter endpoints in your application code and start using the standard OTEL environment variables for configuration.

Hardcoding the Collector endpoint in your application code is a quick way to get OpenTelemetry working, but it creates a maintenance headache. Every time the Collector address changes, you need to update code, rebuild, and redeploy. The OpenTelemetry specification defines a set of environment variables specifically for this purpose.

## The Hardcoded Anti-Pattern

```javascript
// Bad - endpoint is baked into the code
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://otel-collector.monitoring.svc.cluster.local:4318/v1/traces',
});
```

This code only works in one environment. The staging Collector is at a different address, the local dev Collector is at localhost, and production might use a different port. You end up with conditional logic:

```javascript
// Even worse - environment checks in code
const endpoint = process.env.NODE_ENV === 'production'
  ? 'http://otel-collector.monitoring.svc.cluster.local:4318'
  : process.env.NODE_ENV === 'staging'
    ? 'http://otel-collector.staging.svc.cluster.local:4318'
    : 'http://localhost:4318';
```

## The Standard Environment Variables

OpenTelemetry defines standard environment variables that all compliant SDKs respect. When you do not pass explicit configuration to the SDK, it reads from these variables automatically.

The most important ones:

```bash
# General endpoint for all signals (traces, metrics, logs)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Signal-specific endpoints (override the general one)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4318/v1/logs

# Protocol selection
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf  # or grpc

# Service identification
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.2.3

# Headers (useful for authentication)
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer token123

# Sampling
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

## The Clean Pattern

With environment variables, your application code contains no environment-specific configuration:

```javascript
// Good - no hardcoded endpoints
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// The exporter reads OTEL_EXPORTER_OTLP_ENDPOINT automatically
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

The same code works everywhere. Only the environment variables change.

## Setting Environment Variables Per Environment

### Docker Compose (Development)

```yaml
services:
  my-service:
    build: .
    environment:
      OTEL_SERVICE_NAME: my-service
      OTEL_EXPORTER_OTLP_ENDPOINT: http://collector:4318
      OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf

  collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    ports:
      - "4318:4318"
```

### Kubernetes (Production)

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: my-service
          env:
            - name: OTEL_SERVICE_NAME
              value: "my-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4318"
            - name: OTEL_EXPORTER_OTLP_PROTOCOL
              value: "http/protobuf"
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "deployment.environment=production,service.version=$(APP_VERSION)"
```

### Local Development

```bash
# .env file (do not commit this)
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=always_on
```

## Python Example

Python SDKs respect the same environment variables:

```python
# Good - no hardcoded config
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# OTLPSpanExporter reads OTEL_EXPORTER_OTLP_ENDPOINT automatically
# Resource reads OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES automatically
provider = TracerProvider(resource=Resource.create())
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
```

## Full List of Useful Environment Variables

```bash
# Exporter configuration
OTEL_EXPORTER_OTLP_ENDPOINT        # Base endpoint URL
OTEL_EXPORTER_OTLP_PROTOCOL        # grpc or http/protobuf
OTEL_EXPORTER_OTLP_HEADERS         # Custom headers
OTEL_EXPORTER_OTLP_TIMEOUT         # Timeout in milliseconds
OTEL_EXPORTER_OTLP_CERTIFICATE     # TLS certificate path
OTEL_EXPORTER_OTLP_COMPRESSION     # gzip or none

# Resource configuration
OTEL_SERVICE_NAME                   # Service name
OTEL_RESOURCE_ATTRIBUTES            # Comma-separated key=value pairs

# Sampling
OTEL_TRACES_SAMPLER                 # Sampler name
OTEL_TRACES_SAMPLER_ARG             # Sampler argument

# Propagation
OTEL_PROPAGATORS                    # tracecontext,baggage (default)

# SDK behavior
OTEL_LOG_LEVEL                      # SDK log level
OTEL_TRACES_EXPORTER                # otlp, console, or none
OTEL_METRICS_EXPORTER               # otlp, console, or none
OTEL_LOGS_EXPORTER                  # otlp, console, or none
```

Using environment variables instead of hardcoded values makes your instrumentation code portable, your deployments simpler, and your configuration auditable. It is the approach the OpenTelemetry specification recommends, and every compliant SDK supports it.
