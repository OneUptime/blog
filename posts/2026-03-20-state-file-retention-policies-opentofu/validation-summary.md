# Validation Summary: How to Implement State File Retention Policies in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu/Terraform HCL
- AWS provider for Terraform/OpenTofu
- Amazon S3 lifecycle configuration
- Amazon S3 bucket versioning
- Amazon S3 Object Lock
- AWS CLI `s3api list-object-versions`

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_s3_bucket_object_lock_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS provider `aws_s3_bucket_versioning` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Amazon S3 lifecycle transition constraints: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 Object Lock configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- AWS CLI `list-object-versions` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html

## Issues Found
1. **Missing versioning prerequisite**: Added an introduction note that non-current version lifecycle actions require S3 bucket versioning and existing object versions.

2. **Small-object transition behavior was unstated**: Added a current S3 caveat that objects smaller than 128 KB do not transition by default unless an object-size filter is configured.

3. **Invalid Standard-IA transition timings**: Changed the dev and staging `standard_ia_days` values to 30 because S3 does not support transitioning noncurrent versions to Standard-IA before they are at least 30 days noncurrent.

4. **Multiple lifecycle resources for one bucket**: Replaced resource-level `for_each` with a `dynamic "rule"` block so the environment-specific example creates multiple rules inside a single `aws_s3_bucket_lifecycle_configuration` resource. S3 buckets support only one lifecycle configuration.

5. **Compliance example omitted explicit versioning**: Added `aws_s3_bucket_versioning` and `depends_on` references before lifecycle and Object Lock configuration so the Object Lock and non-current version rules have their required versioning prerequisite.

6. **Over-specific compliance wording**: Replaced the SOC2/HIPAA retention comment with neutral wording for workloads that have a 7-year audit-retention requirement.

7. **Object Lock wording was too broad**: Clarified that the default retention configuration applies to new state object versions.

8. **Cost command measured the wrong set of versions**: Changed the storage query from summing all `Versions[].Size` entries to summing only non-current versions with ``Versions[?IsLatest==`false`].Size``.

## Review Notes
- The lifecycle resource, `noncurrent_version_transition`, `noncurrent_version_expiration`, `abort_incomplete_multipart_upload`, Object Lock `default_retention`, and `list-object-versions` command options match current official documentation.
- The dev policy still prioritizes a 90-day recovery window; if avoiding Glacier Flexible Retrieval early deletion fees is more important than archival tiering for development state, a future revision could omit the dev Glacier transition.
- `tofu`, `terraform`, and `aws` were not installed in the local environment, so validation was performed against official documentation rather than local command execution.
