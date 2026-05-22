# Validation Summary: How to Handle Terraform Secrets in CI/CD Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- GitHub Actions
- GitLab CI/CD variables
- HashiCorp Vault and vault-action
- AWS Secrets Manager
- SOPS
- AWS S3 Terraform backend
- AWS CLI

## Sources Consulted
- HashiCorp Terraform sensitive input variables: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- HashiCorp Terraform CLI environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform apply command: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- HashiCorp Vault GitHub Actions guidance: https://developer.hashicorp.com/vault/docs/platform/github-actions
- HashiCorp vault-action documentation: https://github.com/hashicorp/vault-action
- HashiCorp Vault JWT/OIDC authentication: https://developer.hashicorp.com/vault/docs/auth/jwt
- Terraform Vault provider documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs
- Terraform AWS provider Secrets Manager secret version documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- GitHub Actions workflow commands: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- SOPS documentation: https://getsops.io/
- SOPS releases: https://github.com/getsops/sops/releases
- AWS CLI update-secret command: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/update-secret.html

## Issues Found
- The GitHub Actions examples pinned Terraform 1.7.0, which is old relative to the current stable Terraform release line. Updated the examples to Terraform 1.15.4 based on the official HashiCorp releases page.
- The Vault GitHub Actions snippet used JWT authentication but did not mention the required GitHub Actions `id-token: write` permission. Added a note in the snippet so the OIDC token can be issued.
- The SOPS section called the project "Mozilla SOPS" and installed SOPS 3.8.1. Updated the wording to "SOPS" and refreshed the installation example to SOPS 3.11.0 from the current getsops release artifacts.
- The GitHub Actions masking snippet tried to mask `TF_VAR_` values without making those environment variables available to the masking step. Added the relevant `env` entries to the masking and plan steps.
- The S3 backend example used `dynamodb_table`, which is deprecated for S3 backend locking in current Terraform. Replaced it with `use_lockfile = true` and added `s3:DeleteObject` to the example state access policy so lock files can be deleted.
- The Vault dynamic secrets section claimed credentials would already be invalid if state were compromised. Updated the wording to clarify that credentials remain valid until their TTL expires and that long-running workloads need a runtime refresh strategy.
- The rotation workflow ran Terraform without checking out the repository or installing Terraform. Added `actions/checkout@v4` and `hashicorp/setup-terraform@v3`.

## Review Notes
The post is now technically accurate as a practical guide. One future improvement would be to add a dedicated note about Terraform 1.10+ ephemeral values and provider write-only arguments, but that would be an expansion rather than a correction to the existing content.
