# Validation Summary: How to Use Cloud Build Triggers to Automatically Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build triggers
- Google Cloud Run
- Google Artifact Registry
- Google Secret Manager
- Google Cloud CLI
- Docker
- Node.js
- Express
- GitHub and Cloud Source Repositories

## Sources Consulted
- Google Cloud Build: Deploying to Cloud Run using Cloud Build: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Google Cloud Build: Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Default Cloud Build service account: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build: Configure user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build: Use secrets from Secret Manager: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud SDK: gcloud builds triggers create github: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK: gcloud builds triggers create cloud-source-repositories: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/cloud-source-repositories
- Google Cloud SDK: gcloud artifacts repositories create: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK: gcloud builds log: https://cloud.google.com/sdk/gcloud/reference/builds/log
- Google Cloud SDK: gcloud builds describe: https://docs.cloud.google.com/sdk/gcloud/reference/builds/describe

## Issues Found
- The post used the legacy Cloud Build service account email (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`). Current Cloud Build behavior can use different default service accounts, and Google recommends user-specified service accounts. I changed the permissions section to create a dedicated service account, grant the required Cloud Run, Artifact Registry, logging, and Cloud Build roles, and updated trigger commands to pass `--service-account`.
- The Cloud Build configs did not set a logging destination for the user-specified service account. Cloud Build requires user-specified service account builds to use Cloud Logging or a user-owned logs bucket. I added `options.logging: CLOUD_LOGGING_ONLY` to the Cloud Build examples.
- The permissions section omitted Artifact Registry Writer, Logs Writer, and Cloud Build build execution permissions needed by the build service account for this pipeline. I added the corresponding IAM role grants.
- The secrets example used `$$NPM_TOKEN` and `$$DATABASE_URL` directly in command arguments without running the commands through a shell. Cloud Build's Secret Manager guidance requires `bash -c` when referencing secret environment variables in `args`. I changed those steps to use `entrypoint: bash`, quoted the secret values, and kept `secretEnv`.
- The secrets example deployed an image without pushing it to Artifact Registry first. I added a Docker push step before the Cloud Run deployment.
- The secrets section did not mention enabling Secret Manager or granting Secret Manager Secret Accessor to the build service account. I added the required API enablement and IAM grant.
- The Dockerfile used `npm ci --only=production`. I changed it to `npm ci --omit=dev`, which is the current npm form for installing production dependencies only.
- The text introduced the Cloud Source Repositories command as "other Git providers", which was imprecise. I changed that label to "For Cloud Source Repositories".

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was done against official Google Cloud SDK reference pages rather than local `--help` output.
