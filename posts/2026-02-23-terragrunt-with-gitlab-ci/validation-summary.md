# Validation Summary: How to Use Terragrunt with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- GitLab CI/CD
- GitLab OIDC ID tokens
- AWS IAM and STS
- Docker
- YAML
- Python

## Sources Consulted
- Terragrunt CLI `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags documentation: https://docs.terragrunt.com/reference/cli/global-flags/
- GitLab OIDC ID token documentation: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab AWS OIDC documentation: https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- AWS IAM `CreateOpenIDConnectProvider` API documentation: https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateOpenIDConnectProvider.html
- Terraform AWS provider `aws_iam_openid_connect_provider` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform TLS provider `tls_certificate` data source documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- Terraform releases: https://github.com/hashicorp/terraform/releases
- Terragrunt releases: https://github.com/gruntwork-io/terragrunt/releases

## Issues Found
- Updated the Docker image versions from Terraform 1.7.0 and Terragrunt 0.55.0 to current stable versions available at review time, Terraform 1.15.4 and Terragrunt 1.0.4.
- Added `aws-cli` to the CI image because the OIDC setup uses `aws sts assume-role-with-web-identity`.
- Replaced legacy Terragrunt `run-all`, `--terragrunt-non-interactive`, and `TERRAGRUNT_NON_INTERACTIVE` usage with the current `terragrunt run --all` command and `TG_NON_INTERACTIVE` environment variable.
- Replaced `TF_PLUGIN_CACHE_DIR` caching with Terragrunt's provider cache settings because Terragrunt warns against using Terraform's plugin cache directory with concurrent `run --all` operations.
- Changed the AWS OIDC audience from `https://gitlab.com` to `sts.amazonaws.com`, matching GitLab's current guidance that the audience should represent the validating service.
- Replaced the hard-coded GitLab certificate thumbprint with the Terraform TLS provider's `tls_certificate` data source so the example does not rely on a stale thumbprint.
- Split the AWS STS credential command into assignment and export steps, matching GitLab's documented pattern for correct command failure handling.
- Updated the OIDC trust policy example to match branch refs broadly so the same role can work with the merge request plan jobs shown earlier in the tutorial.
- Removed legacy Terragrunt flags from the generated child-pipeline example and manual destroy job.
- Adjusted cache examples to cache `.terragrunt-provider-cache/` rather than `.terraform-plugin-cache/` or `.terragrunt-cache/`.

## Review Notes
The single-role OIDC example is internally consistent for the tutorial, but production setups should usually split read-only plan roles from write-capable apply roles and restrict write roles to protected branches or protected environments.
