# How to Add OpenTelemetry to a Monorepo with Multiple Language Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Monorepo, Multi-Language, Instrumentation, DevOps, Microservices

Description: Learn how to organize and implement OpenTelemetry instrumentation across a monorepo containing services written in multiple programming languages.

---

Monorepos are popular for good reason. They make it easy to share code, coordinate releases, and maintain consistent tooling across a large number of services. But when your monorepo contains services written in different languages, adding observability becomes a coordination challenge. Each language has its own package manager, its own build system, and its own way of initializing OpenTelemetry. Without a plan, you end up with inconsistent instrumentation across services and a maintenance headache that grows with every new service.

This post covers a practical approach to organizing OpenTelemetry instrumentation in a polyglot monorepo. We will look at shared configuration, reusable initialization modules, and CI/CD integration that keeps everything consistent.

## Monorepo Structure

A typical polyglot monorepo might look like this:

```
monorepo/
  services/
    api-gateway/          (Go)
    user-service/         (Node.js)
    billing-service/      (Java)
    ml-pipeline/          (Python)
  packages/
    otel-config/          (shared configuration)
  infra/
    otel-collector/       (collector configs)
    kubernetes/           (k8s manifests)
  scripts/
    check-otel-setup.sh   (CI validation)
```

The key idea is to centralize what can be centralized (collector configuration, environment variables, semantic conventions) while providing language-specific initialization libraries that each service can import.

## Shared Configuration Layer

Start by creating a shared configuration package that defines the common settings all services should use. This is not code that runs in any specific language. It is a set of configuration files and environment variable definitions that all services reference.

```yaml
# packages/otel-config/base-env.yaml
# Base environment variables for OpenTelemetry configuration.
# Each service's Dockerfile or k8s manifest should source these.
otel:
  exporter:
    otlp:
      endpoint: "http://otel-collector.observability.svc:4318"
      protocol: "http/protobuf"
      timeout: 10000
  resource:
    attributes:
      deployment.environment: "${DEPLOY_ENV}"
      service.namespace: "mycompany"
  traces:
    sampler: "parentbased_traceidratio"
    sampler_arg: "0.1"
  logs:
    level: "info"
```

Then create a script that generates the actual environment variables from this config:

```bash
#!/bin/bash
# scripts/generate-otel-env.sh
# Reads the base config and generates environment variable exports
# that work for any language SDK.

export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector.observability.svc:4318"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_TIMEOUT="10000"
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=${DEPLOY_ENV},service.namespace=mycompany"
```

Since all OpenTelemetry SDKs respect the same environment variables, this single set of env vars works for Java, Python, Go, Node.js, and every other supported language.

## Language-Specific Initialization Libraries

While environment variables handle most configuration, each language needs a small initialization module. Create these as shared packages within your monorepo that individual services import.

### Go Initialization Package

```go
// packages/otel-go/tracing.go
// Shared OpenTelemetry initialization for all Go services in the monorepo.
// Usage: call otelgo.Init(ctx, "my-service-name") at the start of main().
package otelgo

import (
    "context"
    "os"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// Init configures the global tracer provider with the standard
// settings used by all Go services in this monorepo.
func Init(ctx context.Context, serviceName string) (func(), error) {
    exporter, err := otlptracehttp.New(ctx)
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(os.Getenv("SERVICE_VERSION")),
        ),
        resource.WithFromEnv(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )

    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.TraceContext{})

    return func() { tp.Shutdown(context.Background()) }, nil
}
```

### Node.js Initialization Package

```javascript
// packages/otel-node/index.js
// Shared OpenTelemetry initialization for all Node.js services.
// Require this file before any application code:
//   node --require @monorepo/otel-node app.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// The SDK reads OTEL_SERVICE_NAME and OTEL_EXPORTER_OTLP_ENDPOINT
// from environment variables, so we do not hardcode them here.
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 30000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

### Python Initialization Package

```python
# packages/otel-python/otel_init/__init__.py
# Shared OpenTelemetry initialization for all Python services.
# Usage: from otel_init import init_telemetry; init_telemetry("my-service")
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION

