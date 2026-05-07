# Validation Summary: How to Use Google Container Registry with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Google Cloud CLI (`gcloud`)
- Google Artifact Registry
- Artifact Registry-backed `gcr.io` repositories
- Google Cloud IAM service accounts
- Podman `registries.conf`

## Sources Consulted
- Google Cloud: Transition from Container Registry to Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud: `gcr.io` repositories in Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Google Cloud: Automatically migrate from Container Registry to Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/auto-migrate-gcr-ar
- Google Cloud: Manual migration to `gcr.io` repositories in Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/manual-gcr-repositories
- Google Cloud: Configure authentication to Artifact Registry for Docker: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud: Push and pull images: https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Google Cloud: Access control with IAM: https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud SDK: `gcloud auth configure-docker`: https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- Google Cloud Build: Cloud builders: https://cloud.google.com/build/docs/cloud-builders
- Podman `login` reference: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html

## Issues Found
- The post originally described Container Registry as an active service alongside Artifact Registry. I corrected that because Container Registry is shut down; in 2026, `gcr.io` usage on Google Cloud means Artifact Registry-backed `gcr.io` repositories.
- The original `gcr.io` authentication section omitted the required migration step. I added `gcloud artifacts docker upgrade migrate --projects=...` so the `gcr.io` examples are valid after the Container Registry shutdown.
- The service account IAM example granted `roles/storage.admin`, which is the old Container Registry storage-bucket model. I replaced it with `roles/artifactregistry.createOnPushWriter`, which is the correct Artifact Registry role for pushing to `gcr.io` endpoints and creating missing `gcr.io` repositories on first push.
- The credential-helper example only configured `gcr.io`, while the post also used regional `*.gcr.io` hosts. I updated the command to configure `gcr.io`, `us.gcr.io`, `eu.gcr.io`, and `asia.gcr.io`.
- The pull example used `gcr.io/google-containers/pause:3.9`, which was not backed by the current official sources I verified for this review. I replaced it with the documented Cloud Build image `gcr.io/cloud-builders/gcloud`.
- The `registries.conf` section implied Podman configuration was required. I corrected the wording so it is clearly optional.
- The CI example used `echo` to pass a JSON service account key to `podman login`. I changed it to `printf '%s'` so the key contents are passed more safely and predictably.

## Review Notes
- Container Registry writes were shut down on March 18, 2025, and reads were shut down on June 3, 2025. That timeline is the main reason the original post needed correction.
- Google still supports `gcr.io` URLs after migration because Artifact Registry can host `gcr.io` repositories and redirect `gcr.io` traffic there.
- Podman was not installed in the local workspace, so command validation relied on current official Google Cloud and Podman documentation rather than local CLI output.
