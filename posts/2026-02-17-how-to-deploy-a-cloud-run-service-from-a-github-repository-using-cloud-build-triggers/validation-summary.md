# Validation Summary: How to Deploy a Cloud Run Service from a GitHub Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Build
- Cloud Build triggers
- Cloud Build repositories and GitHub connections
- Artifact Registry
- Google Cloud IAM
- Pub/Sub build notifications
- Docker
- Google Cloud CLI

## Sources Consulted
- Google Cloud Build: Deploying to Cloud Run using Cloud Build: https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Google Cloud Service Usage: Enabling services: https://cloud.google.com/service-usage/docs/enable-disable
- Google Cloud Build: Connect to a GitHub repository: https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github
- Google Cloud SDK reference: gcloud builds connections create github: https://cloud.google.com/sdk/gcloud/reference/builds/connections/create/github
- Google Cloud SDK reference: gcloud builds repositories create: https://cloud.google.com/sdk/gcloud/reference/builds/repositories/create
- Google Cloud SDK reference: gcloud builds triggers create github: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build: Substituting variable values: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Artifact Registry: Create standard repositories: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Cloud Build: Subscribe to build notifications: https://cloud.google.com/build/docs/subscribe-build-notifications
- Google Cloud SDK reference: gcloud builds list: https://cloud.google.com/sdk/gcloud/reference/builds/list
- Google Cloud SDK reference: gcloud builds log: https://cloud.google.com/sdk/gcloud/reference/builds/log

## Issues Found
- The IAM setup assumed the legacy Cloud Build service account address, `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`. Google changed Cloud Build default service account behavior for newer projects, so this can grant roles to the wrong identity. Updated the command to use `gcloud builds get-default-service-account` and grant roles to the actual default Cloud Build service account.
- The IAM setup only granted Cloud Run Admin and Service Account User. Official Cloud Build-to-Cloud Run guidance also requires permissions for Artifact Registry writes, Cloud Logging, and build execution. Added `roles/artifactregistry.writer`, `roles/logging.logWriter`, and `roles/cloudbuild.builds.editor`.
- The API enablement command omitted Cloud Resource Manager, which is needed for project IAM operations, and Pub/Sub, which is needed for the notification commands. Added both services to the `gcloud services enable` command.
- The Pub/Sub notification example created a `cloud-build-notifications` topic but subscribed to `cloud-builds`, leaving the created topic unused. Updated the example to create the default `cloud-builds` topic that Cloud Build publishes to by default.

## Review Notes
The Cloud Build GitHub connection, repository linking, trigger creation, build substitutions, Artifact Registry repository creation, build log commands, and Cloud Run deploy examples match current official documentation. The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
