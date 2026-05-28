# Validation Summary: How to Migrate On-Premises Jenkins CI/CD Pipelines to Google Cloud Build

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Build
- Google Cloud SDK / gcloud CLI
- Google Kubernetes Engine
- Artifact Registry
- Secret Manager
- Jenkins Pipeline
- Docker
- Node.js and npm

## Sources Consulted
- Google Cloud Build build config schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build GitHub trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build GKE deployment guide: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Cloud Build Secret Manager guide: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build service account updates: https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates
- Google Cloud SDK default Cloud Build service account reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Google Cloud Build container image and Artifact Registry guide: https://docs.cloud.google.com/build/docs/building/build-containers
- Google Artifact Registry Container Registry shutdown guidance: https://docs.cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Google Cloud Build pricing: https://cloud.google.com/build/pricing
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/

## Issues Found
- The image examples used `gcr.io/$PROJECT_ID/...` and described pushing to Container Registry. Container Registry is deprecated and writes to Container Registry are unavailable after March 18, 2025, so the examples now use Artifact Registry paths under `us-central1-docker.pkg.dev`.
- The `gke-deploy` example passed only `--image`, `--location`, and `--cluster`. The documented build-and-deploy flow also requires a Kubernetes resource file or directory via `--filename`, so the example now includes `--filename=k8s/deployment.yaml`.
- The SonarQube and Slack examples passed Secret Manager values directly as command arguments. Cloud Build secret environment variables need shell expansion for this usage, so the examples now run through `sh -c` and use `$$SECRET_NAME` correctly.
- The Secret Manager IAM command granted access only to the legacy Cloud Build service account pattern and only for one secret. The example now retrieves the configured default build service account with `gcloud builds get-default-service-account` and grants access to both example secrets.
- The dependency cache example restored `node_modules` before running `npm ci`, but `npm ci` removes an existing `node_modules` directory before installing. The cache example now stores npm's cache directory and runs `npm ci --cache .npm-cache --prefer-offline`.
- The Cloud Build pricing section listed `$0.003` for the default machine type and 120 free build-minutes per day. Current pricing lists the default `e2-standard-2` at `$0.006` per build-minute and a promotional 2,500 free build-minutes per billing account per month for `e2-standard-2` builds in the default pool.

## Review Notes
The Cloud Build trigger commands, build step ordering with `waitFor`, `availableSecrets` structure, `images` field, artifact upload configuration, and `gcloud builds submit/list/log` examples are technically valid based on the referenced documentation. The examples assume the Artifact Registry repository, GKE cluster, Kubernetes manifest, and required IAM roles already exist.
