# How to Implement Resource Detection in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detection, Observability, Cloud, Kubernetes, AWS, GCP, Azure, Telemetry

Description: Learn how to automatically detect and attach resource attributes in OpenTelemetry to identify the source of telemetry data across cloud environments and container orchestrators.

---

Resource attributes describe the entity producing telemetry: the service name, host, container, cloud instance, and Kubernetes pod. Accurate resource detection is essential for filtering, grouping, and correlating telemetry across your infrastructure. This guide covers implementing resource detection in both the OpenTelemetry Collector and application SDKs.

## What Are Resources?

In OpenTelemetry, a resource represents the entity that generates telemetry data. Resources have attributes that describe that entity. For example:

```text
service.name: checkout-service
service.version: 1.2.3
host.name: ip-10-0-1-42
container.id: a1b2c3d4e5f6
k8s.pod.name: checkout-service-7d8b9c-x4k2q
cloud.provider: aws
cloud.region: us-east-1
```

These attributes appear on every span, metric, and log from that service, making it easy to filter and correlate data.

Resource Detection in the Collector

The OpenTelemetry Collector can detect resources automatically using the `resource_detection` processor.

### Basic Configuration

```yaml
processors:
  resource_detection:
    detectors:
      - env
      - system
    timeout: 5s
    override: false
```

### Available Detectors

The `resource_detection` processor supports multiple detection sources:

```yaml
processors:
  resource_detection:
    detectors:
      # Read from environment variables
      - env

      # Host system information
      - system

      # Docker container metadata
      - docker

      # Kubernetes API metadata
      - k8s_api

      # AWS EC2 and ECS
      - ec2
      - ecs

      # Google Cloud
      - gcp

      # Azure
      - azure

      # Heroku
      - heroku

      # Consul
      - consul
```

### Cloud Provider Detection

**AWS Detection**

```yaml
processors:
  resource_detection/aws:
    detectors: [env, ec2, ecs]
    timeout: 5s
    override: false

    ec2:
      # Tags to include as resource attributes
      tags:
        - Name
        - Environment
        - Team

    ecs:
      # Include ECS resource attributes
      resource_attributes:
        aws.ecs.cluster.arn:
          enabled: true
        aws.ecs.task.arn:
          enabled: true
        aws.ecs.task.family:
          enabled: true
```

Detected attributes include:
- `cloud.provider: aws`
- `cloud.platform: aws_ec2` or `aws_ecs`
- `cloud.region: us-east-1`
- `cloud.availability_zone: us-east-1a`
- `cloud.account.id: 123456789012`
- `host.id: i-0abc123def456`
- `host.type: m5.large`
- `host.name: ip-10-0-1-42`

**GCP Detection**

```yaml
processors:
  resource_detection/gcp:
    detectors: [env, gcp]
    timeout: 5s

    gcp:
      resource_attributes:
        gcp.gce.instance.name:
          enabled: true
        gcp.gce.instance.hostname:
          enabled: true
```

Detected attributes include:
- `cloud.provider: gcp`
- `cloud.platform: gcp_compute_engine`
- `cloud.region: us-central1`
- `cloud.availability_zone: us-central1-a`
- `cloud.account.id: my-project`
- `host.id: 1234567890`

**Azure Detection**

```yaml
processors:
  resource_detection/azure:
    detectors: [env, azure]
    timeout: 5s

    azure:
      resource_attributes:
        azure.vm.name:
          enabled: true
        azure.vm.size:
          enabled: true
        azure.resourcegroup.name:
          enabled: true
```

### Kubernetes Detection

For Kubernetes environments, use Kubernetes API node detection:

```yaml
processors:
  resource_detection/k8s:
    detectors: [env, k8s_api]
    timeout: 5s

    k8s_api:
      # Authentication context
      auth_type: serviceAccount
      node_from_env_var: K8S_NODE_NAME
      # Or use kubeconfig
      # auth_type: kubeConfig
      # context: my-cluster
```

For full pod and container metadata, use the `k8sattributes` processor:

```yaml
processors:
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false

    # Extract these pod labels as attributes
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name

      labels:
        - tag_name: app
          key: app.kubernetes.io/name
          from: pod
        - tag_name: version
          key: app.kubernetes.io/version
          from: pod

      annotations:
        - tag_name: owner
          key: team
          from: namespace

    # Filter which pods to process
    filter:
      namespace: default

    # Pod association rules
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid
```

### System Detection

The system detector collects host-level information:

```yaml
processors:
  resource_detection/system:
    detectors: [system]

    system:
      hostname_sources:
        - dns
        - os
        - cname

      resource_attributes:
        host.name:
          enabled: true
        host.id:
          enabled: true
        host.arch:
          enabled: true
        os.type:
          enabled: true
        os.description:
          enabled: true
```

### Environment Variable Detection

Read resource attributes from environment variables:

```yaml
processors:
  resource_detection/env:
    detectors: [env]
```

This reads from `OTEL_RESOURCE_ATTRIBUTES`:

```bash
export OTEL_RESOURCE_ATTRIBUTES="service.name=checkout-service,deployment.environment.name=production,service.version=1.2.3"
```

Resource Detection in SDKs

Application SDKs can also perform resource detection, running before telemetry reaches the collector.

### Node.js Resource Detection

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} = require('@opentelemetry/resources');
const {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');
const { awsEc2Detector } = require('@opentelemetry/resource-detector-aws');
const { containerDetector } = require('@opentelemetry/resource-detector-container');

// Create resource with manual and detected attributes
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'checkout-service',
  [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.ENVIRONMENT || 'development',
});

