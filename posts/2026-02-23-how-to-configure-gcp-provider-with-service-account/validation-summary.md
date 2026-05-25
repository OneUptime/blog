# Validation Summary: How to Configure GCP Provider with Service Account

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Google provider
- Terraform GCS backend
- Google Cloud IAM
- Google Cloud service accounts
- Workload Identity Federation
- GitHub Actions
- Google Cloud CLI
- Cloud Storage

## Sources Consulted
- Google Cloud IAM service account creation documentation: https://cloud.google.com/iam/docs/service-accounts-create
- Google Cloud IAM service account credentials documentation: https://cloud.google.com/iam/docs/service-account-creds
- Google Cloud IAM service account key creation and deletion documentation: https://cloud.google.com/iam/docs/keys-create-delete
- Google Cloud Workload Identity Federation for deployment pipelines documentation: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Terraform Google provider registry page: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Google Cloud SDK `gcloud services enable` reference: https://cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud Storage Object Versioning documentation: https://cloud.google.com/storage/docs/using-object-versioning

## Issues Found
- The Workload Identity Federation example used a literal `PROJECT_NUMBER` placeholder in the IAM member string without showing how to get it. Changed the example to retrieve `PROJECT_NUMBER` with `gcloud projects describe` and interpolate it in the `principalSet` identifier because Google Cloud requires the project number, not the project ID, in Workload Identity Federation principal identifiers.
- The Workload Identity Federation provider example did not include an attribute condition. Added `attribute.repository_owner` to the mapping and an `--attribute-condition` that restricts tokens to the example GitHub organization, matching current Google and google-github-actions guidance to restrict admission to the pool.
- The GitHub Actions example used `google-github-actions/auth@v2`. Updated it to `google-github-actions/auth@v3`, the current documented major version.
- The GCS backend comment said credentials are inherited from the provider. Corrected it because Terraform backends are initialized separately from providers; the GCS backend uses its own backend credentials configuration or Application Default Credentials.
- The Terraform Google provider version constraint used `~> 6.0`. Updated it to `~> 7.0` because the current official provider major version is 7.x.

## Review Notes
The remaining examples are technically valid, but production users should continue tightening IAM roles to the smallest set needed for the actual Terraform resources and should prefer keyless authentication over service account keys.
