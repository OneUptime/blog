# How to Use External Secrets Operator with Portainer on Kubernetes (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, External Secrets, HashiCorp Vault, AWS Secrets Manager

Description: Deploy and configure the External Secrets Operator on Kubernetes to sync secrets from external providers like AWS Secrets Manager or Vault into Kubernetes Secrets managed by Portainer.

## Introduction

The External Secrets Operator (ESO) is a Kubernetes operator that integrates with external secret management systems (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.) and automatically creates Kubernetes Secrets from external data. Portainer manages the workloads that consume these secrets.

## Prerequisites

- Kubernetes cluster managed by Portainer
- External secrets source (AWS Secrets Manager, Vault, GCP Secret Manager, etc.)
- Helm 3 installed

## Step 1: Install External Secrets Operator

```bash
# Add ESO Helm repository

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl -n external-secrets get pods
kubectl get crd | grep external-secrets.io
```

## Step 2: Configure AWS Secrets Manager Backend

```bash
# Create AWS credentials secret
kubectl create secret generic aws-credentials \
  --namespace external-secrets \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Create a ClusterSecretStore pointing to AWS
cat << 'EOF' | kubectl apply -f -
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
EOF
```

## Step 3: Configure HashiCorp Vault Backend

```bash
# Create Vault token secret
kubectl create secret generic vault-token \
  --namespace external-secrets \
  --from-literal=token=hvs.YOUR_VAULT_TOKEN

# Create ClusterSecretStore for Vault
cat << 'EOF' | kubectl apply -f -
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: http://vault.vault-system.svc.cluster.local:8200
      path: portainer
      version: v2
      auth:
        tokenSecretRef:
          name: vault-token
          namespace: external-secrets
          key: token
EOF
```

## Step 4: Create ExternalSecret Resources

```yaml
# external-secret-app.yml - sync secrets for myapp
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  refreshInterval: 1h  # How often to sync from external store
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: myapp-secrets  # Name of the K8s Secret to create
    creationPolicy: Owner
  data:
  # Sync individual keys from AWS Secrets Manager
  - secretKey: db_password
    remoteRef:
      key: production/myapp/database
      property: password
  - secretKey: api_key
    remoteRef:
      key: production/myapp/api
      property: key
  dataFrom:
  # Sync all keys from a single secret
  - extract:
      key: production/myapp/config
```

## Step 5: Use Synced Secrets in Portainer-Managed Workloads

The ESO creates standard Kubernetes Secrets, which Portainer can see and workloads can consume. Workloads that mount the Secret as a volume can observe refreshed values, while environment variables require a pod restart to pick up secret updates:

```yaml
# Deploy via Portainer's Kubernetes interface
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        # Reference secrets synced by ESO
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-secrets  # Created by ExternalSecret
              key: db_password
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: api_key
        volumeMounts:
        - name: config-secrets
          mountPath: /app/secrets
          readOnly: true
      volumes:
      - name: config-secrets
        secret:
          secretName: myapp-secrets
```

## Step 6: Monitor Secret Syncing

```bash
# Check the synced Secret in Portainer
# ConfigMaps & Secrets > Secrets > myapp-secrets

# Via kubectl
kubectl get externalsecrets -n production
kubectl describe externalsecret myapp-secrets -n production

# Watch the ExternalSecret status
kubectl get externalsecrets myapp-secrets -n production -w
```

## Automatic Secret Rotation

```yaml
# Configure frequent syncing for secrets rotated in Vault's KV engine
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 15m  # Sync every 15 minutes after the external secret is rotated
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Transform the secret data as needed
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@db:5432/myapp"
  data:
  - secretKey: username
    remoteRef:
      key: database/myapp
      property: username
  - secretKey: password
    remoteRef:
      key: database/myapp
      property: password
```

## Conclusion

The External Secrets Operator bridges external secret management systems with Kubernetes, creating standard Kubernetes Secrets that Portainer-managed workloads consume using normal Kubernetes Secret references. This approach provides the best of both worlds: enterprise-grade secret management with centralized control and audit logging, combined with Portainer's intuitive deployment and management interface.
