# Validation Summary: Create Cloud Build Triggers Using Terraform for Infrastructure-as-Code CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Terraform
- Google Cloud IAM
- Google Cloud Pub/Sub
- Google Cloud Storage
- GitHub pull request and push triggers

## Sources Consulted
- Google Cloud Build build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build user-specified service accounts: https://cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts
- Google Cloud Build default service account behavior: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/cloudbuild
- Google Cloud Build Pub/Sub notifications: https://docs.cloud.google.com/build/docs/subscribe-build-notifications
- Terraform Google provider `google_cloudbuild_trigger` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudbuild_trigger
- Google Cloud Source Repositories availability note: https://docs.cloud.google.com/source-repositories/docs/troubleshooting

## Issues Found
- The prerequisites listed Cloud Source Repositories as a general option. Google Cloud Source Repositories is no longer available to new customers as of June 17, 2024, so the post now limits that option to existing CSR customers.
- The custom Cloud Build service account example granted `roles/iam.serviceAccountUser` to the legacy Cloud Build service account. Current Cloud Build guidance for user-specified build service accounts requires the build service account itself to have the permissions needed to create builds and use the configured logging destination. The snippet now grants `roles/cloudbuild.builds.builder`, `roles/logging.logWriter`, and `roles/iam.serviceAccountUser` to the custom service account.
- The pull request trigger used `comment_control = "COMMENTS_ENABLED"` while the text said the trigger runs on every pull request. That setting requires a `/gcbrun` comment before builds run, so it was changed to `COMMENTS_DISABLED`.
- The Pub/Sub notification example created a topic named `cloud-build-notifications` and said Cloud Build automatically publishes to it. Cloud Build publishes to the default `cloud-builds` topic when it exists, unless a custom topic is configured in build options. The topic name and comment were corrected.
- Removed the now-unused `project_number` variable after the legacy Cloud Build service account binding was corrected.

## Review Notes
The Terraform version examples pin `hashicorp/terraform:1.7`, which is syntactically valid but older than current Terraform releases. Future updates could refresh the pinned version after testing the pipeline with the newer Terraform CLI.
