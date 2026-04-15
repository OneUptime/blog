# How to Write Dapr Component YAML Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, YAML, Configuration, Specification

Description: Learn how to write Dapr Component YAML specifications including required fields, metadata, scoping, secret references, and version management.

---

## Overview

Dapr components are defined as YAML files that describe how the Dapr sidecar connects to external infrastructure like Redis, Kafka, PostgreSQL, or Vault. Every Dapr building block - state management, pub/sub, bindings, secrets, locks - is backed by a component. Writing correct component YAML is fundamental to working with Dapr.

## Component YAML Structure

Every component has the same top-level structure:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <component-name>
  namespace: <kubernetes-namespace>     # Kubernetes only
spec:
  type: <component-type>.<provider>
  version: v1
  metadata:
    - name: <setting-name>
      value: <setting-value>
auth:
  secretStore: <secret-store-name>       # optional
scopes:
  - <app-id-1>                           # optional
  - <app-id-2>
```

## Required Fields

| Field | Description |
|---|---|
| `apiVersion` | Always `dapr.io/v1alpha1` |
| `kind` | Always `Component` |
| `metadata.name` | Component name referenced in app code |
| `spec.type` | Component type and provider |
| `spec.version` | Always `v1` for current components |

## State Store Component (Redis)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master.default.svc.cluster.local:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: enableTLS
      value: "false"
    - name: maxRetries
      value: "3"
```

## Pub/Sub Component (RabbitMQ)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
    - name: connectionString
      value: amqp://rabbitmq.default.svc.cluster.local:5672
    - name: durable
      value: "true"
    - name: deletedWhenUnused
      value: "false"
    - name: autoAck
      value: "false"
    - name: prefetchCount
      value: "10"
```

## Secret References in Metadata

Use `secretKeyRef` to pull sensitive values from a secret store instead of hardcoding them:

```yaml
metadata:
  - name: password
    secretKeyRef:
      name: my-secret-name    # name of the secret in the store
      key: password           # key within the secret
auth:
  secretStore: kubernetes
```

## Scoping Components to Specific Apps

Restrict a component to only specific application IDs:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-payments:6379
scopes:
  - payment-service
  - billing-service
```

Apps not in the scopes list cannot use this component.

## Self-Hosted File Location

For self-hosted mode, place component files in:

```text
~/.dapr/components/          # default
./components/                # override with --resources-path
```

## Kubernetes Deployment

Apply components to Kubernetes with kubectl:

```bash
kubectl apply -f statestore.yaml
kubectl apply -f pubsub.yaml
```

List components in a namespace:

```bash
kubectl get components -n default
```

## Validating Component YAML

Run a quick validation by checking if the component loads:

```bash
dapr run --app-id test-app --resources-path ./components -- echo "checking"
```

On Kubernetes, list loaded components with:

```bash
dapr components -k
```

## Summary

Dapr component YAML files follow a consistent structure across all building blocks. Use `secretKeyRef` for any sensitive values, `scopes` to restrict access to specific apps, and the `auth.secretStore` field to specify where the secret store lives. Keeping component files in version control alongside your application code ensures reproducible deployments across environments.
