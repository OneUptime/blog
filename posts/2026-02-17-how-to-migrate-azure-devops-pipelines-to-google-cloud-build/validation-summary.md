# Validation Summary: How to Migrate Azure DevOps Pipelines to Google Cloud Build

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure DevOps Pipelines
- Azure DevOps CLI
- Azure Pipelines YAML tasks
- Google Cloud Build
- Google Cloud Build triggers
- Google Secret Manager
- Google Cloud Deploy
- Google Kubernetes Engine
- Cloud Run
- Artifact Registry
- Cloud Storage
- IAM service accounts

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build Secret Manager integration: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- gcloud GitHub trigger reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Cloud Deploy configuration schema: https://docs.cloud.google.com/deploy/docs/config-files
- gcloud deploy apply reference: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/apply
- Cloud Build default service account change: https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates
- Azure DevOps CLI pipeline management: https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/manage-pipelines-with-azure-cli
- Azure Pipelines stages schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-stage
- Azure Pipelines predefined variables: https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables
- Azure Pipelines task references: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/

## Issues Found
- The Secret Manager example contained two top-level `steps` keys in one YAML snippet, which would make the example ambiguous and invalid as a single Cloud Build config. Split it into two separate YAML snippets for substitutions and `availableSecrets`.
- The direct Secret Manager example used the `gcloud` builder and then ran `npm run migrate`, but the `gcloud` builder image is not a Node.js runtime. Removed the `npm` command from that example and left the Node migration command in the `availableSecrets` example.
- The `PublishTestResults` conversion used `gsutil` inside the `node:20` image, which does not include the Cloud SDK tools. Split the example into a Node test step followed by a `gcr.io/cloud-builders/gsutil` upload step.
- The Cloud Deploy command used `gcloud deploy delivery-pipelines create`, but the stable `delivery-pipelines` command group does not provide a `create` subcommand for declarative YAML. Replaced it with `gcloud deploy apply --file=clouddeploy.yaml --region=us-central1`.
- The GKE Cloud Deploy canary `serviceNetworking` example specified only the Kubernetes service. Added the required deployment name.
- The IAM example assumed the legacy Cloud Build service account format `${PROJECT_NUM}@cloudbuild.gserviceaccount.com`. Updated it to use `gcloud builds get-default-service-account`, which handles projects using either the legacy Cloud Build service account or the Compute Engine default service account.

## Review Notes
- The Cloud Build trigger examples use first-generation GitHub trigger flags. They are still valid, but second-generation repository connections commonly use `--repository` with a regional trigger.
- The Cloud Build examples assume the Artifact Registry repository, Cloud Storage bucket, GKE cluster, and IAM grants already exist.
