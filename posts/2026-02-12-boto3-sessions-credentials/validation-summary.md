# Validation Summary: How to Handle Boto3 Sessions and Credentials

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS SDK for Python (Boto3)
- Botocore
- AWS credential provider chain
- AWS STS AssumeRole
- AWS IAM roles, Lambda execution roles, ECS/EKS container credentials, and EC2 instance metadata
- Python

## Sources Consulted
- Boto3 Credentials guide: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
- Boto3 Session reference: https://docs.aws.amazon.com/boto3/latest/reference/core/session.html
- Boto3 Low-level clients guide: https://docs.aws.amazon.com/boto3/latest/guide/clients.html
- Boto3 Resources guide: https://docs.aws.amazon.com/boto3/latest/guide/resources.html
- Botocore Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- Boto3 STS AssumeRole reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/assume_role.html
- AWS Lambda execution role documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda environment variables documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html

## Issues Found
- The credential resolution chain was incomplete and out of order. Updated it to match current Boto3 documentation, including client-vs-session explicit credentials, AssumeRole with web identity, IAM Identity Center, login with console credentials, container credentials, and EC2 instance metadata.
- The post grouped EC2 instance roles, ECS task roles, and Lambda execution roles under instance metadata. Updated the production guidance to distinguish Lambda environment credentials, ECS/EKS container credentials, and EC2 instance metadata.
- The credential refresh example used private Botocore credential injection via `botocore_session._credentials` and implied manual refresh handling is generally required for role and SSO credentials. Replaced it with a documented Boto3 profile-based session pattern, because Boto3 automatically caches and refreshes supported temporary credentials for configured AssumeRole profiles.

## Review Notes
- All Python snippets were checked with `ast.parse` and are syntactically valid.
- Boto3 is not installed in the local environment, so examples were not executed against the SDK. API usage was verified against official AWS/Boto3/Botocore documentation.
- The OneUptime link returned HTTP 200 during validation.
