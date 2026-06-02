# Validation Summary: How to Use S3 Storage Lens for Visibility Into Storage Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon S3 Storage Lens
- AWS CLI
- AWS Organizations
- Amazon Athena
- Amazon CloudWatch
- S3 Lifecycle configuration

## Sources Consulted
- Amazon S3 Storage Lens overview: https://aws.amazon.com/s3/storage-lens/
- Understanding Amazon S3 Storage Lens: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_basics_metrics_recommendations.html
- Amazon S3 Storage Lens metrics glossary: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_metrics_glossary.html
- AWS CLI `s3control put-storage-lens-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3control/put-storage-lens-configuration.html
- S3BucketDestination API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_S3BucketDestination.html
- AWS CloudFormation `AWS::S3::StorageLens` examples: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-storagelens.html
- StorageLensAwsOrg API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_StorageLensAwsOrg.html
- Enabling trusted access for S3 Storage Lens: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_with_organizations_enabling_trusted_access.html
- Viewing S3 Storage Lens metrics using a data export: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_view_metrics_export.html
- S3 Storage Lens export manifest: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_whatis_metrics_export_manifest.html
- S3 Storage Lens export schema: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_understanding_metrics_export_schema.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- Corrected the free metrics description. The post incorrectly said free metrics include request counts by type and byte downloads/uploads; those activity metrics are advanced metrics. Updated the description to match current AWS documentation.
- Corrected the advanced metrics description. Metrics export to S3 is available for both free and advanced metrics, not only advanced metrics, and advanced performance metrics and CloudWatch publishing were called out explicitly.
- Fixed the first AWS CLI Storage Lens configuration example by removing an empty `Buckets` include list, because the CLI schema says an `Include` container must not be empty and bucket entries must be valid ARNs.
- Added `AdvancedPerformanceMetrics` to the advanced metrics CLI example so the example matches the advanced categories described in the text.
- Corrected the AWS Organizations setup example by adding the required trusted-access command and replacing the invalid sample organization ID with one that matches the documented ARN pattern.
- Corrected the 128 KB guidance. The original text incorrectly tied 128 KB to multipart upload; 128 KB is relevant to S3 Intelligent-Tiering monitoring/automation eligibility.
- Fixed the Athena table schema to match the documented S3 Storage Lens CSV export schema, including `version_number`, `configuration_id`, `aws_account_number`, `aws_region`, `storage_class`, `record_type`, and `record_value`, and changed `metric_value` to `bigint`.
- Updated the Athena table location to the documented Storage Lens export report path layout under `StorageLens/<account>/<configuration>/V_1/reports/`.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and S3 API documentation rather than local `--help` output.
- The Storage Lens pricing example remains directionally correct for the first pricing tier, but large organizations should check the current Amazon S3 pricing page because Storage Lens advanced metrics use tiered pricing at very high object counts.
