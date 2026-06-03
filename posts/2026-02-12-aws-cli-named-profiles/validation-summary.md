# Validation Summary: How to Set Up AWS CLI Named Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI
- AWS CLI named profiles
- AWS shared config and credentials files
- IAM role assumption with STS
- AWS CLI environment variables
- Shell profile helper functions

## Sources Consulted
- AWS CLI User Guide: Configuration and credential file settings in the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI User Guide: Configuring environment variables for the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- AWS CLI User Guide: Command line options in the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html
- AWS CLI Command Reference: aws configure: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI User Guide: Using an IAM role in the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS CLI Command Reference: cloudformation deploy: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy/
- Botocore config provider source for profile environment variable support: https://github.com/boto/botocore/blob/develop/botocore/configprovider.py

## Issues Found
- The post claimed `AWS_PROFILE` takes precedence over `AWS_DEFAULT_PROFILE`. Current AWS CLI documentation documents `AWS_PROFILE`, while botocore still recognizes both `AWS_DEFAULT_PROFILE` and `AWS_PROFILE`. I removed the unsupported precedence claim and changed the guidance to prefer the documented `AWS_PROFILE` variable.
- The region-specific profile section used `source_profile` to avoid duplicating static credentials without configuring `role_arn`. AWS documents `source_profile` for AssumeRole profiles. I replaced that example with one credential profile plus per-command region overrides using `--region` and `AWS_REGION`.
- The shell prompt example used double quotes around `$(aws_prompt)`, which would evaluate the function when assigning `PS1` instead of leaving the command substitution in the prompt string. I changed the example to single quotes so the profile display updates dynamically.

## Review Notes
- The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS documentation and AWS-maintained botocore source instead of local `aws --help` output.
- The two OneUptime internal links referenced by the post returned HTTP 200 during review.
