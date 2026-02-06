# How to Fix the Kubernetes Attributes Processor Not Enriching Spans Because Pod IP Lookup Returns Empty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, k8sattributes, Processor

Description: Fix the k8sattributes processor failing to enrich spans when pod IP lookups return empty due to misconfiguration.

The `k8sattributes` processor is one of the most useful components in a Kubernetes-based OpenTelemetry deployment. It enriches your telemetry with metadata like pod name, namespace, node name, and labels. But it only works if it can match incoming telemetry to the right pod, and that matching usually relies on the pod's IP address. When the IP lookup returns empty, none of the enrichment happens.

## How the k8sattributes Processor Works

The processor maintains a local cache of pod metadata by watching the Kubernetes API. When a span or metric arrives, it extracts the source IP from the connection metadata and looks it up in the cache. If it finds a matching pod, it adds the Kubernetes attributes.

```
Incoming span -> Extract source IP -> Look up in pod cache -> Add k8s attributes
```

If any step in this chain fails, you get spans without Kubernetes metadata.

## Symptom: Missing Kubernetes Attributes

```bash
# Check your spans in the backend - these attributes should be present
# k8s.pod.name
# k8s.namespace.name
# k8s.deployment.name
# k8s.node.name

# If they are missing, the k8sattributes processor is not matching pods
```

## Root Cause 1: Pod IP Not Available in Connection Metadata

When the Collector runs as a Deployment (not a DaemonSet or sidecar), traffic often passes through a Kubernetes Service, which performs SNAT (Source Network Address Translation). The Collector sees the Service's ClusterIP instead of the pod's IP.

```yaml
# This configuration will NOT work when traffic passes through a Service
processors:
  k8sattributes:
    # Default: extract pod IP from connection metadata
    # But SNAT replaces the source IP with the Service IP
```

Fix: Use the `k8s.pod.ip` resource attribute instead of the connection IP. The SDK sets this if configured:

```yaml
processors:
  k8sattributes:
    pod_association:
      - sources:
          # Try resource attribute first (set by the SDK)
          - from: resource_attribute
            name: k8s.pod.ip
      - sources:
          # Fall back to connection IP (works for DaemonSet/sidecar)
          - from: connection
```

## Root Cause 2: SDK Not Setting Pod IP

The SDK needs to know the pod's IP. In Kubernetes, this is typically available via the Downward API:

```yaml
# In your application Deployment
env:
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "k8s.pod.ip=$(POD_IP),k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE)"
  - name: POD_IP
    valueFrom:
      fieldRef:
        fieldPath: status.podIP
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
```

For auto-instrumented applications, the Operator should set these automatically. If it does not, check the Instrumentation CR:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  env:
    - name: OTEL_RESOURCE_ATTRIBUTES
      value: "k8s.pod.ip=$(POD_IP)"
  # The Operator typically injects POD_IP via the Downward API
```

## Root Cause 3: RBAC Permissions Missing

The processor needs to watch pods via the Kubernetes API. Without proper RBAC, the cache stays empty:

```bash
# Check if the processor can see pods
kubectl auth can-i list pods \
  --as=system:serviceaccount:observability:otel-collector \
  --all-namespaces
```

Refer to the RBAC configuration:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
```

## Root Cause 4: Filter Restricting Pod Cache

The processor can be configured with filters that limit which pods it watches. If the filter is too restrictive, the target pod might not be in the cache:

```yaml
processors:
  k8sattributes:
    filter:
      # This only watches pods in the 'production' namespace
      namespace: production
    # If your app runs in 'staging', its pods will not be cached
```

Remove the filter or broaden it:

```yaml
processors:
  k8sattributes:
    # No filter = watch all pods in all namespaces
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
```

## Debugging the Cache

Enable debug logging on the Collector to see what the processor is doing:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Then look for messages about pod cache operations:

```bash
kubectl logs -n observability deployment/otel-collector | grep -i "k8sattributes\|pod.*cache\|association"
```

You should see messages about pods being added to and removed from the cache. If the cache is empty or missing your target pods, check RBAC and filters.

## Verification

After fixing the configuration, verify attributes appear on your spans:

```bash
# Check Collector debug output for enriched spans
kubectl logs -n observability deployment/otel-collector | grep "k8s.pod.name"
```

The k8sattributes processor is powerful but requires all pieces to align: RBAC permissions, pod association configuration, and SDK-level resource attributes. Get all three right and your telemetry will be rich with Kubernetes context.
