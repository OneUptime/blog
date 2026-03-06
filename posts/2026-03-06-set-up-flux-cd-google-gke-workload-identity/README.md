# How to Set Up Flux CD on Google GKE with Workload Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Google Cloud, GKE, Workload Identity, GitOps, Kubernetes, IAM, Artifact Registry

Description: A comprehensive guide to setting up Flux CD on Google Kubernetes Engine with Workload Identity Federation for secure, keyless authentication to GCP services.

---

## Introduction

Workload Identity is the recommended way for workloads running on GKE to access Google Cloud services. Instead of using static service account keys, Workload Identity allows Kubernetes service accounts to act as Google Cloud service accounts, providing a more secure and manageable authentication mechanism.

This guide walks you through setting up Flux CD on GKE with Workload Identity, enabling Flux controllers to securely access Google Artifact Registry, Cloud Source Repositories, and other GCP services without static credentials.

## Prerequisites

- A Google Cloud project with billing enabled
- gcloud CLI installed and configured
- kubectl installed
- Flux CLI v2.0 or later installed
- Owner or Editor role on the GCP project

## Step 1: Enable Required APIs

Enable the necessary Google Cloud APIs for this setup.

```bash
# Enable required APIs
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sourcerepo.googleapis.com

# Set project variables
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export REGION="us-central1"
export CLUSTER_NAME="flux-gke-cluster"
```

## Step 2: Create a GKE Cluster with Workload Identity

Create a GKE cluster with Workload Identity enabled.

```bash
# Create the GKE cluster with Workload Identity enabled
gcloud container clusters create $CLUSTER_NAME \
  --region $REGION \
  --num-nodes 3 \
  --workload-pool="${PROJECT_ID}.svc.id.goog" \
  --enable-ip-alias \
  --release-channel regular

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region $REGION

# Verify Workload Identity is enabled
gcloud container clusters describe $CLUSTER_NAME \
  --region $REGION \
  --format='value(workloadIdentityConfig.workloadPool)'
```

If you have an existing cluster, enable Workload Identity on it:

```bash
# Enable Workload Identity on an existing cluster
gcloud container clusters update $CLUSTER_NAME \
  --region $REGION \
  --workload-pool="${PROJECT_ID}.svc.id.goog"

# Update node pools to use Workload Identity
gcloud container node-pools update default-pool \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --workload-metadata=GKE_METADATA
```

## Step 3: Create Google Service Accounts for Flux

Create dedicated Google Service Accounts (GSAs) for Flux controllers.

```bash
# Create a GSA for the Flux source-controller
# This account will access Git repos and OCI registries
gcloud iam service-accounts create flux-source-controller \
  --display-name "Flux Source Controller" \
  --description "Service account for Flux source-controller to access GCP resources"

# Create a GSA for the Flux kustomize-controller
# This account may need access to decrypt secrets
gcloud iam service-accounts create flux-kustomize-controller \
  --display-name "Flux Kustomize Controller" \
  --description "Service account for Flux kustomize-controller"

# Create a GSA for the Flux image-automation-controller
gcloud iam service-accounts create flux-image-automation \
  --display-name "Flux Image Automation" \
  --description "Service account for Flux image automation controllers"
```

## Step 4: Grant IAM Permissions to the Service Accounts

Assign the necessary IAM roles to the Google Service Accounts.

```bash
# Grant Artifact Registry Reader to source-controller
# Allows pulling OCI artifacts and container images
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Grant Source Repository Reader to source-controller
# Allows cloning Git repositories from Cloud Source Repos
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/source.reader"

# Grant KMS Decrypter to kustomize-controller (for SOPS decryption)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-kustomize-controller@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter"

# Grant Artifact Registry Reader to image-automation controller
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-image-automation@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Step 5: Bind Kubernetes Service Accounts to Google Service Accounts

Create the Workload Identity bindings between KSAs and GSAs.

```bash
# Bind the Flux source-controller KSA to the GSA
gcloud iam service-accounts add-iam-policy-binding \
  flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/source-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Bind the Flux kustomize-controller KSA to the GSA
gcloud iam service-accounts add-iam-policy-binding \
  flux-kustomize-controller@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/kustomize-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Bind the Flux image-reflector-controller KSA to the GSA
gcloud iam service-accounts add-iam-policy-binding \
  flux-image-automation@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/image-reflector-controller]" \
  --role="roles/iam.workloadIdentityUser"
```

## Step 6: Bootstrap Flux CD on GKE

Bootstrap Flux on the GKE cluster.

```bash
# Bootstrap Flux using a GitHub repository
flux bootstrap github \
  --owner=<your-github-org> \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/gke-cluster \
  --personal
```

## Step 7: Annotate Flux Service Accounts for Workload Identity

After Flux is bootstrapped, annotate the Kubernetes service accounts with the Workload Identity binding.

```bash
# Annotate the source-controller service account
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com

