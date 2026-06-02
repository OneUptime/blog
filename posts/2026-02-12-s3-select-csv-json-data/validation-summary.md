# Validation Summary: How to Use S3 Select with CSV and JSON Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Select
- Amazon S3
- AWS CLI
- Boto3
- SQL
- CSV
- JSON and JSON Lines
- Parquet
- GZIP and BZIP2 compression

## Sources Consulted
- Amazon S3 User Guide: Querying data in place with Amazon S3 Select: https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html
- Amazon S3 User Guide: SQL reference for Amazon S3 Select: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference.html
- Amazon S3 User Guide: SELECT command: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-select.html
- Amazon S3 User Guide: Data types: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-data-types.html
- Amazon S3 User Guide: Aggregate functions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-aggregate.html
- Amazon S3 User Guide: Date functions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-date.html
- Amazon S3 User Guide: String functions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference-string.html
- AWS CLI Command Reference: select-object-content: https://docs.aws.amazon.com/cli/latest/reference/s3api/select-object-content.html
- Boto3 S3 Client Reference: select_object_content: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/select_object_content.html
- AWS Storage Blog: How to optimize querying your data in Amazon S3: https://aws.amazon.com/blogs/storage/how-to-optimize-querying-your-data-in-amazon-s3/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- OneUptime blog link referenced in the post: https://oneuptime.com/blog/post/2026-02-12-integrate-s3-aws-glue-etl/view

## Issues Found
- The post described S3 Select as generally available to use without noting that AWS closed new customer access on July 25, 2024. Updated the introduction to state that it is available only to existing S3 Select customers.
- The introduction claimed data transfer could be reduced "by up to 400x" without a current official source in the reviewed AWS documentation. Reworded this to a general reduction claim.
- The Python CSV helper docstring said it returned a list of strings, but the function joins records and returns a single string. Updated the docstring.
- The Boto3 CSV example used `ORDER BY`, but the official S3 Select `SELECT` command documentation lists only `SELECT`, `FROM`, `WHERE`, and `LIMIT` clauses and does not support `ORDER BY`. Removed the unsupported clause.
- The compressed files section implied all compressed supported formats work the same way. Updated it to clarify that gzip and bzip2 apply to CSV and JSON, while Parquet supports columnar compression such as GZIP or Snappy and not whole-object compression.
- The limitations section included a vague "Max result size" claim and said S3 Select works best under a few GB. Replaced this with documented limits: 1 MB maximum input/result record length, 40 MB console return limit, and 5 TB maximum object size.
- The cost section said the same amount of data is scanned regardless. Reworded it to clarify that CSV and JSON queries often scan much of the object and that savings usually come from reduced returned data, reduced application processing, and latency.

## Review Notes
S3 Select remains technically valid for existing customers, but future updates should consider recommending Athena or S3-integrated analytics services first for new AWS customers because S3 Select is closed to new customer access and AWS does not plan to introduce new capabilities.
