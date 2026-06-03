# Validation Summary: How to Block Public Access on S3 Buckets

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Amazon S3
- S3 Block Public Access
- AWS CLI
- AWS CloudFront Origin Access Control
- AWS Organizations Service Control Policies
- Amazon EventBridge / CloudTrail
- AWS Config managed rules

## Sources Consulted
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon S3 User Guide: Configuring block public access settings for your account - https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-account.html
- Amazon S3 User Guide: Configuring block public access settings for your S3 buckets - https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html
- AWS CLI Command Reference: s3api put-public-access-block - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html
- AWS CLI Command Reference: s3control put-public-access-block - https://docs.aws.amazon.com/cli/latest/reference/s3control/put-public-access-block.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon EventBridge documentation: Amazon Simple Storage Service events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-s3.html
- Amazon S3 User Guide: Amazon S3 CloudTrail events - https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html
- AWS Config Developer Guide: s3-bucket-public-read-prohibited - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
- AWS Config Developer Guide: s3-bucket-public-write-prohibited - https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-write-prohibited.html
- IAM Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html

## Issues Found
- The introduction listed specific incidents as publicly exposed S3 bucket examples, but at least one widely cited incident involved access to S3 data through compromised permissions rather than an anonymous public bucket. I changed the wording to the broader and accurate "many data exposures."
- The description of `RestrictPublicBuckets` omitted that authorized users are limited to the bucket owner's account. I updated the definition to match AWS documentation.
- The post said enabling all four settings leaves "no way" to make data public "through anything." That was too broad because S3 Block Public Access blocks public ACL and bucket-policy exposure, while authorized IAM access, AWS service principals, and signed requests such as presigned URLs can still work. I narrowed the wording to public access through ACLs and bucket policies.
- The account-level explanation said it simply overrides bucket settings. AWS evaluates both account-level and bucket-level settings and applies the most restrictive combination per setting. I corrected that explanation.
- The precedence diagram implied a single enabled setting blocks all access regardless of which setting is enabled. I replaced it with a per-setting evaluation flow that reflects how S3 combines Block Public Access with normal S3 authorization.
- The SCP section said the sample policy prevents disabling Block Public Access, but the policy denies modification of the settings except by the exempted role. I updated the wording and added that Block Public Access should be enabled before applying this protective policy.
- The EventBridge example omitted the CloudTrail `eventSource` match that AWS recommends for CloudTrail-delivered S3 API events, and it did not include account-level Block Public Access changes. I added `eventSource` and the account-level event names.

## Review Notes
The AWS CLI is not installed in the local environment, so CLI syntax was verified against the current official AWS CLI command reference instead of local `aws help` output.
