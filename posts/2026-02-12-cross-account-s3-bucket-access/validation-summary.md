# Validation Summary: How to Set Up Cross-Account S3 Bucket Access

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3
- AWS IAM
- AWS STS
- S3 Access Points
- AWS Organizations condition keys
- AWS KMS
- AWS CloudTrail
- AWS CLI

## Sources Consulted
- Amazon S3 bucket policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- IAM cross-account resource access: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- IAM third-party role access and ExternalId: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- AWS CLI sts assume-role: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- Amazon S3 access point policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-policies.html
- AWS CLI s3control create-access-point: https://docs.aws.amazon.com/cli/latest/reference/s3control/create-access-point.html
- Amazon S3 Object Ownership: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS CLI s3api put-bucket-ownership-controls: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-ownership-controls.html
- AWS KMS cross-account key access: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
- AWS CLI cloudtrail put-event-selectors: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html

## Issues Found
- The post said to always use `ExternalId` for cross-account role assumptions. AWS positions ExternalId mainly as confused-deputy protection for third-party access or accounts outside your zone of trust, so the wording was narrowed to that use case.
- The S3 Access Points section omitted that the underlying bucket policy must also allow requests through the access point. Added a short note about bucket policy delegation and `s3:DataAccessPointAccount`.
- The KMS section said the accessing account needs KMS permissions, but cross-account KMS access requires both the KMS key policy and an IAM policy in the external account. Added that requirement.
- The Object Ownership section described object-writer ownership as the default. Current S3 defaults new buckets to Bucket owner enforced with ACLs disabled, so the text now scopes the gotcha to older or ACL-enabled buckets and notes the modern default.

## Review Notes
The JSON policy examples and AWS CLI commands are syntactically aligned with current AWS documentation. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI references instead of local `--help` output.
