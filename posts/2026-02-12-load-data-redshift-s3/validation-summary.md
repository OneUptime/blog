# Validation Summary: How to Load Data into Redshift from S3

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Amazon Redshift
- Amazon S3
- AWS IAM
- AWS CLI
- Redshift COPY command
- CSV, JSON, and Parquet data formats
- GZIP, ZSTD, and LZO compression
- AWS Lambda
- Python redshift_connector

## Sources Consulted
- Amazon Redshift COPY documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html
- Amazon Redshift COPY parameter list: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY-alphabetical-parm-list.html
- Amazon Redshift COPY from columnar data formats: https://docs.aws.amazon.com/redshift/latest/dg/copy-usage_notes-copy-from-columnar.html
- Amazon Redshift authorization parameters for COPY: https://docs.aws.amazon.com/redshift/latest/dg/copy-parameters-authorization.html
- Amazon Redshift COPY examples: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY_command_examples.html
- Amazon Redshift loading data files best practices: https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-use-multiple-files.html
- Amazon Redshift loading compressed and uncompressed files: https://docs.aws.amazon.com/redshift/latest/dg/t_splitting-data-files.html
- Amazon Redshift STL_LOAD_ERRORS documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_ERRORS.html
- Amazon Redshift STL_LOAD_COMMITS documentation: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_COMMITS.html
- Amazon Redshift provisioned cluster node details: https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html
- AWS CLI modify-cluster-iam-roles command reference: https://docs.aws.amazon.com/cli/v1/reference/redshift/modify-cluster-iam-roles.html
- Amazon Redshift Python connector API reference: https://docs.aws.amazon.com/redshift/latest/mgmt/python-api-reference.html
- AWS Lambda S3 trigger tutorial: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- Amazon S3 event notification message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- GNU coreutils split help output from local environment.

## Issues Found
- Example IAM role ARNs used a 9-digit account ID (`123456789`), which is not a valid AWS account ID format. Updated all example ARNs to use a 12-digit placeholder (`123456789012`).
- The Parquet COPY comment said there was no need to specify columns because they are in the file. Redshift COPY from Parquet still maps values to target table columns by file column order, and the counts must match. Updated the comment and explanatory text.
- The prefix-loading explanation implied behavior depended on a trailing slash or lack of file extension. Redshift COPY loads objects whose keys begin with the specified S3 prefix. Updated the wording.
- The performance guidance described splitting files as the single biggest optimization without noting Redshift's different behavior for uncompressed CSV and columnar files. Updated the wording to make the advice specific to compressed text files.
- The `stl_load_commits` query referenced `bytes_scanned` and ordered by `starttime`, neither of which is a documented column in `stl_load_commits`. Replaced the query with documented columns and `ORDER BY curtime DESC`.
- The Lambda S3 event sample used the raw object key from the event. S3 event object keys are URL encoded, so keys containing spaces or special characters can be handled incorrectly. Updated the sample to use `urllib.parse.unquote_plus`.

## Review Notes
The benchmark numbers are plausible as illustrative estimates, but real Redshift COPY performance depends heavily on cluster state, data shape, file sizes, sort/dist keys, network path, and workload management. The Lambda example remains intentionally minimal and would need production hardening for credentials, retries, idempotency, batching, and SQL construction.
