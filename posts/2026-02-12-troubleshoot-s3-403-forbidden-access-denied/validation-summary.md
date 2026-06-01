# Validation Summary: How to Troubleshoot S3 403 Forbidden Access Denied Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon S3
- AWS IAM policies and policy simulator
- S3 bucket policies and Block Public Access
- S3 Object Ownership and ACLs
- AWS KMS SSE-KMS permissions
- Amazon VPC endpoint policies
- AWS Organizations service control policies
- S3 Requester Pays
- AWS CloudTrail
- AWS CLI

## Sources Consulted
- AWS S3 User Guide: Troubleshoot access denied (403 Forbidden) errors in Amazon S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html
- AWS S3 User Guide: Blocking public access to your Amazon S3 storage: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS CLI Command Reference: s3api get-public-access-block: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-public-access-block.html
- AWS S3 User Guide: Required permissions for Amazon S3 API operations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html
- AWS S3 API Reference: GetObject permissions and 403 behavior: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- AWS S3 User Guide: Controlling ownership of objects and disabling ACLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS VPC User Guide: Control access to VPC endpoints using endpoint policies: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- AWS Organizations API Reference: ListPoliciesForTarget: https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListPoliciesForTarget.html
- AWS Organizations User Guide: Service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS CloudTrail User Guide: Logging data events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CLI Command Reference: cloudtrail lookup-events: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS S3 User Guide: Amazon S3 CloudTrail events: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html

## Issues Found
- The non-SSL bucket policy example used only the object ARN while claiming it denied all non-HTTPS S3 requests. Added the bucket ARN as well so the `s3:*` deny covers bucket-level and object-level requests.
- The Block Public Access explanation said `BlockPublicPolicy` overrides an existing public bucket policy. Updated it to distinguish `BlockPublicPolicy`, which rejects new or updated public bucket policies, from `RestrictPublicBuckets`, which restricts public and cross-account access when a bucket has a public policy.
- The Object Ownership fix implied the bucket owner can always copy an externally owned object back to itself. Updated the wording to say the object owner should copy or re-upload with the proper ownership, or use bucket owner enforced.
- The SCP command was described as listing SCPs affecting the account. Updated the comment and added a note that `list-policies-for-target` returns only directly attached policies and inherited policies from parent OUs or the organization root must be checked separately.
- The CloudTrail section said CloudTrail logs every S3 API call and used `lookup-events` for `GetObject`. Updated it to explain that bucket-level management events are logged by default, object-level S3 calls require data events, and `lookup-events` searches recent management events.

## Review Notes
The remaining AWS CLI examples and IAM/S3/KMS policy snippets are syntactically valid and consistent with current AWS documentation. The CloudTrail management-event lookup is useful for bucket-level access errors, but object-level 403 diagnosis requires pre-enabled S3 data event logging or querying existing CloudTrail logs/event data stores.
