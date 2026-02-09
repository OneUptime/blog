# How to Build a Platform Engineering Observability Layer That Abstracts OpenTelemetry Complexity from Dev Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Platform Engineering, Developer Experience, Abstraction Layer

Description: Build a platform engineering observability layer that hides OpenTelemetry complexity while giving development teams powerful telemetry capabilities.

Most developers do not want to learn the intricacies of OpenTelemetry SDK configuration, Collector pipelines, and backend integrations. They want to add a dependency, set an environment variable, and get traces, metrics, and logs. A platform engineering observability layer gives them exactly that by providing a thin abstraction that handles all the complexity behind the scenes.

## What the Abstraction Looks Like

From a developer's perspective, onboarding to observability should be this simple:

```yaml
# Add to your service's platform config
observability:
  enabled: true
  tier: standard  # or "critical" for higher sampling
```

That is it. The platform layer handles everything else.

## The Platform SDK Wrapper

Create a thin wrapper library that teams install instead of raw OTel SDKs:

```typescript
// @yourorg/observability - the platform SDK wrapper
// packages/observability/src/index.ts

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

interface PlatformObservabilityConfig {
  // The only required field
  serviceName: string;
  // Everything else has sensible defaults
  environment?: string;
  version?: string;
  tier?: "critical" | "standard" | "low";
}

let sdk: NodeSDK | null = null;

export function initObservability(config: PlatformObservabilityConfig): void {
  // Prevent double initialization
  if (sdk) return;

  // Resolve configuration from env vars and config
  const collectorEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://otel-collector.observability:4317";

  const environment =
    config.environment || process.env.DEPLOYMENT_ENV || "unknown";

  const version =
    config.version || process.env.APP_VERSION || "0.0.0";

  const teamName = process.env.TEAM_NAME || "unknown";

  // Build resource with standard attributes
  const resource = new Resource({
    "service.name": config.serviceName,
    "service.version": version,
    "deployment.environment": environment,
    "team.name": teamName,
    "service.tier": config.tier || "standard",
    "platform.sdk.version": "2.1.0",
    "platform.sdk.language": "nodejs",
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url: collectorEndpoint }),
    metricReader: new OTLPMetricExporter({ url: collectorEndpoint }),
    logRecordExporter: new OTLPLogExporter({ url: collectorEndpoint }),
    // Auto-instrument everything: HTTP, gRPC, databases, etc.
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          // Ignore health check endpoints
          ignoreIncomingRequestHook: (req) => {
            const url = req.url || "";
            return url.includes("/health") || url.includes("/ready");
          },
        },
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  const shutdown = async () => {
    if (sdk) {
      await sdk.shutdown();
    }
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Re-export the OTel API for teams that need custom spans
export { trace, metrics, context } from "@opentelemetry/api";
```

## Developer Usage

With the platform SDK, developers get observability in two lines:

```typescript
// app.ts
import { initObservability } from "@yourorg/observability";

// One line to set up everything
initObservability({ serviceName: "payment-api", tier: "critical" });

// That is it. HTTP, database, gRPC calls are all traced automatically.
import express from "express";
const app = express();

app.get("/api/payments/:id", async (req, res) => {
  // This handler is automatically traced
  const payment = await db.payments.findById(req.params.id);
  res.json(payment);
});

app.listen(3000);
```

## Python Platform SDK

```python
# @yourorg/observability - Python version
# platform_observability/__init__.py

import os
import atexit
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.auto_instrumentation import sitecustomize

_initialized = False

def init(service_name: str, tier: str = "standard", **kwargs):
    """Initialize observability for a service.

    Args:
        service_name: The name of your service
        tier: "critical", "standard", or "low"
    """
    global _initialized
    if _initialized:
        return
    _initialized = True

    endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://otel-collector.observability:4317"
    )

    resource = Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("APP_VERSION", "0.0.0"),
        "deployment.environment": os.getenv("DEPLOYMENT_ENV", "unknown"),
        "team.name": os.getenv("TEAM_NAME", "unknown"),
        "service.tier": tier,
        "platform.sdk.version": "2.1.0",
        "platform.sdk.language": "python",
    })

    # Set up tracing
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    )
    trace.set_tracer_provider(tracer_provider)

    # Set up metrics
    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[
            PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=endpoint)
            )
        ],
    )
    metrics.set_meter_provider(meter_provider)

    # Register shutdown hook
    atexit.register(tracer_provider.shutdown)
    atexit.register(meter_provider.shutdown)
```

## Automated Sidecar Injection

Use a mutating webhook to inject the Collector sidecar automatically:

```yaml
# webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: otel-sidecar-injector
webhooks:
  - name: sidecar.observability.platform.io
    clientConfig:
      service:
        name: otel-injector
        namespace: observability
        path: /inject
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    namespaceSelector:
      matchLabels:
        observability-enabled: "true"
```

The webhook checks for the `observability: enabled` label and injects the Collector sidecar plus the necessary environment variables. Developers never need to touch Collector configuration.

## Wrapping Up

A platform engineering observability layer turns OpenTelemetry from a complex framework into a simple service that teams consume. By providing pre-configured SDK wrappers, automatic sidecar injection, and sensible defaults, you can get every service in your organization instrumented with minimal developer effort. The platform team controls the complexity; development teams just build features.
