# Validation Summary: How to Build a Data Lake Architecture on AWS

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Amazon S3
- Amazon Data Firehose
- AWS Database Migration Service
- AWS Glue Data Catalog
- AWS Glue ETL with PySpark
- Amazon Athena
- AWS Lake Formation
- Amazon Redshift Spectrum
- Amazon QuickSight

## Sources Consulted
- AWS CLI Command Reference: `s3api put-bucket-encryption` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- Amazon Data Firehose Developer Guide: Enable record format conversion - https://docs.aws.amazon.com/firehose/latest/dev/enable-record-format-conversion.html
- AWS CLI Command Reference: `firehose create-delivery-stream` - https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- AWS CLI Command Reference: `dms create-replication-instance` - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-instance.html
- AWS CLI Command Reference: `glue create-job` - https://docs.aws.amazon.com/cli/latest/reference/glue/create-job.html
- AWS Glue Developer Guide: `getResolvedOptions` - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-get-resolved-options.html
- AWS Glue Developer Guide: DynamicFrameReader `from_catalog` - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame-reader.html
- Amazon Athena User Guide: Partition your data - https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- Amazon Athena User Guide: Use columnar storage formats - https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html
- Amazon Athena User Guide: CREATE VIEW - https://docs.aws.amazon.com/athena/latest/ug/create-view.html
- AWS CLI Command Reference: `athena create-work-group` - https://docs.aws.amazon.com/cli/latest/reference/athena/create-work-group.html
- AWS Lake Formation Developer Guide: Registering an Amazon S3 location - https://docs.aws.amazon.com/lake-formation/latest/dg/register-location.html
- AWS Lake Formation permissions reference - https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html
- Amazon Athena User Guide: Lake Formation views limitations - https://docs.aws.amazon.com/athena/latest/ug/lf-athena-limitations.html

## Issues Found
- The Firehose delivery stream enabled record format conversion to Parquet while setting the S3 destination `CompressionFormat` to `GZIP`. AWS requires `CompressionFormat` to be `UNCOMPRESSED` or omitted when `DataFormatConversionConfiguration` is used. Changed it to `UNCOMPRESSED`; the Parquet serializer still uses Snappy compression.
- The Lake Formation grant example granted `SELECT` on `datalake_curated.daily_event_summary`, an Athena view, while the example did not show the additional underlying table permissions required for ordinary Athena views. Changed the grant to the registered clean-zone table `datalake_clean.user_events`, matching the registered S3 location and the stated "specific tables" example.

## Review Notes
- AWS Glue 4.0 remains valid for the shown job, but AWS Glue 5.x is now available and may be preferable for new deployments depending on Lake Formation integration requirements.
- The tutorial assumes supporting IAM roles, KMS permissions, Glue table schemas, and post-ETL catalog updates/crawlers exist. Those are normal prerequisites for a concise example, but a production walkthrough could expand them.
