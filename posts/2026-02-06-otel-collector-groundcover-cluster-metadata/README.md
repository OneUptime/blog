# How to Configure the OpenTelemetry Collector to Export to Groundcover with Cluster-Level Metadata Enrichment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Groundcover, Kubernetes, Metadata Enrichment

Description: Enrich OpenTelemetry data with cluster-level metadata using the Collector's resource detection and k8s_attributes processors for Groundcover.

When running multiple Kubernetes clusters, each sending telemetry to Groundcover, you need cluster-level metadata on every span, metric, and log record. Without it, you cannot distinguish which cluster produced a given trace. The OpenTelemetry Collector provides several processors and resource detectors that automatically attach cluster identity and node-level metadata to your telemetry before it reaches Groundcover.

## The Problem with Missing Cluster Context

Imagine you run three clusters: production-us-east, production-eu-west, and staging. A span from your checkout service in production-us-east looks identical to one from staging if there is no cluster identifier attached. Groundcover needs this context to give you accurate per-cluster views.

## Collector Configuration with Full Metadata Enrichment

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Detect cloud provider metadata automatically
  resourcedetection:
    detectors: [env, gcp, aws, azure]
    timeout: 5s
    override: false
    # GCP-specific: detect project ID, zone, cluster name
    gcp:
      resource_attributes:
        cloud.provider:
          enabled: true
        cloud.platform:
          enabled: true
        cloud.region:
          enabled: true
        cloud.availability_zone:
          enabled: true
        k8s.cluster.name:
          enabled: true

  # Add Kubernetes pod, node, and namespace metadata
  k8s_attributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.daemonset.name
        - k8s.job.name
        - k8s.container.name
      labels:
        # Extract specific pod labels as resource attributes
        - tag_name: app.kubernetes.io/name
          key: app.kubernetes.io/name
        - tag_name: app.kubernetes.io/version
          key: app.kubernetes.io/version
      annotations:
        - tag_name: team
          key: team

  # Manually set cluster name if not auto-detected
  resource:
    attributes:
      - key: k8s.cluster.name
        value: "${CLUSTER_NAME}"
        action: upsert
      - key: deployment.environment
        value: "${DEPLOY_ENV}"
        action: upsert

  # Control memory usage
  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp/groundcover:
    endpoint: ingest.groundcover.com:443
    headers:
      x-groundcover-api-key: "${GROUNDCOVER_API_KEY}"
    tls:
      insecure: false
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8s_attributes, resource, batch]
      exporters: [otlp/groundcover]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8s_attributes, resource, batch]
      exporters: [otlp/groundcover]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8s_attributes, resource, batch]
      exporters: [otlp/groundcover]
```

## Processor Ordering Matters

The order of processors in the pipeline is significant:

```yaml
processors: [memory_limiter, resourcedetection, k8s_attributes, resource, batch]
```

1. **memory_limiter** runs first to protect the Collector from OOM crashes
2. **resourcedetection** discovers cloud and cluster metadata
3. **k8s_attributes** enriches with pod-level Kubernetes metadata
4. **resource** adds or overrides any missing attributes
5. **batch** groups records for efficient export

If you put `resource` before `resourcedetection`, the resource detector might overwrite your manual values (depending on the `override` setting).

## Extracting Labels and Annotations

The `k8s_attributes` processor can pull pod labels and annotations into resource attributes:

```yaml
k8s_attributes:
  extract:
    labels:
      # Map the "team" label to a resource attribute
      - tag_name: team.owner
        key: team
      # Map the version label
      - tag_name: app.version
        key: app.kubernetes.io/version
    annotations:
      # Pull oncall information from pod annotations
      - tag_name: oncall.contact
        key: oncall-contact
```

This is useful for tagging all telemetry with ownership information. In Groundcover, you can then filter dashboards by team or set up alerts scoped to specific teams.

## Cloud Provider Resource Detection

The `resourcedetection` processor automatically detects cloud metadata. On GCP, it adds attributes like `cloud.provider`, `cloud.region`, `cloud.availability_zone`, and `k8s.cluster.name`. On AWS, it detects `cloud.provider`, `cloud.region`, `cloud.account.id`, and the EKS cluster name.

Here is how it looks on AWS:

```yaml
processors:
  resourcedetection:
    detectors: [env, eks, ec2]
    timeout: 5s
    override: false
    ec2:
      resource_attributes:
        cloud.provider:
          enabled: true
        cloud.region:
          enabled: true
        host.id:
          enabled: true
        host.name:
          enabled: true
```

## Helm Chart Deployment

If you deploy the Collector using Helm, set environment variables for cluster identification:

```yaml
# values.yaml for the OpenTelemetry Collector Helm chart
mode: daemonset

config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317

extraEnvs:
  - name: CLUSTER_NAME
    value: "production-us-east-1"
  - name: DEPLOY_ENV
    value: "production"
  - name: GROUNDCOVER_API_KEY
    valueFrom:
      secretKeyRef:
        name: groundcover-credentials
        key: api-key
```

Deploy with:

```bash
helm install otel-collector open-telemetry/opentelemetry-collector \
  -f values.yaml \
  -n groundcover
```

## Verifying Metadata in Groundcover

After deploying, check that your telemetry in Groundcover includes the expected attributes. Every span and metric should carry `k8s.cluster.name`, `k8s.namespace.name`, `k8s.pod.name`, and the cloud provider attributes. If any are missing, enable debug logging on the Collector and check whether the resource detectors are timing out or the RBAC permissions are insufficient.

With proper cluster-level metadata, you get accurate multi-cluster views in Groundcover, and you can filter and aggregate telemetry across your entire infrastructure.
