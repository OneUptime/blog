# Validation Summary: How to Troubleshoot Cloud Build Failures Due to Permission

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Build
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM and service accounts
- Artifact Registry and Container Registry
- Cloud Run, Cloud Functions, and GKE deployment permissions
- Secret Manager
- Docker and `cloudbuild.yaml`

## Sources Consulted
- Google Cloud Build: Default Cloud Build service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build: Configure access for the default Cloud Build service account: https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account
- Google Cloud Build: Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Submit a build using CLI and API: https://docs.cloud.google.com/build/docs/running-builds/submit-build-via-cli-api
- Google Cloud SDK: `gcloud builds log`: https://cloud.google.com/sdk/gcloud/reference/builds/log
- Google Cloud SDK: `gcloud builds submit`: https://cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry: Connect to Cloud Build: https://cloud.google.com/artifact-registry/docs/configure-cloud-build
- Google Cloud Build: Use secrets from Secret Manager: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build: Increase vCPU for builds: https://docs.cloud.google.com/build/docs/optimize-builds/increase-vcpu-for-builds
- Google Cloud IAM: Service account `actAs` permission: https://cloud.google.com/iam/docs/service-accounts-actas
- Google Cloud IAM: Service accounts overview: https://cloud.google.com/iam/docs/service-account-overview

## Issues Found
- The post stated that the default Cloud Build service account is always `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. Updated this to reflect current Cloud Build behavior: builds can use the Compute Engine default service account, the legacy Cloud Build service account, or a user-specified service account depending on project and organization settings.
- The build context error example used a specific 500 MB limit that is not documented as a current Cloud Build source context limit. Replaced it with a generic source archive or Docker build context size failure message while preserving the troubleshooting guidance.
- The post stated that Cloud Build's default timeout is 10 minutes. Updated it to 60 minutes, matching the current Cloud Build build config schema.
- The machine type list called `E2_MEDIUM` the default. Revised this to say supported machine types include `E2_MEDIUM`, `E2_HIGHCPU_8`, and `E2_HIGHCPU_32`.
- The Secret Manager Docker build example passed `$$API_KEY` directly to Docker without a shell. Updated the step to use `entrypoint: bash` and `args: ['-c', ...]` so the secret environment variable is expanded as documented.

## Review Notes
The quick permission script grants broad project-level roles, including Service Account User. This can work, but a future revision should recommend least-privilege grants scoped to the specific runtime service account or target resource wherever possible.
