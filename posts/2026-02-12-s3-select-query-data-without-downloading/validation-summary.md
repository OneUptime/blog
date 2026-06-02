# Validation Summary: How to Use S3 Select to Query Data Without Downloading Entire Objects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Select
- AWS CLI
- boto3 / Python
- CSV, JSON, JSON Lines, and Apache Parquet
- Amazon Athena

## Sources Consulted
- AWS S3 User Guide: Querying data in place with Amazon S3 Select - https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html
- AWS S3 User Guide: SELECT command - https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-select.html
- AWS S3 User Guide: Operators - https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-operators.html
- AWS S3 User Guide: Conversion functions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-conversion.html
- AWS CLI Command Reference: select-object-content - https://docs.aws.amazon.com/cli/latest/reference/s3api/select-object-content.html
- boto3 S3 client reference: select_object_content - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/select_object_content.html
- AWS public pricing offer file for Amazon S3 us-east-1 - https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json
- Amazon S3 pricing page - https://aws.amazon.com/s3/pricing/

## Issues Found
- The post did not mention that Amazon S3 Select is no longer available to new customers. Added this caveat to the description, introduction, and usage guidance while preserving the tutorial for existing customers.
- The SQL support description was too loose. Updated it to match AWS documentation: S3 Select supports only the SELECT SQL command, with SELECT list, FROM, WHERE, and LIMIT clauses, and does not support joins or subqueries.
- The Parquet performance explanation claimed S3 Select uses built-in statistics to skip row groups. AWS documentation supports column retrieval for Parquet but does not document that row-group statistics are used for this feature, so the claim was narrowed to columnar retrieval.
- The compression section implied all formats support GZIP and BZIP2 whole-object compression. Updated it to specify GZIP/BZIP2 for CSV and JSON, and Parquet columnar compression with GZIP or Snappy, not whole-object compression.
- The Python JSON example parsed each event frame independently. boto3 documentation says S3 Select may split records across Records frames, so the example now aggregates chunks before parsing JSON Lines.
- The cost example used an outdated S3 Standard scan price. Updated the US East (N. Virginia) S3 Standard example to $0.008/GB scanned and adjusted the example calculation and savings claim.
- The limitations section listed incorrect maximum input sizes. Replaced them with the documented 5 TB object size support, 1 MB maximum input/result record length, and 512 MB maximum uncompressed Parquet row group size.
- Verified the internal OneUptime link returned HTTP 200.

## Review Notes
S3 Select remains technically valid for existing customers, but future posts should strongly consider Athena, S3 Object Lambda, or application-side filtering options for new AWS customers because S3 Select is closed to new customer access.
