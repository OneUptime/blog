# How to Implement SDK Configuration in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SDK Configuration, Environment Variable, Resource Attributes, Sampling, Observability

Description: Learn how to configure the OpenTelemetry SDK using environment variables and programmatic configuration.

---

The OpenTelemetry SDK has dozens of configuration options controlling everything from export endpoints to sampling rates. Understanding these options is essential for tuning your telemetry pipeline. This guide covers the major configuration approaches and options.

## Configuration Methods

OpenTelemetry SDKs can be configured through:

1. **Environment variables**: Standard across all languages
2. **Programmatic configuration**: Language-specific APIs
3. **Configuration files**: For the Collector and some SDKs

Environment variables are a recommended approach for production deployments, while precedence depends on the SDK and configuration mechanism. For example, `OTEL_CONFIG_FILE` takes precedence over SDK environment variables when declarative configuration is used.

## Core Environment Variables

These variables are standardized by OpenTelemetry, though support and defaults can vary by SDK:

### Service Identity

```bash
# Required: Identifies your service

export OTEL_SERVICE_NAME="order-service"

# Optional: Additional resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment.name=production,service.version=1.2.3,team=platform"
```

### Exporter Configuration

```bash
# OTLP/HTTP exporter endpoint (for all signals)
export OTEL_EXPORTER_OTLP_ENDPOINT="https://collector.example.com:4318"

# Per-signal OTLP/HTTP endpoints (override the general endpoint and are used as-is)
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://collector.example.com:4318/v1/traces"
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="https://collector.example.com:4318/v1/metrics"
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="https://collector.example.com:4318/v1/logs"

# Protocol: grpc, http/protobuf, or http/json where supported
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"

# Headers for authentication
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=your-key,Authorization=Bearer token"

# Compression: gzip or none
export OTEL_EXPORTER_OTLP_COMPRESSION="gzip"

# Timeout (milliseconds in the specification; some SDKs expose this in seconds)
export OTEL_EXPORTER_OTLP_TIMEOUT="10000"
```

### Exporter Selection

```bash
# Choose which exporter to use
# Options: otlp, console, none
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

# Use multiple exporters (comma-separated)
export OTEL_TRACES_EXPORTER="otlp,console"
```

### Sampling Configuration

```bash
# Sampler type: always_on, always_off, traceidratio, parentbased_always_on,
#               parentbased_always_off, parentbased_traceidratio
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"

# Sampling ratio (for ratio-based samplers)
export OTEL_TRACES_SAMPLER_ARG="0.1"  # 10% sampling
```

### Propagation

```bash
# Context propagation format
# Options: tracecontext, baggage, b3, b3multi, jaeger, xray, ottrace, none
export OTEL_PROPAGATORS="tracecontext,baggage"
```

## Batch Processor Configuration

```bash
# Maximum queue size
export OTEL_BSP_MAX_QUEUE_SIZE="2048"

# Delay between exports in milliseconds
export OTEL_BSP_SCHEDULE_DELAY="5000"

# Maximum batch size
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE="512"

# Export timeout in milliseconds
export OTEL_BSP_EXPORT_TIMEOUT="30000"
```

## Node.js Programmatic Configuration

### Full Configuration Example

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  AlwaysOnSampler,
  AlwaysOffSampler
} = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } = require('@opentelemetry/core');

// Build resource with service metadata
const resource = resourceFromAttributes({
  'service.name': process.env.OTEL_SERVICE_NAME || 'my-service',
  'service.version': process.env.npm_package_version || '1.0.0',
  'deployment.environment.name': process.env.DEPLOY_ENV || 'development',
  // Custom attributes
  'team': process.env.TEAM_NAME || 'platform',
  'region': process.env.AWS_REGION || 'us-east-1'
});

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
       buildOtlpHttpUrl(otlpEndpoint, 'v1/traces'),
  headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  compression: process.env.OTEL_EXPORTER_OTLP_COMPRESSION || 'gzip',
  timeoutMillis: parseInt(process.env.OTEL_EXPORTER_OTLP_TIMEOUT) || 30000
});

// Configure metric exporter
const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
       buildOtlpHttpUrl(otlpEndpoint, 'v1/metrics'),
  headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  compression: 'gzip'
});

// Configure log exporter
const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ||
       buildOtlpHttpUrl(otlpEndpoint, 'v1/logs'),
  headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
});

