# How to Create Service-Specific Instrumentation Templates That Teams Can Adopt in Minutes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Templates, Developer Productivity

Description: Build reusable OpenTelemetry instrumentation templates that let teams add production-grade observability to new services in minutes, not days.

The biggest friction point in OpenTelemetry adoption is the initial setup. Every new service needs SDK initialization, exporter configuration, resource attributes, and auto-instrumentation wiring. If each team figures this out independently, you get inconsistent setups and wasted effort. Templates solve this by encoding your organization's best practices into starter code.

## What Makes a Good Template

A service instrumentation template should handle three things:

1. SDK initialization with your organization's default configuration
2. Auto-instrumentation for common libraries
3. Helper utilities for custom instrumentation

The template should work out of the box with zero configuration for local development and accept environment variables for production deployment.

## Node.js Template Example

Here is a complete instrumentation template for a Node.js service:

```typescript
// src/instrumentation.ts
// This file MUST be loaded before any other imports.
// In your package.json: "start": "node --require ./dist/instrumentation.js ./dist/index.js"

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';

// Read configuration from environment variables with sensible defaults
const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';
const serviceVersion = process.env.SERVICE_VERSION || '0.0.0';
const environment = process.env.DEPLOYMENT_ENV || 'development';
const collectorEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
  // Add your organization-specific resource attributes here
  'service.namespace': process.env.SERVICE_NAMESPACE || 'default',
  'service.team': process.env.SERVICE_TEAM || 'unknown',
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: collectorEndpoint,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: collectorEndpoint,
    }),
    exportIntervalMillis: 30000, // Export metrics every 30 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation - too noisy for most services
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/ready', '/metrics'],
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((err) => console.error('Error shutting down SDK', err))
    .finally(() => process.exit(0));
});
```

## Python Template Example

```python
# otel_setup.py
# Import this module at the top of your application entry point

import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_telemetry(app=None):
    """Initialize OpenTelemetry with organization defaults.

    Call this once at application startup. Pass your Flask app
    if you want automatic HTTP instrumentation.
    """
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "unknown-service"),
        "service.version": os.getenv("SERVICE_VERSION", "0.0.0"),
        "deployment.environment": os.getenv("DEPLOYMENT_ENV", "development"),
        "service.namespace": os.getenv("SERVICE_NAMESPACE", "default"),
        "service.team": os.getenv("SERVICE_TEAM", "unknown"),
    })

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")

    # Traces setup
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics setup
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=endpoint),
        export_interval_millis=30000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Auto-instrumentation for common libraries
    RequestsInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    if app:
        FlaskInstrumentor().instrument_app(app)

    return tracer_provider
```

## Packaging and Distribution

Templates are only useful if teams can find and use them easily. Here are three distribution strategies:

**Internal package registry**: Publish the template as a library on your internal npm registry or PyPI mirror. Teams add it as a dependency:

```json
{
  "dependencies": {
    "@yourcompany/otel-setup": "^2.0.0"
  }
}
```

**Cookiecutter/Yeoman template**: If you use a service scaffolding tool, bake the instrumentation into the template so every new service starts with it:

```bash
# Using cookiecutter for Python services
cookiecutter https://github.com/yourcompany/service-template-python
# The generated project already includes otel_setup.py and dependencies
```

**Shared Helm chart values**: For Kubernetes deployments, provide a shared Helm values snippet that configures the OTel environment variables:

```yaml
# shared-otel-values.yaml
# Include in your service's Helm chart
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-collector.observability:4317"
  - name: OTEL_SERVICE_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.labels['app.kubernetes.io/name']
  - name: DEPLOYMENT_ENV
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
```

## Versioning Your Templates

Treat templates like any other shared library. Use semantic versioning. When you update the template (new SDK version, new default processor, changed configuration), publish a new version and notify teams through your internal channels.

Include a migration guide with each major version bump so teams know what changed and how to update.

## Validation

Add a simple smoke test that teams can run to verify their instrumentation is working:

```bash
# Start local collector and run a quick test
docker compose up -d otel-collector jaeger
npm test  # Your tests generate telemetry
# Check that spans arrived
curl -s "http://localhost:16686/api/traces?service=${OTEL_SERVICE_NAME}&limit=1" \
  | jq '.data | length'
# Should output: 1
```

Templates remove the decision fatigue from instrumentation setup. When the right thing is also the easy thing, adoption happens naturally. Build your templates, publish them, and keep them up to date.
