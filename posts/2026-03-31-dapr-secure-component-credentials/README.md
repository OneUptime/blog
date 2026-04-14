# How to Secure Dapr Component Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Secret, Credential, Component

Description: Learn how to secure Dapr component credentials by using secret store references instead of plaintext values in component YAML files.

---

Dapr component files often need connection strings, passwords, and API keys. Storing these as plaintext in YAML files is a serious security risk. Dapr provides a `secretKeyRef` mechanism that pulls credentials from a secret store at runtime.

## The Problem: Plaintext Credentials

Never do this:

```yaml
spec:
  metadata:
  - name: redisPassword
    value: "my-super-secret-password"   # BAD: plaintext credential in YAML
```

## Solution 1: Kubernetes Secrets

Store credentials in Kubernetes Secrets and reference them:

```bash
# Create the Kubernetes secret
kubectl create secret generic redis-credentials \
  --from-literal=password=my-super-secret-password \
  -n default
```

Reference the secret in the component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
auth:
  secretStore: kubernetes
```

## Solution 2: HashiCorp Vault

Configure a Vault secret store first:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secret-store
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultToken
    value: "root"
  - name: vaultKVPrefix
    value: "dapr"
```

Then reference Vault secrets in other components:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: saslUsername
    secretKeyRef:
      name: kafka/credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka/credentials
      key: password
auth:
  secretStore: vault-secret-store
```

## Solution 3: AWS Secrets Manager

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secret-store
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    value: ""
  - name: secretKey
    value: ""
```

## Scoping Secret Store Access

Restrict which apps can access which secrets:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secret-store
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault:8200"
scopes:
- order-service
- payment-service
```

## Verifying Credential Loading

```bash
# Check that Dapr loaded the credentials without errors
kubectl logs deployment/order-service -c daprd | grep -i "component\|secret\|error"

# Test secret retrieval via API
curl http://localhost:3500/v1.0/secrets/vault-secret-store/redis/password
```

## Summary

Always use `secretKeyRef` in Dapr component files to reference credentials from a secret store rather than embedding plaintext values. Kubernetes Secrets, HashiCorp Vault, and cloud-native secret managers are all supported. Combine secret store references with component scoping to enforce least-privilege access to credentials.
