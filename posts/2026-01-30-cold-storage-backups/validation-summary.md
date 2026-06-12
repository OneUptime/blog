# Validation Summary: How to Build Cold Storage Backups

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS S3 storage classes, S3 Lifecycle, S3 Object Lock, S3 Glacier Flexible Retrieval, and S3 Glacier Deep Archive
- AWS CLI and boto3
- Azure Blob Storage Archive tier and Python SDK
- Google Cloud Storage Archive class and Python SDK
- Backblaze B2 CLI and pricing
- Bash backup scripting
- Python recovery-time and cost calculations

## Sources Consulted
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- AWS S3 pricing and minimum storage duration: https://aws.amazon.com/s3/pricing/
- AWS S3 Glacier storage classes: https://aws.amazon.com/s3/storage-classes/glacier/
- AWS CLI S3 Glacier tree-hash guidance: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-glacier.html
- AWS S3 Lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Microsoft Azure Archive rehydration documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-overview
- Microsoft Azure Blob Python access tier documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python
- Google Cloud Storage classes: https://docs.cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage lifecycle management: https://docs.cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage Python Bucket API: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Backblaze B2 CLI upload documentation: https://www.backblaze.com/docs/cloud-storage-upload-files-with-the-cli
- Backblaze B2 CLI v4 command structure note: https://www.backblaze.com/blog/command-like-a-pro-with-new-backblaze-b2-cli-enhancements/
- Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing

## Issues Found
- Corrected Glacier Deep Archive retrieval-fee wording from "$20-100" to "$2.50-$20" before data-transfer charges. Deep Archive supports Standard and Bulk retrieval, while higher totals can come from separate data transfer fees.
- Clarified the retrieval table so Bulk retrieval is shown as free for S3 Glacier Flexible Retrieval but paid for Deep Archive.
- Fixed the direct Glacier multipart upload example. The original final checksum incorrectly built the tree hash from 128 MB part hashes; Glacier requires a SHA-256 tree hash over 1 MiB chunks of the original archive.
- Updated the Google Cloud Storage lifecycle example to use the Python client's `add_lifecycle_set_storage_class_rule(..., matches_prefix=...)` helper and added the Archive class 365-day minimum storage duration.
- Updated Backblaze B2 CLI examples from deprecated commands to the current nested command form: `b2 account authorize`, `b2 file upload`, and `b2 file download`.
- Updated Backblaze B2 pricing from `$0.005/GB/month` to the current `$6.95/TB/month` starting price and clarified the current free-egress policy.
- Corrected the cold-to-warm diagram to show Glacier Deep Archive restores as temporary copies rather than direct lifecycle movement into warmer storage classes.
- Corrected the predictive rehydration timing table to match S3 Glacier Flexible Retrieval tiers and fixed the expedited minimum-required calculation.
- Replaced an invalid CloudWatch metric example for direct Glacier vaults with a `describe_vault` inventory summary and corrected the estimated monthly storage rate to the S3 Glacier direct API/Flexible Retrieval rate.
- Clarified that Azure high-priority archive rehydration may complete in under an hour for blobs under 10 GB, matching Microsoft documentation.
- Corrected the backup shell script so it archives an already consistent PostgreSQL backup directory rather than tarring a live PostgreSQL data directory directly.

## Review Notes
The post is now technically valid as a practical cold-storage guide. Pricing remains region-sensitive and can change over time, so future reviews should refresh all provider pricing before publication.
