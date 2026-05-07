# Validation Summary: How to Authenticate with AWS Using Named Profiles in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS shared config and credentials files
- AWS named profiles
- AWS IAM Identity Center (SSO)
- AWS IAM AssumeRole
- AWS CLI

## Sources Consulted
- AWS SDKs and Tools: Using shared `config` and `credentials` files to globally configure AWS SDKs and tools — https://docs.aws.amazon.com/sdkref/latest/guide/file-format.html
- AWS CLI: Configuration and credential file settings in the AWS CLI — https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI: Configuring IAM Identity Center authentication with the AWS CLI — https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS SDKs and Tools: IAM Identity Center credential provider — https://docs.aws.amazon.com/sdkref/latest/guide/feature-sso-credentials.html
- OpenTofu Docs: Workspaces — https://opentofu.org/docs/language/state/workspaces/
- OpenTofu CLI Docs: Managing Workspaces — https://opentofu.org/docs/cli/workspaces/
- HashiCorp AWS Provider docs source — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown

## Issues Found
- The SSO profile example used the older inline IAM Identity Center format without noting that AWS now recommends `sso-session`-based configuration. I updated the snippet to the current format and added the required `aws sso login --profile sso-dev` step so the example works as described.
- The variable-based provider example referenced `var.aws_region` without declaring that variable. I replaced it with a concrete region so the snippet is self-contained and valid as written.
- The assume-role example used `arn:aws:iam::PROD_ACCOUNT:role/DeployRole`, which is not a valid AWS ARN shape because the account segment must be a 12-digit account ID. I replaced it with a valid placeholder account ID.
- The workspace section implied that workspaces are a clean isolation mechanism for deployments that use different AWS credentials. I added a caveat because OpenTofu explicitly warns that workspaces are not appropriate for deployments requiring separate credentials or access controls.

## Review Notes
- The post is technically correct after the fixes above.
- AWS allows sensitive keys in either `~/.aws/credentials` or `~/.aws/config`, but AWS recommends storing them in `~/.aws/credentials`.
- For CI/CD and other non-local automation, AWS recommends temporary credentials via IAM roles or federation rather than long-term access keys stored in named profiles.
