# How to Define a Dapr Component YAML File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, YAML, Configuration, Infrastructure

Description: Learn how to write a Dapr component YAML file including apiVersion, kind, metadata, spec, auth, and scopes fields with real examples for all major component types.

---

## Component YAML Structure

Every Dapr component follows the same YAML schema. Understanding each field lets you define any component type correctly.

```yaml
apiVersion: dapr.io/v1alpha1        # always this version
kind: Component                      # always Component
metadata:
  name: <component-name>             # name used in API calls
  namespace: default                 # K8s namespace (omit in self-hosted)
  annotations:                       # optional annotations
    example.com/team: "platform"
spec:
  type: <building-block>.<provider>  # e.g. state.redis, pubsub.kafka
  version: v1                        # component implementation version
  ignoreErrors: false                # don't fail sidecar if component fails to load
  initTimeout: 5s                    # timeout for component initialization
  metadata:                          # component-specific configuration
  - name: <key>
    value: <value>
  - name: <secret-key>
    secretKeyRef:
      name: <k8s-secret-name>        # Kubernetes secret name
      key: <k8s-secret-key>          # key within the secret
  - name: <env-key>
    envRef: <ENV_VAR_NAME>           # read from environment variable
auth:
  secretStore: <secret-store-name>   # which secret store to use for secretKeyRef
scopes:
- app-id-1                           # restrict to specific app IDs
- app-id-2
```

## Metadata Value Types

### Plain value

```yaml
metadata:
- name: redisHost
  value: localhost:6379
```

### Secret reference

```yaml
metadata:
- name: redisPassword
  secretKeyRef:
    name: redis-secret      # Kubernetes Secret or secret store key
    key: password
auth:
  secretStore: kubernetes   # which store to resolve the secret from
```

### Environment variable reference

```yaml
metadata:
- name: connectionString
  envRef: POSTGRES_CONN_STRING
```

## State Store Component Examples

### Redis

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
    value: redis:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "false"
  - name: maxRetries
    value: "3"
  - name: actorStateStore
    value: "true"
auth:
  secretStore: kubernetes
```

### PostgreSQL

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-store
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-secret
      key: conn
  - name: tablePrefix
    value: dapr_state
  - name: cleanupInterval
    value: "10m"
auth:
  secretStore: kubernetes
```

### Azure CosmosDB

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cosmosdb-store
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: https://myaccount.documents.azure.com:443/
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: key
  - name: database
    value: orders
  - name: collection
    value: state
auth:
  secretStore: kubernetes
```

## Pub/Sub Component Examples

### Kafka

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
    value: kafka-broker-1:9092,kafka-broker-2:9092
  - name: consumerGroup
    value: my-consumer-group
  - name: authType
    value: mtls
  - name: caCert
    secretKeyRef:
      name: kafka-certs
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: kafka-certs
      key: client.crt
  - name: clientKey
    secretKeyRef:
      name: kafka-certs
      key: client.key
auth:
  secretStore: kubernetes
```

### Azure Service Bus

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: asb-secret
      key: connection-string
  - name: maxConcurrentHandlers
    value: "10"
  - name: maxActiveMessages
    value: "20"
auth:
  secretStore: kubernetes
```

## Binding Component Examples

### Input: Cron

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: every-hour
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "0 * * * *"
  - name: direction
    value: input
```

### Output: AWS S3

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: report-bucket
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: my-reports
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-secret
      key: access-key
  - name: secretKey
    secretKeyRef:
      name: aws-secret
      key: secret-key
auth:
  secretStore: kubernetes
```

## Secret Store Component Examples

### HashiCorp Vault

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: https://vault.example.com:8200
  - name: vaultToken
    secretKeyRef:
      name: vault-token-secret
      key: token
  - name: vaultKVPrefix
    value: secret
  - name: skipVerify
    value: "false"
auth:
  secretStore: kubernetes   # bootstrap: read vault token from k8s secret
```

## Component Version Field

The `version` field refers to the component plugin version, not the Dapr runtime version. Most components use `v1`. Check the Dapr documentation for each component type to confirm the correct version:

```yaml
spec:
  type: state.redis
  version: v1      # Redis state store v1

spec:
  type: state.postgresql
  version: v2      # PostgreSQL state store v2 (different schema from v1)
```

## ignoreErrors and initTimeout

```yaml
spec:
  type: state.redis
  version: v1
  ignoreErrors: true    # sidecar continues startup even if Redis is unreachable
  initTimeout: 10s      # wait up to 10s for the component to initialize
```

Use `ignoreErrors: true` when a component is optional (e.g., a caching layer).

## Scopes Field

```yaml
scopes:
- order-service
- payment-service
```

Only these two app IDs can use this component. All other apps in the namespace receive a "component not found" error.

## Summary

A Dapr component YAML file always uses `apiVersion: dapr.io/v1alpha1` and `kind: Component`. The `spec.type` identifies the building block and provider. The `metadata` section holds component-specific configuration using plain values, secret references, or environment variable references. The `auth.secretStore` field tells the sidecar where to resolve secret references. The `scopes` field restricts which app IDs can use the component.