// Configure sampler based on environment
function configureSampler() {
  const samplerType = process.env.OTEL_TRACES_SAMPLER || 'parentbased_traceidratio';
  const parsedSamplerArg = parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG);
  const samplerArg = Number.isNaN(parsedSamplerArg) ? 0.1 : parsedSamplerArg;

  switch (samplerType) {
    case 'always_on':
      return new AlwaysOnSampler();
    case 'always_off':
      return new AlwaysOffSampler();
    case 'traceidratio':
      return new TraceIdRatioBasedSampler(samplerArg);
    case 'parentbased_always_on':
      return new ParentBasedSampler({
        root: new AlwaysOnSampler()
      });
    case 'parentbased_always_off':
      return new ParentBasedSampler({
        root: new AlwaysOffSampler()
      });
    case 'parentbased_traceidratio':
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(samplerArg)
      });
    default:
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(0.1)
      });
  }
}

// Configure propagators
const propagator = new CompositePropagator({
  propagators: [
    new W3CTraceContextPropagator(),
    new W3CBaggagePropagator()
  ]
});

// Initialize SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  sampler: configureSampler(),
  textMapPropagator: propagator,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL) || 60000
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter, {
    maxQueueSize: parseInt(process.env.OTEL_BLRP_MAX_QUEUE_SIZE) || 2048,
    scheduledDelayMillis: parseInt(process.env.OTEL_BLRP_SCHEDULE_DELAY) || 5000
  })],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => {
          // Skip health checks
          return req.url === '/health' || req.url === '/ready';
        }
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false  // Disable noisy fs instrumentation
      }
    })
  ]
});

sdk.start();

function buildOtlpHttpUrl(baseUrl, signalPath) {
  return `${baseUrl.replace(/\/$/, '')}/${signalPath}`;
}

// Helper function to parse headers from environment variable
function parseHeaders(headerString) {
  if (!headerString) return {};
  return headerString.split(',').reduce((acc, pair) => {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK shut down'))
    .catch((err) => console.error('SDK shutdown error', err))
    .finally(() => process.exit(0));
});

module.exports = sdk;
```

## Python Programmatic Configuration

```python
# tracing_config.py
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import (
    TraceIdRatioBased,
    ParentBased,
    ALWAYS_ON,
    ALWAYS_OFF
)
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

def configure_opentelemetry():
    """
    Configure OpenTelemetry with environment-based settings.
    Call this at application startup.
    """

    # Build resource
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "my-service"),
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment.name": os.getenv("DEPLOY_ENV", "development"),
        "team": os.getenv("TEAM_NAME", "platform")
    })

    # Configure sampler
    sampler = configure_sampler()

    # Configure trace provider
    trace_provider = TracerProvider(
        resource=resource,
        sampler=sampler
    )

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")

    # Configure trace exporter
    trace_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") or
                 build_otlp_http_url(otlp_endpoint, "v1/traces"),
        headers=parse_headers(os.getenv("OTEL_EXPORTER_OTLP_HEADERS")),
        timeout=int(os.getenv("OTEL_EXPORTER_OTLP_TIMEOUT", "30"))
    )

    # Configure batch processor
    trace_provider.add_span_processor(BatchSpanProcessor(
        trace_exporter,
        max_queue_size=int(os.getenv("OTEL_BSP_MAX_QUEUE_SIZE", "2048")),
        schedule_delay_millis=int(os.getenv("OTEL_BSP_SCHEDULE_DELAY", "5000")),
        max_export_batch_size=int(os.getenv("OTEL_BSP_MAX_EXPORT_BATCH_SIZE", "512")),
        export_timeout_millis=int(os.getenv("OTEL_BSP_EXPORT_TIMEOUT", "30000"))
    ))

    trace.set_tracer_provider(trace_provider)

    # Configure metrics
    metric_exporter = OTLPMetricExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT") or
                 build_otlp_http_url(otlp_endpoint, "v1/metrics"),
        headers=parse_headers(os.getenv("OTEL_EXPORTER_OTLP_HEADERS"))
    )

    metric_reader = PeriodicExportingMetricReader(
        metric_exporter,
        export_interval_millis=int(os.getenv("OTEL_METRIC_EXPORT_INTERVAL", "60000"))
    )

    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[metric_reader]
    )

    metrics.set_meter_provider(meter_provider)

    # Configure propagators
    set_global_textmap(CompositePropagator([
        TraceContextTextMapPropagator(),
        W3CBaggagePropagator()
    ]))

    return trace_provider


