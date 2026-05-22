# Validation Summary: How to Use Environment Variables for Terraform Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables and environment variables
- Terraform sensitive variables, state, ephemeral values, and write-only arguments
- Terraform AWS S3 backend
- AWS, Azure, and Google Cloud Terraform provider environment variables
- GitHub Actions, GitLab CI, and Jenkins Pipeline secret handling
- Linux process environment exposure via `/proc`
- 1Password CLI and HashiCorp Vault CLI secret retrieval examples

## Sources Consulted
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform input variables and sensitive variable behavior: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform sensitive data management: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform ephemeral values: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/ephemeral
- Terraform write-only arguments: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS provider `aws_db_instance` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AzureRM provider documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/index.html.markdown
- Google provider configuration reference source: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/guides/provider_reference.html.markdown
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Jenkins Pipeline Jenkinsfile documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Linux `proc_pid_environ(5)` manual page

## Issues Found
- The description claimed environment variables avoid exposing secrets in state. Terraform sensitive variables are still stored in state unless ephemeral/write-only mechanisms are used. Updated the description to avoid that incorrect claim.
- The GCP provider example used `GOOGLE_CREDENTIALS` with a file path. The Google provider documentation distinguishes `GOOGLE_CREDENTIALS` for credential JSON content and `GOOGLE_APPLICATION_CREDENTIALS` for a path to a JSON file. Changed the example to `GOOGLE_APPLICATION_CREDENTIALS`.
- The `.env` example used unexported shell variables, which `terraform` would not receive as environment variables after `source .env`. Added `export` to the `.env` entries.
- The S3 backend example used `dynamodb_table` for locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends `use_lockfile = true`. Replaced `dynamodb_table` with `use_lockfile`.
- The process listing section overstated visibility as available to anyone who can list processes. Linux `/proc/<pid>/environ` access is permission-gated. Updated the wording to "other processes or users with sufficient permissions" and clarified that access depends on `/proc` and ptrace permissions.
- The secrets manager section said secrets are fetched "at apply time." Terraform data sources are commonly read during planning when possible, so this was narrowed to "fetching secrets from a secrets manager."
- The final secrets manager paragraph called state storage an unavoidable limitation of Terraform. Terraform 1.11+ supports provider-defined write-only arguments, and the AWS provider supports `aws_db_instance.password_wo`. Updated the wording to explain that regular arguments still store values in state and to mention write-only arguments where available.

## Review Notes
- The post is now technically accurate for current Terraform documentation as of 2026-05-22.
- The examples remain illustrative; the `aws_db_instance` snippets omit unrelated required production settings intentionally under the existing "other configuration" style.
