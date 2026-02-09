# How to Troubleshoot Missing Resource Attributes When the Resource Detection Processor Cannot Read Container Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detection, Attributes, Kubernetes

Description: Troubleshoot missing resource attributes when the resource detection processor fails to read container or cloud metadata.

Resource attributes like `service.name`, `cloud.provider`, `host.name`, and `container.id` provide essential context for your telemetry. When the resource detection processor cannot read metadata from the environment, these attributes are missing and your telemetry data becomes harder to filter and correlate.

## How Resource Detection Works

The `resourcedetection` processor in the OpenTelemetry Collector reads metadata from various sources:

- **Environment variables** (OTEL_RESOURCE_ATTRIBUTES)
- **Cloud provider metadata APIs** (AWS, GCP, Azure)
- **Container runtime** (Docker, containerd)
- **Kubernetes Downward API**
- **System information** (hostname, OS)

```yaml
processors:
  resourcedetection:
    detectors: [env, docker, system, gcp, aws, azure]
    timeout: 5s
```

## Diagnosing Missing Attributes

```bash
# Check what resource attributes are present on exported telemetry
# Use the debug exporter
kubectl logs -n observability deployment/otel-collector | grep "Resource"

# Check the Collector startup logs for resource detection results
kubectl logs -n observability deployment/otel-collector | grep -i "resource\|detect"
```

Enable debug logging for more detail:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

## Problem 1: Cloud Metadata API Not Accessible

Cloud providers expose metadata APIs at well-known IP addresses. If the Collector cannot reach them, cloud attributes will be missing.

```bash
# Test metadata API access from the Collector pod

# AWS (Instance Metadata Service v2)
kubectl exec -it otel-collector-pod -- curl -s -X PUT \
  "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60"

# GCP
kubectl exec -it otel-collector-pod -- curl -s -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/"

# Azure
kubectl exec -it otel-collector-pod -- curl -s -H "Metadata: true" \
  "http://169.254.169.254/metadata/instance?api-version=2021-02-01"
```

If these fail, check:
- Network policies blocking traffic to metadata endpoints
- IMDSv2 token requirements on AWS (hop limit might be too low for containerized workloads)
- Workload Identity / Pod Identity configurations

For AWS IMDSv2 with containers:

```bash
# The default hop limit of 1 does not work for containers
# Increase it to 2
aws ec2 modify-instance-metadata-options \
  --instance-id i-1234567890abcdef0 \
  --http-put-response-hop-limit 2
```

## Problem 2: Docker/Container Metadata Not Available

The container runtime detector needs access to the container's cgroup information:

```yaml
# Mount the cgroup filesystem for container detection
apiVersion: apps/v1
kind: DaemonSet
spec:
  template:
    spec:
      containers:
        - name: collector
          volumeMounts:
            - name: cgroup
              mountPath: /sys/fs/cgroup
              readOnly: true
      volumes:
        - name: cgroup
          hostPath:
            path: /sys/fs/cgroup
```

For containerd-based clusters, the Docker detector will not work. Use the system detector instead:

```yaml
processors:
  resourcedetection:
    detectors: [env, system]  # Not 'docker' for containerd clusters
    system:
      hostname_sources: ["os"]
```

## Problem 3: Kubernetes Metadata Missing

For Kubernetes-specific attributes, use the `k8sattributes` processor instead of `resourcedetection`:

```yaml
processors:
  resourcedetection:
    detectors: [env, system, gcp]  # Cloud and system metadata

  k8sattributes:
    # Kubernetes-specific metadata
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - container.image.name
        - container.image.tag

service:
  pipelines:
    traces:
      processors: [resourcedetection, k8sattributes, batch]
```

## Problem 4: service.name Not Set

`service.name` is the most important resource attribute. If it is not set, many backends will assign a default like "unknown_service":

```yaml
# Set service.name via environment variable (highest priority)
env:
  - name: OTEL_SERVICE_NAME
    value: "my-service"

# Or via OTEL_RESOURCE_ATTRIBUTES
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "service.name=my-service,service.version=1.2.3"
```

In the Collector, use the resource processor as a fallback:

```yaml
processors:
  resource:
    attributes:
      - key: service.name
        value: "otel-collector"
        action: upsert  # Only set if not already present
      - key: service.version
        value: "0.95.0"
        action: upsert
```

## Problem 5: Detector Timeout

Some metadata APIs are slow, especially during pod startup. If the detector times out, attributes are silently missing:

```yaml
processors:
  resourcedetection:
    detectors: [env, system, gcp]
    timeout: 10s    # Increase from default 5s
    override: false  # Do not override attributes already set by the SDK
```

## Problem 6: Detector Order Matters

Detectors run in order, and later detectors can override earlier ones:

```yaml
processors:
  resourcedetection:
    detectors: [env, system, gcp]  # env runs first, then system, then gcp
    override: true  # Later detectors override earlier ones
```

If `override: true`, the GCP detector might override the hostname set by the system detector. Set `override: false` if you want the first detector's value to win.

## Verification

After fixing the configuration, check that resource attributes appear on your telemetry:

```yaml
exporters:
  debug:
    verbosity: detailed

# In the debug output, look for:
# Resource SchemaURL:
# Resource attributes:
#   -> service.name: Str(my-service)
#   -> cloud.provider: Str(gcp)
#   -> host.name: Str(node-1)
#   -> k8s.pod.name: Str(my-app-xyz)
```

Resource attributes are the foundation of good observability. Without them, you cannot filter, group, or correlate telemetry effectively. Make sure your resource detection configuration matches your deployment environment and that the Collector has the necessary access to metadata sources.
