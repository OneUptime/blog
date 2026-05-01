# How to Use External Secrets Operator with Portainer on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, External Secrets Operator, Secret, AWS, DevOps

Description: Learn how to deploy and configure the External Secrets Operator on Kubernetes via Portainer to sync secrets from external providers like AWS Secrets Manager or Vault.

---

The External Secrets Operator (ESO) is a Kubernetes operator that reads secrets from external systems (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, GCP Secret Manager) and creates Kubernetes Secrets from them automatically. This guide shows how to deploy ESO via Portainer and configure it to sync secrets into Kubernetes for your workloads.

---

## How External Secrets Operator Works

```mermaid
graph LR
    A[AWS Secrets Manager / Vault / Azure KV] --> B[External Secrets Operator]
    B -->|Creates/Syncs| C[Kubernetes Secret]
    C --> D[Pod Environment Variables]
    C --> E[Pod Volume Mounts]
```

---

## Step 1: Deploy External Secrets Operator via Portainer

In Portainer's Kubernetes environment, deploy ESO using Helm or the manifest.

```bash
# Add the External Secrets Helm repository

helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO via Helm
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

Or deploy via Portainer's Helm interface:
1. If needed, add `https://charts.external-secrets.io` under **My account > Helm repositories**
2. Go to **Applications > Create from code**
3. Select **Helm chart**, choose the External Secrets chart source, and search for `external-secrets`
4. Install with namespace `external-secrets`

---

## Step 2: Create a SecretStore for AWS Secrets Manager

A `SecretStore` tells ESO how to authenticate with your external secrets provider.

```yaml
# aws-secret-store.yaml - connect to AWS Secrets Manager
apiVersion: external-secrets.io/v1
kind: SecretStore
metadata:
  name: aws-secret-store
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          # Reference a Kubernetes secret containing AWS credentials
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
```

```bash
# Create the Kubernetes secret with AWS credentials
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n default

# Apply the SecretStore
kubectl apply -f aws-secret-store.yaml
```

---

## Step 3: Create an ExternalSecret

An `ExternalSecret` tells ESO which secret to fetch and what Kubernetes secret to create.

```yaml
# app-external-secret.yaml - sync secrets from AWS to Kubernetes
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: default
spec:
  refreshInterval: 1h          # how often to re-sync from the external store
  secretStoreRef:
    name: aws-secret-store
    kind: SecretStore
  target:
    name: myapp-k8s-secret     # name of the Kubernetes Secret to create
    creationPolicy: Owner
  data:
    # Map external secret key to Kubernetes secret key
    - secretKey: db-password
      remoteRef:
        key: myapp/production   # path in AWS Secrets Manager
        property: DB_PASSWORD   # key within the secret JSON
    - secretKey: api-key
      remoteRef:
        key: myapp/production
        property: API_KEY
```

```bash
# Apply the ExternalSecret
kubectl apply -f app-external-secret.yaml

# Check sync status
kubectl get externalsecret myapp-secrets
kubectl describe externalsecret myapp-secrets
```

---

## Step 4: Use the Synced Secret in a Portainer Application

Deploy this manifest via Portainer as an application that reads the synced Kubernetes secret.

```yaml
# app-deployment.yaml - deployed via Portainer manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          env:
            # Inject from the Kubernetes secret created by ESO
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-k8s-secret   # created by ExternalSecret
                  key: db-password
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: myapp-k8s-secret
                  key: api-key
```

---

## Step 5: Monitor Secret Sync in Portainer

In Portainer's Kubernetes view:
- **ConfigMaps & Secrets > Secrets** - filter to the `default` namespace to find `myapp-k8s-secret`
- The ESO refreshes the Kubernetes Secret based on `refreshInterval`
- If your application reads the Secret through environment variables, restart the pods to pick up rotated values
- For immediate rotation: `kubectl annotate externalsecret myapp-secrets force-sync=$(date +%s) --overwrite`

---

## Summary

The External Secrets Operator bridges external secrets providers with Kubernetes, automatically creating and refreshing Kubernetes Secrets from your existing secrets infrastructure. Deploy ESO via Portainer's Helm workflow, create a `SecretStore` for your provider, define `ExternalSecret` resources to map external keys to Kubernetes secrets, and reference those secrets in your Portainer-deployed workloads.
