# How to Monitor SaaS Platform White-Label Deployment Performance Across Customer Environments with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, White-Label, SaaS Deployment, Performance Monitoring

Description: Monitor white-label SaaS deployment performance across customer environments using OpenTelemetry resource attributes and custom exporters.

White-label SaaS products run in diverse customer environments. Some customers deploy on-premises, others use different cloud regions, and each has its own traffic patterns and infrastructure constraints. You need observability that works across all these deployments while respecting the isolation boundaries between customers.

## The White-Label Monitoring Challenge

When your product runs under different brands in different environments, you need to:

1. Collect telemetry from every deployment
2. Identify which deployment each signal comes from
3. Compare performance across deployments
4. Detect degradation in specific customer environments

## Resource Attributes for Deployment Identity

Every white-label deployment should tag its telemetry with deployment-specific resource attributes:

```python
# deployment_resource.py
from opentelemetry.sdk.resources import Resource
import os

def create_deployment_resource() -> Resource:
    """Create resource attributes that identify this deployment."""
    return Resource.create({
        # Deployment identification
        "deployment.id": os.environ.get("DEPLOYMENT_ID", "unknown"),
        "deployment.customer": os.environ.get("DEPLOYMENT_CUSTOMER", "unknown"),
        "deployment.region": os.environ.get("DEPLOYMENT_REGION", "unknown"),
        "deployment.version": os.environ.get("APP_VERSION", "unknown"),
        "deployment.type": os.environ.get("DEPLOYMENT_TYPE", "cloud"),

        # Infrastructure details
        "deployment.cloud_provider": os.environ.get("CLOUD_PROVIDER", "unknown"),
        "deployment.cluster": os.environ.get("CLUSTER_NAME", "unknown"),

        # Standard OTel resource attributes
        "service.name": os.environ.get("SERVICE_NAME", "whitelabel-app"),
        "service.version": os.environ.get("APP_VERSION", "unknown"),
    })
```

## SDK Configuration for White-Label Deployments

```python
# telemetry_setup.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from deployment_resource import create_deployment_resource

def setup_telemetry():
    """Configure OpenTelemetry for a white-label deployment."""
    resource = create_deployment_resource()

    # Trace provider
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(
        endpoint=os.environ.get("OTEL_COLLECTOR_ENDPOINT", "http://collector:4317"),
        headers={
            "X-Deployment-Key": os.environ.get("DEPLOYMENT_API_KEY", ""),
        }
    )
    trace_provider.add_span_processor(BatchSpanExporter(trace_exporter))
    trace.set_tracer_provider(trace_provider)

    # Metrics provider
    metric_exporter = OTLPMetricExporter(
        endpoint=os.environ.get("OTEL_COLLECTOR_ENDPOINT", "http://collector:4317"),
        headers={
            "X-Deployment-Key": os.environ.get("DEPLOYMENT_API_KEY", ""),
        }
    )
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(metric_provider)
```

## Collector Configuration for Multi-Deployment Ingestion

Your central collector needs to handle telemetry from many deployments and route it appropriately:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Enrich with deployment metadata from headers
  attributes/deployment:
    actions:
      - key: deployment.authenticated
        value: "true"
        action: insert

  # Batch per deployment to manage throughput
  batch:
    send_batch_size: 1024
    timeout: 5s

  # Group by deployment for efficient export
  groupbyattrs:
    keys:
      - deployment.id
      - deployment.customer

exporters:
  otlp/central:
    endpoint: central-observability:4317

  # Route specific deployments to their own backends
  otlp/enterprise_customer_a:
    endpoint: customer-a-backend:4317

service:
  pipelines:
    traces/all:
      receivers: [otlp]
      processors: [attributes/deployment, batch]
      exporters: [otlp/central]
```

## Deployment Health Metrics

Track the health of each deployment with custom metrics:

```python
# deployment_health.py
from opentelemetry import metrics

meter = metrics.get_meter("deployment.health")

request_latency = meter.create_histogram(
    "deployment.request.latency",
    description="Request latency per deployment",
    unit="ms",
)

error_rate = meter.create_counter(
    "deployment.errors",
    description="Error count per deployment",
    unit="1",
)

uptime_gauge = meter.create_counter(
    "deployment.heartbeat",
    description="Deployment heartbeat counter",
    unit="1",
)

def record_request(deployment_id: str, latency_ms: float, status_code: int):
    """Record request metrics for this deployment."""
    attrs = {"deployment.id": deployment_id}

    request_latency.record(latency_ms, attrs)

    if status_code >= 500:
        error_rate.add(1, {**attrs, "error.type": "server_error"})
    elif status_code >= 400:
        error_rate.add(1, {**attrs, "error.type": "client_error"})

def send_heartbeat(deployment_id: str):
    """Send a periodic heartbeat from this deployment."""
    uptime_gauge.add(1, {
        "deployment.id": deployment_id,
        "deployment.timestamp": str(int(time.time())),
    })
```

## Version Rollout Tracking

When you push a new version, track how it performs across deployments:

```python
# version_tracker.py
version_rollout = meter.create_counter(
    "deployment.version.active",
    description="Active deployment versions",
    unit="1",
)

def track_version_health(deployment_id: str, version: str, healthy: bool):
    """Track the health of each deployment version after rollout."""
    with tracer.start_as_current_span(
        "deployment.version.health_check",
        attributes={
            "deployment.id": deployment_id,
            "deployment.version": version,
            "deployment.healthy": healthy,
        }
    ) as span:
        if not healthy:
            span.add_event("Deployment health check failed", {
                "deployment.id": deployment_id,
                "deployment.version": version,
            })
```

## Cross-Deployment Comparison

The real value of this instrumentation is the ability to compare deployments. When one customer's deployment shows 3x higher latency than average, you can drill into their specific traces to understand if it is an infrastructure issue, a data volume issue, or something else. The deployment resource attributes make these comparisons possible by giving every piece of telemetry a consistent identity that persists across restarts and updates.
