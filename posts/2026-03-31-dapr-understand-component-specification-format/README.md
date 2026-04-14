# How to Understand Dapr Component Specification Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Configuration, YAML, Specification

Description: Learn the structure of Dapr component YAML files including apiVersion, kind, metadata, spec fields, and how to configure secrets and scopes.

---

Dapr components are configured via YAML files that follow a consistent Kubernetes-style schema. Every component file shares the same top-level structure regardless of the component type.

## Top-Level Fields

Every Dapr component YAML has these mandatory top-level fields:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-component
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata: []
```

- `apiVersion` - Always `dapr.io/v1alpha1` for components
- `kind` - Always `Component`
- `metadata.name` - The name your application uses to reference this component
- `spec.type` - The component category and implementation (e.g., `state.redis`, `pubsub.kafka`)
- `spec.version` - The component version, usually `v1`
- `spec.metadata` - A list of key-value pairs for component-specific configuration

## The Metadata Array

The `spec.metadata` array holds component configuration. Each entry is a key-value pair:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master:6379"
    - name: redisPassword
      value: "mypassword"
    - name: enableTLS
      value: "true"
```

Values are always strings, even for booleans and numbers. Check the component reference docs for the exact field names and accepted values.

## Referencing Secrets

Instead of embedding credentials in plain text, reference them from a secret store:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

The `secretKeyRef.name` is the Kubernetes Secret name (or the key in another secret store) and `secretKeyRef.key` is the field within that secret.

## Scoping Components to Applications

Use the top-level `scopes` array to restrict which Dapr app IDs can access a component:

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
      value: "redis:6379"
scopes:
  - order-service
  - inventory-service
```

If `scopes` is omitted, all applications in the namespace can use the component.

## Component Auth Policies

Components support a top-level `auth` field to specify which secret store to use for resolving `secretKeyRef` references:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmosdb
auth:
  secretStore: azure-keyvault
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
    - name: url
      value: "https://myaccount.documents.azure.com:443/"
```

## Applying Components

Apply a component YAML to Kubernetes with kubectl or place files in the components directory for self-hosted mode:

```bash
# Kubernetes
kubectl apply -f statestore.yaml -n dapr-demo

# Self-hosted (default components directory)
cp statestore.yaml ~/.dapr/components/
```

## Summary

Dapr component YAML files follow a Kubernetes-style schema with `apiVersion`, `kind`, `metadata`, and `spec` sections. The `spec.metadata` array holds component-specific key-value configuration, secrets can be referenced via `secretKeyRef`, and the `scopes` array restricts which applications can use each component.
