# Validation Summary: How to Configure S3 Replication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform AWS Provider (`hashicorp/aws`)
- Amazon S3 Cross-Region Replication (CRR)
- Amazon S3 Same-Region Replication (SRR)
- AWS IAM
- AWS KMS
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- Terraform AWS Provider documentation for `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS Provider version 6 upgrade guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Amazon S3 User Guide, setting up permissions for live replication: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Amazon S3 User Guide, replicating encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- Amazon S3 API Reference, `SourceSelectionCriteria`: https://docs.aws.amazon.com/AmazonS3/latest/API/API_SourceSelectionCriteria.html
- Amazon S3 User Guide, changing the replica owner: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-change-owner.html
- Amazon S3 User Guide, replication metrics: https://docs.aws.amazon.com/AmazonS3/latest/userguide/repl-metrics.html
- Amazon S3 User Guide, CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Amazon S3 Replication Time Control SLA: https://aws.amazon.com/s3/sla-rtc/

## Issues Found
- The introduction implied S3 Replication copies objects generally. Updated it to specify new objects and eligible metadata changes, which matches live replication behavior.
- The destination bucket comment said a separate provider is required. Updated it to say the example uses an aliased provider because AWS provider v6 also supports per-resource `region`.
- The article showed multiple `aws_s3_bucket_replication_configuration` resources for the same source bucket without warning. Added the provider-documented caveat that each source bucket has one replication configuration and examples should be treated as alternatives or combined into one resource.
- Replication configuration dependencies only waited for source bucket versioning. Added destination versioning dependencies so the S3 API does not reject replication setup before destination versioning is enabled.
- `replica_modifications` was incorrectly nested inside `destination`. Moved it under `source_selection_criteria`, which is the valid provider/API structure.
- The KMS replication example set a destination KMS key but did not opt in to SSE-KMS/DSSE-KMS source object replication. Added `sse_kms_encrypted_objects` under `source_selection_criteria`.
- The IAM policy omitted KMS permissions needed for SSE-KMS/DSSE-KMS replication. Added `kms:Decrypt` for the source key and `kms:Encrypt` for the replica key.
- The cross-account ownership override example omitted the required `s3:ObjectOwnerOverrideToBucketOwner` permission and destination-side policy caveat. Added the IAM action and a code comment noting the destination bucket policy/Object Ownership requirement.
- The `replication_time` comments described delete-marker behavior. Updated the comments to describe S3 Replication Time Control and moved delete-marker wording to the correct block.
- The CloudWatch alarm omitted AWS's recommended missing-data treatment for replication metrics. Added `treat_missing_data = "ignore"`.
- The conclusion used invalid Terraform shorthand for disabling delete marker replication and overstated RTC as guaranteed timing. Updated it to the correct block syntax and SLA-backed, predictable timing language.

## Review Notes
The post is now technically valid as a tutorial-style set of snippets, but the examples still assume surrounding resources and variables such as provider aliases, KMS keys, replica buckets, destination bucket policies, and SNS topics. Existing objects are outside the scope of the post; they require S3 Batch Replication if they must be copied after enabling live replication. I could not run `tofu validate` or `terraform validate` because neither CLI is installed in this environment.
