# How to Use Dapr Component CRD for Declarative Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, CRD, Declarative, Kubernetes

Description: Use the Dapr Component CRD to declaratively configure state stores, pub/sub brokers, bindings, and secret stores as native Kubernetes resources managed by GitOps.

---

## What is the Dapr Component CRD?

The Dapr Component CRD (`components.dapr.io`) is the primary building block for declaring Dapr infrastructure. It replaces YAML config files used in self-hosted mode and integrates natively with Kubernetes for lifecycle management, RBAC, and namespace scoping.

## Component CRD Structure

Every Component CRD follows this structure:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <component-name>          # Referenced by app code
  namespace: <target-namespace>   # Namespace scope
spec:
  type: <category>.<provider>     # e.g., state.redis
  version: v1                     # Component spec version
  metadata:                       # Provider-specific config
  - name: <key>
    value: <value>
  - name: <secret-key>
    secretKeyRef:
      name: <k8s-secret-name>
      key: <secret-key>
  scopes:                         # Optional: restrict by app ID
  - <app-id>
```

## State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.redis.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
  - name: keyPrefix
    value: "appid"
  - name: enableTLS
    value: "true"
```

## Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.kafka.svc.cluster.local:9092"
  - name: consumerGroup
    value: "my-consumer-group"
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-credentials
      key: password
```

## Input Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron-binding
  namespace: production
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 1m"
```

## Secret Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: vaultToken
    secretKeyRef:
      name: vault-credentials
      key: token
  - name: vaultKVPrefix
    value: "production"
```

## Applying and Validating Components

```bash
# Apply all components
kubectl apply -f ./dapr-components/

# Verify they are registered
kubectl get components -n production

# Check a component's current state
kubectl describe component statestore -n production

# Confirm sidecar loaded the component
kubectl logs my-pod -c daprd | grep "component loaded"
```

## Using Components Across Environments

Use Kustomize overlays to manage component differences between environments:

```bash
# base/statestore.yaml - common structure
# overlays/production/statestore-patch.yaml - production values
kubectl apply -k ./overlays/production/
```

## Summary

The Dapr Component CRD provides a declarative, Kubernetes-native way to configure all Dapr building blocks. Secret values are referenced through Kubernetes Secret resources via `secretKeyRef`, keeping credentials out of version control. Combining Component CRDs with Kustomize or Helm enables consistent, environment-specific configurations managed through GitOps pipelines.
