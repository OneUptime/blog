# Validation Summary: How to Configure S3 Lifecycle Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- Amazon S3 Lifecycle configurations
- S3 storage classes: Standard-IA, Intelligent-Tiering, Glacier Flexible Retrieval, Deep Archive
- S3 Versioning and noncurrent object versions
- S3 Intelligent-Tiering archive access configuration

## Sources Consulted
- OpenTofu Language Documentation: https://opentofu.org/docs/language/
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Terraform AWS Provider `aws_s3_bucket_intelligent_tiering_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_intelligent_tiering_configuration.html.markdown
- Terraform AWS Provider `aws_s3_bucket_versioning` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown
- AWS S3 User Guide, Lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS S3 User Guide, Transitioning objects using S3 Lifecycle: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 User Guide, How S3 Intelligent-Tiering works: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- AWS S3 API Reference, Tiering: https://docs.aws.amazon.com/AmazonS3/latest/API/API_Tiering.html

## Issues Found
- Updated lifecycle transition wording from "objects" to "eligible objects" because current Amazon S3 Lifecycle defaults prevent objects smaller than 128 KB from transitioning to any storage class unless object-size filters or provider-level transition minimum settings override that behavior.
- Updated the noncurrent version expiration comment to avoid implying that S3 always keeps exactly five noncurrent versions. With `noncurrent_days` and `newer_noncurrent_versions`, S3 expires a noncurrent version only after the age threshold is exceeded and enough newer noncurrent versions exist.

## Review Notes
The HCL snippets use current standalone AWS Provider S3 resources rather than deprecated inline `lifecycle_rule` configuration on `aws_s3_bucket`. Empty, prefix, tag, and `and` lifecycle filters match the current provider schema. The Intelligent-Tiering archive access tier values and day thresholds are valid. Local `tofu`/`terraform` binaries were not installed in this workspace, so validation was performed against official OpenTofu, AWS Provider, and AWS S3 documentation rather than by running `tofu validate`.
