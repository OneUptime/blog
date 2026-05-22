# Validation Summary: How to Set Up Terraform in Google Cloud Build

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- Google Cloud Build
- Google Cloud Storage GCS backend
- Google Cloud IAM service accounts and roles
- Google Cloud Build triggers
- Google Secret Manager
- Pub/Sub build notifications

## Sources Consulted
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Cloud Build build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build build step ordering and `waitFor`: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Cloud Build GitHub trigger CLI reference: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Cloud Build user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Cloud Build approvals: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Cloud Build Secret Manager integration: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Cloud Build log storage documentation: https://cloud.google.com/build/docs/securing-builds/store-manage-build-logs
- Cloud Build Pub/Sub notifications: https://docs.cloud.google.com/build/docs/subscribe-build-notifications
- Cloud Build notifiers: https://docs.cloud.google.com/build/docs/configuring-notifications/notifiers
- Cloud Monitoring log-based alert documentation: https://cloud.google.com/logging/docs/alerting/log-based-alerts

## Issues Found
- The IAM section assumed the legacy Cloud Build service account format, which is no longer a reliable default for new projects. Updated the guidance to create and use a dedicated user-specified service account.
- The trigger examples did not attach the Terraform service account. Added `--service-account` to the plan and apply trigger examples.
- The build config examples used a user-specified service account pattern without the required logging configuration. Added `options.logging: CLOUD_LOGGING_ONLY`.
- The first Terraform step was labeled as installing Terraform, but the HashiCorp container already contains Terraform and the step only verifies the version. Updated the comment.
- The production custom role example created a role but did not grant it to the build service account. Added the missing IAM binding.
- The post said Cloud Build does not have native approval support. Updated the manual approval section to use Cloud Build trigger approvals with `--require-approval`.
- The monitoring example used a Cloud Logging-style filter with `gcloud alpha monitoring policies create --condition-filter`, which is for metric threshold or absence conditions. Replaced it with Cloud Build Pub/Sub notification guidance for failed build processing.
- The summary repeated the outdated claim that Cloud Build lacks built-in approval. Updated it to recommend gated apply workflows.

## Review Notes
- Terraform `1.7.0` is syntactically compatible with the shown commands, but it is no longer the latest Terraform release as of this review. The post pins a version intentionally, so this was left unchanged.
- The custom IAM role remains illustrative. Real Terraform permissions must be scoped to the exact resources and Google Cloud APIs managed by the Terraform configuration.
