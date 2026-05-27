# Validation Summary: How to Set Up Cloud Deploy with Cloud Build for an End-to-End CI/CD Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Cloud Deploy
- Artifact Registry
- Google Kubernetes Engine
- Cloud Run
- Skaffold
- Google Cloud CLI
- IAM
- Docker
- Kubernetes manifests

## Sources Consulted
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy deployment verification documentation: https://docs.cloud.google.com/deploy/docs/verify-deployment
- Google Cloud Deploy release creation documentation: https://docs.cloud.google.com/deploy/docs/deploying-application
- Google Cloud Deploy automation rules documentation: https://docs.cloud.google.com/deploy/docs/automation-rules
- Google Cloud Deploy automation resource documentation: https://docs.cloud.google.com/deploy/docs/automation-resource
- Google Cloud Deploy service accounts documentation: https://docs.cloud.google.com/deploy/docs/cloud-deploy-service-account
- Google Cloud Build default service account documentation: https://docs.cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build default service account change documentation: https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates
- Google Cloud SDK reference for `gcloud builds get-default-service-account`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Google Cloud SDK reference for `gcloud builds triggers create github`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK reference for `gcloud deploy rollouts list`: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Skaffold schema/reference documentation: https://skaffold.dev/docs/references/yaml/

## Issues Found
- The Skaffold `verify.timeout` example used `300s`, but the Skaffold schema represents this timeout as an integer number of seconds. Changed it to `300`.
- The IAM section assumed the legacy Cloud Build service account format, `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. Google Cloud now documents that default Cloud Build service accounts vary by project and organization settings, so the post now uses `gcloud builds get-default-service-account`.
- The Cloud Build service account needed permission to push images to Artifact Registry. Added a `roles/artifactregistry.writer` binding.
- The IAM section granted `actAs` on `deploy-sa` but the targets did not use that execution service account or grant it Cloud Deploy/runtime permissions. Added `executionConfigs` to the targets and added `roles/clouddeploy.jobRunner`, `roles/container.developer`, and `roles/artifactregistry.reader` bindings for `deploy-sa`.
- The Automation YAML used `metadata.name: auto-promote-to-staging`, a top-level `deliveryPipeline` field, and `selector` as a list. Cloud Deploy automation resources are children of a delivery pipeline and use `metadata.name: PIPELINE/PURPOSE` with `selector.targets`. Updated the snippet accordingly.
- The `promoteReleaseRule` snippet used `name`, `wait: 120s`, and `toTargetId`. Cloud Deploy automation rules use `id`, minute-based wait values such as `2m`, and `destinationTargetId`. Updated the fields.
- The automation service account lacked the permissions needed to promote releases and act as the execution service account. Added the Cloud Deploy releaser role, the service account user binding, and the command to apply the automation resource.

## Review Notes
The core Cloud Build, release creation, trigger, delivery pipeline, target, and rollout commands are consistent with current Google Cloud documentation. The post focuses on GKE examples while mentioning Cloud Run; Cloud Run targets would require `run` target definitions and service YAML instead of the GKE target examples shown.
