# Validation Summary: How to Use AWS STS Temporary Credentials in Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Security Token Service (STS)
- AWS Identity and Access Management (IAM)
- AWS CLI
- Boto3 / Botocore
- AWS SDK for JavaScript v3
- AWS SDK for Go v2
- Amazon EKS IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- AWS STS AssumeRole API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS STS GetSessionToken API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
- AWS STS AssumeRoleWithWebIdentity API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- AWS CLI sts command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/
- AWS CLI get-caller-identity command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- Boto3 credentials guide: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
- Boto3 STS assume_role reference: https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/assume_role.html
- AWS SDK for JavaScript v3 credential providers guide: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-credential-providers.html
- AWS SDK for Go v2 migration guide: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/migrate-gosdk.html
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- IAM external ID / third-party access documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- IAM access key security documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/securing_access-keys.html

## Issues Found
- The post described `ExternalId` as a shared secret and recommended it for all cross-account roles. AWS states that external IDs are not treated as secrets and are specifically intended for third-party confused deputy protection. Updated the wording to call it a unique identifier for third-party cross-account role assumption.
- The Python `AssumeRole` example said the maximum was "12 hours for user-assumed roles." AWS documents that the duration can be up to the role's maximum session duration, with role chaining limited to one hour. Updated the comment to avoid the inaccurate shorthand.
- The Go SDK v2 example assigned the STS assume-role provider directly to `cfg.Credentials`. AWS SDK for Go v2 documentation recommends wrapping explicitly configured providers in `aws.NewCredentialsCache`. Added the import and cache wrapper.
- The credential refresh example incorrectly implied that a direct `sts.assume_role` call creates an auto-refreshing session. Direct calls return one credential set. Updated the comments to make that clear and left the profile-based provider example as the auto-refreshing approach.
- The EKS web identity example referred to the "EKS SDK." The SDK that automatically uses IRSA credentials is the AWS SDK. Updated the wording.

## Review Notes
The examples use current AWS SDK families: Boto3, AWS SDK for JavaScript v3, and AWS SDK for Go v2. The manual STS examples are correct for short-lived demonstration code, but production applications should prefer SDK credential providers such as role profiles, `fromTemporaryCredentials` in JavaScript v3, or cached providers in Go v2 so credentials refresh automatically.
