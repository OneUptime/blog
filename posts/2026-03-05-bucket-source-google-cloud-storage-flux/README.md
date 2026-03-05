# How to Configure Bucket Source with Google Cloud Storage in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GCP, Google Cloud Storage, Bucket

Description: Learn how to configure Flux CD to pull Kubernetes manifests from Google Cloud Storage buckets using service account keys and Workload Identity.

---

## Introduction

Google Cloud Storage (GCS) is a scalable object storage service that integrates well with Flux CD as a source for Kubernetes manifests. Using the `gcp` provider, Flux can authenticate with GCS and pull manifests on a regular interval. This guide covers both service account key authentication and the recommended Workload Identity approach for GKE clusters.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- A Google Cloud Storage bucket with Kubernetes manifests
- `gcloud` CLI configured
- `kubectl` access to your cluster
- For Workload Identity: a GKE cluster with Workload Identity enabled

## Preparing the GCS Bucket

Create a bucket and upload your manifests.

```bash
# Create a GCS bucket
gcloud storage buckets create gs://my-app-flux-manifests \
  --location=us-central1

# Upload manifests to the bucket
gcloud storage cp -r ./manifests/* gs://my-app-flux-manifests/
```

## Option 1: Service Account Key

Create a Google Cloud service account with read access to the bucket.

```bash
# Create a service account
gcloud iam service-accounts create flux-gcs-reader \
  --display-name="Flux GCS Reader"

# Grant read access to the bucket
gcloud storage buckets add-iam-policy-binding gs://my-app-flux-manifests \
  --member="serviceAccount:flux-gcs-reader@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Create and download a key file
gcloud iam service-accounts keys create ./gcs-key.json \
  --iam-account=flux-gcs-reader@my-project.iam.gserviceaccount.com
```

Create a Kubernetes secret with the service account key.

```bash
# Create a secret with the GCP service account key
kubectl create secret generic gcs-bucket-creds \
  --namespace flux-system \
  --from-file=serviceaccount=./gcs-key.json
```

Create the Bucket source with the `gcp` provider.

```yaml
# flux-system/gcs-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use the gcp provider for native GCS integration
  provider: gcp
  bucketName: my-app-flux-manifests
  endpoint: storage.googleapis.com
  # Region is not required for GCS but can be specified
  secretRef:
    name: gcs-bucket-creds
```

Apply and verify.

```bash
# Apply the Bucket source
kubectl apply -f gcs-bucket-source.yaml

# Check the status
flux get sources bucket -n flux-system
```

## Option 2: GKE Workload Identity

Workload Identity is the recommended approach for GKE clusters. It binds a Kubernetes service account to a Google Cloud service account without needing a key file.

```bash
# Enable Workload Identity on your GKE cluster (if not already enabled)
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --zone=us-central1-a

# Create a GCP service account for Flux
gcloud iam service-accounts create flux-source-controller \
  --display-name="Flux Source Controller"

# Grant read access to the GCS bucket
gcloud storage buckets add-iam-policy-binding gs://my-app-flux-manifests \
  --member="serviceAccount:flux-source-controller@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Bind the Kubernetes service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-source-controller@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[flux-system/source-controller]"
```

Annotate the Flux source-controller service account.

```bash
# Annotate the source-controller service account with the GCP SA
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  --overwrite \
  iam.gke.io/gcp-service-account=flux-source-controller@my-project.iam.gserviceaccount.com

# Restart source-controller to pick up the Workload Identity binding
kubectl rollout restart deployment/source-controller -n flux-system
```

With Workload Identity configured, the Bucket source does not need a `secretRef`.

```yaml
# flux-system/gcs-bucket-workload-identity.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # The gcp provider enables Workload Identity authentication
  provider: gcp
  bucketName: my-app-flux-manifests
  endpoint: storage.googleapis.com
  # No secretRef needed -- Workload Identity handles authentication
```

## Using Prefixes for Multi-Environment Setups

Organize manifests by environment using bucket prefixes.

```yaml
# flux-system/gcs-staging.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  interval: 5m
  provider: gcp
  bucketName: deployment-artifacts
  endpoint: storage.googleapis.com
  # Pull only staging manifests
  prefix: staging/my-app/
  secretRef:
    name: gcs-bucket-creds
```

## Connecting a Kustomization

Deploy the manifests from the Bucket source using a Kustomization.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration with Cloud Build

Upload manifests to GCS from Google Cloud Build.

```yaml
# cloudbuild.yaml
steps:
  # Build and test steps omitted for brevity

  - name: 'gcr.io/cloud-builders/gsutil'
    id: 'upload-manifests'
    args:
      - '-m'
      - 'rsync'
      - '-r'
      - '-d'
      - './manifests/'
      - 'gs://my-app-flux-manifests/'
```

You can also use GitHub Actions with GCP authentication.

```yaml
# .github/workflows/upload-manifests.yaml
name: Upload Manifests to GCS
on:
  push:
    branches: [main]
    paths: ['manifests/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/github/providers/my-repo
          service_account: github-actions@my-project.iam.gserviceaccount.com

      - name: Upload manifests
        uses: google-github-actions/upload-cloud-storage@v2
        with:
          path: manifests
          destination: my-app-flux-manifests
```

## Verifying the Setup

```bash
# Check Bucket source status
flux get sources bucket -n flux-system

# Describe for detailed information
kubectl describe bucket my-app -n flux-system

# View source-controller logs
kubectl logs -n flux-system deployment/source-controller | grep -i "my-app"
```

## Troubleshooting

**Error: googleapi: Error 403: Access denied**

The service account does not have permission to read the bucket. Verify the IAM binding.

```bash
# Check bucket IAM policy
gcloud storage buckets get-iam-policy gs://my-app-flux-manifests
```

**Error: Workload Identity not working**

Ensure the GKE node pool has the correct metadata server enabled and the service account annotation is correct.

```bash
# Verify the annotation
kubectl get sa source-controller -n flux-system -o yaml | grep iam.gke.io
```

## Best Practices

1. **Use Workload Identity on GKE.** It eliminates service account key management and reduces the risk of credential leaks.

2. **Enable Object Versioning.** Turn on GCS object versioning to maintain a history of manifest changes.

3. **Use uniform bucket-level access.** Set the bucket to uniform access control for simpler permission management.

4. **Set lifecycle policies.** Configure GCS lifecycle rules to clean up old object versions automatically.

5. **Use Cloud Audit Logs.** Enable data access audit logs on the bucket to track who reads and writes manifests.

## Conclusion

Configuring Flux CD with Google Cloud Storage as a Bucket source provides a seamless way to deliver manifests through GCS. The `gcp` provider supports both service account key authentication and GKE Workload Identity, with the latter being the recommended approach for production environments. By combining GCS with a CI/CD pipeline that uploads manifests on code changes, you can build a fully automated GitOps workflow on Google Cloud.
