# Validation Summary: How to Use Environment Variables and Build-Time Secrets in Cloud Functions Gen 2

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Google Cloud Functions Gen 2 / Cloud Run functions
- Google Cloud CLI (`gcloud functions deploy`)
- Environment variables and build-time environment variables
- Secret Manager
- Cloud Build secrets (`availableSecrets`, `secretEnv`)
- Node.js Functions Framework
- Python Functions Framework
- Terraform `google_cloudfunctions2_function`

## Sources Consulted
- Google Cloud SDK reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Cloud Run functions IAM and runtime service accounts: https://cloud.google.com/functions/docs/concepts/iam
- Cloud Run / Cloud Run functions environment variables: https://cloud.google.com/functions/docs/configuring/env-var
- Cloud Run / Cloud Run functions secrets configuration: https://cloud.google.com/functions/docs/configuring/secrets
- Cloud Run source deploy build environment variables: https://cloud.google.com/run/docs/configuring/services/build-environment-variables
- Cloud Build Secret Manager integration: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Terraform Google provider `google_cloudfunctions2_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function

## Issues Found
- The examples used `nodejs20`, which is now in the deprecated phase as of 2026-04-30. Updated deployment and Terraform examples to `nodejs22`, which remains supported.
- The Secret Manager IAM examples granted access to `PROJECT_ID@appspot.gserviceaccount.com`, the App Engine default service account used by 1st gen functions. Updated the examples to use the Gen 2 default runtime service account format, `PROJECT_NUMBER-compute@developer.gserviceaccount.com`.
- The post said secret environment variable values are not visible in the function configuration. Clarified that secret references are visible, but secret values are not stored as plain environment variable values.
- The build-time secrets example incorrectly used `--set-build-env-vars` with a Secret Manager resource path, implying that the flag dereferences secrets. Replaced it with a Cloud Build `availableSecrets` / `secretEnv` example and clarified that values passed to `--set-build-env-vars` are still literal build environment variables.

## Review Notes
The remaining examples are syntactically plausible and aligned with current Google Cloud documentation. The post could be improved in the future by recommending a user-managed runtime service account instead of the default Compute Engine service account, but the current examples are technically valid after correction.
