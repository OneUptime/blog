# Validation Summary: How to Authenticate OpenTofu with Vault Using AWS Auth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault AWS auth method
- AWS IAM
- Amazon EC2
- GitHub Actions

## Sources Consulted
- HashiCorp Vault AWS auth method docs: https://developer.hashicorp.com/vault/docs/auth/aws
- HashiCorp Vault AWS auth API docs: https://developer.hashicorp.com/vault/api-docs/auth/aws
- HashiCorp Vault provider docs source (`auth_login_aws`): https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/index.html.markdown
- HashiCorp Vault provider docs source (`vault_aws_auth_backend_client`): https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/aws_auth_backend_client.html.md
- HashiCorp Vault provider docs source (`vault_aws_auth_backend_role`): https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/aws_auth_backend_role.html.md
- HashiCorp Vault provider implementation for AWS login: https://github.com/hashicorp/terraform-provider-vault/blob/main/internal/provider/auth_aws.go
- AWS STS `GetCallerIdentity` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html
- `aws-actions/configure-aws-credentials` official README: https://github.com/aws-actions/configure-aws-credentials
- `actions/checkout` latest release: https://github.com/actions/checkout/releases/latest
- `opentofu/setup-opentofu` official README: https://github.com/opentofu/setup-opentofu

## Issues Found
- The `vault_aws_auth_backend_client` example set `sts_region` without `sts_endpoint`. Current Vault provider behavior requires those two settings together, so I added `sts_endpoint` and clarified that the access key fields are only needed when you are not relying on the Vault server's instance profile.
- The GitHub Actions snippet used older action majors. I updated `actions/checkout` to `@v6`, `aws-actions/configure-aws-credentials` to `@v6`, and `opentofu/setup-opentofu` to `@v2` to match current upstream usage.
- The EC2 section treated `auth_login_aws` as if it performed Vault's legacy `ec2` login flow. The Vault provider's `auth_login_aws` block actually generates an IAM-signed `sts:GetCallerIdentity` request, so I changed the EC2 example to use IAM auth with the EC2 instance profile, added `bound_iam_principal_arns`, and removed the incorrect `header_value` usage in that example.
- The original EC2 role example combined `auth_type = "ec2"` with `inferred_entity_type` and `inferred_aws_region`, but those inference fields only apply to IAM auth. Changing the role to `auth_type = "iam"` made the example consistent with both the provider docs and the login flow used by OpenTofu.

## Review Notes
- The post is technically sound after the fixes.
- `secret_key` in `vault_aws_auth_backend_client` is still valid, but the provider now documents `secret_key_wo` as the safer option because it avoids storing the secret in Terraform state.
- `resolve_aws_unique_ids = false` is valid, but it has ARN-format caveats documented by Vault when IAM role paths are involved.
