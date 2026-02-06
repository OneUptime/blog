# How to Configure the Resource Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Resource Processor, Service Metadata, Configuration

Description: Learn how to configure the resource processor in OpenTelemetry Collector to manage service-level metadata, enrich resource attributes, and maintain consistent service identity across your observability pipeline.

The resource processor modifies resource attributes attached to telemetry signals in the OpenTelemetry Collector. Resource attributes represent service-level metadata like `service.name`, `service.version`, `deployment.environment`, and infrastructure details that remain consistent across all spans, metrics, and logs from a service.

Unlike the attributes processor which modifies per-signal attributes (individual span or metric attributes), the resource processor operates at a higher level, managing the identity and context of the service generating telemetry.

## Understanding Resources in OpenTelemetry

In OpenTelemetry's data model, every telemetry signal has two layers of attributes:

**Resource attributes** (service-level):
- `service.name`: Identifies the service
- `service.version`: Deployment version
- `service.namespace`: Environment or namespace
- `host.name`: Server hostname
- `k8s.pod.name`: Kubernetes pod identifier
- `cloud.provider`: Cloud platform (AWS, GCP, Azure)

**Signal attributes** (per-span/metric/log):
- `http.status_code`: Response status
- `db.statement`: Database query
- `user.id`: User identifier
- `request.duration`: Request timing

Resource attributes apply to all telemetry from a service, while signal attributes vary per span, metric, or log. The resource processor manages that service-level metadata.

## Why Resource Processing Matters

Proper resource attribute management enables:

- **Service identification**: Distinguish between multiple instances of the same service
- **Environment separation**: Separate production, staging, and development telemetry
- **Version tracking**: Correlate deployments with performance changes
- **Multi-tenancy**: Identify which tenant or team owns each service
- **Cloud context**: Track which region, zone, or cluster serves requests
- **Cost allocation**: Attribute observability costs to specific teams or projects

Without consistent resource attributes, telemetry from the same logical service might appear as separate entities, breaking dashboards, alerting, and distributed tracing.

## Basic Configuration

Here's a minimal resource processor configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert

      - key: service.version
        value: ${GIT_COMMIT_SHA}
        action: upsert

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp]
```

This configuration adds environment and version information to all resource attributes for traces flowing through the pipeline.

## Core Configuration Actions

The resource processor supports the same action types as the attributes processor:

### insert

Adds a resource attribute only if it doesn't exist:

```yaml
processors:
  resource:
    attributes:
      - key: service.namespace
        value: production
        action: insert
```

Use `insert` to provide defaults without overriding values set by applications.

### update

Modifies an existing resource attribute:

```yaml
processors:
  resource:
    attributes:
      - key: service.name
        value: api-gateway-v2
        action: update
```

Use `update` when you need to correct or standardize existing values.

### upsert

Adds a new attribute or updates it if it exists:

```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: ${DEPLOY_ENV}
        action: upsert
```

Use `upsert` for attributes that should always have a specific value, regardless of what the application provides.

### delete

Removes a resource attribute:

```yaml
processors:
  resource:
    attributes:
      - key: telemetry.sdk.name
        action: delete
```

Use `delete` to remove unnecessary or sensitive resource metadata.

### hash

Hashes a resource attribute value:

```yaml
processors:
  resource:
    attributes:
      - key: host.name
        action: hash
```

Use `hash` to preserve uniqueness while hiding actual infrastructure details.

## Advanced Configuration Examples

### Complete Deployment Context

Add comprehensive deployment metadata to all telemetry:

```yaml
processors:
  resource:
    attributes:
      # Environment identification
      - key: deployment.environment
        value: production
        action: upsert

      # Version tracking
      - key: service.version
        value: ${GIT_COMMIT_SHA}
        action: upsert

      # Deployment timestamp
      - key: deployment.timestamp
        value: ${DEPLOY_TIMESTAMP}
        action: upsert

      # Build information
      - key: build.id
        value: ${CI_BUILD_ID}
        action: upsert

      # Service namespace
      - key: service.namespace
        value: ecommerce
        action: insert

      # Team ownership
      - key: team.name
        value: platform
        action: insert

      # Cost center
      - key: billing.cost_center
        value: engineering
        action: insert
