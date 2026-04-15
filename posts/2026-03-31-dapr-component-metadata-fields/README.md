# How to Use Dapr Component Metadata Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Metadata, Secret, Configuration

Description: Learn how to use Dapr component metadata fields to configure state stores, pub/sub brokers, and bindings with static values and Kubernetes secrets.

---

## What Are Dapr Component Metadata Fields?

Every Dapr component has a `metadata` array under `spec`. Each item is a key-value pair that configures the underlying infrastructure (Redis, Kafka, PostgreSQL, etc.). Values can be literal strings, environment variables, or references to Kubernetes secrets.

## Literal Value Metadata

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-state
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master.redis:6379"
    - name: redisDB
      value: "0"
    - name: enableTLS
      value: "false"
    - name: maxRetries
      value: "3"
```

## Secret Reference Metadata

For sensitive values, reference a Kubernetes secret:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master.redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-credentials
        key: password
auth:
  secretStore: kubernetes
```

Create the secret before applying the component:

```bash
kubectl create secret generic redis-credentials \
  --from-literal=password=supersecret \
  -n production
```

## Environment Variable Metadata

For local development, use the `secretstores.local.env` secret store to read values from environment variables:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-envvar-store
spec:
  type: secretstores.local.env
  version: v1
  metadata: []
```

Then reference environment variables via `secretKeyRef` in your component:

```yaml
metadata:
  - name: connectionString
    secretKeyRef:
      name: POSTGRES_CONNECTION_STRING
      key: POSTGRES_CONNECTION_STRING
auth:
  secretStore: local-envvar-store
```

## Metadata for Pub/Sub Components

Kafka pub/sub uses a richer metadata set:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka-0.kafka:9092,kafka-1.kafka:9092"
    - name: consumerGroup
      value: "order-consumers"
    - name: authType
      value: "password"
    - name: saslUsername
      value: "dapr"
    - name: saslPassword
      secretKeyRef:
        name: kafka-secret
        key: password
    - name: maxMessageBytes
      value: "1048576"
```

## Common Boolean and Integer Fields

Dapr metadata fields are always strings - even booleans and numbers:

```yaml
metadata:
  - name: enableTLS
    value: "true"        # string "true", not boolean
  - name: ttlInSeconds
    value: "3600"        # string "3600", not integer
  - name: replicationFactor
    value: "3"
```

## Viewing Available Metadata Fields

Check the official component docs or the component spec in the registry:

```bash
# Inspect component metadata in a running cluster
kubectl get component redis-state -n production -o jsonpath='{.spec.metadata}'
```

## Summary

Dapr component metadata fields are the bridge between your YAML specification and the underlying infrastructure. Using secret references for credentials, literal strings for configuration, and the correct string types for booleans and integers keeps your components secure, readable, and consistent across environments.
