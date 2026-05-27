# Validation Summary: How to Update CI/CD Pipelines to Use Artifact Registry After Container Registry

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Container Registry
- Google Cloud Build
- Google Cloud CLI
- Docker
- GitHub Actions
- GitLab CI
- Jenkins Declarative Pipeline
- Kubernetes / GKE image pull testing

## Sources Consulted
- Google Cloud Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry: gcr.io repositories: https://cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Google Cloud Artifact Registry: Configure authentication to Artifact Registry for Docker: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry: Repository and image names: https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud SDK: gcloud artifacts repositories create: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud Build: Store artifacts in Artifact Registry: https://cloud.google.com/build/docs/building/store-artifacts-in-artifact-registry
- Google Cloud Build: Default Cloud Build service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud SDK: gcloud builds get-default-service-account: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README: https://github.com/google-github-actions/setup-gcloud
- Jenkins Pipeline Syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Using a Jenkinsfile: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/

## Issues Found
- The opening stated that every pipeline pushing to `gcr.io` needs to be updated. Google supports `gcr.io` repositories hosted on Artifact Registry after Container Registry shutdown, so the wording was changed to say pipelines should be reviewed and migrated either to Artifact Registry-hosted `gcr.io` repositories or to `pkg.dev` repositories.
- The Cloud Build section assumed the default service account is always `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. Google Cloud Build can now use either the Compute Engine default service account or the legacy Cloud Build service account depending on project and organization settings, so the guidance now tells readers to check the default with `gcloud builds get-default-service-account` and grant access to the actual build service account.
- The GitHub Actions workflow authenticated with `google-github-actions/auth@v2` and then called `gcloud` without explicitly installing/configuring the Cloud SDK. Added `google-github-actions/setup-gcloud@v3`, which is the documented setup action for using `gcloud` after authentication.
- The Jenkins Declarative Pipeline examples omitted `agent`, which makes the examples incomplete as Declarative Pipeline definitions. Added `agent any` to both Jenkins snippets.

## Review Notes
The core Artifact Registry image naming format, `gcloud artifacts repositories create` usage, Docker authentication commands, service account key login username, Cloud Build image configuration, GitLab CI YAML structure, and Kubernetes pull-test command are technically correct. Service account keys remain valid but are discouraged by Google in favor of short-lived credentials or credential helpers where possible.
