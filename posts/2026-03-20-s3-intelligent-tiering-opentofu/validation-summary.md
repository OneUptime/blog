# Validation Summary: How to Configure S3 Intelligent-Tiering with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu HCL
- Terraform AWS Provider
- Amazon S3
- S3 Intelligent-Tiering
- S3 Lifecycle configuration
- S3 Storage Lens

## Sources Consulted
- AWS S3 User Guide: Managing storage costs with Amazon S3 Intelligent-Tiering - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html
- AWS S3 User Guide: How S3 Intelligent-Tiering works - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- AWS S3 User Guide: Managing S3 Intelligent-Tiering - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-managing.html
- AWS S3 User Guide: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS S3 User Guide: Transitioning objects using Amazon S3 Lifecycle - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 API Reference: Tiering - https://docs.aws.amazon.com/AmazonS3/latest/API/API_Tiering.html
- AWS S3 API Reference: Transition - https://docs.aws.amazon.com/AmazonS3/latest/API/API_Transition.html
- AWS S3 Pricing notes for S3 Intelligent-Tiering object size and monitoring charges - https://aws.amazon.com/s3/pricing/
- Terraform AWS Provider docs: aws_s3_bucket - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider docs: aws_s3_bucket_intelligent_tiering_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_intelligent_tiering_configuration
- Terraform AWS Provider docs: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider docs: aws_s3control_storage_lens_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3control_storage_lens_configuration
- OpenTofu CLI docs: init, plan, and apply - https://opentofu.org/docs/cli/commands/init/, https://opentofu.org/docs/cli/commands/plan/, https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The introduction described Intelligent-Tiering as having no performance impact without distinguishing the optional archive tiers used later in the post. AWS documents the low-latency tiers as having no performance impact, while Archive Access and Deep Archive Access require asynchronous restore. Updated the introduction and conclusion to make that distinction.
- The lifecycle rule used `object_size_greater_than = 131072` while describing the rule as covering objects at the 128 KB Intelligent-Tiering eligibility threshold. S3 lifecycle object size filters exclude the specified boundary value, so exactly 128 KiB objects would not match either lifecycle rule. Changed the threshold to `131071` and clarified the comment.
- The conclusion said smaller objects incur the Intelligent-Tiering monitoring fee without savings. AWS pricing documentation says objects smaller than 128 KB in Intelligent-Tiering are not monitored, remain in the Frequent Access tier, and do not incur the monitoring and automation charge. Updated the conclusion accordingly.

## Review Notes
The AWS provider resource names and arguments used in the snippets are current: `aws_s3_bucket`, `aws_s3_bucket_intelligent_tiering_configuration`, `aws_s3_bucket_lifecycle_configuration`, and `aws_s3control_storage_lens_configuration`. The `ARCHIVE_ACCESS`, `DEEP_ARCHIVE_ACCESS`, `INTELLIGENT_TIERING`, `STANDARD_IA`, Storage Lens `output_schema_version = "V_1"`, and `tofu init`, `tofu plan`, and `tofu apply` commands were verified. The snippets assume supporting declarations such as `var.bucket_name`, `data.aws_caller_identity.current`, and the Storage Lens export bucket are defined elsewhere.
