# How to Configure External Secrets Operator in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, External Secrets, Security, Vault, AWS Secrets Manager

Description: Deploy the External Secrets Operator in Rancher to synchronize secrets from Vault, AWS Secrets Manager, and other backends into Kubernetes secrets automatically.

## Introduction

The External Secrets Operator (ESO) bridges external secret management systems (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, Azure Key Vault) with Kubernetes secrets. Instead of manually creating Kubernetes secrets or storing them in Git, ESO automatically syncs secrets from your central secrets management system and keeps them up-to-date. This guide covers deploying ESO on Rancher and configuring multiple backends.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- One of: AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, or Azure Key Vault
- kubectl access

## Step 1: Install External Secrets Operator

```bash
# Add External Secrets Helm repository

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --wait

# Verify installation
kubectl get pods -n external-secrets
kubectl get crd | grep external-secrets.io
```

## Step 2: Configure AWS Secrets Manager Backend

```yaml
# aws-secretstore.yaml - ClusterSecretStore for AWS Secrets Manager
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
        # Use IRSA (IAM Roles for Service Accounts) - recommended for EKS
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

```bash
# Create IAM service account for ESO (EKS)
eksctl create iamserviceaccount \
  --name external-secrets-sa \
  --namespace external-secrets \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve
```

Create a secret in AWS Secrets Manager:

```bash
# Store a database secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "production/database/credentials" \
  --secret-string '{"username": "dbuser", "password": "SecureP@ss123", "host": "db.example.com"}'
```

Create an ExternalSecret to sync it:

```yaml
# db-secret.yaml - Sync database credentials from AWS
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  # Refresh every hour
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        # Map specific fields from the secret
        DB_HOST: "{{ .host }}"
        DB_USER: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
  data:
    - secretKey: host
      remoteRef:
        key: production/database/credentials
        property: host
    - secretKey: username
      remoteRef:
        key: production/database/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: production/database/credentials
        property: password
```

## Step 3: Configure HashiCorp Vault Backend

```bash
# Enable Kubernetes authentication in Vault
vault auth enable kubernetes

# Export the cluster CA certificate from your kubeconfig
kubectl config view --raw --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 --decode > ca.crt

# Allow the ESO service account to use the TokenReview API
kubectl create clusterrolebinding external-secrets-sa-tokenreview \
  --clusterrole=system:auth-delegator \
  --serviceaccount=external-secrets:external-secrets-sa

# Configure Kubernetes auth (Vault will use the caller's JWT for TokenReview)
vault write auth/kubernetes/config \
  kubernetes_host="$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}')" \
  kubernetes_ca_cert=@ca.crt

# Create a Vault policy
vault policy write external-secrets - << 'EOF'
path "secret/data/production/*" {
  capabilities = ["read"]
}
path "secret/metadata/production/*" {
  capabilities = ["list", "read"]
}
EOF

# Create a Vault role for ESO
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets-sa \
  bound_service_account_namespaces=external-secrets \
  audience=vault \
  policies=external-secrets \
  ttl=1h
```

```yaml
# vault-secretstore.yaml - ClusterSecretStore for HashiCorp Vault
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
            audiences:
              - vault
```

Create secrets in Vault:

```bash
# Store secrets in Vault
vault kv put secret/production/api-keys \
  stripe_key="sk_live_xxxx" \
  sendgrid_key="SG.xxxx"
```

```yaml
# api-keys-secret.yaml - Sync API keys from Vault
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  data:
    - secretKey: STRIPE_API_KEY
      remoteRef:
        key: production/api-keys
        property: stripe_key
    - secretKey: SENDGRID_API_KEY
      remoteRef:
        key: production/api-keys
        property: sendgrid_key
```

## Step 4: Create Namespace-Scoped SecretStore

```bash
# Create a service account for the production namespace
kubectl create serviceaccount production-service-account -n production

# Allow the production service account to use the TokenReview API
kubectl create clusterrolebinding production-service-account-tokenreview \
  --clusterrole=system:auth-delegator \
  --serviceaccount=production:production-service-account

# Create a Vault role for the production namespace
vault write auth/kubernetes/role/production \
  bound_service_account_names=production-service-account \
  bound_service_account_namespaces=production \
  audience=vault \
  policies=external-secrets \
  ttl=1h
```

```yaml
# namespace-secretstore.yaml - Namespace-scoped secret store
apiVersion: external-secrets.io/v1
kind: SecretStore
metadata:
  name: vault-production
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "production"
          serviceAccountRef:
            name: production-service-account
            audiences:
              - vault
```

## Step 5: Sync an Entire Secret Path

```yaml
# sync-all-secrets.yaml - Sync all secrets from a Vault path
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: all-production-secrets
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: all-production-secrets
    creationPolicy: Owner
  # Sync all key-value pairs from this path
  dataFrom:
    - extract:
        key: production/app-config
    - extract:
        key: production/database
```

## Step 6: Monitor External Secrets

```bash
# Check ExternalSecret status
kubectl get externalsecret -n production

# Check if secret is synced
kubectl describe externalsecret database-credentials -n production | tail -20

# Check for sync errors
kubectl get externalsecret -n production -o jsonpath='{range .items[*]}{.metadata.name}: {.status.conditions[0].message}{"\n"}{end}'

# Force a refresh
kubectl annotate externalsecret database-credentials \
  -n production \
  force-sync=$(date +%s) \
  --overwrite
```

## Step 7: Registry Credentials from External Secrets

```yaml
# registry-secret.yaml - Registry credentials from Vault
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: registry-credentials
  namespace: production
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: registry-credentials
    creationPolicy: Owner
    template:
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: |
          {
            "auths": {
              "registry.example.com": {
                "username": "{{ .username }}",
                "password": "{{ .password }}",
                "auth": "{{ printf "%s:%s" .username .password | b64enc }}"
              }
            }
          }
  data:
    - secretKey: username
      remoteRef:
        key: production/registry
        property: username
    - secretKey: password
      remoteRef:
        key: production/registry
        property: password
```

## Conclusion

The External Secrets Operator is essential for secure secret management in Rancher environments. It eliminates the need to store secrets in Git or manually manage Kubernetes secrets, instead keeping them in a centralized, audited secrets management system. The automatic refresh mechanism ensures that rotated secrets are propagated to Kubernetes Secrets without manual intervention. For production deployments, use IRSA on EKS or Workload Identity on GKE to avoid long-lived credentials for the ESO itself.
