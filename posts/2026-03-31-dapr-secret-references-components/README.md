# How to Use Secret References in Dapr Component Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Component, Secret Reference, Configuration

Description: Replace hardcoded credentials in Dapr component YAML files with secret references that fetch values from a configured secret store at runtime.

---

Dapr components often require credentials - Redis passwords, database connection strings, API keys. Hardcoding these values in component YAML is a security risk. Dapr supports secret references that pull values from a secret store at component initialization time.

## The Problem with Hardcoded Values

```yaml
# BAD: credentials in plain text
spec:
  type: state.redis
  metadata:
  - name: redisPassword
    value: "my-redis-password-123"  # Exposed in version control
```

## Using secretKeyRef

Replace the `value` field with `secretKeyRef`:

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
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials     # Name of the secret in the store
      key: password               # Key within the secret
```

Dapr fetches `redis-credentials[password]` from the configured `auth.secretStore` and substitutes it at startup.

## Specifying the Secret Store for Component Auth

Point the component to a specific secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: kubernetes   # Use this store for secretKeyRef lookups
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
```

## Kubernetes Secret Store (Most Common)

Create the Kubernetes secret first:

```bash
kubectl create secret generic redis-credentials \
  --from-literal=password=my-redis-password-123 \
  --namespace default
```

Then reference it in the component:

```yaml
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: kubernetes
  metadata:
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
```

## HashiCorp Vault Example

Store the secret in Vault:

```bash
vault kv put secret/redis-credentials password="my-redis-password-123"
```

Reference it in the component:

```yaml
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: vault-store
  metadata:
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
```

## Multiple Secret References in One Component

A pub/sub component with both broker hostname and credentials from secrets:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.rabbitmq
  version: v1
  auth:
    secretStore: kubernetes
  metadata:
  - name: hostname
    secretKeyRef:
      name: rabbitmq-connection
      key: hostname
  - name: username
    secretKeyRef:
      name: rabbitmq-connection
      key: username
  - name: password
    secretKeyRef:
      name: rabbitmq-connection
      key: password
```

Create the combined secret:

```bash
kubectl create secret generic rabbitmq-connection \
  --from-literal=hostname=rabbitmq:5672 \
  --from-literal=username=myapp \
  --from-literal=password=rabbitmq-secret-password
```

## Verifying Secret References Are Working

Check Dapr sidecar logs for component initialization:

```bash
kubectl logs -l app=my-service -c daprd | grep "component loaded"
# level=info msg="component loaded. name: statestore, type: state.redis/v1"
```

If the secret reference fails, you see:

```text
level=error msg="error loading components: secret redis-credentials not found"
```

## Summary

Dapr secret references in component definitions eliminate hardcoded credentials from YAML files and version control. By replacing `value` with `secretKeyRef`, Dapr fetches credentials from a configured secret store at startup, supporting rotation without component YAML changes. This pattern works identically with Kubernetes secrets, HashiCorp Vault, AWS Secrets Manager, and other Dapr-supported secret backends.
