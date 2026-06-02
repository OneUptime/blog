# Validation Summary: How to Fix 'The security token included in the request is invalid'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS IAM
- AWS STS
- AWS CLI
- AWS IAM Identity Center / SSO
- Boto3 / Python
- AWS Signature Version 4

## Sources Consulted
- AWS CLI `assume-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS STS `GetSessionToken` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
- AWS CLI configuration variables and credential precedence: https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
- AWS CLI environment variables: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- AWS CLI `list-access-keys` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/list-access-keys.html
- AWS IAM access key rotation/update guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/id-credentials-access-keys-update.html
- AWS STS Regional endpoints guide: https://docs.aws.amazon.com/sdkref/latest/guide/feature-sts-regionalized-endpoints.html
- AWS IAM guide for managing STS in an AWS Region: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html
- AWS IAM Signature Version 4 reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
- Boto3 credentials guide: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html

## Issues Found
- The post stated that STS tokens typically last 1 hour by default and some can last up to 12 hours. This was too broad. I clarified that AssumeRole defaults to 1 hour and can be configured up to 12 hours, while GetSessionToken can last up to 36 hours for IAM users and up to 1 hour for root account credentials.
- Several ARN examples used a 9-digit account ID. AWS account IDs are 12 digits, so I updated the examples to `123456789012`.
- The STS regional endpoint section incorrectly suggested that tokens from regional STS endpoints might only be valid in the issuing Region and recommended the global endpoint for broader compatibility. AWS recommends regional STS endpoints, and regional STS tokens are valid in all AWS Regions. I corrected the explanation and Boto3 example.
- The root credentials section implied that root credentials generally do not work with STS operations. I revised it to explain the actual limitation: root access keys are discouraged, root-based GetSessionToken credentials have root permissions, are limited to 1 hour, and cannot call most STS operations.
- The Boto3 credential caching example used `get_frozen_credentials()` as if it forced a refresh. That method freezes the current credential values. I changed the guidance to create a fresh Boto3 session so credential resolution runs again, and added `aws_session_token` for temporary credentials.

## Review Notes
AWS CLI was not installed in the local environment, so command syntax was verified against the official AWS CLI command reference rather than local `--help` output.
