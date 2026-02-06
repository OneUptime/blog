# How to Use Container Runtime Semantic Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Containers, Docker, Semantic Conventions, Observability, Resource Attributes, Container Runtime

Description: Learn how to use OpenTelemetry container runtime semantic conventions to track container identity, image details, and runtime metadata in your telemetry.

---

## Introduction

Containers are the building blocks of modern infrastructure. Whether you are running Docker, containerd, CRI-O, or another runtime, your telemetry data needs to reflect which container produced it, what image it was built from, and how the runtime is configured. OpenTelemetry's container semantic conventions provide a standard set of attributes for capturing this information.

This guide covers the container resource attributes defined by OpenTelemetry, shows you how to populate them in different environments, and explains how to use them for troubleshooting and capacity planning.

## The Container Resource Attribute Specification

OpenTelemetry defines a focused set of container attributes under the `container.*` namespace. These attributes describe the container itself, not the application running inside it.

| Attribute | Type | Description |
|-----------|------|-------------|
| `container.name` | string | The container name as seen by the runtime |
| `container.id` | string | The full container ID (typically the 64-character hex string) |
| `container.runtime` | string | The container runtime, such as `docker`, `containerd`, or `cri-o` |
| `container.image.name` | string | The image name without the tag or digest |
| `container.image.tags` | string[] | The image tags associated with the container |
| `container.image.id` | string | The image ID, usually a sha256 digest |
| `container.image.repo_digests` | string[] | Repo digests of the container image |
| `container.command` | string | The command used to start the container |
| `container.command_line` | string | The full command line used to start the container |
| `container.command_args` | string[] | Arguments passed to the container command |

These attributes complement the Kubernetes resource attributes covered in other guides. In a Kubernetes environment, you will typically have both `k8s.*` and `container.*` attributes on the same telemetry signal.

```mermaid
graph LR
    subgraph "Telemetry Resource"
        A[service.name] --> R[Resource]
        B[k8s.pod.name] --> R
        C[k8s.namespace.name] --> R
        D[container.id] --> R
        E[container.image.name] --> R
        F[container.runtime] --> R
    end
    R --> G[Traces]
    R --> H[Metrics]
    R --> I[Logs]
```

## Reading Container Metadata at Runtime

The trick to populating container attributes is knowing where the runtime stores its metadata. Different environments expose this information in different ways.

### Reading the Container ID from cgroup

On Linux hosts, the container ID is available inside the container through the cgroup filesystem. The following Python function reads the container ID from `/proc/self/cgroup`, which is the standard location for Docker and containerd runtimes:

```python
# Read the container ID from the Linux cgroup filesystem.
# Docker and containerd write the full container ID into the
# cgroup path. This function extracts it by parsing the last
# segment of the path.
def get_container_id():
    try:
        with open("/proc/self/cgroup", "r") as f:
            for line in f:
                parts = line.strip().split("/")
                if len(parts) > 2:
                    # The container ID is the last segment
                    container_id = parts[-1]
                    # Docker sometimes appends a scope suffix
                    if container_id.endswith(".scope"):
                        container_id = container_id.rsplit("-", 1)[-1]
                        container_id = container_id.replace(".scope", "")
                    if len(container_id) == 64:
                        return container_id
    except FileNotFoundError:
        pass
    return None
```

For newer kernels using cgroup v2, the container ID may be in `/proc/self/mountinfo` instead. The OpenTelemetry resource detectors handle both cases, which is another good reason to use them.

### Using the OpenTelemetry Resource Detector

Rather than parsing cgroup files yourself, you can use OpenTelemetry's built-in container resource detector. This detector automatically discovers container metadata and attaches it to your resource.

The following example shows how to configure the Python SDK to use the container resource detector alongside a manually defined service resource. The detector handles the cgroup parsing internally and adds all available container attributes:

```python
# Configure the OpenTelemetry SDK with the container resource detector.
# The detector reads container metadata from the cgroup filesystem
# and merges it with any manually specified resource attributes.
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource, get_aggregated_resources
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.extension.aws.resource import AwsEcsResourceDetector

# For container detection, use the process resource detector
# or install opentelemetry-resource-detector-container
from opentelemetry.resource.detector.container import ContainerResourceDetector

# Merge detected container attributes with service attributes
resource = get_aggregated_resources([
    ContainerResourceDetector(),
], base_resource=Resource.create({
    "service.name": "payment-service",
    "service.version": "1.4.0",
}))

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
```

