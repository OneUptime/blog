# Validation Summary: How to Redirect gcr.io Requests to Artifact Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Container Registry
- gcloud CLI
- Docker
- gcrane
- Google Kubernetes Engine
- Cloud Logging
- IAM

## Sources Consulted
- Google Cloud Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry: gcr.io repositories: https://docs.cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Google Cloud Artifact Registry: Manual migration to gcr.io repositories: https://docs.cloud.google.com/artifact-registry/docs/transition/manual-gcr-repositories
- Google Cloud SDK reference: gcloud artifacts docker upgrade migrate: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/upgrade/migrate
- Google Cloud SDK reference: gcloud artifacts settings: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/settings
- Google Cloud Artifact Registry: Copy images from Container Registry: https://cloud.google.com/artifact-registry/docs/docker/copy-from-gcr
- Google Cloud Artifact Registry: Update repository settings: https://cloud.google.com/artifact-registry/docs/repositories/update-repo-settings
- Google Cloud Artifact Registry: Audit logging: https://docs.cloud.google.com/artifact-registry/docs/audit-logging
- Google Cloud Artifact Registry: Deploying to Google Kubernetes Engine: https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Kubernetes Engine: Configure GKE node service accounts: https://docs.cloud.google.com/kubernetes-engine/security/configure-node-service-accounts

## Issues Found
- The migration copy command used the unsupported `--from-prefix` flag. Replaced it with `--copy-only` on `gcloud artifacts docker upgrade migrate --projects=...`, which is the current flag for copy-only migration behavior.
- The dry-run example used unsupported migration flags. Replaced it with `gcloud artifacts settings enable-upgrade-redirection --dry-run`, which is the documented way to validate redirection setup.
- The prerequisites omitted the Storage Admin role needed to manually enable redirection. Added `roles/storage.admin` alongside `roles/artifactregistry.admin`.
- The GKE Workload Identity note was misleading for image pulls. Clarified that GKE image pulls use the node service account, while Workload Identity Federation for GKE controls workload access to Google Cloud APIs.
- The Cloud Logging filter used non-documented `resource.labels` fields for Artifact Registry Docker access. Updated it to filter on `protoPayload.serviceName` and Docker data-plane method names.
- The vulnerability scanning command used `--enable-vulnerability-scanning`, which is not the current documented flag. Replaced it with `--allow-vulnerability-scanning`.
- The rollback text implied normal Container Registry write behavior. Clarified that disabling redirection does not delete images, but Container Registry writes are unavailable after the March 18, 2025 shutdown.

## Review Notes
The post remains a useful transition guide. Container Registry is already shut down for writes as of March 18, 2025, so future revisions should keep migration and rollback language framed around current post-shutdown behavior.
