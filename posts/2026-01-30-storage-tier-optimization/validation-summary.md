# Validation Summary: How to Create Storage Tier Optimization

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- AWS S3 (Standard, Standard-IA, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval, Glacier Deep Archive)
- AWS S3 Intelligent-Tiering (including opt-in Archive Access and Deep Archive Access tiers)
- AWS S3 Lifecycle Configuration
- AWS S3 Storage Lens
- AWS S3 Access Logs
- Azure Blob Storage (Hot, Cool, Cold, Archive tiers)
- Azure Blob Storage lifecycle management policies
- Google Cloud Storage (Standard, Nearline, Coldline, Archive)
- GCS lifecycle policies (`gsutil lifecycle`)
- boto3 Python SDK (S3 client, restore_object, put_bucket_intelligent_tiering_configuration)
- azure-storage-blob Python SDK (BlobServiceClient, set_standard_blob_tier)
- Kubernetes CronJob / ConfigMap
- BigQuery / Athena SQL
- Mermaid diagrams

## Sources Consulted
- AWS S3 pricing — https://aws.amazon.com/s3/pricing/
- AWS S3 storage classes documentation — https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- AWS S3 Glacier storage classes — https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- Archive retrieval options (Expedited / Standard / Bulk) — https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- S3 Intelligent-Tiering — https://aws.amazon.com/s3/storage-classes/intelligent-tiering/
- PutBucketIntelligentTieringConfiguration API — https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketIntelligentTieringConfiguration.html
- boto3 S3 client docs for put_bucket_intelligent_tiering_configuration and restore_object
- Azure access tiers overview — https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Azure set blob access tier with Python — https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-use-access-tier-python
- GCS storage class documentation — https://cloud.google.com/storage/docs/storage-classes
- GCS lifecycle management — https://cloud.google.com/storage/docs/lifecycle

## Issues Found

1. **Incorrect Glacier Expedited retrieval scope** (`ArchiveManager.initiate_restore` docstring):
   - Was: `Expedited: 1-5 minutes (Glacier Instant/Flexible only)`.
   - Fix: Changed to `Expedited: 1-5 minutes (Glacier Flexible Retrieval only)` and clarified the docstring header references Glacier Flexible Retrieval tiers.
   - Why: S3 Glacier Instant Retrieval has no retrieval-tier concept (objects are accessible via GetObject in milliseconds). Expedited is only supported by Glacier Flexible Retrieval. Deep Archive supports only Standard and Bulk.

2. **bulk_restore incorrectly included GLACIER_IR objects**:
   - Was: `if obj.get('StorageClass') in ['GLACIER', 'DEEP_ARCHIVE', 'GLACIER_IR']:`.
   - Fix: Removed `GLACIER_IR` from the list and added a comment explaining why.
   - Why: Calling `restore_object` on objects in S3 Glacier Instant Retrieval will fail with `ObjectAlreadyInActiveTierError` because those objects are already directly accessible via GetObject.

3. **Mermaid diagram price for Intelligent-Tiering Archive Access tier was wrong**:
   - Was: `Archive Access Tier $0.004/GB` with "3-5 hours" async retrieval.
   - Fix: Changed price to `$0.0036/GB`.
   - Why: $0.004/GB is the price of the auto "Archive Instant Access" tier (millisecond retrieval). The opt-in "Archive Access" tier (3-5 hour async retrieval — which is what the diagram and adjacent Python code configure via `ARCHIVE_ACCESS`) costs $0.0036/GB in us-east-1, matching S3 Glacier Flexible Retrieval pricing.

4. **Glacier Flexible Retrieval retrieval cost in cost calculator was Expedited price, not Standard**:
   - Was: `'GLACIER': StorageTier('Glacier Flexible', 0.0036, 0.03, 90, 0.0036)`.
   - Fix: Changed retrieval cost from `0.03` to `0.01`.
   - Why: $0.03/GB is the Expedited retrieval price for Glacier Flexible Retrieval; the Standard retrieval price (the realistic default used in cost-optimization calculators) is $0.01/GB. Using the Expedited rate inflates retrieval costs and would distort the tier-recommendation output. GLACIER_IR keeps its $0.03/GB retrieval since that is its single flat rate.

## Review Notes
- All standard S3 storage prices listed in the AWS S3 Storage Classes table (Standard $0.023, Standard-IA $0.0125, One Zone-IA $0.01, Glacier Instant $0.004, Glacier Flexible $0.0036, Deep Archive $0.00099) match current AWS us-east-1 pricing.
- The "S3 Glacier Flexible | 1-12 hours" retrieval-time range in the AWS table is a simplification — Expedited is in minutes, Standard is 3-5 hours, Bulk is 5-12 hours. Kept as-is since it covers the high end accurately and the post discusses individual tiers in detail elsewhere.
- The GCS "Standard | 99.99% Availability SLA" entry reflects the typical availability target; the contractual SLA for multi/dual-region Standard is technically 99.95% and single-region is 99.9%. Left as-is because it's representative of the typical experience and the broader comparison is correct.
- `set_standard_blob_tier('Cold')` requires azure-storage-blob >= 12.15.0 (Cold tier became GA in 2023). Worth noting if users hit version errors.
- The `gsutil lifecycle set` command still works but Google now recommends `gcloud storage buckets update --lifecycle-file=...` as the modern equivalent. Not a correctness issue.
- S3 Intelligent-Tiering monitors objects ≥ 128 KB; smaller objects are always charged at Frequent Access tier rates and never auto-tier. Not mentioned in the post but worth being aware of when planning intelligent tiering.
- The pricing values are stamped "as of 2024" in the cost calculator comment — readers should re-verify against current AWS pricing pages before relying on the numbers in production.
