# How to Configure Flux CD with Google Artifact Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Google Cloud, Artifact Registry, OCI, Helm, Docker, GitOps, Kubernetes, Workload Identity

Description: A step-by-step guide to configuring Flux CD to pull Docker images, Helm charts, and OCI artifacts from Google Artifact Registry using Workload Identity.

---

## Introduction

Google Artifact Registry (GAR) is Google Cloud's recommended service for managing container images, Helm charts, and other OCI artifacts. It is the successor to Google Container Registry (GCR) and provides improved security, regional storage, and fine-grained access control.

This guide covers how to configure Flux CD to authenticate with and pull from Google Artifact Registry, including Docker image repositories, Helm chart repositories, and OCI artifact repositories, all using Workload Identity for keyless authentication.

## Prerequisites

- A GKE cluster with Flux CD installed and Workload Identity enabled
- gcloud CLI installed and configured
- Flux CLI v2.0 or later
- kubectl configured for your cluster

## Step 1: Create Artifact Registry Repositories

Create different types of repositories in Google Artifact Registry.

```bash
# Set environment variables
export PROJECT_ID=$(gcloud config get-value project)
export REGION="us-central1"

# Create a Docker image repository
gcloud artifacts repositories create docker-images \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for Flux CD workloads"

# Create a Helm chart repository
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=$REGION \
  --description="Helm charts managed by Flux CD"

# Create a generic OCI artifact repository for Kubernetes manifests
gcloud artifacts repositories create flux-manifests \
  --repository-format=docker \
  --location=$REGION \
  --description="OCI artifacts containing Kubernetes manifests"

# Verify repositories were created
gcloud artifacts repositories list --location=$REGION
```

## Step 2: Configure Workload Identity for GAR Access

Set up Workload Identity to allow Flux controllers to access Artifact Registry.

```bash
# Create a Google Service Account for Flux
gcloud iam service-accounts create flux-gar-reader \
  --display-name "Flux Artifact Registry Reader"

# Grant Artifact Registry Reader role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Bind the KSA to the GSA for source-controller
gcloud iam service-accounts add-iam-policy-binding \
  flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/source-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Bind the KSA to the GSA for image-reflector-controller
gcloud iam service-accounts add-iam-policy-binding \
  flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/image-reflector-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Annotate the Flux service accounts
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com

kubectl annotate serviceaccount image-reflector-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com

# Restart controllers to apply the identity
kubectl rollout restart deployment/source-controller -n flux-system
kubectl rollout restart deployment/image-reflector-controller -n flux-system
```

## Step 3: Configure Flux OCIRepository for Docker Images

Set up Flux to pull Kubernetes manifests stored as OCI artifacts in GAR.

```yaml
# oci-repository-manifests.yaml
# Pulls Kubernetes manifests packaged as OCI artifacts from GAR
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  # GAR OCI repository URL
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/flux-manifests/my-app
  ref:
    # Track the latest semver tag
    semver: ">=1.0.0"
  # Use GCP provider for Workload Identity authentication
  provider: gcp
---
# kustomization-from-oci.yaml
# Applies the manifests from the OCI artifact
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  sourceRef:
    kind: OCIRepository
    name: app-manifests
  path: ./
  prune: true
  wait: true
```

## Step 4: Push OCI Artifacts to GAR

Push Kubernetes manifests as OCI artifacts to GAR.

```bash
# Authenticate Docker with GAR
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Push manifests as an OCI artifact using Flux CLI
flux push artifact \
  oci://${REGION}-docker.pkg.dev/${PROJECT_ID}/flux-manifests/my-app:v1.0.0 \
  --path="./kubernetes/manifests" \
  --source="https://github.com/org/repo" \
  --revision="main/abc123def"

# Tag the artifact
flux tag artifact \
  oci://${REGION}-docker.pkg.dev/${PROJECT_ID}/flux-manifests/my-app:v1.0.0 \
  --tag latest

# List artifacts in the repository
gcloud artifacts docker images list \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/flux-manifests/my-app
```

## Step 5: Configure Flux HelmRepository with GAR

Set up Flux to pull Helm charts from an OCI-based Helm repository in GAR.

```yaml
# helm-repo-gar.yaml
# Helm repository pointing to GAR for chart storage
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  # GAR Helm chart repository URL
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/helm-charts
  # Use GCP provider for Workload Identity authentication
  provider: gcp
---
# helm-release-from-gar.yaml
# Deploys a Helm chart from GAR
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: us-central1-docker.pkg.dev/PROJECT_ID/docker-images/my-app
      tag: latest
    service:
      type: ClusterIP
      port: 80
```

## Step 6: Push Helm Charts to GAR

