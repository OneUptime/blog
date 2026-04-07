# Validation Summary: How to Use S3-Select with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- S3-Select
- AWS CLI (`aws s3api select-object-content`)
- Python boto3
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- AWS S3-Select documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html
- AWS S3-Select SQL reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-select-sql-reference.html
- Ceph RGW S3-Select documentation: https://docs.ceph.com/en/latest/radosgw/s3select/
- boto3 select_object_content API reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/select_object_content.html

## Issues Found

1. **GROUP BY query example was invalid**: The first AWS CLI example used `SELECT region, SUM(CAST(revenue AS DECIMAL)) FROM S3Object GROUP BY region`. S3-Select does not support `GROUP BY` — neither in AWS S3 nor in Ceph RGW's implementation. Replaced with a valid filter query: `SELECT * FROM S3Object WHERE CAST(revenue AS DECIMAL) > 10000`.

2. **GROUP BY and HAVING listed as supported SQL features**: The "Supported SQL Features" section incorrectly listed `GROUP BY` and `HAVING` as supported. These are not part of the S3-Select SQL dialect. Removed both from the list.

3. **Summary referenced "aggregations" as a primary use case**: The closing summary suggested pushing "aggregations" to the storage layer, which is misleading since GROUP BY is not supported. Aggregate functions (SUM, COUNT, etc.) do work but only over the entire result set, not grouped. Removed the word "aggregations" from the summary.

## Review Notes
- Aggregate functions (SUM, COUNT, MIN, MAX, AVG) are listed and do work in S3-Select, but only over the entire filtered result set — not with GROUP BY clauses. This is technically correct as listed after the fix.
- The post mentions Parquet in the introduction and description but does not include a Parquet query example. Ceph RGW's Parquet support in S3-Select has been experimental/limited. The mention is not incorrect but readers may expect a Parquet example.
- The `ceph config set client.rgw` section name is a reasonable default but in production may need to target a specific RGW daemon section (e.g., `client.rgw.myrgw`). This is acceptable for a tutorial.
- The default RGW port 7480 used in examples is correct for the Beast frontend.
