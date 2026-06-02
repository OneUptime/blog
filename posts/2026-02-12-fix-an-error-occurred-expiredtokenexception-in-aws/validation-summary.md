# Validation Summary: How to Fix 'An error occurred (ExpiredTokenException)' in AWS

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- AWS CLI
- AWS IAM Identity Center / AWS SSO
- Amazon EC2 instance roles and instance metadata
- Python boto3 / botocore
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS STS AssumeRole API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS CLI configuration variables for IAM role profiles: https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
- AWS CLI IAM role configuration guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS CLI get-session-token command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html
- AWS STS GetFederationToken API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetFederationToken.html
- AWS IAM Identity Center session duration guide: https://docs.aws.amazon.com/singlesignon/latest/userguide/howtosessionduration.html
- AWS IAM roles for EC2 instances guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html
- AWS IAM temporary security credentials guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html
- AWS SDK for JavaScript v3 credential providers guide: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-credential-providers.html
- AWS SDK for JavaScript v3 credential provider package reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/

## Issues Found
- Several sample IAM ARNs used a 9-digit account ID. AWS account IDs are 12 digits, so the examples were updated to use `123456789012`.
- The AWS CLI role profile snippet did not include the session name shown elsewhere. Added `role_session_name = my-session`, which is a valid optional config key mapped to the STS `RoleSessionName` parameter.
- The Python manual refresh helper refreshed STS credentials but retried with the original boto3 client, which would still hold expired credentials. Removed that misleading helper and added a proactive expiration check in `get_client()` so a fresh client is created with fresh credentials.
- The EC2 section said instance roles should "never" get the error. Updated this to clarify that the AWS CLI and SDK provider chains should avoid it when using instance metadata, but applications that cache metadata credentials manually can still hit expiration.
- The EC2 metadata verification command used an IMDSv1 request. Updated it to use an IMDSv2 token, which works when IMDSv2 is required.

## Review Notes
The post is technically valid after the fixes. The manual credential manager examples are acceptable for illustrating refresh behavior, but the AWS SDK credential provider chain or built-in assume-role profile support remains the better production approach because it handles refresh and caching lifecycle details automatically.