```

This enrichment provides complete context for troubleshooting, cost allocation, and deployment tracking.

### Cloud Infrastructure Context

Inject cloud provider metadata:

```yaml
processors:
  resource:
    attributes:
      # Cloud provider
      - key: cloud.provider
        value: aws
        action: insert

      # Cloud region
      - key: cloud.region
        value: ${AWS_REGION}
        action: upsert

      # Availability zone
      - key: cloud.availability_zone
        value: ${AWS_AZ}
        action: upsert

      # Account ID (hashed for security)
      - key: cloud.account.id
        value: ${AWS_ACCOUNT_ID}
        action: upsert
        # Later hash it
      - key: cloud.account.id
        action: hash

      # VPC identifier
      - key: network.vpc.id
        value: ${VPC_ID}
        action: upsert
```

### Kubernetes Context Enrichment

For collectors running in Kubernetes:

```yaml
processors:
  resource:
    attributes:
      # Cluster identification
      - key: k8s.cluster.name
        value: ${K8S_CLUSTER_NAME}
        action: upsert

      # Namespace
      - key: k8s.namespace.name
        value: ${K8S_NAMESPACE}
        action: upsert

      # Pod information
      - key: k8s.pod.name
        value: ${K8S_POD_NAME}
        action: upsert

      - key: k8s.pod.uid
        value: ${K8S_POD_UID}
        action: upsert

      # Node information
      - key: k8s.node.name
        value: ${K8S_NODE_NAME}
        action: upsert

      # Deployment information
      - key: k8s.deployment.name
        value: ${K8S_DEPLOYMENT_NAME}
        action: upsert
```

Typically, you'd populate these from the Kubernetes Downward API in your deployment:

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
      - name: collector
        env:
        - name: K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: K8S_POD_UID
          valueFrom:
            fieldRef:
              fieldPath: metadata.uid
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

### Multi-Tenant Service Identification

For multi-tenant architectures, ensure resource attributes distinguish between tenant contexts:

```yaml
processors:
  resource:
    attributes:
      # Tenant identifier
      - key: tenant.id
        value: ${TENANT_ID}
        action: upsert

      # Tenant tier (for prioritization)
      - key: tenant.tier
        value: ${TENANT_TIER}
        action: upsert

      # Geographic region
      - key: tenant.region
        value: ${TENANT_REGION}
        action: upsert

      # Service instance ID
      - key: service.instance.id
        value: ${HOSTNAME}
        action: upsert
```

### Sanitizing Resource Attributes

Remove or mask sensitive infrastructure details:

```yaml
processors:
  resource:
    attributes:
      # Remove internal IP addresses
      - key: host.ip
        action: delete

      # Hash hostnames to preserve uniqueness
      - key: host.name
        action: hash

      # Remove internal network details
      - key: network.interface.name
        action: delete

      # Keep essential identification
      - key: service.name
        action: update
        value: anonymized-service
```

## Resource Processor vs. Attributes Processor

Understanding when to use each processor is crucial:

### Use Resource Processor For

**Service-level metadata** that applies to all telemetry from a service:
- `service.name`, `service.version`, `service.namespace`
- `deployment.environment`, `deployment.version`
- `host.name`, `host.id`, `host.type`
- `k8s.cluster.name`, `k8s.pod.name`, `k8s.namespace.name`
- `cloud.provider`, `cloud.region`, `cloud.account.id`

### Use Attributes Processor For

**Signal-specific attributes** that vary per span, metric, or log:
- `http.status_code`, `http.method`, `http.url`
- `db.statement`, `db.operation`, `db.name`
- `user.id`, `session.id`, `request.id`
- `error.type`, `error.message`

### Example: Combining Both Processors

```yaml
processors:
  # Resource processor: service-level metadata
  resource:
    attributes:
      - key: service.version
        value: ${VERSION}
        action: upsert
      - key: deployment.environment
        value: production
        action: insert

  # Attributes processor: span-level attributes
  attributes:
    actions:
      - key: http.url
        pattern: ^([^?]+)
        action: extract
      - key: user.email
        action: hash

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, attributes, batch]
      exporters: [otlphttp]
```

This separation maintains a clean distinction between service identity (resource) and request-specific context (attributes).

## Resource Detection

The OpenTelemetry Collector can automatically detect resource attributes from the environment using the `resourcedetection` processor:

```yaml
processors:
  # Automatically detect resource attributes
  resourcedetection:
    detectors: [env, system, docker, gcp, ec2, ecs, eks, azure]
    timeout: 5s
    override: false

  # Add or override specific attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

