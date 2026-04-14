# How to Manage Dapr Components with Kubernetes Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Operator, Kubernetes, Component, Automation

Description: Manage Dapr components using the Dapr Kubernetes operator, which watches Component CRDs and automatically reloads sidecars when configurations change.

---

## The Dapr Operator's Role

The `dapr-operator` is a Kubernetes operator deployed as part of the Dapr control plane. It watches for changes to Dapr CRDs (Component, Configuration, Resiliency, Subscription, HTTPEndpoint) and notifies running sidecars to reload their configuration. This enables zero-downtime updates to Dapr components.

## How the Operator Watches Components

When you apply or modify a Component CRD, the operator detects the change and pushes an update to all subscribed Dapr sidecars in the matching namespace:

```bash
# Apply a new component
kubectl apply -f statestore.yaml

# The operator logs show the update being propagated
kubectl logs -l app=dapr-operator -n dapr-system | grep "component updated"
```

The sidecar receives the update and reloads the component without restarting the pod (when `HotReload` is enabled).

## Enabling Hot Reload

Hot reload allows component updates without pod restarts. Enable it in the Configuration CRD:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  features:
  - name: HotReload
    enabled: true
```

Apply the annotation to your deployment:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

Now when you update a Component CRD, the sidecar picks up the change live:

```bash
# Update the Redis host
kubectl patch component statestore -n default --type=merge \
  -p '{"spec":{"metadata":[{"name":"redisHost","value":"redis-new:6379"}]}}'

# Verify the sidecar picked up the change
kubectl logs my-pod -c daprd | grep "component reloaded"
```

## Updating Components with the Operator

When hot reload is enabled, the operator propagates component changes to sidecars without downtime. To update a component's configuration:

1. Modify the Component CRD with the updated spec
2. The operator detects the change and propagates it to sidecars
3. Sidecars reload the component live

```bash
# Update the statestore component to point to a new Redis instance
kubectl apply -f - <<EOF
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-v2:6379"
  - name: failover
    value: "true"
EOF
```

## Monitoring Operator Health

The operator exposes metrics for component update operations:

```bash
kubectl port-forward svc/dapr-api -n dapr-system 9090:9090
curl http://localhost:9090/metrics | grep component
```

Check operator pod health:

```bash
kubectl get deployment dapr-operator -n dapr-system
kubectl describe deployment dapr-operator -n dapr-system
```

## Operator RBAC Requirements

The Dapr operator requires ClusterRole permissions to watch CRDs across namespaces:

```bash
kubectl get clusterrolebinding | grep dapr-operator
kubectl describe clusterrole dapr-operator-admin
```

If the operator has reduced permissions, it may not propagate updates to all namespaces.

## Summary

The Dapr Kubernetes operator is responsible for watching Component CRDs and propagating changes to running sidecars. Enable the `HotReload` feature flag to allow live component updates without pod restarts. Monitor operator health through its metrics endpoint and ensure its RBAC permissions cover all tenant namespaces for reliable update propagation in multi-tenant deployments.