# Annotate the kustomize-controller service account
kubectl annotate serviceaccount kustomize-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-kustomize-controller@${PROJECT_ID}.iam.gserviceaccount.com

# Annotate the image-reflector-controller service account
kubectl annotate serviceaccount image-reflector-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-image-automation@${PROJECT_ID}.iam.gserviceaccount.com

# Restart the controllers to pick up the new annotations
kubectl rollout restart deployment/source-controller -n flux-system
kubectl rollout restart deployment/kustomize-controller -n flux-system
kubectl rollout restart deployment/image-reflector-controller -n flux-system
```

Alternatively, manage these annotations declaratively through a Flux Kustomization patch:

```yaml
# flux-system-patches.yaml
# Patches Flux service accounts with Workload Identity annotations
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Patch source-controller service account
  - target:
      kind: ServiceAccount
      name: source-controller
      namespace: flux-system
    patch: |
      - op: add
        path: /metadata/annotations/iam.gke.io~1gcp-service-account
        value: flux-source-controller@PROJECT_ID.iam.gserviceaccount.com
  # Patch kustomize-controller service account
  - target:
      kind: ServiceAccount
      name: kustomize-controller
      namespace: flux-system
    patch: |
      - op: add
        path: /metadata/annotations/iam.gke.io~1gcp-service-account
        value: flux-kustomize-controller@PROJECT_ID.iam.gserviceaccount.com
  # Patch image-reflector-controller service account
  - target:
      kind: ServiceAccount
      name: image-reflector-controller
      namespace: flux-system
    patch: |
      - op: add
        path: /metadata/annotations/iam.gke.io~1gcp-service-account
        value: flux-image-automation@PROJECT_ID.iam.gserviceaccount.com
```

## Step 8: Configure Flux Sources with GCP Provider

Set up Flux sources that use the GCP provider for authentication.

```yaml
# oci-repository-gar.yaml
# Pulls OCI artifacts from Google Artifact Registry using Workload Identity
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/flux-manifests/app
  ref:
    tag: latest
  # Use the GCP provider for Workload Identity authentication
  provider: gcp
```

```yaml
# helm-repository-gar.yaml
# Pulls Helm charts from Google Artifact Registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: app-charts
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/helm-charts
  # Use GCP provider for authentication via Workload Identity
  provider: gcp
```

## Step 9: Configure Image Automation with Workload Identity

Set up Flux image automation to scan images in Google Artifact Registry.

```yaml
# image-repository.yaml
# Scans Artifact Registry for new image tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: us-central1-docker.pkg.dev/PROJECT_ID/docker-images/my-app
  interval: 5m
  # Use GCP provider for Workload Identity authentication
  provider: gcp
---
# image-policy.yaml
# Selects the latest semver tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 10: Verify Workload Identity Configuration

Test and verify that the Workload Identity setup is working correctly.

```bash
# Verify service account annotations
kubectl get sa -n flux-system -o custom-columns=\
'NAME:.metadata.name,GCP_SA:.metadata.annotations.iam\.gke\.io/gcp-service-account'

# Check source-controller can access Artifact Registry
flux get sources oci -A

# Check image-reflector can scan images
flux get images repository -A

# Test Workload Identity from a debug pod
kubectl run -it --rm workload-identity-test \
  --image=google/cloud-sdk:slim \
  --namespace=flux-system \
  --serviceaccount=source-controller \
  -- gcloud auth list

# Check controller logs for authentication errors
kubectl logs -n flux-system deploy/source-controller | grep -i "auth\|identity\|error"
```

## Troubleshooting

### Workload Identity Not Working

```bash
# Verify the Workload Identity pool is configured
gcloud container clusters describe $CLUSTER_NAME \
  --region $REGION \
  --format='value(workloadIdentityConfig)'

# Check the IAM binding exists
gcloud iam service-accounts get-iam-policy \
  flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com

# Verify node pool metadata is set
gcloud container node-pools describe default-pool \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --format='value(config.workloadMetadataConfig)'
```

### Permission Denied Errors

```bash
# List IAM roles for the service account
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# Add missing roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-source-controller@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### Controller Pod Not Using Workload Identity

```bash
# Ensure the pod has the correct service account
kubectl get pod -n flux-system -l app=source-controller -o jsonpath='{.items[0].spec.serviceAccountName}'

# Check for GKE metadata server access
kubectl exec -n flux-system deploy/source-controller -- \
  curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

## Summary

In this guide, you set up Flux CD on Google GKE with Workload Identity Federation. You created a GKE cluster with Workload Identity enabled, set up Google Service Accounts for each Flux controller, bound Kubernetes service accounts to Google service accounts, and configured Flux sources to use the GCP provider for keyless authentication. This setup eliminates the need for static service account keys and provides a secure, auditable way for Flux controllers to access Google Cloud services like Artifact Registry and Cloud Source Repositories.
