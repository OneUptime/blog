# Validation Summary: How to Optimize Storage Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS S3
- S3 storage classes and lifecycle policies
- S3 Intelligent-Tiering
- Amazon CloudWatch metrics and billing alarms
- Amazon EBS volumes and snapshots
- AWS Cost Explorer
- Python and boto3
- Parquet, gzip, pandas, and pyarrow

## Sources Consulted
- AWS S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- boto3 S3 `put_bucket_intelligent_tiering_configuration`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_bucket_intelligent_tiering_configuration.html
- boto3 S3 `put_bucket_lifecycle_configuration`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_bucket_lifecycle_configuration.html
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- boto3 S3 `list_multipart_uploads`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_multipart_uploads.html
- Amazon CloudWatch billing alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- boto3 Cost Explorer service reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce.html
- Amazon EBS pricing: https://aws.amazon.com/ebs/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The S3 audit code reported only the `StandardStorage` CloudWatch `BucketSizeBytes` metric as the bucket size. Updated it to sum the documented storage-type dimensions across Standard, IA, Glacier, Intelligent-Tiering, overhead, and legacy storage categories.
- The S3 audit code used the first CloudWatch datapoint returned, even though datapoints are not guaranteed to be ordered. Updated it to use the latest datapoint by timestamp.
- The Intelligent-Tiering example implied the bucket configuration moves all objects into Intelligent-Tiering. Clarified that the API configures optional archive tiers for objects already stored in the `INTELLIGENT_TIERING` storage class.
- The lifecycle examples used `STANDARD_IA` transitions at 30 days and 7 days. boto3/AWS documentation requires `STANDARD_IA` lifecycle transition days to be greater than 30, so these were changed to 31 days and the short log policy was simplified accordingly.
- The orphaned EBS volume cost estimate used `$0.10/GB-month` while labeling it as gp3. Updated the example to `$0.08/GB-month`, matching the current AWS gp3 storage example rate.
- The incomplete multipart upload cleanup function used a single `list_multipart_uploads` call, which returns at most 1,000 uploads. Updated it to use the boto3 paginator.
- The CloudWatch billing alarm comment described `EstimatedCharges` as daily S3 cost. Updated the comment to clarify it is an estimated monthly charge metric evaluated daily.

## Review Notes
The hard-coded pricing examples are region-sensitive and can change over time; they are reasonable as illustrative US East style examples but should be rechecked periodically. The Cost Explorer service filter values can vary by account and billing presentation, so production reporting code may need to discover available dimension values before filtering.
