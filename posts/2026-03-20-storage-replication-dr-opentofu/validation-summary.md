# Validation Summary: How to Set Up Storage Replication for DR with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS S3 Cross-Region Replication
- AWS S3 Replication Time Control
- Azure Storage Account / Azure Blob Storage
- Azure GZRS and RA-GZRS
- Google Cloud Storage dual-region buckets
- Google Cloud Storage Turbo Replication

## Sources Consulted
- HashiCorp AWS Provider `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- AWS S3 replication configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS S3 Replication Time Control: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html
- Amazon S3 Replication Time Control SLA: https://aws.amazon.com/s3/features/replication/sla/
- HashiCorp AzureRM Provider `azurerm_storage_account`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Azure Storage disaster recovery and geo-redundancy guidance: https://learn.microsoft.com/en-us/azure/storage/common/storage-disaster-recovery-guidance
- HashiCorp Google Provider `google_storage_bucket`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google Cloud Storage bucket locations: https://cloud.google.com/storage/docs/locations
- Google Cloud Storage Turbo Replication: https://cloud.google.com/storage/docs/managing-turbo-replication
- Google Cloud Storage availability and durability: https://cloud.google.com/storage/docs/availability-durability
- Google Cloud Storage SLA: https://cloud.google.com/storage/sla

## Issues Found
- The AWS S3 replication example placed `replication_time` and `metrics` at the rule level. In the AWS provider schema, S3 RTC settings are configured under the `destination` block. Moved `metrics` and `replication_time` into `destination`.
- The AWS S3 rule used V2-only behavior without an explicit V2 filter/priority pairing. Added `filter {}` and `priority = 1` so the all-objects rule works with `delete_marker_replication`.
- The AWS S3 replication resource depended only on source bucket versioning. Added the replica bucket versioning resource to `depends_on` because destination versioning is also required before replication is configured.
- The AWS S3 example referenced an undefined `aws_kms_key.dr_s3` and opted into KMS-encrypted object replication without the additional KMS key/IAM configuration required for a complete working snippet. Removed the incomplete KMS-specific settings.
- The Azure section title and comment referred to GRS while the code used `GZRS`. Updated the wording to geo-zone-redundant storage.
- The GCP section described a multi-region bucket, but Turbo Replication is for dual-region buckets. Updated the overview and heading to use dual-region terminology.
- The GCP example used `US-CENTRAL1+US-EAST1` as the Terraform bucket location. Replaced it with the official predefined dual-region code `NAM4`.
- The GCP Turbo Replication comment said 99% of objects replicate within 15 minutes. Updated it to the documented 15-minute RPO for newly written objects.
- The summary overstated AWS S3 RTC as a 99.99% SLA guarantee. Updated it to distinguish the 99.99% design target from the 99.9% SLA commitment, and clarified Google Cloud Storage Turbo Replication as a 15-minute RPO with SLA conformance terms.

## Review Notes
- The snippets still use example bucket and storage account names. Real deployments must use globally unique names and provide the referenced provider aliases/resource group.
- No local OpenTofu or Terraform binary was available in the review environment, so validation was performed against official provider schemas and cloud service documentation rather than by running `tofu validate`.
