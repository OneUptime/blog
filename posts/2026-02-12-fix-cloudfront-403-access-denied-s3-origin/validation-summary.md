# Validation Summary: How to Fix CloudFront '403 Access Denied' with S3 Origin

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon CloudFront
- Amazon S3
- CloudFront Origin Access Control (OAC)
- CloudFront Origin Access Identity (OAI)
- AWS CLI
- S3 bucket policies and ACLs
- S3 Object Ownership
- AWS KMS / SSE-KMS
- CloudFront Functions

## Sources Consulted
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CLI Command Reference: create-origin-access-control - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-origin-access-control.html
- AWS CLI Command Reference: get-bucket-policy - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-policy.html
- Amazon CloudFront Developer Guide: Specify a default root object - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html
- Amazon CloudFront Developer Guide: CloudFront Functions event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon S3 User Guide: Controlling ownership of objects and disabling ACLs for your bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html

## Issues Found
- The OAC introduction said OAC supports "all S3 features." AWS documents specific OAC advantages over OAI, including SSE-KMS, dynamic S3 requests, and broader Region support, but "all S3 features" is too broad. Changed the wording to say OAC supports features OAI does not, including SSE-KMS.
- The OAC setup did not mention the current S3 Object Ownership prerequisite. Added AWS's guidance to use `BucketOwnerEnforced`, or `BucketOwnerPreferred` if ACLs are required.
- The OAI bucket policy example used a distribution-looking placeholder in the OAI ARN. AWS requires the origin access identity ID in that ARN. Changed the placeholder to a distinct OAI-style value.
- The bucket policy inspection command omitted `--query Policy`, which would not pipe a raw JSON policy document cleanly to `python3 -m json.tool`. Updated the command to extract the `Policy` field before formatting it.
- The S3 Block Public Access section implied it can interfere with older OAI configurations. AWS treats correctly scoped OAC/OAI access as non-public; Block Public Access mainly blocks public-read fallback policies or ACLs. Updated the wording accordingly.
- The object-level permissions section said object ACLs override bucket-level permissions. Current S3 Object Ownership behavior is more precise: with `BucketOwnerEnforced`, ACLs are disabled and policies control access; with ACLs enabled, cross-account ownership or missing ACL grants can cause object-specific failures. Updated the explanation.
- The KMS key policy example only listed `kms:Decrypt`. AWS's CloudFront OAC SSE-KMS example includes `kms:Decrypt`, `kms:Encrypt`, and `kms:GenerateDataKey*`. Updated the policy action list to match the official example.

## Review Notes
The post is technically relevant and now aligns with current AWS documentation. The CloudFront distribution update steps remain intentionally high-level; a future improvement could add a complete `update-distribution` CLI flow with ETag handling, but the current guidance is not technically incorrect.
