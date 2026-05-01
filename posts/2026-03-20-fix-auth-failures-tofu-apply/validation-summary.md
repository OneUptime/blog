# Validation Summary: How to Fix Authentication Failures During tofu apply

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTofu CLI
- AWS CLI, IAM, STS, and the AWS provider
- Google Cloud CLI and Application Default Credentials
- Azure CLI and the AzureRM provider
- GitHub Actions OIDC for AWS

## Sources Consulted
- OpenTofu debugging docs: https://opentofu.org/docs/v1.6/internals/debugging/
- AWS CLI `get-caller-identity`: https://docs.aws.amazon.com/en_us/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI IAM Identity Center authentication: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS CLI environment variables: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- AWS provider authentication and configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS STS `AssumeRoleWithWebIdentity`: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- Google Cloud SDK `gcloud auth application-default`: https://cloud.google.com/sdk/gcloud/reference/auth/application-default
- Google Cloud SDK `gcloud auth application-default print-access-token`: https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token
- AzureRM provider authentication via Azure CLI: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli
- AzureRM provider service principal with client secret: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret.html
- Azure CLI authentication: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli?view=azure-cli-latest
- GitHub Actions OIDC for AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws?apiVersion=2022-11-28
- `aws-actions/configure-aws-credentials` action docs: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The introduction and conclusion treated `AccessDenied` and `UnauthorizedOperation` as authentication failures. I updated both passages to refer to authentication and authorization failures, which matches IAM and cloud API behavior.
- The AWS profile section said the profile must exist in `~/.aws/config` and implied that `AWS_PROFILE` would override a provider block. I corrected this to match provider precedence and to note that named profiles can come from the shared config or credentials files.
- The denied-action diagnostic command used `grep "AccessDenied\\|is not authorized"`. I changed it to `grep -E "AccessDenied|is not authorized"` for clearer, portable extended-regex syntax.
- The CI/CD section incorrectly tied long-running applies to GitHub's OIDC JWT lifetime and used `role-duration-seconds: 3600`, which is already the default for `AssumeRoleWithWebIdentity`. I rewrote the explanation around the AWS STS session duration, updated the action to `aws-actions/configure-aws-credentials@v6`, and changed the sample duration to `7200`.

## Review Notes
- The AWS static-credentials example is valid for long-lived access keys. If a reader is using temporary STS credentials instead, they must also set `AWS_SESSION_TOKEN`.
- GitHub Actions action versions and recommended pinning practices change over time, so workflow snippets like this should be revalidated periodically.
