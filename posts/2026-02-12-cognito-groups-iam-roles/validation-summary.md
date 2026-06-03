# Validation Summary: How to Map Cognito Groups to IAM Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito User Pools
- Amazon Cognito Identity Pools
- AWS Identity and Access Management (IAM)
- AWS CLI
- AWS SDK for JavaScript v3
- Amazon S3
- Amazon DynamoDB

## Sources Consulted
- Amazon Cognito Developer Guide: Using role-based access control - https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html
- Amazon Cognito Developer Guide: Adding groups to a user pool - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html
- Amazon Cognito Developer Guide: Understanding the identity token - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html
- Amazon Cognito Developer Guide: IAM roles - https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html
- AWS CLI Command Reference: cognito-identity create-identity-pool - https://docs.aws.amazon.com/cli/latest/reference/cognito-identity/create-identity-pool.html
- AWS CLI Command Reference: cognito-identity set-identity-pool-roles - https://docs.aws.amazon.com/cli/latest/reference/cognito-identity/set-identity-pool-roles.html
- AWS CLI Command Reference: cognito-idp update-group - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-group.html
- AWS SDK for JavaScript v3: Cognito Identity GetIdCommand and GetCredentialsForIdentityCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity/
- Amazon S3 User Guide: How Amazon S3 works with IAM - https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html
- IAM User Guide: Amazon S3 policy example for Cognito users - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_cognito-bucket.html

## Issues Found
- The identity pool creation command used `--allow-unauthenticated-identities false`, but the AWS CLI uses paired boolean flags. Changed it to `--no-allow-unauthenticated-identities`.
- Several IAM ARNs used a 9-digit placeholder account ID. Changed them to the valid 12-digit placeholder `123456789012`.
- The trust policy used an invalid identity pool ID placeholder. Changed it to a GUID-shaped identity pool ID placeholder.
- The group update commands associated roles but did not set precedence, even though the article relies on precedence to select `cognito:preferred_role` for users in multiple groups. Added `--precedence 1` for Admins and `--precedence 10` for Users.
- The S3 read-only policy granted `s3:ListBucket` against only an object ARN. Split the S3 permissions so bucket-level `ListBucket` uses the bucket ARN and object-level `GetObject` uses the object ARN.
- The admin policy claimed broad S3 access to app resources but omitted the bucket ARN. Added the bucket ARN alongside the object ARN.
- The section titled "Scoping Permissions with Session Tags" described an example that uses the Cognito identity policy variable `${cognito-identity.amazonaws.com:sub}`, not session tags. Renamed and reworded the section to describe Cognito identity policy variables accurately.

## Review Notes
The JavaScript examples use current AWS SDK for JavaScript v3 clients and command shapes. The post correctly describes token-based role mapping through `cognito:roles` and `cognito:preferred_role`, and correctly states that the lowest group precedence value wins.
