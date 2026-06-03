# Validation Summary: How to Assume an IAM Role Using AWS STS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- AWS STS AssumeRole
- AWS CLI profiles and commands
- IAM role trust policies
- MFA-protected role assumption
- STS session policies and session tags
- Python boto3
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS STS AssumeRole API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS CLI `sts assume-role` Command Reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI `iam update-role` Command Reference: https://docs.aws.amazon.com/cli/latest/reference/iam/update-role.html
- AWS IAM session tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS IAM policy variables and tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- boto3 STS `assume_role` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/assume_role.html
- boto3 session/client credential documentation: https://docs.aws.amazon.com/boto3/latest/reference/core/session.html
- AWS SDK for JavaScript v3 STS client documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sts
- AWS SDK for JavaScript v3 S3 client documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/

## Issues Found
- The session-duration section said callers can request up to the role's maximum session duration without mentioning the role chaining exception. Updated the sentence to note that role chaining limits the new session to one hour.
- The session-tags section did not mention that callers need `sts:TagSession` permission to pass session tags. Added that requirement.
- The session-tags section referred to `${aws:PrincipalTag/Project}` for access decisions. Updated it to `aws:PrincipalTag/Project` in a condition, which matches the IAM condition-key usage described by AWS.
- The `get-caller-identity` section said the command returns a "user ARN." Updated it to say the command returns an ARN, because assumed-role credentials return an assumed-role ARN.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS API documentation rather than local `aws --help` output. The CLI, boto3, and AWS SDK for JavaScript v3 examples are otherwise current and syntactically consistent with official documentation.
