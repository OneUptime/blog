# How to Manage Dapr Secrets with External Secrets Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, External Secrets Operator, Kubernetes, Security

Description: Integrate External Secrets Operator with Dapr to sync secrets from AWS Secrets Manager, Vault, or Azure Key Vault into Kubernetes for use in Dapr components.

---

## The Challenge of Dapr Secrets

Dapr components reference Kubernetes secrets for sensitive configuration like passwords and API keys. While Dapr has a built-in secret store API, many teams already use centralized secret management solutions. External Secrets Operator (ESO) bridges the gap by syncing secrets from external vaults into Kubernetes, where Dapr components can reference them.

## Installing External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

## Configuring a SecretStore for AWS Secrets Manager

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

Apply IRSA annotation to the service account:

```bash
kubectl annotate serviceaccount external-secrets-sa \
  -n default \
  eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/external-secrets-role
```

## Syncing Redis Credentials for Dapr

Create an ExternalSecret that pulls Redis credentials and creates a Kubernetes secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dapr-redis-secret
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: redis-secret
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: prod/redis/dapr
        property: password
    - secretKey: host
      remoteRef:
        key: prod/redis/dapr
        property: host
```

## Dapr Component Using the Synced Secret

```yaml
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
      secretKeyRef:
        name: redis-secret
        key: host
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Using HashiCorp Vault as the Source

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.prod.internal"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "dapr-role"
          serviceAccountRef:
            name: default
            namespace: default
```

Sync a Kafka password for a Dapr pub/sub component:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dapr-kafka-secret
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: kafka-secret
  data:
    - secretKey: password
      remoteRef:
        key: kafka/dapr
        property: password
```

## Verifying Secret Sync

```bash
# Check ExternalSecret status
kubectl get externalsecrets -n default

# Describe to see sync status
kubectl describe externalsecret dapr-redis-secret

# Verify the Kubernetes secret was created
kubectl get secret redis-secret -n default
```

## Summary

External Secrets Operator provides a Kubernetes-native bridge between centralized secret managers and Dapr components. By using ESO to sync secrets from AWS Secrets Manager or HashiCorp Vault into Kubernetes secrets, Dapr components can reference them without storing sensitive values in YAML files or Git repositories, maintaining a clean secret rotation workflow.
