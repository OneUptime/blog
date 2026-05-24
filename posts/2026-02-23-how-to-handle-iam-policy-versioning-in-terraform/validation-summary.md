# Validation Summary: How to Handle IAM Policy Versioning in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL syntax, AWS provider ~> 5.0)
- AWS IAM (managed policies, policy versioning)
- AWS S3 (object versioning, `aws_s3_object`, `aws_s3_bucket_versioning`)
- AWS CloudTrail / CloudWatch Events (EventBridge)
- AWS SNS
- AWS CLI (`aws iam list-policy-versions`, `aws iam delete-policy-version`)
- Terraform functions (`jsonencode`, `sha256`, `timestamp`)
- `null_resource` with `local-exec` provisioner

## Sources Consulted
- AWS IAM documentation on managed policy versions: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-versioning.html (confirms 5-version limit, default version semantics)
- Terraform AWS provider `aws_iam_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy (confirms automatic version pruning behavior)
- Terraform AWS provider `aws_iam_policy` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy (confirms `policy_id`, `default_version_id`, `attachment_count`, `arn` attributes)
- Terraform AWS provider `aws_s3_object` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object (confirms current resource name and `content`/`metadata` arguments)
- Terraform AWS provider `aws_cloudwatch_event_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule (confirms `event_pattern` structure)
- AWS CLI Reference for `iam list-policy-versions` and `iam delete-policy-version`: https://docs.aws.amazon.com/cli/latest/reference/iam/
- AWS CloudTrail event names for IAM: `CreatePolicyVersion`, `DeletePolicyVersion`, `SetDefaultPolicyVersion` are valid IAM API actions.

## Issues Found
No technical issues found.

## Review Notes
- The 5-version limit and the Terraform AWS provider's automatic pruning of the oldest non-default version when updating an `aws_iam_policy` are both accurate.
- The data-source attribute names (`policy_id`, `default_version_id`, `arn`, `attachment_count`) match the current Terraform AWS provider docs.
- `aws_s3_object` is the current (non-deprecated) resource name; the older `aws_s3_bucket_object` would have triggered a deprecation warning.
- The `version_archive` resource uses `sha256(var.policy_document)` in the S3 key, which means a new S3 object is created at a new key whenever the policy changes. Combined with S3 versioning on the bucket, this is functional, though readers should be aware that the use of `timestamp()` inside the `metadata` block will cause a perpetual diff on every `terraform plan` (a known anti-pattern). This is a stylistic/UX caveat rather than a technical error.
- IAM is a global service, so IAM CloudTrail events are delivered in `us-east-1`. The CloudWatch Event Rule must be created in that region to capture them. The post uses `us-east-1` in the provider block, which keeps the example consistent, but readers running the rule in another region would need to add a us-east-1 provider alias.
- The blog cross-link to the IAM Policy Simulator tests post is internal to oneuptime.com/blog and follows the same publication date convention used in the post.
