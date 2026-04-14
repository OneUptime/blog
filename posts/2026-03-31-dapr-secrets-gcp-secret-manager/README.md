# How to Configure Dapr with GCP Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Secret Manager, Secret Management, Kubernetes

Description: Learn how to configure Dapr to use Google Cloud Secret Manager as a secret store backend on GKE using Workload Identity for seamless authentication.

---

Google Cloud Secret Manager is GCP's managed service for storing API keys, passwords, and certificates. It integrates with Cloud IAM for access control and supports automatic secret rotation. Dapr's GCP Secret Manager component lets your microservices read secrets through the standard Dapr API without managing GCP authentication code.

## Prerequisites: Enable the API

```bash
gcloud services enable secretmanager.googleapis.com \
  --project=my-gcp-project
```

## Create Secrets in GCP Secret Manager

```bash
# Create a secret
gcloud secrets create db-password \
  --replication-policy=automatic \
  --project=my-gcp-project

# Add a version with the actual value
echo -n "supersecretpassword" | gcloud secrets versions add db-password \
  --data-file=- \
  --project=my-gcp-project

# Create an API key secret
gcloud secrets create stripe-api-key \
  --replication-policy=automatic \
  --project=my-gcp-project

echo -n "sk_live_abc123" | gcloud secrets versions add stripe-api-key \
  --data-file=- \
  --project=my-gcp-project
```

## Set Up Workload Identity on GKE

Create a GCP service account and grant it Secret Manager access:

```bash
# Create GCP service account
gcloud iam service-accounts create dapr-secrets-sa \
  --project=my-gcp-project

# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:dapr-secrets-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Bind to Kubernetes service account
gcloud iam service-accounts add-iam-policy-binding \
  dapr-secrets-sa@my-gcp-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-gcp-project.svc.id.goog[production/my-service-sa]"
```

```bash
kubectl annotate serviceaccount my-service-sa \
  --namespace production \
  iam.gke.io/gcp-service-account=dapr-secrets-sa@my-gcp-project.iam.gserviceaccount.com
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-secret-store
  namespace: production
spec:
  type: secretstores.gcp.secretmanager
  version: v1
  metadata:
    - name: project_id
      value: "my-gcp-project"
```

With Workload Identity configured, no explicit credentials are required in the component definition.

For local development or non-GKE environments, use a service account key file:

```yaml
spec:
  metadata:
    - name: project_id
      value: "my-gcp-project"
    - name: private_key_id
      value: "key-id"
    - name: private_key
      secretKeyRef:
        name: gcp-sa-key
        key: private-key
    - name: client_email
      value: "dapr-secrets-sa@my-gcp-project.iam.gserviceaccount.com"
```

## Retrieve a Secret

```bash
curl http://localhost:3500/v1.0/secrets/gcp-secret-store/db-password
```

Response:

```json
{
  "db-password": "supersecretpassword"
}
```

To retrieve a specific version:

```bash
curl "http://localhost:3500/v1.0/secrets/gcp-secret-store/db-password?metadata.version_id=2"
```

## Summary

Configuring Dapr with GCP Secret Manager on GKE involves enabling the Secret Manager API, creating a GCP service account with Secret Accessor permissions, setting up Workload Identity binding, and defining a minimal Dapr component that references your project ID. The Workload Identity integration eliminates the need to manage service account keys in your Kubernetes cluster.
