# Validation Summary: How to Create an S3 Bucket with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS S3
- AWS S3 versioning, server-side encryption (SSE-S3 / SSE-KMS), public access block, lifecycle policies
- AWS IAM policy documents
- AWS CloudFront (referenced in bucket policy example)

## Sources Consulted
- AWS provider docs — `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider docs — `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- AWS provider docs — `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider docs — `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- AWS provider docs — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS provider docs — `aws_s3_bucket_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- AWS provider docs — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- hashicorp/terraform-provider-aws issue #23433 (lifecycle rule filter requirement)

## Issues Found
1. **Misleading comment on `bucket_key_enabled`** — The original comment "# Prevent unencrypted uploads" next to `bucket_key_enabled = true` was technically incorrect. `bucket_key_enabled` controls whether S3 Bucket Keys are used to reduce SSE-KMS request costs; it does not prevent unencrypted uploads. Default encryption (the surrounding resource) is what causes S3 to encrypt new objects on upload, and blocking unencrypted PutObject calls actually requires a bucket policy with a deny condition on `s3:x-amz-server-side-encryption`. Updated the comment to: "Use an S3 Bucket Key to reduce SSE-KMS request costs".
2. **Missing `filter {}` in lifecycle rule** — In AWS provider v4+/v5+, each rule in `aws_s3_bucket_lifecycle_configuration` requires either a `filter` or `prefix` argument; omitting both produces the warning *"No attribute specified when one (and only one) of [rule[0].filter,rule[0].prefix] is required"* (tracked in hashicorp/terraform-provider-aws#23433). Added an empty `filter {}` block so the rule cleanly applies to all objects in the bucket.

## Review Notes
- The introduction lists ACL among the split configuration concerns but the post does not show an `aws_s3_bucket_acl` example. This is fine because the post enables full public access blocking (which makes ACLs effectively irrelevant), but a future revision could either drop the ACL mention from the intro or add a brief example.
- The `aws_cloudfront_distribution.main` reference inside the bucket policy is illustrative; readers will need to define their own CloudFront distribution resource for that example to plan/apply.
- All resource names, attribute names, and structures otherwise match current AWS provider documentation (verified against v5+).
