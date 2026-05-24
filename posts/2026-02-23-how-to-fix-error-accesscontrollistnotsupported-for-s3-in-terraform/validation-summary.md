# Validation Summary: How to Fix Error AccessControlListNotSupported for S3 in Terraform

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HCL)
- Terraform AWS Provider (`aws_s3_bucket`, `aws_s3_bucket_acl`, `aws_s3_bucket_ownership_controls`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_policy`, `aws_cloudfront_origin_access_control`, `aws_cloudfront_distribution`)
- Amazon S3 (Object Ownership, ACLs, Bucket Policies, Public Access Block)
- Amazon CloudFront (Origin Access Control / OAC)
- AWS IAM (bucket policy principals and conditions)

## Sources Consulted
- AWS S3 Object Ownership documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS announcement on S3 default settings change (April 2023): https://aws.amazon.com/blogs/aws/heads-up-amazon-s3-security-changes-are-coming-in-april-of-2023/
- Terraform AWS Provider `aws_s3_bucket_ownership_controls` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_ownership_controls
- Terraform AWS Provider `aws_s3_bucket_acl` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- Terraform AWS Provider `aws_cloudfront_origin_access_control` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- Terraform AWS Provider `aws_s3_bucket_public_access_block` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- AWS docs on restricting S3 bucket access to a CloudFront OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
No technical issues found.

The April 2023 date for the AWS default change is accurate (the rollout for all new buckets completed by late April 2023). The three `object_ownership` values (`BucketOwnerEnforced`, `BucketOwnerPreferred`, `ObjectWriter`) are correct, and `BucketOwnerEnforced` is indeed the default. The `aws_cloudfront_origin_access_control` resource arguments (`name`, `description`, `origin_access_control_origin_type`, `signing_behavior`, `signing_protocol`) match the provider schema. The OAC bucket policy uses the correct `cloudfront.amazonaws.com` service principal with the `AWS:SourceArn` condition, which is AWS's recommended pattern. The `depends_on` between `aws_s3_bucket_acl` and `aws_s3_bucket_ownership_controls` is necessary and correctly explained. Use of `bucket_regional_domain_name` (rather than `bucket_domain_name`) for the CloudFront origin is correct, since OAC requires the regional endpoint.

## Review Notes
- The inline `acl = "private"` argument on `aws_s3_bucket` shown in the "before" examples was actually deprecated in Terraform AWS Provider v4.0 (Feb 2022), before the AWS server-side default change in April 2023. The post correctly presents it as a legacy/broken pattern, so this is fine.
- The `lifecycle { ignore_changes = [acl] }` snippet in the migration section works on AWS provider v4.x where `acl` is computed. On AWS provider v5.x and later, the `acl` attribute was removed from `aws_s3_bucket`, so `ignore_changes = [acl]` would produce an error there. Readers on v5+ should generally not need this snippet because there is nothing to ignore once the argument is gone.
- The "When Do You Actually Need ACLs?" section mentions S3 server access logging as a case requiring ACLs. With `BucketOwnerEnforced` buckets, log delivery to S3 is now granted via bucket policies (the S3 Log Delivery service uses the `logging.s3.amazonaws.com` service principal), so this is more of a legacy edge case than a current requirement. The framing as a possible exception is acceptable.
- The error message format shown is representative; exact wording can vary slightly between Terraform AWS provider versions, but the `AccessControlListNotSupported` code and message are accurate.
