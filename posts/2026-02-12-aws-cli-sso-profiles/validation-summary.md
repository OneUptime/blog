# Validation Summary: How to Use AWS CLI with SSO Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI
- AWS IAM Identity Center
- AWS SSO profiles and `sso-session` configuration
- Boto3 / botocore
- AWS SDK credential resolution
- GitHub Actions OIDC federation

## Sources Consulted
- AWS CLI User Guide: Configuring IAM Identity Center authentication with the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS CLI Command Reference: `aws sso login`: https://docs.aws.amazon.com/cli/latest/reference/sso/login.html
- AWS CLI User Guide: Configuration and credential file settings, including `aws configure export-credentials`: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI User Guide: AWS IAM Identity Center concepts for the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso-concepts.html
- AWS IAM Identity Center User Guide: User interactive sessions: https://docs.aws.amazon.com/singlesignon/latest/userguide/user-interactive-sessions.html
- AWS IAM Identity Center User Guide: Set session duration for AWS accounts: https://docs.aws.amazon.com/singlesignon/latest/userguide/howtosessionduration.html
- AWS SDKs and Tools Reference Guide: How IAM Identity Center authentication is resolved for AWS SDKs and tools: https://docs.aws.amazon.com/sdkref/latest/guide/understanding-sso.html
- AWS Control Tower User Guide: IAM Identity Center groups for AWS Control Tower: https://docs.aws.amazon.com/controltower/latest/userguide/sso-groups.html
- AWS Control Tower User Guide: Manage permissions for entities with IAM: https://docs.aws.amazon.com/controltower/latest/userguide/iam.html
- GitHub Actions official action: `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The post said the SSO access token lasts 8 hours by default. AWS documentation distinguishes the IAM Identity Center user interactive session, permission set credentials, and hourly access token refresh. Updated the section to state that user interactive sessions default to 8 hours, permission set credentials default to 1 hour and can be configured up to 12 hours, and the CLI/SDKs refresh the access token while the underlying session is valid.
- The post implied AWS Control Tower always means IAM Identity Center is available. AWS Control Tower can use IAM Identity Center depending on the identity provider configuration. Updated the sentence to refer specifically to Control Tower landing zones that use IAM Identity Center.
- The `aws configure export-credentials --format env` sample output omitted the `export` prefix. AWS CLI documentation shows `env` output as exported shell variables, so the sample output was corrected.
- The GitHub Actions OIDC role ARN used a 9-digit AWS account ID. AWS account IDs are 12 digits, so the example ARN was corrected to use a 12-digit account ID.
- The troubleshooting section recommended `AWS_SSO_BROWSER`, which is not listed in the official AWS CLI supported environment variables and is not documented for `aws sso login`. The guidance was changed to use the documented `--no-browser` option.

## Review Notes
The shell helper functions parse `~/.aws/config` with simple text tools and may not handle every valid AWS config layout, but they are acceptable as lightweight interactive helpers. The Python examples are syntactically valid, but production scripts should also handle failed `aws sso login` subprocess exits explicitly.
