# Validation Summary: How to Configure Data Lake Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS S3
- AWS Glue Data Catalog and Crawlers
- AWS IAM policies
- Python
- boto3
- PyArrow / Parquet
- Great Expectations / GX Core
- Data lake architecture, partitioning, and metadata catalogs

## Sources Consulted
- AWS S3 boto3 `create_bucket` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/create_bucket.html
- AWS S3 boto3 `put_bucket_lifecycle_configuration` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_lifecycle_configuration.html
- AWS S3 tagging and access control policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/tagging-and-policies.html
- AWS Glue boto3 `create_database` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/create_database.html
- AWS Glue boto3 `create_table` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/create_table.html
- AWS Glue boto3 `create_crawler` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue/client/create_crawler.html
- AWS Glue RecrawlPolicy API documentation: https://docs.aws.amazon.com/glue/latest/webapi/API_RecrawlPolicy.html
- Apache Arrow `pyarrow.parquet.write_table` documentation: https://arrow.apache.org/docs/python/generated/pyarrow.parquet.write_table.html
- Great Expectations GX Core dataframe connection documentation: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- Great Expectations GX Core expectation suite documentation: https://docs.greatexpectations.io/docs/core/define_expectations/organize_expectation_suites/
- Great Expectations GX Core quickstart validation workflow: https://docs.greatexpectations.io/docs/core/introduction/try_gx/

## Issues Found
- The AWS Glue crawler example used `json.dumps(...)` without importing `json`. Added `import json` to the Glue code block so the snippet works as shown.
- The Great Expectations example used legacy imports and APIs (`great_expectations.dataset.PandasDataset` and `ExpectationConfiguration` from `great_expectations.core`) that are not the current GX Core 1.x documented workflow. Updated the snippet to use `import great_expectations as gx`, `gx.ExpectationSuite`, typed expectation classes, dataframe data sources/assets, a whole-dataframe batch definition, and `batch.validate(suite)`.
- The quality check comment described the `status` allowed-value check as referential integrity. Changed the comment to describe the actual validation being performed.
- The S3 IAM policy applied `s3:ExistingObjectTag/classification` to a statement that also included `s3:ListBucket`. That condition key is for existing object tags and should apply to object access, not bucket listing. Split analyst access into separate bucket list and tagged object read statements.

## Review Notes
- The S3 examples assume prerequisite infrastructure such as a unique bucket naming strategy and an existing KMS key alias named `alias/datalake-key`.
- The Glue crawler example uses a placeholder IAM role ARN that must be replaced with a real role in an actual deployment.
- The PyArrow Parquet options used in the post (`compression`, `row_group_size`, `use_dictionary`, and `write_statistics`) match the documented `write_table` parameters.
- The OneUptime and related-reading links returned HTTP 200 during review.