def init_telemetry(service_name):
    """Initialize OpenTelemetry with the monorepo standard configuration.

    This function sets up the tracer provider, exporter, and resource
    attributes. Environment variables handle endpoint and sampler config.
    """
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: os.getenv("SERVICE_VERSION", "unknown"),
    })

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter()  # reads from OTEL_EXPORTER_OTLP_ENDPOINT
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    return provider
```

## CI/CD Validation

In a monorepo, it is critical to validate that every service is properly instrumented. Add a CI check that verifies OpenTelemetry setup:

```bash
#!/bin/bash
# scripts/check-otel-setup.sh
# CI script that validates every service has proper OTel configuration.
# Runs as part of the pull request check pipeline.

ERRORS=0

# Check that every service directory has OpenTelemetry dependencies
for service_dir in services/*/; do
    service_name=$(basename "$service_dir")
    echo "Checking $service_name..."

    # Check Go services
    if [ -f "$service_dir/go.mod" ]; then
        if ! grep -q "go.opentelemetry.io/otel" "$service_dir/go.mod"; then
            echo "ERROR: $service_name (Go) missing OpenTelemetry dependency"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    # Check Node.js services
    if [ -f "$service_dir/package.json" ]; then
        if ! grep -q "@opentelemetry" "$service_dir/package.json"; then
            echo "ERROR: $service_name (Node.js) missing OpenTelemetry dependency"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    # Check Python services
    if [ -f "$service_dir/requirements.txt" ]; then
        if ! grep -q "opentelemetry" "$service_dir/requirements.txt"; then
            echo "ERROR: $service_name (Python) missing OpenTelemetry dependency"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    # Check Java services
    if [ -f "$service_dir/pom.xml" ]; then
        if ! grep -q "opentelemetry" "$service_dir/pom.xml"; then
            echo "ERROR: $service_name (Java) missing OpenTelemetry dependency"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo "Found $ERRORS services missing OpenTelemetry instrumentation"
    exit 1
fi

echo "All services have OpenTelemetry configured"
```

## Kubernetes Integration

In Kubernetes, inject the shared environment variables into every service using a ConfigMap:

```yaml
# infra/kubernetes/otel-configmap.yaml
# Shared OpenTelemetry environment variables for all services.
# Referenced by every service's Deployment spec.
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-env
  namespace: default
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.observability.svc:4318"
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf"
  OTEL_TRACES_SAMPLER: "parentbased_traceidratio"
  OTEL_TRACES_SAMPLER_ARG: "0.1"
  OTEL_RESOURCE_ATTRIBUTES: "deployment.environment=production,service.namespace=mycompany"
```

Each service deployment references this ConfigMap:

```yaml
# infra/kubernetes/user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
        - name: user-service
          image: mycompany/user-service:latest
          envFrom:
            # Load the shared OTel environment variables
            - configMapRef:
                name: otel-env
          env:
            # Override the service name for this specific service
            - name: OTEL_SERVICE_NAME
              value: "user-service"
            - name: SERVICE_VERSION
              value: "2.3.1"
```

## Dependency Management

Version pinning is important in a monorepo. You do not want one service using OpenTelemetry SDK v1.20 while another uses v1.35. Use your monorepo tooling to enforce consistent versions.

For Node.js services using a tool like Turborepo or Nx, define the OpenTelemetry versions in the root `package.json`:

```json
{
  "resolutions": {
    "@opentelemetry/sdk-node": "0.52.0",
    "@opentelemetry/api": "1.9.0",
    "@opentelemetry/exporter-trace-otlp-http": "0.52.0"
  }
}
```

For Python services, maintain a shared constraints file:

```
# packages/otel-config/python-constraints.txt
# Pin OpenTelemetry versions across all Python services
opentelemetry-api==1.25.0
opentelemetry-sdk==1.25.0
opentelemetry-exporter-otlp-proto-http==1.25.0
```

## Conclusion

Adding OpenTelemetry to a polyglot monorepo is about finding the right balance between centralized configuration and language-specific implementation. The environment variables and collector configuration should be shared. The SDK initialization code should be packaged as reusable libraries within the monorepo. And CI checks should enforce that every service meets the instrumentation baseline. This approach scales well as you add more services and more languages to your monorepo, because the shared infrastructure absorbs most of the complexity.
