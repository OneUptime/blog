# Validation Summary: How to Handle Terraform Provider Access Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM roles and OIDC identity providers
- AWS STS role assumption and web identity federation
- GitHub Actions OIDC
- GitLab CI/CD OIDC
- AWS Secrets Manager
- AWS CloudWatch Logs metric filters and alarms
- Python with boto3

## Sources Consulted
- Terraform AWS provider `aws_iam_openid_connect_provider` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform AWS provider assume role configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `aws_cloudwatch_log_metric_filter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS `configure-aws-credentials` action documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS IAM OIDC federation documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html
- AWS IAM create OpenID Connect provider documentation: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM temporary credentials with OIDC documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html
- GitLab Docs, Configure OpenID Connect in AWS to retrieve temporary credentials: https://docs.gitlab.com/ci/cloud_services/aws/
- Amazon CloudWatch Logs filter pattern syntax documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Boto3 IAM `create_access_key` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/create_access_key.html
- Boto3 Secrets Manager `update_secret` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/update_secret.html

## Issues Found
- The Python credential rotation example used `json.dumps(...)` without importing `json`. Added `import json` and removed the unused `timedelta` import so the snippet parses correctly.
- The GitHub and GitLab OIDC provider examples included hard-coded SHA-1 thumbprints. Current AWS IAM provider creation treats thumbprints as optional and can retrieve the thumbprint when omitted; the GitHub AWS credentials action documentation also notes that older GitHub thumbprint guidance is no longer necessary. Removed the hard-coded `thumbprint_list` blocks to avoid stale certificate fingerprints.
- The multi-account hub trust policy scoped the GitHub `sub` claim but omitted the `aud` condition. Added the `token.actions.githubusercontent.com:aud = sts.amazonaws.com` condition to match GitHub and AWS recommended trust-policy scoping.
- The CloudWatch Logs metric filter monitored `AssumeRole` only, but the post's OIDC examples use `AssumeRoleWithWebIdentity`. Updated the filter pattern to match both `AssumeRole` and `AssumeRoleWithWebIdentity` events.

## Review Notes
Terraform was not installed in the workspace, so HCL snippets were checked against official provider documentation rather than with `terraform validate`. The tag-based IAM policy examples are directionally correct, but real-world least-privilege policies often need service-specific exceptions because not every AWS API action supports `aws:ResourceTag` or `aws:RequestTag` conditions.
