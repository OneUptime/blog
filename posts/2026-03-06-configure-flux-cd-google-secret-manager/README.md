# How to Configure Flux CD with Google Secret Manager

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, google cloud, secret manager, external secrets operator, gitops, kubernetes, workload identity, security

Description: A step-by-step guide to integrating Flux CD with Google Secret Manager using External Secrets Operator for automated secret synchronization in Kubernetes.

---

## Introduction

Google Secret Manager is a fully managed service for storing and accessing secrets such as API keys, database passwords, and TLS certificates. When combined with the External Secrets Operator (ESO) and Flux CD, you can build a GitOps workflow where secret references are stored in Git but the actual secret values are securely fetched from Google Secret Manager at runtime.

This guide covers deploying the External Secrets Operator via Flux CD, configuring SecretStore resources for Google Secret Manager, and setting up automated secret synchronization using Workload Identity.

## Prerequisites

- A GKE cluster with Flux CD installed and Workload Identity enabled
- gcloud CLI installed and configured
- kubectl and Flux CLI installed
- Google Cloud project with Secret Manager API enabled

## Step 1: Enable Secret Manager API and Create Secrets

Set up Google Secret Manager and create initial secrets.

```bash
# Set environment variables
export PROJECT_ID=$(gcloud config get-value project)

# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets in Google Secret Manager
gcloud secrets create database-password \
  --replication-policy="automatic"

# Add a secret version (the actual value)
echo -n "super-secret-db-password" | \
  gcloud secrets versions add database-password --data-file=-

# Create additional secrets
gcloud secrets create api-key \
  --replication-policy="automatic"
echo -n "sk-api-key-1234567890" | \
  gcloud secrets versions add api-key --data-file=-

gcloud secrets create redis-url \
  --replication-policy="automatic"
echo -n "redis://10.0.1.50:6379/0" | \
  gcloud secrets versions add redis-url --data-file=-

# List all secrets
gcloud secrets list

# Verify a secret value
gcloud secrets versions access latest --secret=database-password
```

## Step 2: Configure Workload Identity for Secret Manager Access

Set up Workload Identity to allow the External Secrets Operator to access Google Secret Manager.

```bash
# Create a Google Service Account for ESO
gcloud iam service-accounts create eso-secret-reader \
  --display-name "External Secrets Operator Reader"

# Grant Secret Manager accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:eso-secret-reader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Create the Workload Identity binding for the ESO service account
# The ESO controller runs in the external-secrets namespace
gcloud iam service-accounts add-iam-policy-binding \
  eso-secret-reader@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[external-secrets/external-secrets]" \
  --role="roles/iam.workloadIdentityUser"
```

## Step 3: Deploy External Secrets Operator via Flux

Install the External Secrets Operator using Flux Helm releases.

```yaml
# helm-repo-eso.yaml
# Adds the External Secrets Operator Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
---
# helm-release-eso.yaml
# Deploys External Secrets Operator via Helm
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: external-secrets
  install:
    createNamespace: true
  chart:
    spec:
      chart: external-secrets
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
  values:
    # Configure the service account for Workload Identity
    serviceAccount:
      annotations:
        iam.gke.io/gcp-service-account: eso-secret-reader@PROJECT_ID.iam.gserviceaccount.com
    # Install CRDs with the chart
    installCRDs: true
    # Configure webhook for validation
    webhook:
      port: 9443
```

## Step 4: Configure ClusterSecretStore for Google Secret Manager

Create a ClusterSecretStore that connects to Google Secret Manager.

```yaml
# cluster-secret-store.yaml
# Configures ESO to use Google Secret Manager as the secret backend
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      # The GCP project that contains the secrets
      projectID: PROJECT_ID
      auth:
        # Use Workload Identity for authentication (no static credentials)
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: flux-gke-cluster
          clusterProjectID: PROJECT_ID
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

Alternatively, create a namespace-scoped SecretStore:

```yaml
# secret-store-production.yaml
# Namespace-scoped SecretStore for the production namespace
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-manager
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: PROJECT_ID
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: flux-gke-cluster
          clusterProjectID: PROJECT_ID
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 5: Create ExternalSecret Resources

Define ExternalSecret resources that map Google Secret Manager secrets to Kubernetes secrets.

```yaml
# external-secret-database.yaml
# Syncs database credentials from Google Secret Manager to Kubernetes
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  # How often to sync the secret from Google Secret Manager
  refreshInterval: 5m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  # The Kubernetes secret that will be created
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        # Template the secret data with values from Secret Manager
        DB_HOST: "{{ .db_host }}"
        DB_PORT: "{{ .db_port }}"
        DB_PASSWORD: "{{ .db_password }}"
        # Construct a connection string from multiple secrets
        DATABASE_URL: "postgresql://app:{{ .db_password }}@{{ .db_host }}:{{ .db_port }}/myapp"
  data:
    # Map each key to a Google Secret Manager secret
    - secretKey: db_password
      remoteRef:
        key: database-password
        version: latest
    - secretKey: db_host
      remoteRef:
        key: database-host
        version: latest
    - secretKey: db_port
      remoteRef:
        key: database-port
        version: latest
```

