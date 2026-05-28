# Validation Summary: How to Build and Push Docker Images to Artifact Registry Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Registry
- Google Cloud Build
- Google Cloud CLI
- Docker
- Docker Buildx
- Artifact Analysis vulnerability scanning
- Artifact Registry cleanup policies

## Sources Consulted
- Google Cloud Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry repository creation: https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud Artifact Registry locations: https://docs.cloud.google.com/artifact-registry/docs/repositories/repo-locations
- Google Cloud Artifact Registry access control: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry Cloud Build integration: https://docs.cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Cloud Build config file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build container image storage: https://docs.cloud.google.com/build/docs/building/build-containers
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Artifact Registry cleanup policies: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Cloud CLI `gcloud artifacts repositories set-cleanup-policies`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/set-cleanup-policies
- Google Cloud Artifact Analysis automatic scanning: https://docs.cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- Google Cloud CLI `gcloud artifacts repositories update`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- Google Cloud CLI `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/

## Issues Found
- Updated the Container Registry status. The post said Container Registry still works in maintenance mode, but official Google Cloud documentation says Container Registry is deprecated and writes are no longer available after March 18, 2025.
- Corrected the Cloud Build permissions explanation. The post incorrectly said Cloud Build has the Artifact Registry Writer role by default. The current behavior depends on the default service account and project relationship; default Cloud Build service accounts can upload and download artifacts in same-project repositories, while cross-project or user-specified service accounts need explicit Artifact Registry Writer access.
- Fixed the explicit test step. The original test step used the newly built image as the Cloud Build step image, which would require pulling it before it had been pushed. The snippet now runs tests with `docker run` against the locally built image.
- Added `dynamicSubstitutions: true` to the `_AR_REPO` substitution example because it references `${PROJECT_ID}` inside a user-defined substitution.
- Fixed branch-based tag examples to sanitize `/` characters in branch names before using them in Docker tags.
- Fixed the cleanup policy JSON. The original block contained a JSON comment, used non-documentation casing for `tagState`, and did not implement the stated "keep the last 10 versions" behavior. The updated policy uses valid JSON, documented duration syntax, a `mostRecentVersions` keep policy, and the required `tagState` for tag prefixes.
- Corrected vulnerability scanning instructions. The current `gcloud artifacts repositories update` flag is `--allow-vulnerability-scanning`, and automatic scanning requires the Container Scanning API.
- Updated terminology from Container Analysis to Artifact Analysis for vulnerability scanning.

## Review Notes
The remaining examples are technically valid as tutorial snippets. The multi-architecture Buildx example depends on the Docker builder image having Buildx support and on the application Dockerfile being compatible with both target architectures.
