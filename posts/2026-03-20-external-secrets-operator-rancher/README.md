# How to Configure External Secrets Operator in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, External Secrets, Kubernetes Secrets, Vault, AWS Secrets Manager, Security

Description: Install and configure the External Secrets Operator in Rancher to sync secrets from external vaults like AWS Secrets Manager and HashiCorp Vault into Kubernetes Secrets.

## Introduction

Storing secrets directly in Kubernetes poses risks: by default, Secrets are stored unencrypted in etcd unless encryption at rest is enabled, RBAC misconfiguration can expose secrets, and secrets are base64 encoded (not encrypted). The External Secrets Operator (ESO) solves this by syncing secrets from external, dedicated secret stores into Kubernetes Secrets automatically.

## Prerequisites

- Rancher cluster with `helm` and `kubectl`
- An external secret store (AWS Secrets Manager, Vault, GCP Secret Manager, etc.)

## Step 1: Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

## Step 2: Configure AWS Secrets Manager Backend

Create AWS credentials with read access to specific secrets, then configure ESO:

```yaml
# aws-secretstore.yaml

apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials    # Kubernetes Secret with AWS credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
```

```bash
kubectl apply -f aws-secretstore.yaml
```

## Step 3: Create an ExternalSecret

An ExternalSecret defines which external secret to sync and what Kubernetes Secret to create:

```yaml
# database-external-secret.yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h    # Sync every hour

  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore

  target:
    name: database-credentials    # Kubernetes Secret to create
    creationPolicy: Owner

  data:
    - secretKey: DB_PASSWORD       # Key in the Kubernetes Secret
      remoteRef:
        key: /production/myapp/database    # Secret name in AWS Secrets Manager
        property: password                  # JSON field within the secret

    - secretKey: DB_USERNAME
      remoteRef:
        key: /production/myapp/database
        property: username
```

```bash
kubectl apply -f database-external-secret.yaml

# Verify the secret was created
kubectl get secret database-credentials -n production
kubectl describe externalsecret database-credentials -n production
```

## Step 4: Configure HashiCorp Vault Backend

```yaml
# vault-secretstore.yaml
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: http://vault.vault.svc.cluster.local:8200
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets    # Vault role with appropriate policies and audience
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
            audiences:
              - vault
```

```bash
kubectl apply -f vault-secretstore.yaml
```

## Step 5: Use the Secret in a Deployment

```yaml
# Deployment spec using the synced secret
envFrom:
  - secretRef:
      name: database-credentials    # Kubernetes Secret created by ESO
```

## Conclusion

The External Secrets Operator decouples secret management from Kubernetes, enabling you to use dedicated secret stores with proper access controls, audit logging, and automatic rotation. When a secret rotates in AWS Secrets Manager, ESO automatically syncs the new value to the Kubernetes Secret within the configured refresh interval.
