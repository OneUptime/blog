# Validation Summary: How to Back Up OpenTofu State Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS S3
- AWS CLI
- HashiCorp AWS provider
- Bash
- `jq`
- Python 3

## Sources Consulted
- OpenTofu docs: `tofu state` command - https://opentofu.org/docs/cli/commands/state/
- OpenTofu docs: `tofu state pull` - https://opentofu.org/docs/v1.11/cli/commands/state/pull/
- OpenTofu docs: state storage and locking / manual pull-push - https://opentofu.org/docs/language/state/backends/
- OpenTofu docs: local backend - https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu docs: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider docs: `aws_s3_bucket_versioning` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_versioning.html.markdown
- AWS provider docs: `aws_s3_bucket_lifecycle_configuration` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- AWS provider docs: `aws_s3_bucket_replication_configuration` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_replication_configuration.html.markdown
- Amazon S3 User Guide: How S3 Versioning works - https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- Amazon S3 User Guide: Requirements and considerations for replication - https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-and-other-bucket-configs.html
- Amazon S3 User Guide: Deleting an object from an MFA delete-enabled bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMFADelete.html
- Amazon S3 API Reference: `NoncurrentVersionTransition` - https://docs.aws.amazon.com/AmazonS3/latest/API/API_NoncurrentVersionTransition.html
- Amazon S3 User Guide: Transitioning objects using Amazon S3 Lifecycle - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS CLI Command Reference: `aws s3 cp` - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI Command Reference: `aws s3api list-object-versions` - https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI Command Reference: `aws s3api get-object` - https://docs.aws.amazon.com/cli/v1/reference/s3api/get-object.html

## Issues Found
- The S3 versioning section incorrectly declared two separate `aws_s3_bucket_versioning` resources for the same bucket and enabled `mfa_delete` without the required top-level `mfa` argument. I merged this into a single valid resource example and clarified the MFA Delete requirement.
- The explanation said every `tofu apply` creates a new S3 version. S3 versioning actually creates a new object version when the state object is written or overwritten, so I corrected that wording.
- The manual backup commands generated the backup filename twice with separate `date` evaluations, which could cause the `aws s3 cp` command to reference a file that does not exist. I changed the snippet to store the filename in a variable and reuse it.
- The same-bucket copy example called the result a "versioned backup", but the command creates a separate timestamped object key. I corrected that wording.
- The local backup section was too broad. I scoped it to local-backend workflows and clarified that the backup file reflects the prior local state write.
- The scheduled backup script comment said it listed all state files, but the command only matched keys ending in the default `terraform.tfstate` name. I corrected the comment to match the actual behavior.
- The cross-region replication section omitted key prerequisites from the official docs. I added that both buckets must already have versioning enabled and modernized the rule example with `filter {}`.

## Review Notes
- The lifecycle configuration snippet is valid as written for rules that apply to the whole bucket, and the noncurrent transition storage classes used in the post are supported by Amazon S3.
- S3 replication applies to objects created or updated after the replication configuration is in place. Existing state-object versions are not retroactively replicated unless you use additional replication tooling such as Batch Replication.