def build_otlp_http_url(base_url, signal_path):
    return f"{base_url.rstrip('/')}/{signal_path}"


def configure_sampler():
    """
    Configure sampler based on environment variables.
    """
    sampler_type = os.getenv("OTEL_TRACES_SAMPLER", "parentbased_traceidratio")
    sampler_arg = float(os.getenv("OTEL_TRACES_SAMPLER_ARG", "0.1"))

    if sampler_type == "always_on":
        return ALWAYS_ON
    elif sampler_type == "always_off":
        return ALWAYS_OFF
    elif sampler_type == "traceidratio":
        return TraceIdRatioBased(sampler_arg)
    elif sampler_type == "parentbased_always_on":
        return ParentBased(root=ALWAYS_ON)
    elif sampler_type == "parentbased_always_off":
        return ParentBased(root=ALWAYS_OFF)
    elif sampler_type == "parentbased_traceidratio":
        return ParentBased(root=TraceIdRatioBased(sampler_arg))
    else:
        return ParentBased(root=TraceIdRatioBased(0.1))


def parse_headers(header_string):
    """
    Parse headers from comma-separated key=value string.
    """
    if not header_string:
        return {}

    headers = {}
    for pair in header_string.split(","):
        if "=" in pair:
            key, value = pair.split("=", 1)
            headers[key.strip()] = value.strip()
    return headers
```

## Configuration by Environment

### Development

```bash
# .env.development
OTEL_SERVICE_NAME=my-service-dev
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=always_on
OTEL_TRACES_EXPORTER=otlp,console
OTEL_LOG_LEVEL=debug
```

### Staging

```bash
# .env.staging
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=staging
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-collector.example.com:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5
OTEL_EXPORTER_OTLP_COMPRESSION=gzip
```

### Production

```bash
# .env.production
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=production,region=us-east-1
OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=${API_KEY}
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_EXPORTER_OTLP_COMPRESSION=gzip
OTEL_BSP_MAX_QUEUE_SIZE=4096
OTEL_BSP_SCHEDULE_DELAY=3000
```

## Kubernetes ConfigMap

```yaml
# otel-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: my-app
data:
  OTEL_SERVICE_NAME: "order-service"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.observability:4318"
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf"
  OTEL_TRACES_SAMPLER: "parentbased_traceidratio"
  OTEL_TRACES_SAMPLER_ARG: "0.1"
  OTEL_EXPORTER_OTLP_COMPRESSION: "gzip"
  OTEL_PROPAGATORS: "tracecontext,baggage"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: otel-config
          env:
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE)"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
```

## Configuration Reference Table

| Variable | Description | Default |
|----------|-------------|---------|
| OTEL_SERVICE_NAME | Service name for resource | unknown_service |
| OTEL_RESOURCE_ATTRIBUTES | Additional resource attributes | (none) |
| OTEL_EXPORTER_OTLP_ENDPOINT | OTLP endpoint URL | http://localhost:4318 for OTLP/HTTP, http://localhost:4317 for OTLP/gRPC |
| OTEL_EXPORTER_OTLP_PROTOCOL | Protocol (grpc, http/protobuf, http/json where supported) | SDK-specific; the specification recommends http/protobuf unless an SDK needs grpc for compatibility |
| OTEL_EXPORTER_OTLP_HEADERS | Headers for requests | (none) |
| OTEL_EXPORTER_OTLP_COMPRESSION | Compression (gzip, none) | none |
| OTEL_EXPORTER_OTLP_TIMEOUT | Export timeout (ms) | 10000 |
| OTEL_TRACES_SAMPLER | Sampler type | parentbased_always_on |
| OTEL_TRACES_SAMPLER_ARG | Sampler argument | (varies) |
| OTEL_PROPAGATORS | Context propagators | tracecontext,baggage |
| OTEL_BSP_MAX_QUEUE_SIZE | Max span queue size | 2048 |
| OTEL_BSP_SCHEDULE_DELAY | Export delay (ms) | 5000 |
| OTEL_BSP_MAX_EXPORT_BATCH_SIZE | Max batch size | 512 |

## Summary

OpenTelemetry SDK configuration is primarily done through environment variables, providing consistency across languages and easy deployment configuration. Set `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` as minimum configuration. Use resource attributes to add deployment context. Configure sampling based on your traffic volume and observability needs.

For production deployments, enable compression, set appropriate batch sizes, and configure reliable retry behavior. Use ConfigMaps or environment-specific files to manage configuration across environments.
