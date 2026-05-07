# Validation Summary: How to Authenticate with AWS Using Environment Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- AWS CLI
- AWS IAM Identity Center (SSO)
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu S3 backend docs: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu Docker image docs: https://opentofu.org/docs/v1.7/intro/install/docker/
- OpenTofu GitHub repository releases: https://github.com/opentofu/opentofu
- AWS CLI `export-credentials` command reference: https://docs.aws.amazon.com/cli/latest/reference/configure/export-credentials.html
- AWS CLI configuration and credentials guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS SDKs and Tools environment variables reference: https://docs.aws.amazon.com/credref/latest/refdocs/environment-variables.html
- AWS SDKs and Tools standardized credential providers: https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html
- AWS IAM security credentials overview: https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html
- AWS IAM programmatic access guidance: https://docs.aws.amazon.com/us_en/IAM/latest/UserGuide/security-creds-programmatic-access.html
- AWS IAM access key guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- GitHub Docs for AWS OIDC: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- `actions/checkout` README: https://github.com/actions/checkout
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- GitLab CI/CD variables docs: https://docs.gitlab.com/ci/variables/

## Issues Found
- The GitHub Actions example used outdated action versions. Updated `actions/checkout` from `@v4` to `@v6`, `aws-actions/configure-aws-credentials` from `@v4` to `@v6`, and `opentofu/setup-opentofu` from `@v1` to `@v2` to match current official usage.
- The OpenTofu version examples used `1.7.0`, which is no longer actively maintained. Updated the GitHub Actions `tofu_version` and the GitLab container image to `1.11.6`, the current latest OpenTofu release as of 2026-05-07.
- The GitLab CI example incorrectly re-declared `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` as same-name job variables. Removed those lines and clarified that masked GitLab UI variables are inherited automatically by jobs.
- The authentication precedence diagram did not match the AWS provider’s documented order. Updated it to: provider configuration parameters, environment variables, shared credentials files, shared configuration files, container credentials, and instance profile credentials/Region.
- The statement that credentials in `.tf` files always end up in state files was too broad. Reworded it to the documented, accurate guidance that environment variables keep provider credentials out of version-controlled OpenTofu code.
- The advice to “set a short expiry” on access keys was inaccurate for IAM user access keys, which are long-term credentials and do not expire automatically. Replaced it with rotation and least-privilege guidance.

## Review Notes
- The AWS CLI examples using `aws sso login` and `aws configure export-credentials --profile ... --format env` are valid and current.
- The AWS provider does support reading credentials from `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`, and `AWS_DEFAULT_REGION`.
- The post remains technically sound after the corrections above.
