# Validation Summary: How to Manage GCP Secrets in Terraform Using Google Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Terraform
- HashiCorp Google provider
- HashiCorp Random provider
- Google Cloud IAM
- Cloud Run
- Cloud Functions 2nd gen
- Pub/Sub
- Python Secret Manager client library

## Sources Consulted
- HashiCorp Google provider: `google_secret_manager_secret` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- HashiCorp Google provider: `google_secret_manager_secret_version` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version
- HashiCorp Google provider: Secret Manager IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
- HashiCorp Google provider: `google_cloud_run_v2_service` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- HashiCorp Google provider: `google_cloudfunctions2_function` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- HashiCorp Random provider: ephemeral `random_password`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/ephemeral-resources/password
- Terraform write-only arguments documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/resources/write-only-arguments
- Terraform sensitive input variables documentation: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Google Cloud Secret Manager access control documentation: https://docs.cloud.google.com/secret-manager/docs/manage-access-to-secrets
- Google Cloud Secret Manager rotation documentation: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager Python client library documentation: https://docs.cloud.google.com/secret-manager/docs/reference/libraries
- Google Cloud Run secrets configuration documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets

## Issues Found
- The post stated that Terraform secret values necessarily end up in state. This is accurate for `secret_data` and normal managed password resources, but current Terraform and the Google provider support write-only secret data via `secret_data_wo`. Updated the explanation and examples to use `secret_data_wo`, `secret_data_wo_version`, and an ephemeral `random_password`.
- The rotation section said applications know when secrets change. Secret Manager rotation schedules notify Pub/Sub when rotation is due; they do not rotate the value by themselves. Updated the wording to say "when rotation is due."
- The best-practices section said the platform handles caching for injected secrets. The official behavior is better described as platform-managed injection, with version update caveats depending on environment variables versus mounted volumes. Updated the wording to "handles injection."

## Review Notes
The remaining Terraform resource blocks, IAM role names, Cloud Run and Cloud Functions secret environment variable fields, Terraform variable passing examples, Secret Manager rotation fields, and Python `access_secret_version` example are consistent with current official documentation. Secret values read by Terraform data sources or passed into other resources should still be treated as sensitive because downstream resources and state can expose them depending on provider behavior.
