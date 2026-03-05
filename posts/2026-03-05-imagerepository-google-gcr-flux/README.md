# How to Configure ImageRepository for Google Container Registry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Google Container Registry, GCR, Artifact Registry

Description: Learn how to configure a Flux ImageRepository to scan Google Container Registry and Artifact Registry for image tags.

---

Google Container Registry (GCR) and Google Artifact Registry are container image hosting services provided by Google Cloud. Flux supports scanning these registries using the ImageRepository resource with native GCP provider authentication. This guide covers how to configure Flux to scan both GCR and Artifact Registry.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- A Google Cloud project with GCR or Artifact Registry enabled
- gcloud CLI installed and configured
- kubectl access to your cluster

## Understanding GCR and Artifact Registry

Google Cloud offers two container registry services:

- **Google Container Registry (GCR)**: Uses hostnames like `gcr.io`, `us.gcr.io`, `eu.gcr.io`, `asia.gcr.io`. GCR is based on Google Cloud Storage.
- **Google Artifact Registry**: Uses hostnames like `us-docker.pkg.dev`, `europe-docker.pkg.dev`. This is the newer, recommended service.

Flux supports both through the `provider: gcp` setting.

## Step 1: Use Native GCP Provider Authentication

The recommended approach on GKE is to use the `provider: gcp` field.

```yaml
# imagerepository-gcr.yaml
# Scan a GCR image using native GCP provider authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: gcr.io/my-project/my-app
  interval: 5m0s
  provider: gcp
```

Apply the manifest.

```bash
# Apply the GCR ImageRepository
kubectl apply -f imagerepository-gcr.yaml
```

For Artifact Registry, use the Artifact Registry hostname.

```yaml
# imagerepository-artifact-registry.yaml
# Scan a Google Artifact Registry image using native GCP authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app-ar
  namespace: flux-system
spec:
  image: us-docker.pkg.dev/my-project/my-repo/my-app
  interval: 5m0s
  provider: gcp
```

## Step 2: Configure Workload Identity on GKE

For the `provider: gcp` to work on GKE, configure Workload Identity for the image reflector controller.

Create a Google Cloud service account.

```bash
# Create a GCP service account for Flux image reflector
gcloud iam service-accounts create flux-image-reflector \
  --display-name="Flux Image Reflector" \
  --project=my-project
```

Grant the service account permission to read from the registry.

```bash
# Grant Artifact Registry Reader role for Artifact Registry
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:flux-image-reflector@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# For GCR, grant Storage Object Viewer on the GCR bucket
gcloud storage buckets add-iam-policy-binding gs://artifacts.my-project.appspot.com \
  --member="serviceAccount:flux-image-reflector@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

Bind the GCP service account to the Kubernetes service account.

```bash
# Allow the Kubernetes SA to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  flux-image-reflector@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[flux-system/image-reflector-controller]"
```

Annotate the Kubernetes ServiceAccount.

```yaml
# Patch the image-reflector-controller ServiceAccount for GKE Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    # Associate the GCP service account
    iam.gke.io/gcp-service-account: flux-image-reflector@my-project.iam.gserviceaccount.com
```

Apply the ServiceAccount patch.

```bash
# Apply the ServiceAccount annotation
kubectl apply -f image-reflector-sa.yaml
```

## Step 3: Use a Service Account Key (Alternative)

If you are not running on GKE or cannot use Workload Identity, use a service account key.

```bash
# Create a service account key
gcloud iam service-accounts keys create key.json \
  --iam-account=flux-image-reflector@my-project.iam.gserviceaccount.com

# Create a Kubernetes secret with the service account key
kubectl create secret docker-registry gcr-credentials \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat key.json)" \
  -n flux-system

# Clean up the local key file
rm key.json
```

Reference the Secret in the ImageRepository.

```yaml
# imagerepository-gcr-key.yaml
# Scan GCR using a service account key
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: gcr.io/my-project/my-app
  interval: 5m0s
  secretRef:
    name: gcr-credentials
```

For Artifact Registry, change the `--docker-server` accordingly.

```bash
# Create credentials for Artifact Registry
kubectl create secret docker-registry ar-credentials \
  --docker-server=us-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat key.json)" \
  -n flux-system
```

## Step 4: Use Node Identity on GKE (Not Recommended)

On GKE clusters with the default compute service account, nodes may already have GCR access. However, Flux does not use node-level credentials when `provider: gcp` is set. You must configure Workload Identity or provide a Secret.

## Step 5: Verify the ImageRepository

```bash
# Check the GCR ImageRepository status
flux get image repository my-app -n flux-system

# Get detailed information
kubectl describe imagerepository my-app -n flux-system
```

## Troubleshooting

- **Permission denied**: Ensure the service account has the correct IAM roles (`artifactregistry.reader` for Artifact Registry, `storage.objectViewer` for GCR).
- **Workload Identity not working**: Verify the annotation on the ServiceAccount and the IAM binding.
- **Wrong hostname**: Use `gcr.io` for GCR and the correct regional hostname for Artifact Registry.

```bash
# Check logs for GCR-related errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "gcr\|gcp\|google\|artifact"
```

## Summary

You have configured Flux to scan Google Container Registry and Google Artifact Registry for image tags. Using GKE Workload Identity with the `provider: gcp` setting is the recommended approach. With the ImageRepository configured, Flux can discover new image tags and feed them into your ImagePolicy for automated deployments.
