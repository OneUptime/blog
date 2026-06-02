# Validation Summary: How to Integrate S3 with AWS Glue for ETL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- AWS Glue Crawlers
- AWS Glue Data Catalog
- AWS Glue ETL jobs
- AWS CLI
- PySpark
- Apache Parquet
- Amazon Athena
- Amazon Redshift Spectrum
- IAM
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CLI Command Reference: create-crawler: https://docs.aws.amazon.com/cli/latest/reference/glue/create-crawler.html
- AWS Glue Developer Guide: Scheduling incremental crawls for adding new partitions: https://docs.aws.amazon.com/glue/latest/dg/incremental-crawls.html
- AWS Glue Developer Guide: Using the Parquet format in AWS Glue: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-parquet-home.html
- AWS CLI Command Reference: create-trigger: https://docs.aws.amazon.com/cli/latest/reference/glue/create-trigger.html
- AWS Glue Developer Guide: AWS Glue triggers: https://docs.aws.amazon.com/glue/latest/dg/about-triggers.html
- AWS Glue Developer Guide: AWS Glue versions: https://docs.aws.amazon.com/glue/latest/dg/release-notes.html
- AWS Glue Developer Guide: Tracking processed data using job bookmarks: https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
- AWS Prescriptive Guidance: AWS Glue ETL worker types and DPUs: https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-etl-aws-glue/aws-glue-etl.html
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-12-s3-storage-class-analysis-optimize-costs/view

## Issues Found
- The raw crawler used `CRAWL_NEW_FOLDERS_ONLY` with `UpdateBehavior` set to `UPDATE_IN_DATABASE`. AWS documents that incremental crawls force both update and delete behavior to `LOG`, so the crawler command was changed to `UpdateBehavior: LOG`.
- The Glue write example used the historical `format="glueparquet"` value. AWS documentation says this access pattern is no longer advocated and recommends `format="parquet"` with `useGlueParquetWriter` enabled, so the example was updated accordingly.
- The processed-data crawler did not set a table prefix, but the Athena query referenced `company_analytics.processed_logs`. Without a prefix, a crawler pointed at `s3://company-data-processed/logs/` would not reliably create a table named `processed_logs`; the crawler command now includes `--table-prefix processed_`.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI validation was performed against the official AWS CLI documentation rather than local `--help` output.
- The bucket names and IAM role ARNs are example placeholders; real deployments need globally unique S3 bucket names, service trust policies for Glue roles, and least-privilege IAM scoped to the actual account and buckets.
- AWS Glue 4.0 is still valid and uses Spark 3.3.0 and Python 3.10, but AWS Glue 5.x is now available and AWS Glue 5.1 is documented as the default for jobs created without specifying a Glue version.
