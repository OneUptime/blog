# Validation Summary: How to Set Up Automatic Deployment of Cloud Functions from a Git Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Run functions / Cloud Functions
- Google Cloud CLI (`gcloud`)
- GitHub and Cloud Build repository connections
- Cloud Source Repositories
- Secret Manager
- IAM service accounts and roles
- Node.js runtimes
- YAML build configuration

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build step ordering and `waitFor`: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build GitHub trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build GitHub connection CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/connections/create/github
- `gcloud functions deploy` CLI reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Cloud Run functions identity documentation: https://cloud.google.com/functions/docs/securing/function-identity
- Cloud Build default service account access documentation: https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account
- Cloud Source Repositories resources page: https://docs.cloud.google.com/source-repositories/docs/resources

## Issues Found
- The post used the `node:18` builder image and `nodejs18` Cloud Functions runtime. Node.js 18 is decommissioned for Cloud Run functions as of October 30, 2025, so I updated the examples to `node:22` and `nodejs22`.
- The Cloud Build example claimed that both dependency-install steps run in parallel, but `install-sendNotifications` had no `waitFor` field and would wait for all prior steps. I added `waitFor: ["-"]` so the example matches the explanation.
- The GitHub trigger examples use a 2nd gen repository resource path but did not specify `--region`. I added `--region "us-central1"` to the trigger creation commands.
- The permissions section deployed two functions with two runtime service accounts, but only granted `roles/iam.serviceAccountUser` on one of them. I added the corresponding grant for `notifier-sa`.
- The Cloud Source Repositories section implied it was generally available for new use. I clarified that it applies to existing Cloud Source Repositories users and that the product is not available to new customers.
- The secrets example mixed runtime secret binding (`--set-secrets`) with an unused Cloud Build `availableSecrets` block. I removed the unused block and adjusted the wording to describe passing a Secret Manager reference at deployment time.
- The selective deployment section referenced Cloud Build's `_CHANGED_FILES`, which is not a documented built-in substitution. I changed the guidance to use trigger file filters or a custom script.

## Review Notes
The examples are still intentionally generic and assume the referenced Pub/Sub topics, function entry points, service accounts, test scripts, and permissions already exist. For production use, a user-specified Cloud Build service account on the trigger would be preferable to relying on the legacy default service account.
