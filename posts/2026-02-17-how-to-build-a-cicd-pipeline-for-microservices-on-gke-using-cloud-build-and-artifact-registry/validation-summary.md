# Validation Summary: How to Build a CI/CD Pipeline for Microservices on GKE Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Kubernetes Engine
- Artifact Registry
- Artifact Analysis / Container Scanning
- Google Cloud CLI
- Kubernetes Deployments
- Docker
- Node.js

## Sources Consulted
- Google Cloud Build: Deploying to GKE: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Cloud Build: Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Substituting variable values: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build: Default Cloud Build service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build: Configure user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build: Store artifacts in Artifact Registry: https://cloud.google.com/build/docs/building/store-artifacts-in-artifact-registry
- Google Cloud SDK: gcloud builds triggers create github: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK: gcloud artifacts repositories create: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK: gcloud artifacts repositories update: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- Google Cloud SDK: gcloud artifacts vulnerabilities list: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Artifact Analysis: Enable automatic scanning: https://docs.cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- Google Artifact Analysis: Scan packages automatically: https://docs.cloud.google.com/artifact-analysis/docs/package-scan-automatic
- Kubernetes: Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- GoogleCloudPlatform cloud-builders repository: https://github.com/GoogleCloudPlatform/cloud-builders

## Issues Found
- The prerequisite API list omitted the Container Scanning API required for Artifact Analysis vulnerability scanning. Added `containerscanning.googleapis.com`.
- The IAM example granted GKE permissions only to the legacy Cloud Build service account. Current Cloud Build guidance recommends a user-specified service account because the default service account can vary by project. Replaced the legacy service account binding with a dedicated build service account and added GKE, Artifact Registry Writer, and Logs Writer roles.
- The trigger examples did not specify the dedicated service account. Added `--service-account` to both trigger commands.
- The automated rollback example used a Cloud Function that assumed Cloud Build substitutions and a configured `kubectl` context would be available in the event handler. Replaced it with a Cloud Build `kubectl` verification step that runs `kubectl rollout undo` directly if rollout verification fails.
- The Artifact Registry vulnerability scanning command used the outdated `--enable-vulnerability-scanning` flag. Replaced it with the current `--allow-vulnerability-scanning` flag.
- The vulnerability results command used `gcloud artifacts docker images list --show-occurrences`, which is not the documented current command for listing vulnerabilities for an artifact. Replaced it with `gcloud artifacts vulnerabilities list` against an image digest.

## Review Notes
The main Cloud Build YAML structure, substitutions, `waitFor`, `images`, timeout, `E2_HIGHCPU_8`, `CLOUD_LOGGING_ONLY`, Docker builder usage, `gke-deploy` usage, GitHub trigger flags, Kubernetes rolling update settings, and probe fields are consistent with current official documentation. Local `gcloud` verification could not be run because the Google Cloud CLI is not installed in this workspace.