Package and push Helm charts to GAR.

```bash
# Package the Helm chart
helm package ./charts/my-app --version 1.0.0

# Push the chart to GAR using Helm
helm push my-app-1.0.0.tgz \
  oci://${REGION}-docker.pkg.dev/${PROJECT_ID}/helm-charts

# Verify the chart was pushed
gcloud artifacts docker images list \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/helm-charts/my-app
```

## Step 7: Configure Image Automation with GAR

Set up Flux image scanning and automation for Docker images in GAR.

```yaml
# image-repository-gar.yaml
# Scans GAR for new Docker image tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Docker image path in GAR
  image: us-central1-docker.pkg.dev/PROJECT_ID/docker-images/my-app
  interval: 5m
  # Use GCP provider for Workload Identity authentication
  provider: gcp
---
# image-policy-semver.yaml
# Selects the latest image tag matching a semver pattern
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
      # Only select stable releases (no pre-release tags)
      range: ">=1.0.0"
---
# image-update-automation.yaml
# Automatically updates image tags in Git when new images are found
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-image-automation
        email: flux@example.com
      messageTemplate: "Update image {{ .Changed.Name }} to {{ .Changed.NewTag }}"
    push:
      branch: main
  update:
    path: ./clusters/gke-cluster
    strategy: Setters
```

## Step 8: Alternative Authentication with Service Account Keys

If Workload Identity is not available, use a service account key for authentication.

```bash
# Create a service account key (not recommended for production)
gcloud iam service-accounts keys create key.json \
  --iam-account=flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com

# Create a Kubernetes secret with the key
kubectl create secret docker-registry gar-credentials \
  --namespace flux-system \
  --docker-server=${REGION}-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat key.json)" \
  --docker-email=flux@example.com

# Clean up the key file
rm key.json
```

```yaml
# oci-repository-with-secret.yaml
# Uses a Kubernetes secret instead of Workload Identity
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests-secret
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/flux-manifests/my-app
  ref:
    tag: latest
  # Reference the secret for authentication
  secretRef:
    name: gar-credentials
```

## Step 9: Configure Repository-Level Permissions

Set up fine-grained access control for specific GAR repositories.

```bash
# Grant read access to a specific repository only
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=$REGION \
  --member="serviceAccount:flux-gar-reader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Grant write access for a CI pipeline service account
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=$REGION \
  --member="serviceAccount:ci-pipeline@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# List permissions on a repository
gcloud artifacts repositories get-iam-policy docker-images \
  --location=$REGION
```

## Step 10: Set Up Multi-Region GAR with Flux

Configure Flux to pull from multiple GAR regions for resilience.

```yaml
# oci-repository-us.yaml
# Primary source from US region
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests-us
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/PROJECT_ID/flux-manifests/my-app
  ref:
    semver: ">=1.0.0"
  provider: gcp
---
# oci-repository-eu.yaml
# Secondary source from EU region for European clusters
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests-eu
  namespace: flux-system
spec:
  interval: 5m
  url: oci://europe-west1-docker.pkg.dev/PROJECT_ID/flux-manifests/my-app
  ref:
    semver: ">=1.0.0"
  provider: gcp
```

## Troubleshooting

### Authentication Failures

```bash
# Check if Workload Identity is properly configured
kubectl get sa source-controller -n flux-system -o yaml | grep gcp-service-account

# Verify the source-controller can authenticate
kubectl logs -n flux-system deploy/source-controller | grep -i "auth\|403\|401"

# Test GAR access from a debug pod
kubectl run gar-test --rm -it \
  --image=google/cloud-sdk:slim \
  --namespace=flux-system \
  --serviceaccount=source-controller \
  -- bash -c "gcloud auth list && gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/docker-images"
```

### OCI Repository Not Syncing

```bash
# Check the OCI repository status
flux get sources oci -A

# Force a reconciliation
flux reconcile source oci app-manifests

# Check the source-controller logs for detailed errors
kubectl logs -n flux-system deploy/source-controller --tail=50
```

### Helm Chart Pull Failures

```bash
# Verify the chart exists in GAR
gcloud artifacts docker tags list \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/helm-charts/my-app

# Check the Helm repository status
flux get sources helm -A

# Check the HelmRelease status
flux get helmreleases -A
```

## Summary

In this guide, you configured Flux CD to work with Google Artifact Registry for Docker images, Helm charts, and OCI artifacts. You set up Workload Identity for keyless authentication, created different types of GAR repositories, configured Flux OCIRepository and HelmRepository sources with the GCP provider, set up image automation for automatic deployments, and configured fine-grained repository-level permissions. This setup provides a secure and maintainable way to manage artifacts in your GitOps workflow.
