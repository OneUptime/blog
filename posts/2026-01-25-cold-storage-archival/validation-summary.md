# Validation Summary: How to Implement Cold Storage Archival

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3 storage classes and S3 Glacier retrieval
- AWS CLI
- Azure Blob Storage access tiers, lifecycle management, and archive rehydration
- Azure CLI
- Google Cloud Storage classes and lifecycle management
- gsutil
- Python and boto3
- Bash scripting

## Sources Consulted
- AWS S3 Glacier storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- AWS CLI restore-object reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/restore-object.html
- AWS S3 storage class configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/sc-howtoset.html
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS S3 Glacier pricing: https://aws.amazon.com/s3/glacier/pricing/
- Azure Blob Storage access tiers: https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview
- Azure Blob Storage archive rehydration overview: https://learn.microsoft.com/en-us/azure/storage/blobs/archive-rehydrate-overview
- Azure CLI storage management policy reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Azure CLI blob reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Google Cloud Storage classes: https://docs.cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage lifecycle management: https://docs.cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage lifecycle configuration reference: https://docs.cloud.google.com/storage/docs/lifecycle-configurations
- Google Cloud Storage object storage class changes: https://docs.cloud.google.com/storage/docs/changing-storage-classes
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing

## Issues Found
- The storage class diagram placed Azure Cold in the "Deep Cold" category. Azure Cold is an online tier with immediate access, while Azure Archive is the offline archive tier. Updated the diagram and comparison table to distinguish Cold from Archive.
- The comparison table listed S3 Glacier Flexible Retrieval as "1-12 hours." AWS documents Expedited retrieval at 1-5 minutes, Standard at 3-5 hours, and Bulk at 5-12 hours. Updated the retrieval-time summary.
- The comparison table listed Azure Archive retrieval only as "Hours." Microsoft documents standard-priority rehydration as up to 15 hours and high-priority rehydration as potentially under 1 hour for blobs under 10 GB. Updated the table and CLI comments.
- The GCP Archive retrieval section said early deletion charges can apply but omitted retrieval fees. Google Cloud documents retrieval fees for Nearline, Coldline, and Archive storage. Updated the wording.
- The GCP rewrite comment said changing an object to Standard "avoids retrieval fees." Rewriting an archived object can itself incur retrieval/data access charges; the benefit is for future frequent access. Updated the comment.
- The AWS retrieval cost estimator applied S3 Glacier Flexible Retrieval rates to both Glacier Flexible Retrieval and Deep Archive objects. Updated the script to use separate rates and timing notes for GLACIER and DEEP_ARCHIVE, and to avoid counting unsupported Expedited Deep Archive retrievals as costed objects.
- General best-practice and wrap-up language implied all cold storage retrieval is delayed. Updated the wording because AWS Glacier Instant Retrieval, Azure Cold, and Google Cloud Archive can provide immediate object access.

## Review Notes
Prices in the post are example public cloud prices and vary by region, redundancy option, request type, object size, and data transfer path. The examples are still suitable for a cost-optimization guide, but production cost estimates should use the provider pricing calculator and the target region.