const sdk = new NodeSDK({
  resource,
  // Resource detectors run at startup
  resourceDetectors: [
    envDetector,
    hostDetector,
    osDetector,
    processDetector,
    containerDetector,
    awsEc2Detector,  // Only works on EC2
  ],
});

sdk.start();
```

### Python Resource Detection

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource, get_aggregated_resources
from opentelemetry.sdk.resources import (
    ProcessResourceDetector,
    OTELResourceDetector,
)
from opentelemetry.sdk.extension.aws.resource.ec2 import AwsEc2ResourceDetector

# Manual resource attributes

manual_resource = Resource.create({
    "service.name": "checkout-service",
    "service.version": "1.2.3",
    "deployment.environment.name": "production",
})

# Combine with detected resources
detected_resource = get_aggregated_resources([
    OTELResourceDetector(),
    ProcessResourceDetector(),
    AwsEc2ResourceDetector(),  # Only works on EC2
])

# Merge resources (manual takes precedence)
resource = detected_resource.merge(manual_resource)

# Create tracer provider with resource
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)
```

### Go Resource Detection

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.37.0"

    // Resource detectors
    "go.opentelemetry.io/contrib/detectors/aws/ec2/v2"
    "go.opentelemetry.io/contrib/detectors/gcp"
)

func initResource(ctx context.Context) (*resource.Resource, error) {
    // Start with manual attributes
    res, err := resource.New(ctx,
        // Add service information
        resource.WithAttributes(
            semconv.ServiceName("checkout-service"),
            semconv.ServiceVersion("1.2.3"),
            semconv.DeploymentEnvironmentName("production"),
        ),
        // Enable automatic detection
        resource.WithFromEnv(),
        resource.WithHost(),
        resource.WithProcess(),
        resource.WithContainer(),
        resource.WithOS(),
        // Cloud detectors (will no-op if not in that environment)
        resource.WithDetectors(
            ec2.NewResourceDetector(),
            gcp.NewDetector(),
        ),
    )
    if err != nil {
        return nil, err
    }
    return res, nil
}
```

### Java Resource Detection

```java
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.contrib.aws.resource.Ec2Resource;
import io.opentelemetry.contrib.gcp.resource.GcpResource;
import io.opentelemetry.semconv.ServiceAttributes;

public class ResourceConfig {
    public static Resource createResource() {
        // Manual attributes
        Resource manual = Resource.builder()
            .put(ServiceAttributes.SERVICE_NAME, "checkout-service")
            .put(AttributeKey.stringKey("service.version"), "1.2.3")
            .put(AttributeKey.stringKey("deployment.environment.name"), "production")
            .build();

        // Merge with detected resources
        Resource detected = Resource.getDefault()
            .merge(Ec2Resource.get())     // AWS EC2 detection
            .merge(GcpResource.create()); // GCP detection

        return detected.merge(manual);
    }
}
```

## Combining Collector and SDK Detection

A common pattern is to perform basic detection in the SDK and enrich in the collector:

```mermaid
flowchart LR
    subgraph SDK
        A[Service Name] --> B[Process Info]
        B --> C[Basic Host Info]
    end

    subgraph Collector
        D[Cloud Detection] --> E[K8s Metadata]
        E --> F[Custom Attributes]
    end

    C --> D
    F --> G[Backend]
```

**SDK Configuration** (runs in application):
```javascript
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'checkout-service',
  [ATTR_SERVICE_VERSION]: '1.2.3',
});
```

**Collector Configuration** (enriches data):
```yaml
processors:
  resource_detection:
    detectors: [env, ec2, ecs, gcp, azure, k8s_api]
    override: false  # Don't override SDK-set values
    k8s_api:
      node_from_env_var: K8S_NODE_NAME

  k8sattributes:
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name

service:
  pipelines:
    traces:
      processors: [resource_detection, k8sattributes, batch]
```

## Complete Production Example

Here is a complete collector configuration for a Kubernetes environment on AWS:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048

  resource_detection:
    detectors: [env, system, ec2, ecs]
    timeout: 5s
    override: false

    system:
      hostname_sources: [dns, os]

    ec2:
      tags:
        - Name
        - Environment
        - Team

  k8sattributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
        - k8s.container.name
      labels:
        - tag_name: app
          key: app.kubernetes.io/name
          from: pod
        - tag_name: version
          key: app.kubernetes.io/version
          from: pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

  resource:
    attributes:
      - key: collector.version
        value: "1.0.0"
        action: insert

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - resource_detection
        - k8sattributes
        - resource
        - batch
      exporters: [otlphttp]
```

## Troubleshooting Resource Detection

### Detection Not Working

1. Check timeout settings. Cloud metadata endpoints can be slow.
2. Verify network access to metadata endpoints (169.254.169.254 for AWS/GCP).
3. Check IAM permissions for cloud resource tags.
4. For Kubernetes, verify service account permissions.

### Duplicate Attributes

Set `override: false` to prevent collector detection from overwriting SDK-set values:

```yaml
processors:
  resource_detection:
    override: false
```

### Viewing Detected Resources

Use the debug exporter to see what resources are detected:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource_detection]
      exporters: [debug]
```

## Conclusion

Proper resource detection transforms raw telemetry into actionable data. By automatically identifying the source of each span, metric, and log, you can filter by service, correlate across infrastructure, and debug issues faster. Start with basic detection (environment variables, service name), add cloud-specific detectors for your platform, and layer in Kubernetes metadata if applicable. The combination of SDK and collector detection provides both speed (SDK) and completeness (collector).
