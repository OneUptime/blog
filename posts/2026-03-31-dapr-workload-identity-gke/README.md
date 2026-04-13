# How to Use Dapr with Workload Identity Federation on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GKE, Workload Identity, GCP, Authentication

Description: Configure Dapr on GKE to use Workload Identity Federation for credential-free access to GCP services like Pub/Sub, Secret Manager, and Cloud Storage.

---

## GKE Workload Identity Overview

GKE Workload Identity allows Kubernetes service accounts to act as GCP service accounts by exchanging a Kubernetes-issued OIDC token for a GCP access token. Dapr components running on GKE can authenticate to GCP services without any credential files or secrets.

## Step 1 - Enable Workload Identity on GKE

```bash
# Enable Workload Identity on cluster
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --zone=us-central1-a

# Enable on node pool
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --zone=us-central1-a \
  --workload-metadata=GKE_METADATA
```

## Step 2 - Create GCP Service Account

```bash
# Create a dedicated GCP service account for Dapr
gcloud iam service-accounts create dapr-gke-sa \
  --display-name="Dapr GKE Service Account" \
  --project=my-project

# Grant required permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dapr-gke-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dapr-gke-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

## Step 3 - Create IAM Binding for Workload Identity

```bash
# Allow the Kubernetes SA to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  dapr-gke-sa@my-project.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:my-project.svc.id.goog[production/my-app]"
```

## Step 4 - Configure Kubernetes ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: dapr-gke-sa@my-project.iam.gserviceaccount.com
```

Apply:

```bash
kubectl apply -f service-account.yaml
```

## Step 5 - Configure Dapr GCP Components

Secret Manager component without explicit credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-secret-store
spec:
  type: secretstores.gcp.secretmanager
  version: v1
  metadata:
    - name: project_id
      value: "my-project"
    # No credentials needed - Workload Identity provides them
```

Pub/Sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
    - name: projectId
      value: "my-project"
```

## Step 6 - Configure Pod to Use the ServiceAccount

```yaml
spec:
  serviceAccountName: my-app  # Must reference the annotated SA
  containers:
    - name: app
      image: my-app:latest
```

## Verifying Workload Identity

```bash
# Verify the pod is using the correct identity
kubectl exec -it <pod-name> -- \
  curl -s -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"

# Expected output: dapr-gke-sa@my-project.iam.gserviceaccount.com

# Test secret retrieval
curl http://localhost:3500/v1.0/secrets/gcp-secret-store/my-secret
```

## Summary

Configure Dapr with GKE Workload Identity by enabling the feature on your cluster, creating a GCP service account with appropriate IAM roles, binding the Kubernetes ServiceAccount to the GCP identity via IAM, and annotating the ServiceAccount with the GCP SA email. Dapr GCP components automatically use these credentials without any credential files in pod configuration.
