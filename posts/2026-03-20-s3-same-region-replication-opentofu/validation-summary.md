# Validation Summary: How to Configure S3 Same-Region Replication with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS S3
- S3 Same-Region Replication
- S3 Object Lock
- AWS IAM
- Terraform/OpenTofu HCL

## Sources Consulted
- AWS S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- AWS S3 live replication permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- AWS S3 replication configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS S3 ReplicationRule API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ReplicationRule.html
- AWS S3 Destination API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_Destination.html
- AWS S3 Object Lock considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- AWS S3 replication behavior for replicated data: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html
- Terraform AWS provider `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` command workflow: https://opentofu.org/docs/cli/init/

## Issues Found
- The first replication rule used `storage_class = "STANDARD"` with a comment saying it would keep the same storage class as the source. The provider documentation says the source storage class is preserved by default when `storage_class` is omitted; setting `STANDARD` explicitly stores replicas in that class. Updated the comment to match the configuration.
- The replication rules used V2 `filter` blocks without explicit unique `priority` values. AWS replication configuration documentation requires priority with filtered rules, and the provider requires priorities to be unique across multiple rules. Added `priority = 1` and `priority = 2`.
- The second filtered replication rule did not include `delete_marker_replication`. AWS documentation says filtered replication rules must include delete marker replication configuration. Added `delete_marker_replication { status = "Disabled" }`.
- The destination block included `access_control_translation` and `account` in a same-account bucket example. AWS and provider documentation say owner override should be used only for cross-account replication. Removed the owner override block and the related unnecessary IAM permissions.
- The replication configuration depended only on source bucket versioning. AWS requires both source and destination buckets to have versioning enabled before configuring replication, and the IAM role policy must exist before S3 can use the role. Added explicit dependencies on the IAM role policy and both versioning resources.
- The Object Lock configuration did not explicitly depend on destination bucket versioning even though the provider documentation requires versioning before enabling Object Lock on an existing bucket. Added a dependency on destination bucket versioning.

## Review Notes
- S3 replication applies to new objects after the replication configuration is created. Existing objects require S3 Batch Replication; the post does not cover that scenario.
- The example assumes a same-account destination bucket. Cross-account SRR additionally requires destination bucket permissions and, if changing replica ownership, the destination account owner override settings.
