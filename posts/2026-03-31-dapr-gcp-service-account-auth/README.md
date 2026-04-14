# How to Configure GCP Service Account Authentication for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Authentication, Service Account, Security

Description: Configure GCP service account authentication for Dapr components using Workload Identity, key files, and secret references for production deployments.

---

## Overview

Dapr components that integrate with GCP services - like Pub/Sub, Firestore, Secret Manager, and Cloud Storage - require authentication via GCP service accounts. This guide covers all configuration patterns, from Workload Identity on GKE to JSON key files for non-GCP environments.

## Service Account Permissions Matrix

| Dapr Component | Required Role |
|----------------|---------------|
| pubsub.gcp.pubsub | roles/pubsub.editor |
| state.gcp.firestore | roles/datastore.user |
| secretstores.gcp.secretmanager | roles/secretmanager.secretAccessor |
| bindings.gcp.bucket | roles/storage.objectAdmin |

## Creating a Dapr Service Account

```bash
# Create the service account
gcloud iam service-accounts create dapr-runtime \
  --display-name="Dapr Runtime Service Account" \
  --description="Service account for Dapr components"

SA_EMAIL=dapr-runtime@my-project.iam.gserviceaccount.com

# Grant permissions for each component type
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/pubsub.editor"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

## Method 1: Workload Identity on GKE

```bash
# Enable Workload Identity on existing cluster
gcloud container clusters update dapr-cluster \
  --workload-pool=my-project.svc.id.goog

# Create Kubernetes service account
kubectl create serviceaccount dapr-app-sa -n default

# Bind KSA to GSA
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:my-project.svc.id.goog[default/dapr-app-sa]"

# Annotate the KSA
kubectl annotate serviceaccount dapr-app-sa \
  -n default \
  iam.gke.io/gcp-service-account=${SA_EMAIL}
```

Use the annotated service account in your deployment:

```yaml
spec:
  template:
    spec:
      serviceAccountName: dapr-app-sa
      containers:
      - name: my-app
        image: my-app:latest
```

## Method 2: JSON Key File via Kubernetes Secret

```bash
# Generate key file
gcloud iam service-accounts keys create dapr-key.json \
  --iam-account=${SA_EMAIL}

# Store as Kubernetes secret
kubectl create secret generic gcp-credentials \
  --from-file=credentials.json=./dapr-key.json
```

Mount and reference in the Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-project"
  - name: credentialsJson
    secretKeyRef:
      name: gcp-credentials
      key: credentials.json
```

## Method 3: Using Dapr Secrets Store for Credentials

Store GCP credentials in a Dapr secrets store and reference them:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "my-project"
  - name: credentialsJson
    secretKeyRef:
      name: gcp-service-account-key
      key: json
auth:
  secretStore: kubernetes
```

## Rotating Service Account Keys

```bash
# List existing keys
gcloud iam service-accounts keys list --iam-account=${SA_EMAIL}

# Create new key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=${SA_EMAIL}

# Update Kubernetes secret
kubectl create secret generic gcp-credentials \
  --from-file=credentials.json=./new-key.json \
  --dry-run=client -o yaml | kubectl apply -f -

# Delete old key (use key ID from list output)
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=${SA_EMAIL}
```

## Summary

GCP service account authentication for Dapr components can be configured via Workload Identity on GKE, JSON key files stored as Kubernetes secrets, or through Dapr's secrets store. Workload Identity is the most secure production option as it eliminates static credentials and supports automatic rotation.
