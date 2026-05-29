# Validation Summary: How to Authenticate Docker with Google Artifact Registry

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Google Cloud Artifact Registry
- Docker authentication and Docker credential helpers
- Google Cloud CLI (`gcloud`)
- Standalone `docker-credential-gcr`
- Google IAM service accounts and Artifact Registry roles
- Workload Identity Federation for GitHub Actions
- Google Kubernetes Engine image pulls
- Cloud Build

## Sources Consulted
- Google Cloud Artifact Registry: Configure authentication to Artifact Registry for Docker: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry: Deploying to Google Kubernetes Engine: https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud Artifact Registry: Access control with IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google GitHub Actions `auth` README: https://github.com/google-github-actions/auth
- Google GitHub Actions `setup-gcloud` README: https://github.com/google-github-actions/setup-gcloud
- Docker CLI reference: `docker login`: https://docs.docker.com/reference/cli/docker/login/
- GoogleCloudPlatform `docker-credential-gcr` repository: https://github.com/GoogleCloudPlatform/docker-credential-gcr

## Issues Found
- The standalone credential helper install example pinned `docker-credential-gcr` to `2.1.8`, while current Google documentation uses `2.1.29`. Updated the version and adjusted the archive name to the current documented `OS`/`ARCH` format.
- The GitHub Actions example used `google-github-actions/auth@v2` and `setup-gcloud@v2`. Updated both to current major versions shown in the official action documentation.
- The GKE section said same-project image pulls work automatically without qualifications. Updated it to include the documented requirements for node service account, access scopes, supported GKE version, and IAM permissions.
- The Docker config conflict note implied `auths` entries might override or confuse `credHelpers` for the same host. Updated it to match Docker/Google documentation: host-specific credential helpers take precedence and `auths` entries for that host are ignored.

## Review Notes
The overall authentication methods, hostnames, Docker login usernames (`oauth2accesstoken` and `_json_key`), Artifact Registry IAM roles, and `gcloud auth configure-docker` usage are technically correct. Service account keys remain valid but are the least secure method; the post correctly recommends avoiding them where possible.
