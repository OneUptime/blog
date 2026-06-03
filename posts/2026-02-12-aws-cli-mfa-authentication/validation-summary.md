# Validation Summary: How to Use AWS CLI with MFA Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI
- AWS IAM
- AWS STS
- Multi-Factor Authentication
- IAM policy conditions
- Bash
- Python
- Boto3

## Sources Consulted
- AWS CLI User Guide: Using an IAM role in the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS CLI Command Reference: sts get-session-token: https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html
- AWS CLI Command Reference: iam list-mfa-devices: https://docs.aws.amazon.com/cli/latest/reference/iam/list-mfa-devices.html
- AWS CLI User Guide: Configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS IAM User Guide: AWS global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Boto3 STS client get_session_token reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts/client/get_session_token.html

## Issues Found
- The introductory MFA flow described `sts:GetSessionToken` as the single path for CLI MFA. This was incomplete because the later role-profile example uses `sts:AssumeRole` with MFA through the AWS CLI profile provider. Updated the flow to distinguish manual `GetSessionToken` sessions from role-profile `AssumeRole` sessions.
- The post stated that temporary credentials are valid for up to 36 hours without distinguishing STS credential types. Updated it to clarify that `GetSessionToken` credentials for IAM users can last up to 36 hours, while assumed-role credentials are governed by the role session duration and role maximum session duration.
- Several sample MFA ARNs used a 9-digit account ID (`123456789`). Updated them to a 12-digit example account ID (`123456789012`), matching AWS ARN examples and account ID format.

## Review Notes
The AWS CLI profile configuration, `mfa_serial`, `source_profile`, `role_arn`, CLI credential caching, `duration_seconds`, `iam list-mfa-devices`, `sts get-session-token`, Boto3 `get_session_token`, and the `BoolIfExists` deny pattern for `aws:MultiFactorAuthPresent` are consistent with current official AWS documentation.
