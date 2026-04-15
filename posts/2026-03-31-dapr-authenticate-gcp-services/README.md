# How to Authenticate Dapr with GCP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Authentication, Security, Kubernetes

Description: Configure Dapr to authenticate with Google Cloud Platform services using Workload Identity, service account keys, and GCP-native auth mechanisms.

---

## Overview

When deploying Dapr on Google Kubernetes Engine (GKE) or other environments, authenticating with GCP services like Pub/Sub, Firestore, and Secret Manager requires proper identity configuration. GCP offers multiple authentication methods - Workload Identity is the recommended approach for GKE.

## Prerequisites

- GKE cluster with Workload Identity enabled
- `gcloud` CLI configured
- Dapr installed on the cluster

## Method 1: Workload Identity (Recommended)

Workload Identity links a Kubernetes service account to a GCP service account, eliminating the need for static credentials.

Enable Workload Identity on your GKE cluster:

```bash
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --region=us-central1
```

Create and configure the GCP service account:

```bash
# Create GCP service account
gcloud iam service-accounts create dapr-sa \
  --display-name="Dapr Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dapr-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.editor"

# Bind to Kubernetes service account
gcloud iam service-accounts add-iam-policy-binding \
  dapr-sa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[default/my-app-sa]"
```

Annotate the Kubernetes service account:

```bash
kubectl annotate serviceaccount my-app-sa \
  iam.gke.io/gcp-service-account=dapr-sa@my-project.iam.gserviceaccount.com
```

## Method 2: Service Account Key File

For non-GKE environments, use a service account key JSON:

```bash
# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=dapr-sa@my-project.iam.gserviceaccount.com

# Store credentials as Kubernetes secret
kubectl create secret generic gcp-credentials \
  --from-literal=privateKeyId="$(jq -r '.private_key_id' key.json)" \
  --from-literal=clientEmail="$(jq -r '.client_email' key.json)" \
  --from-literal=privateKey="$(jq -r '.private_key' key.json)"
```

Reference the key in the Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: type
    value: "service_account"
  - name: projectId
    value: "my-project"
  - name: privateKeyId
    secretKeyRef:
      name: gcp-credentials
      key: privateKeyId
  - name: clientEmail
    secretKeyRef:
      name: gcp-credentials
      key: clientEmail
  - name: privateKey
    secretKeyRef:
      name: gcp-credentials
      key: privateKey
```

## Method 3: Application Default Credentials

For local development, use Application Default Credentials (ADC):

```bash
gcloud auth application-default login
```

Dapr components will automatically use ADC when no credentials are specified:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.gcp.secretmanager
  version: v1
  metadata:
  - name: projectId
    value: "my-project"
  # No credentials needed - uses ADC
```

## Verifying Authentication

Test that the Dapr sidecar can access GCP resources:

```bash
# Test secret manager access
curl http://localhost:3500/v1.0/secrets/secretstore/my-secret

# Test pub/sub publish
curl -X POST http://localhost:3500/v1.0/publish/pubsub/my-topic \
  -H "Content-Type: application/json" \
  -d '{"message": "hello from dapr"}'
```

## Summary

Dapr integrates with GCP authentication through Workload Identity, service account keys, or Application Default Credentials. Workload Identity is the most secure option for GKE deployments as it eliminates static credential management. All GCP Dapr components support these authentication methods transparently.
