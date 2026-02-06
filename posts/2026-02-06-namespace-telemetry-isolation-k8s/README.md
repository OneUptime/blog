# How to Set Up Namespace-Based Telemetry Isolation in Kubernetes for Multi-Tenant Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Multi-Tenant, Namespace Isolation

Description: Implement namespace-based telemetry isolation in Kubernetes to ensure tenants can only see their own observability data.

In multi-tenant Kubernetes clusters, telemetry isolation is critical. Tenant A should never see Tenant B's traces, metrics, or logs. This post shows how to achieve strong isolation using Kubernetes namespaces, per-namespace Collector instances, and backend-level access controls.

## Isolation Strategy

The isolation works at three levels:

1. **Network level**: NetworkPolicies prevent cross-namespace Collector access.
2. **Data level**: Resource attributes tag all telemetry with the source namespace.
3. **Backend level**: Separate storage or query-time filtering based on namespace attributes.

## Per-Namespace Collector Deployment

Use a Kubernetes operator or Helm to deploy isolated Collectors:

```yaml
# namespace-collector.yaml
# Deploy this in each tenant namespace
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: tenant-alpha  # One per namespace
spec:
  selector:
    matchLabels:
      app: otel-collector
      tenant: tenant-alpha
  template:
    metadata:
      labels:
        app: otel-collector
        tenant: tenant-alpha
    spec:
      serviceAccountName: otel-collector
      # Only schedule on nodes that run this tenant's pods
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  tenant: tenant-alpha
              topologyKey: kubernetes.io/hostname
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config", "/etc/otel/config.yaml"]
          env:
            - name: TENANT_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          ports:
            - containerPort: 4317
              name: otlp-grpc
          resources:
            limits:
              cpu: "1"
              memory: "2Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Collector Configuration with Namespace Injection

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 4096
    timeout: 1s

  memory_limiter:
    check_interval: 5s
    limit_mib: 1536

  # Inject tenant namespace into all telemetry
  resource:
    attributes:
      - key: k8s.namespace.name
        value: ${env:TENANT_NAME}
        action: upsert
      - key: tenant.name
        value: ${env:TENANT_NAME}
        action: upsert
      - key: tenant.isolation_level
        value: namespace
        action: upsert

  # Strip any pre-existing tenant attributes to prevent spoofing
  attributes:
    actions:
      # Remove any client-supplied tenant attributes
      - key: tenant.name
        action: delete
      # These get re-added by the resource processor above

exporters:
  otlp/gateway:
    endpoint: otel-gateway.observability.svc.cluster.local:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes, resource, batch]
      exporters: [otlp/gateway]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, attributes, resource, batch]
      exporters: [otlp/gateway]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, attributes, resource, batch]
      exporters: [otlp/gateway]
```

## Network Policies for Isolation

Prevent pods from sending telemetry to a different tenant's Collector:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: otel-collector-isolation
  namespace: tenant-alpha
spec:
  podSelector:
    matchLabels:
      app: otel-collector
  policyTypes:
    - Ingress
  ingress:
    # Only accept traffic from pods in the same namespace
    - from:
        - podSelector: {}
      ports:
        - port: 4317
          protocol: TCP
        - port: 4318
          protocol: TCP
---
# Deny egress to other tenants' Collectors
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-tenant-telemetry
  namespace: tenant-alpha
spec:
  podSelector:
    matchLabels: {}
  policyTypes:
    - Egress
  egress:
    # Allow egress to own namespace Collector
    - to:
        - podSelector:
            matchLabels:
              app: otel-collector
      ports:
        - port: 4317
        - port: 4318
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
    # Allow egress to other service dependencies
    - to:
        - podSelector: {}
```

## Automating Namespace Onboarding

Write a controller that automatically deploys Collectors when new tenant namespaces are created:

```python
# namespace_watcher.py
from kubernetes import client, config, watch
import subprocess
import yaml

config.load_incluster_config()
v1 = client.CoreV1Api()

def deploy_collector_for_namespace(namespace):
    """Deploy an OTel Collector when a new tenant namespace is created."""
    # Skip system namespaces
    skip_namespaces = [
        "kube-system", "kube-public", "default",
        "observability", "flux-system"
    ]
    if namespace in skip_namespaces:
        return

    print(f"Deploying OTel Collector for namespace: {namespace}")

    # Generate config with namespace-specific values
    values = {
        "config": {
            "processors": {
                "resource": {
                    "attributes": [
                        {"key": "tenant.name", "value": namespace,
                         "action": "upsert"}
                    ]
                }
            }
        }
    }

    values_file = f"/tmp/values-{namespace}.yaml"
    with open(values_file, "w") as f:
        yaml.dump(values, f)

    subprocess.run([
        "helm", "upgrade", "--install",
        f"otel-collector-{namespace}",
        "open-telemetry/opentelemetry-collector",
        "-n", namespace,
        "-f", "base-values.yaml",
        "-f", values_file,
    ], check=True)

# Watch for new namespaces
w = watch.Watch()
for event in w.stream(v1.list_namespace):
    if event["type"] == "ADDED":
        ns = event["object"].metadata.name
        labels = event["object"].metadata.labels or {}
        if labels.get("tenant-enabled") == "true":
            deploy_collector_for_namespace(ns)
```

## Query-Time Isolation

On the backend side, ensure queries are filtered by tenant:

```sql
-- ClickHouse view that enforces tenant isolation
CREATE VIEW tenant_traces AS
SELECT *
FROM otel_traces
WHERE resource_attributes['tenant.name'] = currentUser()
-- The currentUser() maps to the tenant's query user
```

## Wrapping Up

Namespace-based telemetry isolation gives you strong multi-tenant boundaries in Kubernetes. By combining per-namespace Collectors, mandatory attribute injection, network policies, and backend-level filtering, you ensure that tenants can only access their own telemetry data. The key is that tenant identity is injected by the Collector (not the application), making it impossible for applications to spoof their tenant identity.
