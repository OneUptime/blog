# Validation Summary: How to Use OIDC for Provider Authentication in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- OpenID Connect (OIDC)
- GitHub Actions
- GitLab CI/CD
- AWS IAM and STS
- Microsoft Entra ID / AzureRM Terraform provider
- Google Cloud Workload Identity Federation

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Docs: OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- AWS GitHub Action documentation for configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS provider docs for aws_iam_openid_connect_provider and AssumeRoleWithWebIdentity support: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- HashiCorp AzureRM provider OIDC guide and azurerm backend docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc and https://developer.hashicorp.com/terraform/language/backend/azurerm
- Google GitHub Actions auth documentation: https://github.com/google-github-actions/auth
- Google Cloud Workload Identity Federation documentation: https://cloud.google.com/iam/docs/workload-identity-federation
- GitLab Docs for OIDC ID tokens and cloud services: https://docs.gitlab.com/ci/secrets/id_token_authentication/ and https://docs.gitlab.com/ci/cloud_services/
- AWS SDKs and Tools reference for web identity environment variables: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html

## Issues Found
- The OIDC flow said credentials expire after the workflow completes. Changed this to say credentials expire after their configured short lifetime, because cloud-issued temporary credentials are time-bound and can outlive the workflow briefly.
- The AWS GitHub OIDC Terraform example used a fixed GitHub thumbprint. Current AWS provider versions make `thumbprint_list` optional, and AWS IAM ignores configured thumbprints for GitHub's OIDC provider, so the example now omits the static thumbprint.
- The GitLab CI example requested an ID token with `aud: https://gitlab.example.com` while using AWS STS. Changed the audience to `sts.amazonaws.com`, which must match the AWS IAM OIDC provider audience/client ID.
- The GitLab CI example used `aws sts assume-role-with-web-identity` inside the `hashicorp/terraform` image, which does not guarantee the AWS CLI is available. Changed it to write the GitLab ID token to a file and let the AWS SDK/Terraform provider use `AWS_ROLE_ARN`, `AWS_ROLE_SESSION_NAME`, and `AWS_WEB_IDENTITY_TOKEN_FILE`.
- The AWS trust policy hardening example described branch and environment matching as if both applied at once. Adjusted the wording to reflect that GitHub `sub` values for branch refs and environments are alternate subject formats.
- The GitHub Actions debug snippet treated the OIDC endpoint JSON response as a raw JWT. Updated it to extract `.value` before decoding the JWT payload.
- The troubleshooting note implied AWS GitHub OIDC thumbprints should be regenerated. Updated it to clarify that thumbprint updates apply to custom OIDC providers, while AWS IAM ignores the configured thumbprint for GitHub Actions' OIDC provider.

## Review Notes
- The remaining GitHub Actions examples use older-but-supported major versions such as `aws-actions/configure-aws-credentials@v4` and `google-github-actions/auth@v2`; newer major versions exist, but the shown versions are not inherently incorrect.
- The Azure workflow stores client ID, tenant ID, and subscription ID in GitHub secrets. These identifiers are not credentials, but using secrets for them is technically valid.