service:
  pipelines:
    traces:
      processors: [resourcedetection, resource, batch]
```

The `resourcedetection` processor detects attributes from:

- **env**: Environment variables (e.g., `OTEL_RESOURCE_ATTRIBUTES`)
- **system**: Host information (hostname, OS, architecture)
- **docker**: Docker container metadata
- **gcp**: Google Cloud Platform metadata
- **ec2**: AWS EC2 instance metadata
- **ecs**: AWS ECS task metadata
- **eks**: AWS EKS cluster metadata
- **azure**: Azure VM metadata

Combine `resourcedetection` with the `resource` processor to auto-detect infrastructure context and add deployment-specific metadata.

## Environment Variable Substitution

The resource processor supports environment variable substitution using `${VAR_NAME}` syntax:

```yaml
processors:
  resource:
    attributes:
      - key: service.version
        value: ${GIT_COMMIT_SHA}
        action: upsert

      - key: deployment.timestamp
        value: ${DEPLOY_TIMESTAMP}
        action: upsert

      - key: k8s.namespace.name
        value: ${K8S_NAMESPACE}
        action: upsert
```

This enables dynamic configuration without modifying the collector config file for each deployment.

## Resource Attributes Flow

Understanding how resource attributes flow through the collector:

```mermaid
graph LR
    A[Application SDK] -->|Resource Attributes| B[Receiver]
    B --> C[Resource Processor]
    C -->|Enriched Resources| D[Attributes Processor]
    D --> E[Batch Processor]
    E --> F[Exporter]
    F -->|All Telemetry + Resources| G[Backend]
```

The resource processor enriches resource attributes early in the pipeline. These enriched resources then apply to all spans, metrics, and logs processed downstream.

## Multi-Pipeline Resource Configuration

Different telemetry types may need different resource processing:

```yaml
processors:
  # Shared resource processor for all pipelines
  resource/common:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  # Trace-specific resource processing
  resource/traces:
    attributes:
      - key: telemetry.type
        value: traces
        action: insert

  # Metric-specific resource processing
  resource/metrics:
    attributes:
      - key: telemetry.type
        value: metrics
        action: insert

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource/common, resource/traces, batch]
      exporters: [otlphttp]

    metrics:
      receivers: [otlp]
      processors: [resource/common, resource/metrics, batch]
      exporters: [otlphttp]
```

## Troubleshooting Resource Attributes

### Issue 1: Resource Attributes Not Applied

**Symptom**: Resource attributes configured in processor don't appear in exported telemetry.

**Diagnosis**:

```yaml
exporters:
  # Add logging exporter to inspect telemetry
  logging:
    verbosity: detailed

service:
  pipelines:
    traces:
      processors: [resource, batch]
      exporters: [logging, otlphttp]
```

Check the logging output for resource attributes. If missing, verify:

1. Processor is in the pipeline
2. Environment variables are set correctly
3. Action type is appropriate (use `upsert` to override existing values)

### Issue 2: Resource Attributes Conflict

**Symptom**: Application-set resource attributes conflict with collector-set attributes.

**Solution**: Use `upsert` action to override application values:

```yaml
processors:
  resource:
    attributes:
      # Override application-provided environment
      - key: deployment.environment
        value: production
        action: upsert
```

Or use `insert` to respect application values:

```yaml
processors:
  resource:
    attributes:
      # Only add if application didn't provide it
      - key: deployment.environment
        value: production
        action: insert
```

### Issue 3: Environment Variable Not Substituted

**Symptom**: Resource attribute shows `${VAR_NAME}` instead of the actual value.

**Cause**: Environment variable not set when collector starts.

**Solution**: Verify environment variable exists:

```bash
# Check environment variable
echo $GIT_COMMIT_SHA

# If empty, set it before starting collector
export GIT_COMMIT_SHA="abc123"
otelcol --config config.yaml
```

In Kubernetes, ensure environment variables are defined in the deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: collector
        env:
        - name: GIT_COMMIT_SHA
          value: "abc123"
```

## Performance Considerations

Resource processing has minimal performance impact because resource attributes are set once per batch, not per individual telemetry item. However, keep these guidelines in mind:

### Efficient Pattern

```yaml
processors:
  resource:
    attributes:
      # Simple value assignments are fast
      - key: environment
        value: production
        action: insert
```

