# Validation Summary: How to Build a Data Lake on S3 with Glue and Lake Formation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon S3
- AWS Glue Data Catalog
- AWS Glue ETL jobs and DynamicFrames
- AWS Glue crawlers
- AWS Glue workflows and triggers
- AWS Lake Formation
- Amazon Athena
- Amazon QuickSight
- Amazon Redshift Spectrum
- PySpark
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI Command Reference: register-resource - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/register-resource.html
- AWS CLI Command Reference: create-crawler - https://docs.aws.amazon.com/cli/latest/reference/glue/create-crawler.html
- AWS Glue documentation: GlueContext class and Data Catalog reads - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- AWS Glue documentation: DynamicFrameWriter class - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame-writer.html
- AWS Glue documentation: triggers and workflow dependencies - https://docs.aws.amazon.com/glue/latest/dg/about-triggers.html
- Botocore AWS Glue create_trigger API reference - https://docs.aws.amazon.com/botocore/latest/reference/services/glue/client/create_trigger.html
- AWS Lake Formation documentation: granting table permissions - https://docs.aws.amazon.com/lake-formation/latest/dg/granting-table-permissions.html
- AWS Lake Formation documentation: granting Data Catalog permissions - https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-permissions.html
- AWS Lake Formation documentation: granting data location permissions - https://docs.aws.amazon.com/lake-formation/latest/dg/granting-location-permissions.html
- AWS Lake Formation permissions reference - https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html

## Issues Found
- The ingestion job description and code claimed to read directly from RDS via a Glue connection, but the code used `glueContext.create_dynamic_frame.from_catalog` and did not use the `connection_name` argument. Updated the wording, comment, and job arguments so the example correctly describes reading cataloged source tables.
- The crawler setup said it covered all zones but omitted a raw-zone crawler. Added `raw-zone-crawler` so the raw S3 output can be cataloged before the transform job reads `raw_zone.orders`.
- The Glue workflow started the transform job immediately after ingestion, before crawling the raw data, and started the curated job at the same time as the processed crawler. Reordered the triggers so raw crawl, transform, processed crawl, curate, and curated crawl run in dependency order.
- The Glue trigger examples did not activate scheduled or conditional triggers on creation. Added `--start-on-creation`, which AWS documents as the flag for starting scheduled and conditional triggers when created.
- The Lake Formation data engineer grants claimed full access to all zones but only granted database permissions for raw and processed zones. Added curated database access and table wildcard `ALL` grants for raw, processed, and curated tables.

## Review Notes
- The examples still assume prerequisite IAM roles, Glue jobs, Glue connections or source catalog tables, and service permissions exist. Those setup details are outside the scope of the post but would be needed in a production implementation.
- Lake Formation data location permissions may be required for principals that create or alter tables pointing to registered S3 locations, depending on database location settings and role design.
