# Validation Summary: How to Configure S3 Versioning with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for Terraform/OpenTofu
- Amazon S3 bucket versioning
- S3 MFA Delete
- S3 Object Lock
- S3 Lifecycle rules
- S3 bucket policies
- S3 Replication
- AWS CLI

## Sources Consulted
- HashiCorp AWS Provider `aws_s3_bucket_versioning` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown
- HashiCorp AWS Provider `aws_s3_bucket_lifecycle_configuration` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- HashiCorp AWS Provider `aws_s3_bucket_object_lock_configuration` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_object_lock_configuration.html.markdown
- HashiCorp AWS Provider `aws_s3_bucket_replication_configuration` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_replication_configuration.html.markdown
- HashiCorp AWS Provider `aws_s3_object` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/s3_object.html.markdown
- Amazon S3 Versioning User Guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- Amazon S3 MFA Delete documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html
- Amazon S3 PutBucketVersioning API Reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html
- Amazon S3 Object Lock configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Amazon S3 Lifecycle configuration elements documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 Lifecycle transition constraints: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- AWS CLI `copy-object` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3api/copy-object.html

## Issues Found
- The MFA Delete section implied OpenTofu could directly manage MFA Delete as normal desired state and showed `mfa_delete = "Enabled"` without the required root-account MFA handling. I changed the text and snippet to show versioning in OpenTofu and MFA Delete enablement through the AWS CLI/API with root MFA credentials.
- The Object Lock snippet said Object Lock must be set at bucket creation time and said objects cannot be deleted for 7 years. Current S3 and provider docs support enabling Object Lock on existing versioned general purpose buckets, and Object Lock retention protects object versions from permanent deletion. I corrected the comments without restructuring the section.
- The lifecycle example transitioned noncurrent versions to `STANDARD_IA` after 7 days, which violates S3's 30-day minimum for Standard-IA and One Zone-IA noncurrent transitions. I changed the transition schedule to 30 days for `STANDARD_IA`, 60 days for `GLACIER`, and 90 days for noncurrent expiration so the staged lifecycle example is valid.
- The bucket policy used a non-existent `s3:VersionStatus` condition key to deny only suspension. The S3 service authorization reference does not define that condition key, so the deny would not reliably prevent suspension. I changed the example to deny `s3:PutBucketVersioning` as a versioning-change guardrail.
- The replication example enabled versioning only on the source bucket. S3 replication requires both source and destination buckets to have versioning enabled, so I added destination bucket versioning and included it in the dependency list.
- The conclusion described expired-object-delete-marker cleanup too broadly. I narrowed it to delete markers left after all noncurrent versions have expired.

## Review Notes
The post is now technically valid as a concise tutorial. Future improvements could add a note that a deny-all `s3:PutBucketVersioning` bucket policy also blocks later legitimate versioning changes unless the policy is updated or scoped to leave a break-glass/IaC principal available.
