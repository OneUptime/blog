# How to Configure GCP Authentication for Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Authentication, Binding, Security

Description: Learn the GCP authentication methods supported by Dapr bindings, including service account keys, Workload Identity Federation, and GKE Workload Identity for secure credential management.

---

## GCP Authentication Methods for Dapr Bindings

Dapr GCP bindings require Google Cloud credentials to authenticate. There are several approaches, ranging from simple service account key files for development to keyless Workload Identity for GKE production deployments.

## Method 1: Service Account Key File

The most common approach - suitable for development and non-GKE environments:

### Create the Service Account

```bash
# Create the service account
gcloud iam service-accounts create dapr-binding-sa \
  --display-name "Dapr Binding Service Account" \
  --project my-gcp-project

# Grant permissions
gcloud projects add-iam-policy-binding my-gcp-project \
  --member "serviceAccount:dapr-binding-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding my-gcp-project \
  --member "serviceAccount:dapr-binding-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/pubsub.editor"

# Download the key
gcloud iam service-accounts keys create ./dapr-sa-key.json \
  --iam-account dapr-binding-sa@my-gcp-project.iam.gserviceaccount.com
```

### Store in Kubernetes and Reference in Component

```bash
kubectl create secret generic gcp-sa-key-fields \
  --from-literal=privateKeyId="$(jq -r '.private_key_id' ./dapr-sa-key.json)" \
  --from-literal=privateKey="$(jq -r '.private_key' ./dapr-sa-key.json)"
```

Use the key fields in your component spec:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcs-store
spec:
  type: bindings.gcp.bucket
  version: v1
  metadata:
    - name: bucket
      value: "my-bucket"
    - name: type
      value: "service_account"
    - name: project_id
      value: "my-gcp-project"
    - name: private_key_id
      secretKeyRef:
        name: gcp-sa-key-fields
        key: privateKeyId
    - name: private_key
      secretKeyRef:
        name: gcp-sa-key-fields
        key: privateKey
    - name: client_email
      value: "dapr-binding-sa@my-gcp-project.iam.gserviceaccount.com"
    - name: client_id
      value: "123456789012345678901"
    - name: auth_uri
      value: "https://accounts.google.com/o/oauth2/auth"
    - name: token_uri
      value: "https://oauth2.googleapis.com/token"
```

## Method 2: Application Default Credentials (ADC)

When running on GCE or Cloud Run, leave the key fields empty and rely on the metadata server:

```bash
# On GCE, the VM's service account is used automatically
# On Cloud Run, the service's configured service account is used
gcloud config set project my-gcp-project
gcloud auth application-default login  # For local dev
```

## Method 3: GKE Workload Identity (Recommended for GKE)

GKE Workload Identity binds a Kubernetes service account to a GCP service account, eliminating key file management:

### Step 1: Enable Workload Identity on GKE

```bash
gcloud container clusters update my-gke-cluster \
  --workload-pool=my-gcp-project.svc.id.goog \
  --region us-central1
```

### Step 2: Create the GCP Service Account

```bash
gcloud iam service-accounts create dapr-gke-binding-sa \
  --project my-gcp-project

gcloud storage buckets add-iam-policy-binding gs://my-dapr-documents \
  --member "serviceAccount:dapr-gke-binding-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/storage.objectAdmin"
```

### Step 3: Bind to Kubernetes Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  dapr-gke-binding-sa@my-gcp-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-gcp-project.svc.id.goog[default/order-service]"
```

Annotate the Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: dapr-gke-binding-sa@my-gcp-project.iam.gserviceaccount.com
```

### Step 4: Configure the Binding Without Key Fields

```yaml
  metadata:
    - name: bucket
      value: "my-dapr-documents"
    - name: project_id
      value: "my-gcp-project"
```

Leave all key fields empty. Dapr uses Application Default Credentials, which GKE Workload Identity provides automatically via the metadata server.

## Least Privilege Role Assignments

```bash
# Storage: read and write only
gcloud storage buckets add-iam-policy-binding gs://my-dapr-documents \
  --member "serviceAccount:dapr-gke-binding-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/storage.objectAdmin"

# Pub/Sub: publish and consume from specific topic/subscription
gcloud pubsub topics add-iam-policy-binding order-events \
  --member "serviceAccount:dapr-gke-binding-sa@my-gcp-project.iam.gserviceaccount.com" \
  --role "roles/pubsub.publisher"
```

## Summary

GCP authentication for Dapr bindings evolves from service account key files in development to keyless GKE Workload Identity in production. Workload Identity eliminates key rotation, reduces credential leakage risk, and ties permissions directly to the Kubernetes workload identity. Always use Dapr secret references for key file fields, and prefer Workload Identity when running on GKE.
