# Validation Summary: How to Set Up S3 Cross-Region Replication with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform AWS Provider
- AWS S3
- S3 Cross-Region Replication
- S3 Replication Time Control
- AWS IAM
- AWS KMS
- AWS CLI

## Sources Consulted
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- Terraform AWS Provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html#replication-and-other-bucket-configs
- Amazon S3 replication configuration for KMS-encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- Amazon S3 Replication Time Control documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html
- Amazon S3 delete marker replication documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-marker-replication.html
- Amazon S3 replication status documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-status.html
- AWS CLI `s3api head-object` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html

## Issues Found
- The DR-region provider alias `aws.dr_region` was referenced but not shown. Added default and aliased AWS provider configuration blocks so the snippets demonstrate the required multi-region provider setup.
- The prerequisites omitted KMS permissions even though the replication and destination encryption examples use customer-managed KMS keys. Updated the prerequisite to include KMS permissions.
- The replication role policy did not include the KMS permissions required for SSE-KMS source objects and KMS-encrypted replicas. Added `kms:Decrypt` for the source key and destination-key permissions for encryption, bucket-key decryption, and data-key generation.
- The replication configuration set a destination replica KMS key but did not opt in to replicating SSE-KMS source objects. Added `source_selection_criteria` with `sse_kms_encrypted_objects` enabled.
- The replication resource only depended on source bucket versioning. Added dependencies on destination bucket versioning and the IAM role policy so OpenTofu does not try to configure replication before required prerequisites are in place.
- The comment above the `replication_time` block incorrectly described delete marker replication. Updated it to describe Replication Time Control.
- The conclusion overstated RTC as a blanket guarantee and treated `aws s3 sync` as equivalent to replication of existing objects. Reworded it to describe RTC as an SLA-backed 15-minute target for eligible new objects and clarified that `aws s3 sync` only covers current object versions.

## Review Notes
- The snippets still assume input variables such as `var.project_name`, `var.primary_region`, `var.dr_region`, `var.source_kms_key_arn`, and `var.dr_kms_key_arn` are defined elsewhere.
- For cross-account replication, additional destination bucket and KMS key policy permissions may be required; the post reads as a same-account setup.
- Local `tofu validate` could not be run because neither `tofu` nor `terraform` is installed in this workspace.
