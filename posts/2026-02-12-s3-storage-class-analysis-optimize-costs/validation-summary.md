# Validation Summary: How to Set Up S3 Storage Class Analysis to Optimize Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 Storage Class Analysis
- Amazon S3 Lifecycle configurations
- Amazon S3 Intelligent-Tiering
- Amazon S3 Storage Lens
- AWS CLI
- Amazon CloudWatch S3 storage metrics
- Python with boto3

## Sources Consulted
- AWS S3 Storage Class Analysis documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/analytics-storage-class.html
- AWS S3 Lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS CLI put-bucket-lifecycle-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS S3 Intelligent-Tiering documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html
- AWS S3 Intelligent-Tiering overview: https://docs.amazonaws.cn/en_us/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- AWS CLI put-storage-lens-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/s3control/put-storage-lens-configuration.html
- AWS S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- boto3 S3 restore_object documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/objectsummary/restore_object.html

## Issues Found
- The post overstated Storage Class Analysis as telling users exactly which data can move to Glacier. AWS documents its recommendation fields as guidance for transitions from Standard to Standard-IA, so the introduction was narrowed to Standard-IA guidance that can inform broader lifecycle rules.
- The exported CSV column list included `ObjectSizeBytes` and described `Filter` as the configured prefix or tag. AWS documents the export as using fields such as `Storage_MB`, `DataRetrieved_MB`, `GetRequestCount`, and Standard-IA recommendation columns, with `Filter` intentionally empty, so the list was corrected.
- The interpretation section equated "infrequently accessed" with objects not accessed for 30+ days. AWS bases the analysis on object age groups, storage volume, and bytes retrieved, so the explanation was corrected.
- The lifecycle prose said Glacier after 90 days while the example used `GLACIER_IR`. The wording was changed to Glacier Instant Retrieval.
- The noncurrent-version lifecycle example transitioned noncurrent versions to Standard-IA after 7 days, but AWS requires noncurrent objects to be at least 30 days noncurrent before transition to Standard-IA or One Zone-IA. The example now uses 30 days, transitions to Deep Archive after 60 days, and expires noncurrent versions after 240 days to avoid implying immediate early-deletion charges.
- The Intelligent-Tiering section said archived objects instantly move back to frequent access when accessed. AWS documents that Infrequent Access and Archive Instant Access objects move back on access, while optional Archive Access and Deep Archive Access tiers require restore first, so the text was corrected.
- The Intelligent-Tiering archive configuration used an empty `Filter` object. The AWS CLI schema supports bucket-level configurations without a filter, so the empty filter was removed.
- The boto3 CloudWatch example passed timestamp strings for `StartTime` and `EndTime`, while the boto3 API documents these parameters as datetime values. The script now uses UTC `datetime` values for the previous daily metric window.

## Review Notes
Pricing remains approximate and region-dependent. The AWS CLI command shapes and JSON fields were checked against current AWS CLI and S3 documentation, but the commands were not executed because the local AWS CLI is not installed and the examples require real AWS account resources.
