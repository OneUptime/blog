# Validation Summary: How to Configure Providers with Ephemeral Values in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (HCL code examples for OpenTofu provider configuration)

## Technologies Covered
- OpenTofu (ephemeral resources, provider configuration)
- HCL configuration language
- AWS provider for Terraform/OpenTofu (`aws_ssm_parameter`, `aws_secretsmanager_secret_version` ephemeral resources)
- Vault provider for Terraform/OpenTofu (`vault_database_secret`, `vault_aws_access_credentials` ephemeral resources)
- GitHub provider
- Kubernetes provider
- PostgreSQL provider
- Datadog provider

## Sources Consulted
- [OpenTofu - Ephemeral resources documentation (v1.11)](https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/)
- [OpenTofu v1.11.0 release notes](https://opentofu.org/blog/opentofu-1-11-0/)
- [OpenTofu - What's new in 1.11](https://opentofu.org/docs/intro/whats-new/)
- [HashiCorp - List of Ephemeral Resources released by Top Terraform Providers](https://support.hashicorp.com/hc/en-us/articles/36370466952979-List-of-Ephemeral-Resources-released-by-Top-Terraform-Providers)
- [AWS provider - aws_ssm_parameter ephemeral resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/ssm_parameter)
- [Vault provider - vault_database_secret ephemeral resource (GitHub source)](https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/ephemeral-resources/database_secret.html.md)
- [Vault provider - vault_aws_access_credentials ephemeral resource (GitHub source)](https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/ephemeral-resources/aws_access_credentials.html.md)
- [Vault provider - Use ephemeral resources guide](https://registry.terraform.io/providers/hashicorp/vault/latest/docs/guides/using_ephemeral_resources)
- [HashiCorp - Ephemeral values in Terraform blog](https://www.hashicorp.com/en/blog/ephemeral-values-in-terraform)

## Issues Found

1. **Incorrect OpenTofu version claim.** The post stated "OpenTofu 1.10+" supports ephemeral resources. While Terraform introduced ephemeral resources in 1.10, OpenTofu only added them in **1.11**. Updated the Summary section to reference OpenTofu 1.11+.

2. **Non-existent ephemeral resource `aws_iam_role`.** The original "Cross-Account AWS Provider" section used `ephemeral "aws_iam_role"` with `role_arn`, `session_name`, and `duration` arguments and `access_key_id`/`secret_access_key`/`session_token` attributes. This ephemeral resource does not exist in the AWS provider. The AWS provider's official ephemeral resources are: `aws_secretsmanager_random_password`, `aws_eks_cluster_auth`, `aws_cognito_identity_openid_token_for_developer_identity`, `aws_ssm_parameter`, `aws_kms_secrets`, `aws_lambda_invocation`, and `aws_secretsmanager_secret_version`. Replaced the example with a correct, real-world pattern using `ephemeral "vault_aws_access_credentials"` (which does exist in the Vault provider) to obtain time-limited STS credentials and feed them into an aliased AWS provider. Argument names (`backend`, `role`, `type`, `region`) and attribute names (`access_key`, `secret_key`, `security_token`) match the official Vault provider documentation. Updated the section heading accordingly.

3. **Misleading `provider_meta` section.** The section "Ephemeral Values in provider_meta" claimed the example showed how to use ephemeral values in a `provider_meta` block, but the example actually only used a regular `provider` block. `provider_meta` is a separate, module-author-only construct that does not match what the example demonstrates. Renamed the section to "Ephemeral Values for Third-Party Provider Credentials" and rewrote the introductory sentence accordingly. The code itself is valid and was kept (with minor whitespace alignment).

## Review Notes

- Verified: `vault_database_secret` ephemeral resource takes `mount` (required) and `name` (required) arguments and exposes `username` and `password` attributes — matches the post's Database Provider example.
- Verified: `aws_ssm_parameter` ephemeral resource accepts `name` and `with_decryption` and exposes `value` — matches the post.
- Verified: `aws_secretsmanager_secret_version` ephemeral resource accepts `secret_id` and exposes `secret_string` — matches the post.
- Kubernetes, PostgreSQL, and Datadog provider argument names referenced in the post (`host`, `client_certificate`, `client_key`, `cluster_ca_certificate`, `api_key`, `app_key`, etc.) are accurate.
- Caveat for readers: ephemeral values can only be referenced from a defined set of contexts (providers, locals, other ephemeral resources, write-only resource arguments). Using them elsewhere is a configuration error. The post's examples respect this restriction.
- Provider version caveat: ephemeral resources require recent provider versions — Vault provider >= 5.0.0 (5.1.0+ for `vault_database_secret`), and AWS provider >= 5.77.0 (with `aws_ssm_parameter` available from 5.81.0). Pinning these versions in `required_providers` is recommended in real-world configurations.
