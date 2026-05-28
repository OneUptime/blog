# Validation Summary: How to Configure the Google Cloud Terraform Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Google Cloud Terraform provider
- Google Cloud authentication and Application Default Credentials
- Google Cloud service accounts and service account impersonation
- Workload Identity Federation
- GitHub Actions
- Google Cloud APIs and `google_project_service`

## Sources Consulted
- HashiCorp Terraform provider configuration reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp Terraform provider requirements reference: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform `terraform` block reference: https://developer.hashicorp.com/terraform/language/terraform
- Google Cloud Terraform authentication documentation: https://docs.cloud.google.com/docs/terraform/authentication
- Google Cloud Workload Identity Federation for deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- `google-github-actions/auth` documentation: https://github.com/google-github-actions/auth
- Terraform Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference.html
- Terraform Google `google_project_service` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service

## Issues Found
- The post described `~> 5.0` as pinning the provider version exactly. Terraform provider version constraints limit acceptable versions, while the `.terraform.lock.hcl` file records exact selected versions. Updated the wording to distinguish constraints from exact provider selections.
- The GitHub Actions Workload Identity Federation example used `google-github-actions/auth@v2`. The current documented major version is `v3`, so the workflow example was updated to `google-github-actions/auth@v3`.

## Review Notes
- The provider examples use the Google provider `~> 5.0`, which remains syntactically valid but is not the latest major line as of this review. A future content refresh could update examples to a current provider major version after checking the relevant upgrade guides.
- Local `terraform` and `gcloud` commands could not be run in this environment because neither CLI is installed, so validation was performed against official documentation.
