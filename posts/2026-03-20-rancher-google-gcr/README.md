# How to Configure Google Container Registry with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Google Cloud, GCR, Container Registry, Artifact Registry

Description: Set up Google Container Registry (GCR) or Artifact Registry with Rancher using service accounts and Workload Identity for secure container image management.

## Introduction

Google Container Registry (GCR) has been shut down, and Google recommends Artifact Registry for container image storage. If you still need legacy `gcr.io` image names, use `gcr.io` repositories hosted on Artifact Registry. Integrating these registries with Rancher requires proper IAM authentication. This guide covers using service account keys, Workload Identity Federation for GKE, and configuring cluster-wide registry access.

## Prerequisites

- Google Cloud project with billing enabled
- Artifact Registry configured, including `gcr.io` repositories if you need legacy `gcr.io` image names
- `gcloud` CLI installed and authenticated
- Rancher managing a GKE or other cluster
- kubectl access to your cluster

## Step 1: Create a Service Account for Registry Access

```bash
# Create a dedicated service account for registry pulls

gcloud iam service-accounts create rancher-registry-sa \
  --display-name="Rancher Registry Service Account" \
  --project=my-project-id

# Grant Artifact Registry Reader for pkg.dev repositories or gcr.io repositories hosted on Artifact Registry
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:rancher-registry-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Step 2: Create and Download a Service Account Key

```bash
# Create a JSON key for the service account
gcloud iam service-accounts keys create gcr-key.json \
  --iam-account=rancher-registry-sa@my-project-id.iam.gserviceaccount.com

# View the key file (contains sensitive credentials)
cat gcr-key.json
```

## Step 3: Create Kubernetes Secret for Registry Access

```bash
# For gcr.io repositories hosted on Artifact Registry
kubectl create secret docker-registry gcr-credentials \
  --docker-server=https://gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  --docker-email=admin@example.com \
  --namespace=production

# For Artifact Registry in us-central1
kubectl create secret docker-registry ar-credentials \
  --docker-server=https://us-central1-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  --docker-email=admin@example.com \
  --namespace=production
```

## Step 4: Configure Artifact Registry

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-containers \
  --repository-format=docker \
  --location=us-central1 \
  --description="Production container images"

# Authenticate local Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push an image
docker build -t us-central1-docker.pkg.dev/my-project-id/my-containers/my-app:v1.0 .
docker push us-central1-docker.pkg.dev/my-project-id/my-containers/my-app:v1.0
```

## Step 5: Deploy Using GCR/Artifact Registry Images

```yaml
# deployment.yaml - Using Artifact Registry image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-gcp-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-gcp-app
  template:
    metadata:
      labels:
        app: my-gcp-app
    spec:
      # Reference the registry credential secret
      imagePullSecrets:
        - name: ar-credentials
      containers:
        - name: my-gcp-app
          # Artifact Registry image URI
          image: us-central1-docker.pkg.dev/my-project-id/my-containers/my-app:v1.0
          ports:
            - containerPort: 8080
```

## Step 6: Configure Workload Identity Federation for GKE

For GKE clusters managed by Rancher, use Workload Identity Federation for GKE to avoid key management for workloads that call Google Cloud APIs. Private image pulls from Artifact Registry still use the node's IAM service account or an `imagePullSecret`.

```bash
# Enable Workload Identity Federation for GKE on the cluster
gcloud container clusters update my-cluster \
  --workload-pool=my-project-id.svc.id.goog \
  --region=us-central1

# Create Kubernetes service account
kubectl create serviceaccount registry-puller \
  --namespace production

# Bind Kubernetes SA to IAM service account
gcloud iam service-accounts add-iam-policy-binding \
  rancher-registry-sa@my-project-id.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project-id.svc.id.goog[production/registry-puller]"

# Annotate the Kubernetes service account
kubectl annotate serviceaccount registry-puller \
  --namespace production \
  iam.gke.io/gcp-service-account=rancher-registry-sa@my-project-id.iam.gserviceaccount.com
```

```yaml
# workload-identity-pod.yaml - Deployment using Workload Identity Federation for GKE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-wi
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app-wi
  template:
    metadata:
      labels:
        app: my-app-wi
    spec:
      # Use the annotated Kubernetes service account for Google Cloud API access
      serviceAccountName: registry-puller
      containers:
        - name: my-app
          # Image pulls still rely on the node identity or imagePullSecrets
          image: us-central1-docker.pkg.dev/my-project-id/my-containers/my-app:v1.0
```

## Step 7: Configure GCR with RKE2 Clusters

```yaml
# /etc/rancher/rke2/registries.yaml - RKE2 private registry config
mirrors:
  "gcr.io":
    endpoint:
      - "https://gcr.io"
  "us-central1-docker.pkg.dev":
    endpoint:
      - "https://us-central1-docker.pkg.dev"
configs:
  "gcr.io":
    auth:
      username: "_json_key"
      password: |
        {
          "type": "service_account",
          "project_id": "my-project-id",
          ...
        }
  "us-central1-docker.pkg.dev":
    auth:
      username: "_json_key"
      password: |
        {
          "type": "service_account",
          "project_id": "my-project-id",
          ...
        }
```

## Step 8: Set Up Automated Key Rotation

```bash
# Script to rotate service account key and update Kubernetes secret
#!/bin/bash
SA_EMAIL="rancher-registry-sa@my-project-id.iam.gserviceaccount.com"
NAMESPACE="production"
SECRET_NAME="gcr-credentials"
REGISTRY_SERVER="https://gcr.io"

# Create new key
gcloud iam service-accounts keys create new-gcr-key.json \
  --iam-account="$SA_EMAIL"

# Update Kubernetes secret
kubectl create secret docker-registry "$SECRET_NAME" \
  --docker-server="$REGISTRY_SERVER" \
  --docker-username=_json_key \
  --docker-password="$(cat new-gcr-key.json)" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

# Delete old keys (keep only 2 most recent)
OLD_KEYS=$(gcloud iam service-accounts keys list \
  --iam-account="$SA_EMAIL" \
  --managed-by=user \
  --sort-by=~validAfterTime \
  --format="value(name)" | tail -n +3)

for KEY in $OLD_KEYS; do
  KEY_ID="${KEY##*/}"
  gcloud iam service-accounts keys delete "$KEY_ID" \
    --iam-account="$SA_EMAIL" --quiet
done
```

## Troubleshooting

```bash
# Verify service account has correct permissions
gcloud projects get-iam-policy my-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:rancher-registry-sa"

# Test authentication
cat gcr-key.json | docker login -u _json_key --password-stdin https://us-central1-docker.pkg.dev

# Check pod pull errors
kubectl describe pod <pod-name> -n production | grep -A 5 "Failed to pull"
```

## Conclusion

Artifact Registry integrates well with Rancher-managed clusters, including migrated `gcr.io` repositories that keep legacy image names working after the Container Registry shutdown. For GKE clusters, Workload Identity Federation for GKE is the most secure approach for workloads that call Google Cloud APIs, while image pulls still rely on the node service account or an `imagePullSecret`. For non-GKE clusters, use service account keys with a rotation strategy. Artifact Registry is recommended for new deployments because it offers more features and regional storage options.
