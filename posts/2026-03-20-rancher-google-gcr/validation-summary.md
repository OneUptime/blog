# Validation Summary: How to Configure Google Container Registry with Rancher

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rancher
- Kubernetes
- Google Cloud IAM and service accounts
- Artifact Registry and migrated `gcr.io` repositories
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- RKE2 private registry configuration
- `gcloud`, `kubectl`, and Docker CLI

## Sources Consulted
- Google Cloud: Prepare for Container Registry shutdown - https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Google Cloud: `gcr.io` repositories in Artifact Registry - https://cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Google Cloud: Access control with IAM for Artifact Registry - https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud: Deploying Artifact Registry images to GKE - https://cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud: Troubleshoot image pulls in GKE - https://cloud.google.com/kubernetes-engine/docs/troubleshooting/image-pulls
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- RKE2 documentation: Private Registry Configuration - https://docs.rke2.io/install/private_registry
- Kubernetes documentation: `kubectl create secret docker-registry` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Google Cloud SDK reference: `gcloud iam service-accounts keys create` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK reference: `gcloud iam service-accounts keys list` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list
- Google Cloud SDK reference: `gcloud iam service-accounts keys delete` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/delete
- Google Cloud SDK reference: `gcloud artifacts repositories create` - https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK reference: `gcloud auth configure-docker` - https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- Google Cloud SDK reference: `gcloud container clusters update` - https://cloud.google.com/sdk/gcloud/reference/container/clusters/update

## Issues Found
- The post described Google Container Registry as an active service. I updated the introduction, prerequisites, and conclusion to reflect that Container Registry is shut down and that legacy `gcr.io` names now need Artifact Registry `gcr.io` repositories. During review, I verified the shutdown timeline in Google’s docs: writes ended on March 18, 2025 and reads from legacy Container Registry ended on June 3, 2025.
- Step 1 granted `roles/storage.objectViewer` for legacy GCR access. I removed that guidance because current `gcr.io` repositories hosted on Artifact Registry use Artifact Registry IAM permissions such as `roles/artifactregistry.reader`, not Cloud Storage bucket permissions.
- Step 3 framed the secret as a GCR secret and used registry server values without the scheme used in current Google examples. I updated the heading to registry access, clarified the `gcr.io` case is for repositories hosted on Artifact Registry, and used `https://` registry hosts.
- Step 6 implied Workload Identity on the pod handles private Artifact Registry image pulls. I corrected the text to Workload Identity Federation for GKE and clarified that kubelet image pulls still use the node IAM service account or an `imagePullSecret`.
- The Deployment YAML in Step 6 was invalid for `apps/v1` because it omitted the required selector and matching pod template labels. I added the missing `replicas`, `selector`, and `template.metadata.labels` fields.
- The RKE2 `registries.yaml` example used `endpoints`, but the documented key is `endpoint`. I corrected the schema and added the missing auth block for `us-central1-docker.pkg.dev`, since the example config referenced both registry hosts.
- The key-rotation script used `gcloud iam service-accounts keys list` without filtering or ordering user-managed keys and then passed the full resource name to `keys delete`, which expects a key ID. I updated the script to keep only user-managed keys, sort by newest first, extract key IDs, and then delete the older keys safely.
- The troubleshooting section used `docker login -p` against `gcr.io`. I changed it to `--password-stdin` against the Artifact Registry hostname, which matches current Google authentication guidance.

## Review Notes
- Service account keys are still supported, but Google recommends more secure alternatives when possible. The post now accurately presents Workload Identity Federation for GKE as the preferred approach for workload-to-Google-Cloud API access.
- Workload Identity Federation for GKE does not change how kubelet authenticates image pulls from Artifact Registry; that remains tied to node identity or explicit image pull credentials.
- The title still references GCR, but the corrected body now makes clear that any current `gcr.io` usage depends on Artifact Registry-backed `gcr.io` repositories rather than legacy Container Registry.
