# How to Deploy Dapr Components in Specific Kubernetes Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Component, Namespace, Scoping

Description: Deploy Dapr components in specific Kubernetes namespaces and use component scoping to control which applications can access each component.

---

## Component Namespace Scoping

Dapr components are namespace-scoped by default - a component deployed in namespace `team-a` is only available to applications running in `team-a`. This provides natural isolation for multi-team environments.

## Deploying a Namespace-Scoped State Store

```yaml
# team-a/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: team-a
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-team-a.team-a.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

```bash
kubectl apply -f team-a/statestore.yaml
kubectl apply -f team-b/statestore.yaml  # Different Redis instance

# Verify components are visible per namespace
kubectl get components.dapr.io -n team-a
kubectl get components.dapr.io -n team-b
```

## Scoping Components to Specific Apps

Within a namespace, you can further restrict which app IDs can access a component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payments-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
scopes:
- payment-service
- billing-service
```

Only `payment-service` and `billing-service` can use this component. Other apps get an error if they try to access it.

## Deploying a Shared Pub/Sub in a Dedicated Namespace

```yaml
# infra/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: infra
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.infra.svc.cluster.local:9092"
  - name: consumerGroup
    value: "dapr-group"
```

Dapr sidecars only load components from their own namespace. To share this pub/sub with applications in other namespaces, deploy the same component definition in each namespace that needs access:

```bash
# Deploy the pub/sub component in each namespace that needs it
for ns in team-a team-b team-c; do
  sed "s/namespace: infra/namespace: $ns/" infra/pubsub.yaml | kubectl apply -f -
done
```

Each namespace gets its own Component resource, but they all point to the same Kafka cluster.

## Verifying Component Scoping

```bash
# Check which apps can see the component
kubectl describe component payments-statestore -n default | grep -A5 Scopes

# Test from an unscoped app (should fail)
kubectl exec -it deploy/inventory-service -c inventory-service -- \
  curl http://localhost:3500/v1.0/state/payments-statestore/some-key
# Expected: error - app not in component scopes
```

## Migrating Components Across Namespaces

```bash
# Export component from old namespace
kubectl get component statestore -n old-ns -o yaml > statestore-export.yaml

# Edit the namespace field
sed -i 's/namespace: old-ns/namespace: new-ns/' statestore-export.yaml

# Apply to new namespace
kubectl apply -f statestore-export.yaml
```

## Summary

Dapr components are namespace-scoped and can be further restricted to specific app IDs using the `scopes` field. This enables teams to share a Kubernetes cluster while maintaining strict separation of their Dapr components and backing services. Always verify component visibility with `kubectl get components.dapr.io -n <namespace>` after deployment.
