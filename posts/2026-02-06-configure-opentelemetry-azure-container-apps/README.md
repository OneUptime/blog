# How to Configure OpenTelemetry for Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Azure Container Apps, Container, Observability, Azure, Tracing, Dapr, OTLP

Description: A hands-on guide to configuring OpenTelemetry for Azure Container Apps, covering the built-in OTLP agent, sidecar Collectors, and Dapr integration.

---

> Azure Container Apps is a serverless container platform that abstracts away Kubernetes complexity while still giving you the flexibility of containers. It has built-in support for OpenTelemetry through its managed OTLP agent, making it one of the easiest Azure services to instrument.

This guide covers three approaches to getting OpenTelemetry data out of your Container Apps: using the built-in managed OpenTelemetry agent, running the OpenTelemetry Collector as a sidecar, and leveraging Dapr's built-in telemetry. Each approach has trade-offs, and we will look at when to use which.

---

## Architecture Options

```mermaid
flowchart TB
    subgraph "Option 1: Built-in Agent"
        A1[Container App] -->|OTLP| MA[Managed OTLP Agent]
        MA --> B1[Configured Destination]
    end

    subgraph "Option 2: Sidecar Collector"
        A2[Container App] -->|OTLP| SC[OTel Collector Sidecar]
        SC --> B2[Any Backend]
    end

    subgraph "Option 3: Dapr Integration"
        A3[Container App] -->|Dapr SDK| D[Dapr Sidecar]
        D -->|Traces| MA3[Managed OTLP Agent]
        MA3 --> B3[Configured Destination]
    end
```

---

## Prerequisites

- Azure CLI with the `containerapp` extension 2.79.0 or later
- An Azure subscription
- A container image for your application (we will use a sample)
- An OpenTelemetry-compatible backend for receiving telemetry

---

## Option 1: Using the Built-in Managed OTLP Agent

Azure Container Apps has a managed OpenTelemetry agent built into the platform. You do not need to deploy any additional infrastructure. Just configure the environment to accept OTLP data and let your application use the injected exporter settings.

### Enable the OTLP Agent on the Environment

Configure the Container Apps environment with OpenTelemetry settings. This enables the managed agent that listens for OTLP data from your containers.

```bash
# Create a Container Apps environment

# The managed OTLP agent is provisioned when telemetry is configured
az containerapp env create \
  --name my-container-env \
  --resource-group my-rg \
  --location eastus

# Configure the OpenTelemetry endpoint on the environment
# This tells the managed agent where to forward telemetry
az containerapp env telemetry otlp add \
  --name my-container-env \
  --resource-group my-rg \
  --otlp-name "my-otlp-config" \
  --endpoint "https://your-backend.example.com:4317" \
  --headers "api-key=your-api-key" \
  --insecure false \
  --enable-open-telemetry-traces true
```

### Configure Your Application

When the managed agent is enabled, Azure Container Apps injects the OTLP endpoint and protocol environment variables into your application. Your application just needs to use the standard OpenTelemetry exporter configuration.

```bash
# Deploy a container app that sends telemetry to the managed agent
az containerapp create \
  --name my-app \
  --resource-group my-rg \
  --environment my-container-env \
  --image myregistry.azurecr.io/my-app:latest \
  --target-port 8080 \
  --ingress external \
  --env-vars \
    OTEL_SERVICE_NAME="my-container-app" \
    OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production"
```

The managed agent runs inside the environment and injects `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` at runtime. No network configuration needed.

### Application Code Example (Python)

Here is a Python application that sends traces through the managed agent.

```python
# app.py
# A FastAPI application instrumented with OpenTelemetry
# The OTLP endpoint is configured via environment variables

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
import os

# Configure the tracer with service metadata
resource = Resource.create({
    "service.name": os.environ.get("OTEL_SERVICE_NAME", "my-container-app"),
    "service.version": "1.0.0",
})

provider = TracerProvider(resource=resource)

# The OTLP exporter reads the endpoint and protocol from the environment
# variables injected by Azure Container Apps.
exporter = OTLPSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
app = FastAPI()

@app.get("/")
async def root():
    with tracer.start_as_current_span("handle-root-request") as span:
        span.set_attribute("endpoint", "/")
        return {"message": "Hello from Container Apps"}

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    with tracer.start_as_current_span("get-item") as span:
        span.set_attribute("item.id", item_id)
        # Simulate a database lookup
        item = await fetch_item_from_db(item_id)
        return item

async def fetch_item_from_db(item_id: int):
    """Simulate a database call with its own span."""
    with tracer.start_as_current_span("db-fetch-item") as span:
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.statement", "SELECT * FROM items WHERE id = ?")
        # Your actual database query here
        return {"id": item_id, "name": f"Item {item_id}"}
```

---

## Option 2: OpenTelemetry Collector as a Sidecar

If you need more control over telemetry processing (filtering, sampling, routing to multiple backends), run the OpenTelemetry Collector as a sidecar container alongside your application.

### Collector Configuration

Create a Collector configuration that your sidecar will use.

