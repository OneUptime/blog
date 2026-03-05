# How to Configure External Secrets with Google Secret Manager in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, External Secrets, Google Secret Manager, GKE, Secrets Management

Description: Learn how to configure the External Secrets Operator with Google Secret Manager in a Flux CD GitOps workflow to sync secrets from GCP into Kubernetes.

---

Google Secret Manager provides a secure and convenient way to store API keys, passwords, certificates, and other sensitive data in Google Cloud. By integrating it with the External Secrets Operator (ESO) and Flux CD, you can reference GCP secrets declaratively in Git and have them automatically synced to your Kubernetes cluster. This guide covers setup with both GKE Workload Identity and service account key authentication.

## Prerequisites

- A Kubernetes cluster (GKE recommended for Workload Identity)
- Flux CD bootstrapped on the cluster
- Google Cloud project with Secret Manager API enabled
- gcloud CLI installed and configured

Enable the Secret Manager API:

```bash
gcloud services enable secretmanager.googleapis.com
```

## Step 1: Install External Secrets Operator with Flux

```yaml
# infrastructure/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

```yaml
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.10.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
```

## Step 2: Configure GCP Authentication

### Option A: GKE Workload Identity (Recommended)

Create a Google service account and bind it to the Kubernetes service account:

```bash
PROJECT_ID=$(gcloud config get-value project)

# Create a GCP service account
gcloud iam service-accounts create external-secrets \
  --display-name="External Secrets Operator"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:external-secrets@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Bind the GCP SA to the Kubernetes SA
gcloud iam service-accounts add-iam-policy-binding \
  external-secrets@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[external-secrets/external-secrets]"
```

Annotate the ESO service account in the HelmRelease values:

```yaml
values:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: external-secrets@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### Option B: Service Account Key

Create a service account key and store it as a Kubernetes Secret:

```bash
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=external-secrets@${PROJECT_ID}.iam.gserviceaccount.com

kubectl create secret generic gcp-sa-credentials \
  --namespace=external-secrets \
  --from-file=credentials.json=sa-key.json

# Clean up the local key file
rm sa-key.json
```

## Step 3: Create a ClusterSecretStore

For Workload Identity:

```yaml
# infrastructure/external-secrets/clustersecretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: YOUR_PROJECT_ID
```

For service account key:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: YOUR_PROJECT_ID
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcp-sa-credentials
            namespace: external-secrets
            key: credentials.json
```

## Step 4: Store Secrets in Google Secret Manager

```bash
# Create a simple secret
echo -n "s3cret-password" | gcloud secrets create db-password --data-file=-

# Create a JSON secret
echo -n '{"host":"db.example.com","port":"5432","user":"admin","password":"s3cret"}' | \
  gcloud secrets create db-config --data-file=-

# Create an API key secret
echo -n "ak_live_xxxxxxxxxxxx" | gcloud secrets create api-key --data-file=-
```

## Step 5: Create ExternalSecret Resources

For simple secrets:

```yaml
# apps/my-app/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-password
    - secretKey: API_KEY
      remoteRef:
        key: api-key
```

For extracting fields from a JSON secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: db-config
        property: host
    - secretKey: DB_PORT
      remoteRef:
        key: db-config
        property: port
    - secretKey: DB_USER
      remoteRef:
        key: db-config
        property: user
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-config
        property: password
```

## Step 6: Use Specific Secret Versions

Google Secret Manager supports versioning. You can pin to a specific version:

```yaml
data:
  - secretKey: DB_PASSWORD
    remoteRef:
      key: db-password
      version: "3"
```

Or always use the latest:

```yaml
data:
  - secretKey: DB_PASSWORD
    remoteRef:
      key: db-password
      version: latest
```

## Step 7: Verify and Troubleshoot

Check that the ExternalSecret is syncing:

```bash
kubectl get externalsecrets -n my-app
kubectl describe externalsecret app-secrets -n my-app
```

Verify the Kubernetes Secret:

```bash
kubectl get secret app-secrets -n my-app
kubectl get secret app-secrets -n my-app -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

If secrets are not syncing, check the ESO logs:

```bash
kubectl logs -n external-secrets deploy/external-secrets -f
```

Common issues:
- **Permission denied**: The service account lacks the `roles/secretmanager.secretAccessor` role
- **Secret not found**: The secret name in `remoteRef.key` does not match the GCP secret name
- **Workload Identity not working**: Verify the annotation on the Kubernetes service account matches the GCP service account

Check the ClusterSecretStore health:

```bash
kubectl get clustersecretstore gcp-secret-manager -o jsonpath='{.status.conditions}' | jq
```

## Summary

Integrating External Secrets with Google Secret Manager in Flux CD provides a secure GitOps workflow where secret values stay in GCP and only references are stored in Git. GKE Workload Identity offers the most secure authentication method, while service account keys work for non-GKE clusters. The ExternalSecret resources managed by Flux define the mapping between GCP secrets and Kubernetes Secrets, with configurable refresh intervals to keep credentials in sync.
