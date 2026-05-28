# Validation Summary: Fix Cloud Build Service Account Permission Denied Accessing Artifact Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Build
- Google Artifact Registry
- Google Cloud IAM
- Google Cloud CLI
- Docker
- Cloud Build YAML configuration

## Sources Consulted
- Google Cloud Build default service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build default service account change: https://cloud.google.com/build/docs/cloud-build-service-account-updates
- Artifact Registry Cloud Build integration: https://cloud.google.com/artifact-registry/docs/configure-cloud-build
- Artifact Registry IAM access control: https://cloud.google.com/artifact-registry/docs/access-control
- Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Artifact Registry push and pull documentation: https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Cloud Build user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud CLI reference for Artifact Registry IAM binding: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/add-iam-policy-binding

## Issues Found
- The post identified `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` as the default Cloud Build service account and `PROJECT_ID@cloudbuild.gserviceaccount.com` as a legacy account. Google Cloud documentation now describes the Compute Engine default service account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) as the default in many newer projects, while `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` is the legacy Cloud Build service account. Updated the service account list accordingly.
- Several IAM commands assumed the build service account was always `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. Updated examples to use `BUILD_SERVICE_ACCOUNT_EMAIL` placeholders so the commands apply to Compute Engine default, legacy Cloud Build, and user-specified service accounts.
- The Docker credential helper section said Cloud Build needs `gcloud auth configure-docker` and showed that command inside a `gcr.io/cloud-builders/docker` step. Official Artifact Registry documentation says Cloud Build does not need Docker authentication configuration in normal Cloud Build environments. Updated the section to explain that Cloud Build handles authentication when IAM is correct, and kept `gcloud auth configure-docker` guidance for local Docker or other CI systems.
- The default service account section implied missing `roles/editor` or `roles/cloudbuild.builds.builder` should be fixed by granting Artifact Registry, Storage Object Viewer, and Logs Writer roles. Updated this to focus on granting the specific Artifact Registry role needed for image access, and noted `roles/logging.logWriter` only for user-specified service accounts that store logs in Cloud Logging.

## Review Notes
The post is technically relevant and current after corrections. The local environment did not have the `gcloud` CLI installed, so command validation was performed against official Google Cloud documentation rather than local `--help` output.
