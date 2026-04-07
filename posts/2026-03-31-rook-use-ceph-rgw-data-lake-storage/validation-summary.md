# Validation Summary: How to Use Ceph RGW for Data Lake Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- AWS CLI (S3 and S3API commands)
- Apache Spark (PySpark with S3A connector)
- Trino (formerly Presto) with Hive connector
- S3-compatible object storage
- Parquet file format

## Sources Consulted
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS CLI S3API command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS CLI S3 configuration (multipart settings): https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- Apache Hadoop S3A connector documentation: https://hadoop.apache.org/docs/current/hadoop-aws/tools/hadoop-aws/index.html
- Trino Hive connector S3 configuration: https://trino.io/docs/current/connector/hive.html
- Ceph RGW S3 API documentation: https://docs.ceph.com/en/latest/radosgw/s3/

## Issues Found
1. **Invalid `--multipart-chunksize` flag on `aws s3 cp`**: The `--multipart-chunksize` is not a valid command-line flag for the `aws s3 cp` command. Multipart chunk size is configured through the AWS CLI S3 configuration using `aws configure set default.s3.multipart_chunksize`. Fixed the section to first configure the chunk size via `aws configure set`, then run the upload command without the invalid flag. The AWS CLI automatically uses multipart uploads for files exceeding the multipart threshold.

## Review Notes
- The lifecycle policy uses `GLACIER` as the StorageClass. In Ceph RGW, storage classes must be explicitly configured and mapped to different pools. The `GLACIER` name is used here as an S3-compatible convention, but users will need to configure a corresponding storage class in their Ceph RGW deployment for this to work.
- The Spark and Trino integration examples are correct and follow current best practices for S3-compatible storage backends.
- All AWS CLI commands correctly include the `--endpoint-url` flag required for non-AWS S3 endpoints.
