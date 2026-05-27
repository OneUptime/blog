# Validation Summary: How to Set Up Continuous Deployment to App Engine Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- App Engine
- Cloud Build
- Cloud Build GitHub triggers
- Google Cloud CLI
- IAM service accounts and roles
- Pub/Sub build notifications
- Python and Node.js build steps

## Sources Consulted
- Google Cloud Build: Deploying to App Engine - https://cloud.google.com/build/docs/deploying-builds/deploy-appengine
- Google Cloud Build: Default Cloud Build service account - https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build: Configure user-specified service accounts - https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build: Passing data between build steps - https://cloud.google.com/build/docs/configuring-builds/pass-data-between-steps
- Google Cloud Build: Substituting variable values - https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build: Build configuration file schema - https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build: Subscribe to build notifications - https://cloud.google.com/build/docs/subscribe-build-notifications
- Google Cloud SDK: gcloud builds triggers create github - https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK: gcloud app deploy - https://cloud.google.com/sdk/gcloud/reference/app/deploy
- Google Cloud SDK: gcloud app services set-traffic - https://cloud.google.com/sdk/gcloud/reference/app/services/set-traffic
- App Engine standard environment: Configure service accounts - https://cloud.google.com/appengine/docs/standard/configure-service-accounts

## Issues Found
- The post assumed the legacy Cloud Build service account, `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`, would be the account used by builds. Current Cloud Build behavior can use different default service accounts, and Google recommends specifying a service account for triggers. Updated the IAM setup to create a dedicated deployment service account and added `--service-account` to trigger commands.
- The IAM roles were incomplete for current App Engine deployments from Cloud Build. Added the documented build roles for App Engine deployment, logging, Cloud Storage, Artifact Registry, and Cloud Build execution, and scoped Service Account User to the App Engine default service account.
- Python examples installed dependencies in one Cloud Build step and ran tests in a later step. Cloud Build discards each step container, so packages installed outside `/workspace` or a shared volume are not available to later containers. Combined Python dependency installation and tests into the same step.
- User-specified trigger service accounts need an explicit build log storage option. Added `options: logging: CLOUD_LOGGING_ONLY` to the Cloud Build snippets that use the dedicated trigger service account.
- The canary traffic example used `--splits=canary=0.1`, but `gcloud app services set-traffic` treats split values as relative weights. A single split entry routes all traffic to that version. Updated the example to include both the stable and canary versions.
- The "failure notification" wording implied that Cloud Build build options themselves create failure notifications. Reworded it to describe logging and build options, leaving the Pub/Sub notification setup as the notification mechanism.

## Review Notes
The examples are technically valid as templates, but users still need to replace placeholders such as project IDs, repository names, service account names, and the currently serving App Engine version in the canary example.
