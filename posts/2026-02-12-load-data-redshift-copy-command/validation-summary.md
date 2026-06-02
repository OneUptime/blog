# Validation Summary: How to Load Data into Redshift with COPY Command

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Redshift
- Redshift COPY command
- Amazon S3
- Redshift Data API
- AWS Lambda
- Python boto3
- AWS CLI
- CSV, JSON, Parquet, ORC, and compressed data formats

## Sources Consulted
- Amazon Redshift COPY command documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html
- Amazon Redshift COPY parameter reference: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY-parameters.html
- Amazon Redshift data format parameters: https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-format.html
- Amazon Redshift data conversion parameters: https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-data-conversion.html
- Amazon Redshift COPY from columnar data formats: https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-copy-from-columnar.html
- Amazon Redshift loading data files best practices: https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-use-multiple-files.html
- Amazon Redshift STL_LOAD_ERRORS documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_ERRORS.html
- Amazon Redshift SYS_LOAD_HISTORY documentation: https://docs.aws.amazon.com/redshift/latest/dg/SYS_LOAD_HISTORY.html
- Amazon Redshift Data API ExecuteStatement documentation: https://docs.aws.amazon.com/redshift-data/latest/APIReference/API_ExecuteStatement.html
- Amazon Redshift Data API BatchExecuteStatement documentation: https://docs.aws.amazon.com/redshift-data/latest/APIReference/API_BatchExecuteStatement.html
- Amazon S3 event message structure documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html

## Issues Found
- The Parquet section said column mappings were unnecessary because Parquet files carry their own schema. Redshift COPY from Parquet/ORC loads values into target columns in file column order and requires matching column counts, so the text was corrected to state that date formats and delimiters are unnecessary while column order/count still matter.
- The columnar format performance section said Redshift can read only the columns it needs during COPY. For loading into a table, that phrasing was misleading, so it was changed to attribute performance benefits to columnar layout and built-in compression.
- The Lambda example used `execute_statement` with multiple SQL statements in one string. The Redshift Data API requires `ExecuteStatement` input to be a single SQL statement; the example now uses `batch_execute_statement` with separate COPY and ANALYZE statements.
- The Lambda example used the S3 event object key directly. S3 notification object keys are URL encoded, so the example now decodes the key with `unquote_plus`.
- The Lambda example interpolated the S3 key directly into SQL. The example now escapes single quotes in the key before building the COPY path.
- The recent COPY monitoring query selected columns that do not exist in `stl_load_commits`, including `lines_loaded`, `bytes_scanned`, `starttime`, and `endtime`. It now uses `sys_load_history`, which includes loaded rows, loaded bytes, scanned bytes, start time, and duration for COPY commands.

## Review Notes
The remaining examples and claims align with current Amazon Redshift documentation for COPY syntax, supported data formats, compression parameters, manifest files, MAXERROR, column lists for non-columnar loads, and multi-file loading guidance. `stl_load_errors` is still valid for provisioned main-cluster COPY error debugging, but Redshift documentation recommends SYS monitoring views such as `sys_load_error_detail` for coverage across provisioned, concurrency scaling, and serverless namespaces.