### Setting Container Attributes via Environment Variables

If you cannot use a resource detector, you can pass container attributes through the `OTEL_RESOURCE_ATTRIBUTES` environment variable. This approach works well in Docker Compose or CI environments where you control the container startup.

Here is a Docker Compose file that sets container-related resource attributes directly. The `HOSTNAME` variable, which Docker sets to the container ID by default, provides the container identity:

```yaml
# Docker Compose configuration that passes container metadata
# through the OTEL_RESOURCE_ATTRIBUTES environment variable.
# Docker sets HOSTNAME to the short container ID by default.
version: "3.8"
services:
  api:
    image: myregistry/api-service:v3.2.1
    container_name: api-service
    environment:
      - OTEL_RESOURCE_ATTRIBUTES=container.name=api-service,container.image.name=myregistry/api-service,container.image.tags=v3.2.1,container.runtime=docker
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=api-service

  worker:
    image: myregistry/worker-service:v1.8.0
    container_name: worker-service
    environment:
      - OTEL_RESOURCE_ATTRIBUTES=container.name=worker-service,container.image.name=myregistry/worker-service,container.image.tags=v1.8.0,container.runtime=docker
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=worker-service

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"
```

## Enriching Container Data in the Collector

The OpenTelemetry Collector can add container attributes to telemetry even when the application does not set them. The `resourcedetection` processor supports several detectors, including Docker and ECS.

This Collector configuration uses the Docker resource detector to attach container metadata. The processor queries the Docker socket to resolve container details for each incoming telemetry signal:

```yaml
# Collector configuration using the resourcedetection processor
# to automatically discover container metadata from Docker.
# The docker detector queries the Docker API for container info.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  resourcedetection:
    detectors: [docker]
    timeout: 5s
    override: false

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: "https://ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [otlp]
```

The `override: false` setting is important. It tells the processor not to overwrite attributes that the application has already set. This way, application-provided values take priority over detected ones.

## Practical Use Cases

### Tracking Image Drift

One of the most useful applications of container semantic conventions is detecting image drift across environments. By querying `container.image.name` and `container.image.tags`, you can verify that all instances of a service are running the same image version.

```mermaid
flowchart TD
    A[Query: container.image.tags by k8s.deployment.name] --> B{All pods same tag?}
    B -->|Yes| C[Deployment is consistent]
    B -->|No| D[Image drift detected]
    D --> E[Check rollout status]
    E --> F[Identify stale pods]
```

### Correlating Container Restarts with Errors

When a container restarts, the `container.id` changes. By tracking this attribute over time, you can correlate restarts with error spikes. If you see a new `container.id` appear for a given `service.name` and `k8s.pod.name`, you know the container was recreated.

### Debugging Multi-Container Pods

In Kubernetes, pods can have sidecar containers. The `container.name` attribute lets you distinguish telemetry from different containers in the same pod. Without this attribute, traces from a proxy sidecar and the main application container would be indistinguishable.

## Working with Different Runtimes

The `container.runtime` attribute tells you which runtime is managing the container. This matters more than you might expect. Different runtimes have different behaviors for resource limits, network configuration, and logging. When investigating performance issues, knowing whether a container runs on Docker, containerd, or CRI-O can change your troubleshooting approach.

For containerd environments (common in modern Kubernetes clusters), the container ID format and cgroup path may differ from Docker. The OpenTelemetry resource detectors handle these differences, but if you are reading metadata manually, you need to account for the runtime.

## Best Practices

Keep these guidelines in mind when working with container semantic conventions.

Always include `container.image.name` and `container.image.tags` in your resource attributes. These two attributes are the most useful for day-to-day operations because they let you quickly identify what code is running in any given container.

Use the resource detector when possible. Manual configuration is error-prone and can fall out of sync when images are updated. The detector reads live metadata from the runtime.

Set `container.runtime` explicitly if your organization uses multiple runtimes. This attribute helps you filter telemetry by runtime when debugging runtime-specific issues.

Do not rely on `container.id` for long-term correlation. Container IDs change on every restart. Use `k8s.pod.name` or `service.instance.id` for identifiers that persist across container recreations within the same pod lifecycle.

## Conclusion

Container runtime semantic conventions give your telemetry the infrastructure context it needs. By consistently applying `container.*` attributes through resource detectors, environment variables, or the Collector's resourcedetection processor, you make it possible to trace issues from application behavior down to the specific container image and runtime that produced them. This level of visibility is essential for operating containerized workloads at scale.
