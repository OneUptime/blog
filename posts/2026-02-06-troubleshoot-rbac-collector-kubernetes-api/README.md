# How to Troubleshoot RBAC Permission Errors When the Collector Cannot Query the Kubernetes API for Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RBAC, Kubernetes, Collector

Description: Diagnose and fix RBAC permission errors that prevent the OpenTelemetry Collector from querying Kubernetes API metadata.

The OpenTelemetry Collector's `k8sattributes` processor and `k8sobjects` receiver need to query the Kubernetes API to enrich telemetry with pod names, namespace labels, node information, and other metadata. Without the right RBAC permissions, these components fail silently or log permission errors, and your telemetry data is missing crucial context.

## Recognizing the Problem

Check the Collector logs for RBAC-related errors:

```bash
kubectl logs -n observability deployment/otel-collector | grep -i "forbidden\|rbac\|unauthorized"

# Typical errors:
# "failed to list pods: pods is forbidden: User \"system:serviceaccount:observability:otel-collector\"
#  cannot list resource \"pods\" in API group \"\" at the cluster scope"
```

Or the k8sattributes processor might log warnings about missing metadata:

```
warn  k8sattributesprocessor: pod not found in cache, cannot add k8s attributes
```

## Understanding What Permissions Are Needed

Different Collector components need different permissions:

| Component | Resources | Verbs |
|-----------|-----------|-------|
| k8sattributes processor | pods, namespaces, replicasets | get, list, watch |
| k8sobjects receiver | pods, events, nodes | get, list, watch |
| kubeletstats receiver | nodes, nodes/stats | get |
| filelog receiver | pods | get, list, watch |

## Creating the Proper RBAC Configuration

Here is a complete RBAC setup for a Collector that uses the most common Kubernetes-aware components:

```yaml
# ServiceAccount for the Collector
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability

---
# ClusterRole with the necessary permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  # For k8sattributes processor - pod metadata enrichment
  - apiGroups: [""]
    resources: ["pods", "namespaces"]
    verbs: ["get", "list", "watch"]

  # For k8sattributes processor - deployment/replicaset owner references
  - apiGroups: ["apps"]
    resources: ["replicasets", "deployments"]
    verbs: ["get", "list", "watch"]

  # For kubeletstats receiver
  - apiGroups: [""]
    resources: ["nodes", "nodes/stats", "nodes/proxy"]
    verbs: ["get", "list"]

  # For k8sobjects receiver (if collecting Kubernetes events)
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]

  # For k8s_observer extension (service discovery)
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["get", "list", "watch"]

---
# Bind the ClusterRole to the ServiceAccount
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

## Assigning the ServiceAccount to the Collector

Make sure the Collector pod uses the correct ServiceAccount:

```yaml
apiVersion: apps/v1
kind: Deployment  # or DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  template:
    spec:
      serviceAccountName: otel-collector  # Must match the SA above
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
```

## Debugging RBAC Issues

Use `kubectl auth can-i` to test permissions:

```bash
# Test if the Collector SA can list pods cluster-wide
kubectl auth can-i list pods \
  --as=system:serviceaccount:observability:otel-collector \
  --all-namespaces
# Expected: yes

# Test if it can get node stats
kubectl auth can-i get nodes/stats \
  --as=system:serviceaccount:observability:otel-collector
# Expected: yes

# Test if it can watch replicasets
kubectl auth can-i watch replicasets.apps \
  --as=system:serviceaccount:observability:otel-collector \
  --all-namespaces
# Expected: yes
```

If any of these return "no", the RBAC configuration is missing that permission.

## Common Mistakes

### Using Role Instead of ClusterRole

A `Role` only grants access within a single namespace. Since the Collector typically needs to see pods across all namespaces, you need a `ClusterRole` and `ClusterRoleBinding`:

```yaml
# WRONG - This only works for the 'observability' namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role  # Should be ClusterRole
metadata:
  name: otel-collector
  namespace: observability

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding  # Should be ClusterRoleBinding
metadata:
  name: otel-collector
  namespace: observability
```

### Missing the apps API Group

The `replicasets` resource is in the `apps` API group, not the core group:

```yaml
# WRONG - replicasets are not in the "" API group
- apiGroups: [""]
  resources: ["replicasets"]
  verbs: ["get", "list", "watch"]

# CORRECT
- apiGroups: ["apps"]
  resources: ["replicasets"]
  verbs: ["get", "list", "watch"]
```

### Wrong ServiceAccount Namespace in the Binding

```yaml
# WRONG - namespace mismatch
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: default  # Collector runs in 'observability'!

# CORRECT
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: observability
```

## Verifying Everything Works

After applying the RBAC configuration, restart the Collector and check the logs:

```bash
kubectl rollout restart deployment/otel-collector -n observability
kubectl logs -n observability deployment/otel-collector --tail=50 | grep -i "k8s\|pod\|forbidden"
```

You should see the k8sattributes processor successfully watching pods instead of logging permission errors. Your spans and metrics should now include Kubernetes metadata like `k8s.pod.name`, `k8s.namespace.name`, and `k8s.deployment.name`.
