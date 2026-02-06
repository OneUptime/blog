# How to Route Telemetry Data by Team Ownership Using Pod Labels and Namespace Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Routing, Pod Labels

Description: Route OpenTelemetry telemetry data to different backends based on Kubernetes pod labels and namespace attributes for team ownership.

In Kubernetes, pod labels and namespace annotations carry ownership information. By extracting these attributes in the OpenTelemetry Collector and using them for routing decisions, you can automatically direct telemetry to the right backend, dashboard, or storage tier based on team ownership.

## The Approach

The pipeline works in three steps:

1. **Extract**: Use the k8sattributes processor to enrich telemetry with pod labels and namespace metadata.
2. **Route**: Use the routing processor to send telemetry to different exporters based on those attributes.
3. **Export**: Each route points to a team-specific or tier-specific backend.

## Step 1: Label Your Pods

Ensure all pods have ownership labels:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: payments
  labels:
    team: payments
    tier: critical
spec:
  template:
    metadata:
      labels:
        app: payment-api
        team: payments
        tier: critical
        cost-center: CC-1234
```

And annotate your namespaces:

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    team: payments
    environment: production
  annotations:
    observability.platform/owner: "alice@company.com"
    observability.platform/tier: "critical"
    observability.platform/backend: "premium"
```

## Step 2: Collector with k8sattributes and Routing

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Extract Kubernetes metadata
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.node.name
      labels:
        # Extract specific pod labels as resource attributes
        - tag_name: team.name
          key: team
          from: pod
        - tag_name: service.tier
          key: tier
          from: pod
        - tag_name: team.cost_center
          key: cost-center
          from: pod
      annotations:
        # Extract namespace annotations
        - tag_name: team.owner
          key: observability.platform/owner
          from: namespace
        - tag_name: backend.tier
          key: observability.platform/backend
          from: namespace

    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
      - sources:
          - from: connection

  batch:
    send_batch_size: 4096
    timeout: 1s

  # Route based on extracted attributes
  routing/by_tier:
    from_attribute: backend.tier
    attribute_source: resource
    table:
      - value: premium
        exporters: [otlphttp/premium]
      - value: standard
        exporters: [otlphttp/standard]
    default_exporters: [otlphttp/standard]

  routing/by_team:
    from_attribute: team.name
    attribute_source: resource
    table:
      - value: payments
        exporters: [otlphttp/payments_team]
      - value: platform
        exporters: [otlphttp/platform_team]
    default_exporters: [otlphttp/shared]

exporters:
  # Premium backend with higher retention and resources
  otlphttp/premium:
    endpoint: https://premium-backend:4318
    headers:
      X-Storage-Tier: premium
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  # Standard backend
  otlphttp/standard:
    endpoint: https://standard-backend:4318
    headers:
      X-Storage-Tier: standard

  # Team-specific backends
  otlphttp/payments_team:
    endpoint: https://payments-observability:4318

  otlphttp/platform_team:
    endpoint: https://platform-observability:4318

  otlphttp/shared:
    endpoint: https://shared-observability:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, batch, routing/by_tier]
      exporters: [otlphttp/premium, otlphttp/standard]
    metrics:
      receivers: [otlp]
      processors: [k8sattributes, batch, routing/by_team]
      exporters: [otlphttp/payments_team, otlphttp/platform_team, otlphttp/shared]
    logs:
      receivers: [otlp]
      processors: [k8sattributes, batch, routing/by_tier]
      exporters: [otlphttp/premium, otlphttp/standard]
```

## RBAC for the k8sattributes Processor

The Collector needs permissions to read pod and namespace metadata:

```yaml
# collector-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces", "nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: observability
roleRef:
  kind: ClusterRole
  name: otel-collector
  apiGroup: rbac.authorization.k8s.io
```

## Handling Label Changes

When a pod's labels change (e.g., a service moves to a new team), the k8sattributes processor picks up the change automatically because it watches the Kubernetes API. Telemetry routing updates without any Collector restart.

## Fallback Routing

Always define a default route for pods that lack ownership labels:

```yaml
processors:
  # Add a default team for untagged pods
  transform:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["team.name"], "unowned")
            where attributes["team.name"] == nil
```

This ensures that telemetry from untagged pods still gets routed somewhere instead of being dropped. You can then set up alerts when telemetry arrives with `team.name=unowned` to identify pods that need labels.

## Validating Labels in CI

Add a CI check that verifies all deployments have required labels:

```bash
#!/bin/bash
# validate-labels.sh
REQUIRED_LABELS=("team" "tier" "cost-center")

for manifest in k8s/deployments/*.yaml; do
  for label in "${REQUIRED_LABELS[@]}"; do
    if ! grep -q "^        ${label}:" "$manifest"; then
      echo "FAIL: $manifest missing required pod label: $label"
      exit 1
    fi
  done
done
echo "All deployments have required labels."
```

## Wrapping Up

Using Kubernetes pod labels and namespace attributes for telemetry routing gives you automatic, metadata-driven data management. Teams do not need to configure routing manually. They just label their pods correctly, and the Collector handles the rest. This approach scales naturally because it leverages the ownership metadata that should already exist in your Kubernetes manifests.
