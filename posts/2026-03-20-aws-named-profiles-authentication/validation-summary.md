# Validation Summary: How to Authenticate with AWS Using Named Profiles

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- AWS CLI named profiles
- AWS shared credentials and config files (`~/.aws/credentials`, `~/.aws/config`)
- AWS STS / IAM role assumption with MFA
- OpenTofu with the AWS provider
- INI configuration snippets
- HCL provider configuration

## Sources Consulted
- AWS CLI configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI `configure` command reference: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI IAM role configuration guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS CLI environment variables reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- OpenTofu providers documentation: https://opentofu.org/docs/language/providers/
- AWS provider authentication and configuration reference used by OpenTofu: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown
- GitHub author profile URL check: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- The AWS CLI commands, `--profile` usage, `AWS_PROFILE` environment variable behavior, and profile file formats all match the current AWS CLI v2 documentation.
- The IAM role example is technically correct: `role_arn`, `source_profile`, and `mfa_serial` are valid shared config settings, and the CLI can prompt for MFA when the role profile is used.
- The OpenTofu example is technically correct because the AWS provider still supports both the `profile` argument and the `AWS_PROFILE` environment variable, and it can read `region` from the shared AWS config when a profile is selected.
- The post uses long-term IAM user access key examples, which are still supported, but current AWS guidance prefers temporary credentials through IAM Identity Center or other federated workflows for real-world use.