```yaml
# external-secret-api-keys.yaml
# Syncs API keys from Google Secret Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 10m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  data:
    - secretKey: API_KEY
      remoteRef:
        key: api-key
        version: latest
    - secretKey: REDIS_URL
      remoteRef:
        key: redis-url
        version: latest
```

## Step 6: Use Find Pattern to Sync Multiple Secrets

Sync multiple secrets at once using the find pattern.

```yaml
# external-secret-bulk.yaml
# Syncs all secrets matching a pattern from Google Secret Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: all-app-secrets
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  dataFrom:
    # Find all secrets matching a naming pattern
    - find:
        name:
          # Regex to match secrets prefixed with "app-"
          regexp: "^app-.*"
        tags:
          # Optionally filter by labels
          environment: production
```

## Step 7: Configure Flux Kustomization for External Secrets

Organize the External Secrets resources under Flux Kustomizations.

```yaml
# kustomization-eso.yaml
# Deploys ESO infrastructure (operator and stores)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: external-secrets-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/external-secrets
  prune: true
  wait: true
  timeout: 5m
---
# kustomization-secret-stores.yaml
# Deploys SecretStore configurations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secret-stores
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/secret-stores
  prune: true
  dependsOn:
    - name: external-secrets-operator
---
# kustomization-app-secrets.yaml
# Deploys ExternalSecret resources for applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./secrets/production
  prune: true
  dependsOn:
    - name: secret-stores
```

## Step 8: Configure Secret Rotation

Set up automatic secret rotation with Google Secret Manager and ESO.

```bash
# Enable automatic rotation for a secret
gcloud secrets update database-password \
  --add-rotation \
  --rotation-period=30d \
  --next-rotation-time=$(date -u -d "+30 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+30d +%Y-%m-%dT%H:%M:%SZ)

# Create a Cloud Function for secret rotation logic
# The function generates a new password and updates the database
```

```yaml
# external-secret-with-rotation.yaml
# ExternalSecret that tracks the latest version for automatic rotation
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-credentials
  namespace: production
spec:
  # Refresh every minute to pick up rotated secrets quickly
  refreshInterval: 1m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: rotating-credentials
    creationPolicy: Owner
    # Delete the K8s secret if the ExternalSecret is deleted
    deletionPolicy: Delete
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: database-password
        # Always use the latest version to pick up rotations
        version: latest
```

## Step 9: Set Up Monitoring and Alerts

Monitor External Secrets synchronization status.

```yaml
# alert-external-secrets.yaml
# Flux alert for ExternalSecret sync failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: external-secrets-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: app-secrets
    - kind: HelmRelease
      name: external-secrets
  summary: "External Secrets synchronization issue"
```

```bash
# Check ExternalSecret sync status
kubectl get externalsecrets -A

# Check for sync errors
kubectl get externalsecrets -n production -o wide

# View detailed status of an ExternalSecret
kubectl describe externalsecret database-credentials -n production

# Check the ESO controller logs
kubectl logs -n external-secrets deploy/external-secrets --tail=50
```

## Step 10: Alternative Authentication with Service Account Key

If Workload Identity is not available, use a static service account key.

```bash
# Create a service account key
gcloud iam service-accounts keys create eso-key.json \
  --iam-account=eso-secret-reader@${PROJECT_ID}.iam.gserviceaccount.com

# Create a Kubernetes secret with the key
kubectl create secret generic gcp-sm-credentials \
  --namespace external-secrets \
  --from-file=secret-access-credentials=eso-key.json

# Clean up
rm eso-key.json
```

```yaml
# cluster-secret-store-with-key.yaml
# Uses a static service account key instead of Workload Identity
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: PROJECT_ID
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcp-sm-credentials
            namespace: external-secrets
            key: secret-access-credentials
```

## Troubleshooting

### ExternalSecret Not Syncing

```bash
# Check the ExternalSecret status
kubectl get externalsecret -n production database-credentials -o yaml

# Look for condition messages
kubectl get externalsecret -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[*].message}{"\n"}{end}'

# Force a refresh
kubectl annotate externalsecret database-credentials \
  -n production \
  force-sync=$(date +%s) --overwrite
```

### SecretStore Connection Failures

```bash
# Validate the SecretStore
kubectl get secretstore -n production -o wide
kubectl get clustersecretstore -o wide

# Check ESO controller logs for auth errors
kubectl logs -n external-secrets deploy/external-secrets | grep -i "error\|auth\|permission"

# Verify IAM bindings
gcloud secrets get-iam-policy database-password
```

### Workload Identity Issues

```bash
# Verify the ESO service account annotation
kubectl get sa external-secrets -n external-secrets -o yaml | grep gcp-service-account

# Test Secret Manager access from a debug pod
kubectl run sm-test --rm -it \
  --image=google/cloud-sdk:slim \
  --namespace=external-secrets \
  --serviceaccount=external-secrets \
  -- gcloud secrets versions access latest --secret=database-password
```

## Summary

In this guide, you configured Flux CD with Google Secret Manager using the External Secrets Operator. You deployed ESO via Flux Helm releases, configured SecretStore resources with Workload Identity authentication, created ExternalSecret resources that synchronize secrets from Google Secret Manager to Kubernetes, set up secret rotation and monitoring, and organized everything under Flux Kustomizations with proper dependencies. This approach keeps secret values out of Git while maintaining a GitOps workflow where secret references and configurations are version-controlled.
