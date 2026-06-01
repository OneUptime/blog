# Validation Summary: How to Use Glue Job Bookmarks for Incremental Data Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue
- AWS Glue job bookmarks
- AWS Glue PySpark DynamicFrames
- Amazon S3 sources and targets
- JDBC sources
- AWS Glue Data Catalog
- Boto3 AWS Glue and CloudWatch clients

## Sources Consulted
- AWS Glue User Guide: Tracking processed data using job bookmarks - https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
- AWS Glue User Guide: Using job bookmarks - https://docs.aws.amazon.com/glue/latest/dg/programming-etl-connect-bookmarks.html
- AWS Glue User Guide: Using job parameters in AWS Glue jobs - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html
- AWS Glue API Reference: CreateJob - https://docs.aws.amazon.com/glue/latest/webapi/API_CreateJob.html
- AWS Glue API Reference: Job runs, GetJobBookmark, and ResetJobBookmark - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-runs.html
- AWS Glue User Guide: GlueContext class - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html

## Issues Found
- The post said Glue job bookmarks "ensure" only new or changed data is processed and prevent duplicates. Updated this to "help" process only new or changed data and "help prevent" duplicates, because AWS documents at-least-once behavior and target output still needs careful duplicate handling.
- The S3 explanation said Glue tracks file timestamps and paths, and that previously unseen paths are included. Updated this to focus on object modification timestamps for supported S3 source formats, matching AWS documentation.
- The `job-bookmark-pause` description was too broad. Updated it to explain that pause processes from the current bookmark, or an optional `job-bookmark-from`/`job-bookmark-to` run range, without updating bookmark state.
- The post implied target-side `transformation_ctx` is required for bookmark tracking on writes. Updated the wording to emphasize that source `transformation_ctx` is critical for source bookmark tracking, while sink context identifies sink state; AWS notes target files are not tracked for cleanup or reprocessing decisions.
- The JDBC section described bookmark keys as generally monotonically increasing and used `event_date` in a compound key example. Updated it to state AWS's stricter requirement that user-defined bookmark keys must each be strictly monotonically increasing or decreasing, with gaps allowed, and replaced the compound example with monotonic-style key names.
- Added the AWS-documented caveat that case-sensitive column names are not supported as JDBC bookmark keys.
- Added the AWS-documented caveat that resetting or rewinding bookmarks does not clean target files because only source inputs are tracked for reprocessing decisions.

## Review Notes
All Python code blocks were checked for syntax with Python 3 AST parsing. The code uses current AWS Glue and Boto3 API names as documented. The examples remain illustrative and still require real IAM roles, S3 paths, Data Catalog tables, JDBC connectivity, and columns such as `year`, `month`, and `day` to exist in the user's data.
