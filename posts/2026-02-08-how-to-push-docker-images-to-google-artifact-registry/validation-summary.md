# Validation Summary: How to Push Docker Images to Google Artifact Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Buildx
- Google Cloud CLI
- Google Artifact Registry
- Artifact Analysis / Container Scanning API
- Google Cloud IAM
- GitHub Actions
- Workload Identity Federation
- Google Kubernetes Engine

## Sources Consulted
- Google Cloud Artifact Registry quickstart for Docker: https://docs.cloud.google.com/artifact-registry/docs/docker/store-docker-container-images
- Google Cloud Artifact Registry image naming documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Artifact Registry push and pull documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Google Cloud SDK reference for `gcloud artifacts repositories create`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK reference for `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud SDK reference for `gcloud artifacts docker tags list`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- Google Cloud Artifact Registry cleanup policy documentation: https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Cloud Artifact Registry access control documentation: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry GKE integration documentation: https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud Artifact Analysis automatic scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README: https://github.com/google-github-actions/setup-gcloud
- Homebrew cask page for `gcloud-cli`: https://formulae.brew.sh/cask/gcloud-cli
- Docker Buildx documentation: https://docs.docker.com/build/building/multi-platform/

## Issues Found
- The macOS Homebrew install command used `brew install google-cloud-sdk`, which is not the current Homebrew cask command for the Google Cloud CLI. Changed it to `brew install --cask gcloud-cli`.
- The post said Artifact Registry provides vulnerability scanning "out of the box." Artifact Analysis scanning must be enabled at the project/API and repository settings level. Updated the wording to say scanning is available when Artifact Analysis is enabled.
- The GitHub Actions workflow used `google-github-actions/auth@v2`; the current major version is `v3`. Updated both auth snippets to `@v3`.
- The GitHub Actions workflow used `gcloud` without explicitly setting up the Cloud SDK. Added `google-github-actions/setup-gcloud@v3` after authentication.
- The Workload Identity Federation example omitted `project_id`, which the official auth documentation notes may be required for downstream tools such as `gcloud`. Added `project_id: ${{ env.PROJECT_ID }}`.
- The GKE pull-access comment was too broad. Same-project automatic pulls only work when GKE version, node service account, and access-scope requirements are met. Updated the comment with those conditions.
- The cleanup policy JSON used an invalid top-level `cleanupPolicies` wrapper, `id` instead of `name`, and uppercase `ANY` for `tagState`. Changed the file to the documented top-level array format with `name` fields and lowercase `any`.
- The closing paragraph implied vulnerability scanning always catches issues before deployment. Updated it to clarify that scanning applies when enabled.

## Review Notes
The main Artifact Registry commands, image naming pattern, Docker tag/push/pull examples, tag listing/describing commands, IAM writer role, and Docker Buildx multi-architecture example match current official documentation. The local environment did not have `gcloud` installed, so CLI validation was performed against official command references rather than local `--help` output.