```yaml
# otel-sidecar-config.yaml
# Sidecar Collector for Azure Container Apps

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  # Filter out health check spans to reduce noise
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'

  # Tail-based sampling to keep interesting traces
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: error-traces
        type: status_code
        status_code: {status_codes: [ERROR]}  # Always keep error traces
      - name: slow-traces
        type: latency
        latency: {threshold_ms: 1000}          # Keep traces over 1 second
      - name: sample-rest
        type: probabilistic
        probabilistic: {sampling_percentage: 10} # Sample 10% of normal traces

exporters:
  otlphttp:
    endpoint: "https://your-backend.example.com"
    headers:
      Authorization: "Bearer your-token"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, tail_sampling, batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

### Deploy with Sidecar

Azure Container Apps supports multiple containers in a single container app, including sidecar and init containers. Deploy the Collector as a sidecar.

```bash
# Deploy with the OTel Collector as a sidecar container
# The sidecar shares the network namespace, so localhost works
az containerapp create \
  --name my-app-with-sidecar \
  --resource-group my-rg \
  --environment my-container-env \
  --yaml app-with-sidecar.yaml
```

Here is the YAML definition for the multi-container deployment.

```yaml
# app-with-sidecar.yaml
# Container App with OpenTelemetry Collector sidecar

properties:
  configuration:
    ingress:
      external: true
      targetPort: 8080
  template:
    containers:
      # Main application container
      - name: my-app
        image: myregistry.azurecr.io/my-app:latest
        resources:
          cpu: 0.5
          memory: 1Gi
        env:
          - name: OTEL_SERVICE_NAME
            value: my-container-app
          # Point to the sidecar Collector on localhost
          - name: OTEL_EXPORTER_OTLP_ENDPOINT
            value: http://localhost:4317
          - name: OTEL_EXPORTER_OTLP_PROTOCOL
            value: grpc

      # OpenTelemetry Collector sidecar
      - name: otel-collector
        # Build this image with otel-sidecar-config.yaml copied to
        # /etc/otelcol-contrib/config.yaml
        image: myregistry.azurecr.io/otel-collector-with-config:latest
        resources:
          cpu: 0.25
          memory: 512Mi
        args:
          - "--config=/etc/otelcol-contrib/config.yaml"

    scale:
      minReplicas: 1
      maxReplicas: 10
      rules:
        - name: http-scaling
          http:
            metadata:
              concurrentRequests: "50"
```

---

## Option 3: Dapr Integration

If you are using Dapr with Azure Container Apps, the managed OpenTelemetry agent can export Dapr-generated traces. You get distributed tracing for Dapr service invocation and pub/sub calls without adding tracing code to those Dapr calls.

### Enable Dapr with Tracing

```bash
# Enable Dapr on a Container App with tracing configured
az containerapp dapr enable \
  --name my-app \
  --resource-group my-rg \
  --dapr-app-id my-app \
  --dapr-app-port 8080

# Deploy your managed environment's ARM template with includeDapr: true
# in openTelemetryConfiguration.tracesConfiguration.
az deployment group create \
  --resource-group my-rg \
  --template-file containerapp-env-otel.json
```

The environment OpenTelemetry configuration points Dapr traces to your configured destination. The example below shows the relevant part of the managed environment resource; merge it with the rest of your environment definition.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.App/managedEnvironments",
      "apiVersion": "2024-08-02-preview",
      "name": "my-container-env",
      "location": "eastus",
      "properties": {
        "openTelemetryConfiguration": {
          "destinationsConfiguration": {
            "otlpConfigurations": [
              {
                "name": "my-otlp-config",
                "endpoint": "https://your-backend.example.com:4317",
                "headers": "api-key=your-api-key",
                "insecure": false
              }
            ]
          },
          "tracesConfiguration": {
            "destinations": ["my-otlp-config"],
            "includeDapr": true
          }
        }
      }
    }
  ]
}
```

Dapr traces service invocations and pub/sub messages. You get spans for those Dapr calls without writing tracing code.

---

## Environment Variables Reference

Here is a quick reference for the OpenTelemetry environment variables you will commonly use in Container Apps.

```bash
# Required: identifies your service in traces
OTEL_SERVICE_NAME="my-service"

# OTLP endpoint (injected for the managed agent, or localhost for a sidecar)
OTEL_EXPORTER_OTLP_ENDPOINT="http://otel.service.k8se-apps:4317"

# Protocol: the managed Container Apps agent supports grpc
OTEL_EXPORTER_OTLP_PROTOCOL="grpc"

# Optional: add resource attributes
OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.2.3"

# Optional: set the trace sampler
OTEL_TRACES_SAMPLER="parentbased_traceidratio"
OTEL_TRACES_SAMPLER_ARG="0.1"  # Sample 10% of traces
```

---

## Choosing the Right Approach

| Feature | Built-in Agent | Sidecar Collector | Dapr |
|---------|---------------|-------------------|------|
| Setup complexity | Low | Medium | Low (if already using Dapr) |
| Custom processing | No | Yes | Limited |
| Backend flexibility | Azure Monitor, Datadog, or OTLP destinations | Full | Same as managed agent |
| Resource overhead | No additional app resources | 0.25 CPU + 512MB | Dapr sidecar resources |
| Tail sampling | No | Yes | No |
| Auto-instrumentation | No | No | Yes (for Dapr calls) |

For most teams starting out, the built-in managed agent is the fastest path. If you need filtering, sampling, or multi-backend routing, go with the sidecar Collector. If you are already invested in Dapr for service mesh functionality, the built-in tracing is a nice bonus.

---

## Summary

Azure Container Apps gives you multiple paths to OpenTelemetry integration. The built-in managed agent gets you started in minutes with minimal configuration. The sidecar Collector gives you full control over your telemetry pipeline. And Dapr provides automatic tracing for service-to-service communication. Pick the approach that matches your current needs and you can always migrate to a more sophisticated setup as your observability requirements grow.
