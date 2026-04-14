# How to Configure Dapr with GCP Firestore State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Firestore, State Store, Google Cloud

Description: Learn how to configure Dapr with Google Cloud Firestore as a state store, leveraging Firestore's serverless document database for cloud-native microservices on GCP.

---

## Overview

Google Cloud Firestore is a serverless, horizontally scaling document database built for automatic multi-region data storage. As a Dapr state store, Firestore is the natural fit for microservices running on Google Cloud Platform (GCP), offering strong consistency, real-time updates, and deep GCP IAM integration with no capacity planning required.

## Prerequisites

- A Google Cloud project with Firestore enabled
- Dapr CLI and runtime installed
- gcloud CLI configured

## Setting Up Firestore

Enable Firestore in your GCP project:

```bash
# Enable the Firestore API
gcloud services enable firestore.googleapis.com

# Create a Firestore database (Native mode)
gcloud firestore databases create \
  --location=us-east1 \
  --type=firestore-native
```

Create a service account for Dapr:

```bash
# Create service account
gcloud iam service-accounts create dapr-state-sa \
  --display-name "Dapr State Store Service Account"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:dapr-state-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Create and download a key
gcloud iam service-accounts keys create dapr-sa-key.json \
  --iam-account=dapr-state-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Configuring the Dapr Component

Create a Kubernetes secret with the service account key:

```bash
kubectl create secret generic gcp-secret \
  --from-file=key.json=dapr-sa-key.json
```

Create the Dapr Firestore state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: firestore-statestore
  namespace: default
spec:
  type: state.gcp.firestore
  version: v1
  metadata:
  - name: type
    value: "service_account"
  - name: project_id
    value: "YOUR_GCP_PROJECT_ID"
  - name: private_key_id
    secretKeyRef:
      name: gcp-secret
      key: private_key_id
  - name: private_key
    secretKeyRef:
      name: gcp-secret
      key: private_key
  - name: client_email
    value: "dapr-state-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"
  - name: client_id
    secretKeyRef:
      name: gcp-secret
      key: client_id
  - name: entity_kind
    value: "DaprState"
```

Apply the component:

```bash
kubectl apply -f firestore-statestore.yaml
```

## Using the Firestore State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store user profile state
await client.state.save("firestore-statestore", [
  {
    key: "user-profile-gcp-1001",
    value: {
      displayName: "Alice Chen",
      email: "alice@example.com",
      preferences: { notifications: true, theme: "system" },
      lastLogin: new Date().toISOString()
    }
  }
]);

const profile = await client.state.get("firestore-statestore", "user-profile-gcp-1001");
console.log("Profile:", profile);
```

## Using Workload Identity (Recommended for GKE)

For GKE clusters, use Workload Identity instead of service account keys:

```bash
# Bind GKE service account to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  dapr-state-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:YOUR_PROJECT_ID.svc.id.goog[default/dapr-sa]"
```

## Summary

GCP Firestore as a Dapr state store provides a fully serverless, auto-scaling document database backend with native GCP IAM integration. For GKE deployments, Workload Identity eliminates the need for service account key files, making it the most secure and operationally simple way to connect Dapr to Firestore on Google Cloud.
