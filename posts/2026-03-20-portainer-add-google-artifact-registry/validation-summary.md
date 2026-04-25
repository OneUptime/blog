# Validation Summary: How to Add Google Artifact Registry to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Google Cloud Artifact Registry
- Google Cloud IAM service accounts
- Google Cloud CLI (`gcloud`)
- Docker registry authentication
- Docker Compose / Portainer stacks

## Sources Consulted
- Portainer Documentation: Add a custom registry — https://docs.portainer.io/admin/registries/add/custom
- Portainer Documentation: Registries (Docker environments) — https://docs.portainer.io/user/docker/host/registries
- Google Cloud Documentation: Configure authentication to Artifact Registry for Docker — https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Documentation: Repository and image names — https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Documentation: Access control with IAM — https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Documentation: Create standard repositories — https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud Documentation: Artifact Registry locations — https://cloud.google.com/artifact-registry/docs/repositories/repo-locations
- Google Cloud SDK Reference: `gcloud iam service-accounts create` — https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK Reference: `gcloud iam service-accounts keys create` — https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create
- Google Cloud SDK Reference: `gcloud projects add-iam-policy-binding` — https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK Reference: `gcloud services list` — https://cloud.google.com/sdk/gcloud/reference/services/list
- Google Cloud SDK Reference: `gcloud auth configure-docker` — https://cloud.google.com/sdk/gcloud/reference/auth/configure-docker
- Google Cloud IAM Documentation: Create and delete service account keys — https://cloud.google.com/iam/docs/keys-create-delete

## Issues Found
1. **Artifact Registry hostname described as region-only**: The post used `{region}-docker.pkg.dev`, but Google documents the hostname as `LOCATION-docker.pkg.dev`, where the location can be regional or multi-regional. Updated the URL format and troubleshooting wording to use `location`.

2. **Undefined `PROJECT_ID` variable**: The post used `$PROJECT_ID` in IAM commands without defining it first. Added `PROJECT_ID=$(gcloud config get-value project)` before those commands so the examples work as written.

3. **Fragile service account email lookup**: The post derived `SA_EMAIL` by filtering `gcloud iam service-accounts list` on display name. Replaced that with the deterministic service account email format `portainer-reader@${PROJECT_ID}.iam.gserviceaccount.com`, which matches Google Cloud's service account naming.

4. **Incorrect service account key sample format**: The sample JSON used `-----BEGIN RSA PRIVATE KEY-----`, but current Google Cloud JSON service account keys use `-----BEGIN PRIVATE KEY-----`. Updated the sample block accordingly.

5. **Missing Portainer authentication toggle**: Portainer's custom registry flow requires enabling Authentication before entering username and password. Added that step to the Portainer configuration instructions.

6. **Access token Docker login example not aligned with current official guidance**: The post used `docker login ... --password "$(gcloud auth print-access-token)"`. Updated it to the documented `--password-stdin` flow with the explicit Artifact Registry HTTPS endpoint.

7. **Overbroad statement about Portainer registry credential scope**: Portainer registry access is environment-scoped rather than universally global. Adjusted the stack comment and conclusion to reflect that the stored credentials apply to Portainer environments that have access to the registry.

## Review Notes
- The core approach is technically valid: using a dedicated service account with `roles/artifactregistry.reader` and `_json_key` authentication works for Artifact Registry.
- Google Cloud currently recommends access tokens or credential helpers over long-lived service account keys when possible, because service account keys are a higher-risk credential type.
- Some Google Cloud organizations disable service account key creation by policy. That does not make the post incorrect, but readers may encounter this as an environment-specific restriction.
