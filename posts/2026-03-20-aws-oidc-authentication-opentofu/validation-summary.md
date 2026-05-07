# Validation Summary: How to Use AWS OIDC Authentication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS STS
- OpenID Connect (OIDC)
- GitHub Actions
- GitLab CI/CD
- Terraform-compatible HCL
- YAML CI configuration

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS IAM User Guide: Create a role for OpenID Connect federation - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- AWS IAM User Guide: IAM and AWS STS condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS IAM User Guide: Obtain the thumbprint for an OpenID Connect identity provider - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS SDKs and Tools Reference Guide: Assuming a role with web identity or OpenID Connect - https://docs.aws.amazon.com/sdkref/latest/guide/access-assume-role-web.html
- AWS CLI User Guide: Using an IAM role with web identity - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html#cli-configure-role-oidc
- GitLab Docs: Configure OpenID Connect in AWS to retrieve temporary credentials - https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Docs: OpenID Connect authentication using ID tokens - https://docs.gitlab.com/ci/secrets/id_token_authentication/
- HashiCorp AWS Provider docs: `aws_iam_openid_connect_provider` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_openid_connect_provider.html.markdown
- HashiCorp AWS Provider docs: `aws_iam_role` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- HashiCorp AWS Provider docs: provider configuration and web identity environment variables - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- `aws-actions/configure-aws-credentials` action docs - https://github.com/aws-actions/configure-aws-credentials
- `opentofu/setup-opentofu` action docs - https://github.com/opentofu/setup-opentofu
- OpenTofu CLI docs: `tofu init` - https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post hard-coded `thumbprint_list` values for both GitHub and GitLab OIDC providers. I removed those fields because current AWS provider documentation marks `thumbprint_list` as optional and explicitly notes that AWS validates GitHub and GitLab against trusted root CAs rather than using configured thumbprints.
- The GitHub OIDC snippet comment incorrectly said the thumbprint could be verified from the OIDC discovery document at `/.well-known/openid-configuration`. That document does not publish the TLS thumbprint, so removing the thumbprint block also removed that incorrect instruction.

## Review Notes
- The GitHub Actions and OpenTofu version pins in the examples are older than the current docs examples as of 2026-05-07, but the syntax and usage shown remain valid.
- The GitLab example uses `https://gitlab.com` as the OIDC audience/client ID, which is valid when it matches the IAM OIDC provider configuration. GitLab's current docs also note that `sts.amazonaws.com` is a common audience value for AWS integrations.
