# How to Use Secret References in Dapr State Store Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Secret, Security, Kubernetes

Description: Learn how to use Dapr secret references in state store component definitions to avoid hardcoding credentials in your YAML configuration files.

---

## The Problem with Hardcoded Credentials

Embedding passwords or connection strings directly in Dapr component YAML files is a security risk. These files often end up in version control or are visible to anyone with kubectl access. Dapr solves this by allowing component metadata values to reference secrets from a configured secret store.

## Setting Up a Kubernetes Secret Store

The simplest approach on Kubernetes is to use the built-in `secretstores.kubernetes` component, which reads from Kubernetes Secrets:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
  namespace: production
spec:
  type: secretstores.kubernetes
  version: v1
```

This component is available by default - you do not need to deploy anything extra.

## Creating a Kubernetes Secret

Store your credentials as a standard Kubernetes Secret:

```bash
kubectl create secret generic redis-secret \
  --from-literal=password=my-super-secret-password \
  -n production
```

Or using a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: production
type: Opaque
stringData:
  password: my-super-secret-password
```

## Referencing the Secret in a State Store Component

Use `secretKeyRef` in the component metadata to point to the Kubernetes Secret:

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
    value: redis-master.production.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
auth:
  secretStore: kubernetes-secrets
```

The `auth.secretStore` field tells Dapr which secret store to query when resolving `secretKeyRef` values.

## Using Azure Key Vault as the Secret Store

For Azure-based deployments, you can reference secrets from Azure Key Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
  namespace: production
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: my-keyvault
  - name: azureTenantId
    value: "your-tenant-id"
  - name: azureClientId
    value: "your-client-id"
  - name: azureClientSecret
    secretKeyRef:
      name: akv-client-secret
      key: clientSecret
```

Then reference Key Vault secrets in your PostgreSQL state store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pg-statestore
  namespace: production
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-connection-string
      key: connstr
auth:
  secretStore: azurekeyvault
```

## Verifying the Configuration

After applying the components, check that Dapr loaded them without errors:

```bash
kubectl get components -n production
kubectl describe component statestore -n production
```

Look for any events that indicate a secret resolution failure. If you see errors, verify that the Dapr sidecar has RBAC permission to read the Kubernetes Secret:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["redis-secret"]
```

## Summary

Dapr secret references allow you to decouple credentials from component definitions by pointing to entries in a configured secret store. Using Kubernetes Secrets or an external vault like Azure Key Vault, you keep sensitive values out of your YAML files and version control while giving Dapr the access it needs at runtime.
