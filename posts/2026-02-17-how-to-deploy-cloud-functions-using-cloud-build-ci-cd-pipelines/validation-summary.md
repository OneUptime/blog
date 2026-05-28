# Validation Summary: How to Deploy Cloud Functions Using Cloud Build CI/CD Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Functions / Cloud Run functions
- Google Cloud CLI (`gcloud`)
- Node.js
- Functions Framework for Node.js
- Secret Manager
- Pub/Sub triggers
- Cloud Storage Eventarc triggers
- IAM service accounts and roles

## Sources Consulted
- Google Cloud Build: Deploying to Cloud Run functions: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-functions
- Google Cloud SDK reference: `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference: `gcloud builds triggers create github`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK reference: `gcloud builds get-default-service-account`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Cloud Build build step ordering: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Functions IAM roles: https://cloud.google.com/functions/docs/reference/iam/roles
- Cloud Functions Node.js runtime support: https://cloud.google.com/functions/docs/runtime-support
- Cloud Functions Node.js runtime: https://cloud.google.com/functions/docs/concepts/nodejs-runtime
- Cloud Run functions HTTP functions: https://cloud.google.com/run/docs/write-http-functions
- Cloud Functions secrets configuration: https://cloud.google.com/functions/docs/configuring/secrets
- Cloud Storage Eventarc triggers for functions: https://cloud.google.com/functions/docs/calling/storage

## Issues Found
- The prerequisites enabled `cloudfunctions.googleapis.com` twice and omitted APIs commonly required for 2nd gen function deployment from Cloud Build. I removed the duplicate and added `run.googleapis.com` and `artifactregistry.googleapis.com`.
- The IAM setup assumed the legacy Cloud Build service account format. Google Cloud now recommends checking the active default build service account because newer projects may use a different account. I changed the snippet to use `gcloud builds get-default-service-account`.
- The IAM setup granted only `roles/cloudfunctions.developer`. Google Cloud's Cloud Build deployment guidance lists additional roles for Cloud Run functions deployments, including Cloud Run Admin, Storage Admin, Artifact Registry Writer, Logs Writer, and Cloud Build Editor. I added those role grants.
- The runtime service account example used the App Engine default service account, which is the 1st gen default. For Cloud Run functions / 2nd gen, the default runtime service account is the Compute Engine default service account. I changed it to `${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`.
- The deployment examples used `nodejs20`, which is deprecated as of April 30, 2026. I updated the function runtime examples to `nodejs22` and the Node.js build images to `node:22`.
- The timeout example used `120`; I changed it to the explicit duration value `120s`, matching the duration style used by Google Cloud CLI documentation.
- The GitHub trigger examples omitted `--region`, which current Cloud Build trigger documentation includes and notes as required for 2nd gen repositories. I added `--region="us-central1"` to both trigger commands.

## Review Notes
- The post remains focused on `gcloud functions deploy`, which is still supported for Cloud Functions / Cloud Run functions even though Google now refers to 2nd gen Cloud Functions as Cloud Run functions in current documentation.
- The secrets example is correct for environment variable secrets. Google recommends numeric versions for secret environment variables when deterministic rollout behavior is desired, while `latest` remains valid.
