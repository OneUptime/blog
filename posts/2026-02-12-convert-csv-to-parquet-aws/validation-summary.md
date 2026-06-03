# Validation Summary: How to Convert CSV Data to Parquet Format on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Athena
- AWS Glue ETL jobs and crawlers
- AWS Glue Data Catalog
- Amazon S3
- AWS Lambda
- AWS CLI
- Apache Parquet
- Apache Spark / PySpark
- pandas
- PyArrow

## Sources Consulted
- Amazon Athena CTAS table properties: https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena CTAS examples: https://docs.aws.amazon.com/athena/latest/ug/ctas-examples.html
- Amazon Athena compression support: https://docs.aws.amazon.com/athena/latest/ug/compression-formats.html
- Amazon Athena Hive table compression support: https://docs.aws.amazon.com/athena/latest/ug/compression-support-hive.html
- AWS Glue GlueContext API, including `purge_s3_path`: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- AWS Glue job API and worker/execution-class fields: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-job.html
- AWS CLI `glue start-job-run`: https://docs.aws.amazon.com/cli/latest/reference/glue/start-job-run.html
- AWS CLI `glue create-job`: https://docs.aws.amazon.com/cli/latest/reference/glue/create-job.html
- AWS CLI `glue create-crawler`: https://docs.aws.amazon.com/cli/latest/reference/glue/create-crawler.html
- AWS CLI `s3api put-bucket-notification-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS Lambda S3 event notifications and invoke permissions: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS Lambda S3 trigger tutorial: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-tutorial.html
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Apache Arrow PyArrow Parquet documentation: https://arrow.apache.org/docs/python/parquet.html
- PyArrow `parquet.write_table` API: https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- OneUptime internal post links referenced by the article, verified as HTTP 200.

## Issues Found
- The Glue ETL job called `glueContext.purge_s3_path(output_path, options={"retentionPeriod": 0})` after writing Parquet files. AWS Glue documents `purge_s3_path` as recursively deleting files from the S3 path, so this would remove the newly written output rather than update the Glue Data Catalog. Removed the purge call and clarified that the catalog should be updated with a crawler or external table definition after the job completes.
- The Glue sample imported `DateType` but never used it. Removed the unused import to keep the example accurate.
- The Lambda sample used the raw S3 event object key directly. S3 event keys are URL-encoded, so keys containing spaces or special characters could fail. Added `urllib.parse.unquote_plus`.
- The Lambda sample generated the output key with `replace('/raw/', '/parquet/')`, which would not change keys like `raw/file.csv` from the documented trigger prefix. Changed it to replace the leading `raw/` prefix.
- The Lambda sample reported `parquet_size_bytes` using `parquet_buffer.tell()` after seeking to the start, which would report `0`. Changed it to measure the Parquet byte buffer length.
- The Lambda sample reported CSV size using the decoded string length, which can differ from byte size for UTF-8 content. Changed it to measure the original bytes.
- The S3 notification setup omitted the required Lambda resource-based permission when configuring the trigger with the CLI. Added an `aws lambda add-permission` command before `put-bucket-notification-configuration`.
- The Lambda sizing guidance said "under 500 MB" as if that were a general limit. AWS Lambda limits are based on configured memory, timeout, and ephemeral storage, and this example reads the file into memory. Reworded the guidance to say files must fit comfortably in Lambda memory and complete within the 15-minute timeout.
- The compression table presented LZO as a general Parquet choice for the Athena-oriented workflow. Athena can read but not write LZO-compressed Parquet. Updated the LZO row to state that caveat.
- The Snappy guidance claimed the "fastest read speed" absolutely. Reworded it to "fast read speed" to avoid an overbroad claim.

## Review Notes
- The Athena CTAS `parquet_compression = 'SNAPPY'` property is still accepted, but AWS recommends the more general `write_compression` property for consistency. This is a future improvement rather than a correctness issue.
- The Lambda example depends on packaging pandas and PyArrow with the function, typically via layers or a container image; the post does not cover deployment packaging.
- The local environment did not have the AWS CLI installed, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