### Less Efficient Pattern

```yaml
processors:
  # Avoid complex detection for every resource
  resourcedetection:
    detectors: [env, system, docker, gcp, ec2, ecs, eks, azure, aks]
    timeout: 30s  # Long timeout affects latency
```

**Best practices**:
1. Limit resource detection to relevant platforms (don't check all cloud providers)
2. Use reasonable timeouts (2-5 seconds)
3. Cache detection results when possible (handled automatically by most detectors)

## Common Patterns

### Pattern 1: Service Mesh Integration

Enrich telemetry with service mesh metadata:

```yaml
processors:
  resource:
    attributes:
      # Mesh identification
      - key: service.mesh.name
        value: istio
        action: insert

      # Mesh namespace
      - key: service.mesh.namespace
        value: ${ISTIO_NAMESPACE}
        action: upsert

      # Sidecar version
      - key: service.mesh.version
        value: ${ISTIO_VERSION}
        action: upsert
```

### Pattern 2: Canary Deployment Tracking

Mark telemetry from canary deployments:

```yaml
processors:
  resource:
    attributes:
      # Canary flag
      - key: deployment.canary
        value: ${IS_CANARY}
        action: upsert

      # Traffic percentage
      - key: deployment.traffic_percent
        value: ${CANARY_TRAFFIC_PCT}
        action: upsert

      # Canary start time
      - key: deployment.canary_start
        value: ${CANARY_START_TIME}
        action: upsert
```

### Pattern 3: Cost Allocation Tags

Add billing and cost allocation metadata:

```yaml
processors:
  resource:
    attributes:
      # Cost center
      - key: billing.cost_center
        value: ${COST_CENTER}
        action: upsert

      # Team ownership
      - key: billing.team
        value: ${TEAM_NAME}
        action: upsert

      # Project identifier
      - key: billing.project
        value: ${PROJECT_ID}
        action: upsert

      # Environment tier
      - key: billing.tier
        value: production
        action: insert
```

### Pattern 4: Compliance Metadata

Add compliance and governance attributes:

```yaml
processors:
  resource:
    attributes:
      # Data classification
      - key: compliance.data_classification
        value: confidential
        action: insert

      # Retention policy
      - key: compliance.retention_days
        value: "90"
        action: insert

      # Regulatory scope
      - key: compliance.regulations
        value: "GDPR,SOC2"
        action: insert
```

## Testing Resource Processor Configuration

Validate resource attribute transformations:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  resource:
    attributes:
      - key: test.attribute
        value: test-value
        action: insert
      - key: service.version
        value: ${VERSION}
        action: upsert

exporters:
  logging:
    verbosity: detailed  # Shows resource attributes

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource]
      exporters: [logging]
```

Send test telemetry and inspect logs for resource attributes:

```bash
# Set environment variable
export VERSION="1.2.3"

# Start collector
otelcol --config test-config.yaml

# Send test spans and check logs for resource attributes
```

## Production Checklist

Before deploying resource processor to production:

- [ ] All required environment variables defined and validated
- [ ] Service identification attributes set (`service.name`, `service.version`, `service.namespace`)
- [ ] Deployment context configured (`deployment.environment`, version tracking)
- [ ] Infrastructure context added (cloud provider, region, Kubernetes cluster)
- [ ] Cost allocation tags configured (team, project, cost center)
- [ ] Sensitive resource attributes masked or deleted
- [ ] Resource detection configured for appropriate platforms
- [ ] Multi-pipeline resource processors ordered correctly
- [ ] Test pipeline validates resource transformations
- [ ] Documentation updated with resource attribute standards

## Key Takeaways

The resource processor manages service-level metadata in the OpenTelemetry Collector, enriching all telemetry from a service with consistent identity and context attributes.

Use it to add deployment information, infrastructure context, cost allocation tags, and compliance metadata. Combine it with the `resourcedetection` processor for automatic infrastructure discovery and manual enrichment.

Keep resource attributes focused on service-level metadata that applies to all telemetry. Use the attributes processor for per-signal attributes that vary between spans, metrics, and logs.

**Related Reading:**

- [How to Configure the Attributes Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/attributes-processor-opentelemetry-collector/view)
- [How to Configure the Batch Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/batch-processor-opentelemetry-collector/view)
- [What is OpenTelemetry Collector and why use one?](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view)
