# Validation Summary: How to Create Athena Workgroups in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- Amazon Athena
- Athena workgroups
- Athena prepared statements
- Amazon S3
- AWS KMS
- AWS IAM
- Amazon CloudWatch
- Amazon SNS
- AWS Glue Data Catalog

## Sources Consulted
- Terraform AWS Provider documentation for `aws_athena_workgroup`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup
- Terraform AWS Provider documentation for `aws_athena_prepared_statement`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_prepared_statement
- AWS Athena documentation on overriding client-side settings: https://docs.aws.amazon.com/athena/latest/ug/workgroups-settings-override.html
- AWS Athena documentation on per-query and per-workgroup data usage controls: https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html
- AWS Athena documentation on CloudWatch query metrics and dimensions: https://docs.aws.amazon.com/athena/latest/ug/query-metrics-viewing.html
- AWS Athena documentation on parameterized queries and prepared statements: https://docs.aws.amazon.com/athena/latest/ug/querying-with-prepared-statements.html
- AWS Service Authorization Reference for Amazon Athena IAM actions and resource types: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonathena.html
- Amazon S3 documentation examples for prefix-scoped access policies: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html

## Issues Found
- The cost-control workgroup example described `bytes_scanned_cutoff_per_query` as limiting concurrent queries. I changed the comment to say it limits the amount of data a single query can scan, matching the Terraform AWS Provider and Athena data usage control documentation.
- The text said Athena cancels a query before it starts if it would scan more than the cutoff. AWS documents that queries are canceled when they exceed the scan limit, and canceled queries can still have scanned data and partial results. I updated the wording to avoid implying pre-execution cancellation.
- The S3 IAM policy combined source-data read permissions and query-result write permissions in one statement, which would also allow `s3:PutObject` to the source data lake bucket. I split the permissions so source data is read-only and writes are limited to the Athena results prefix.
- The CloudWatch alarm for `ProcessedBytes` only used the `WorkGroup` dimension. Athena publishes query metrics with `WorkGroup`, `QueryState`, and `QueryType` dimensions, so I added `QueryState = "SUCCEEDED"` and `QueryType = "DML"` to match the metric series.
- The “Prepared Statements in Workgroups” section used `aws_athena_named_query`, which creates a saved named query rather than a prepared statement. I replaced it with `aws_athena_prepared_statement` and a parameterized query using positional `?` parameters.

## Review Notes
- The Terraform resource arguments used for Athena workgroups, S3 bucket encryption, KMS keys, IAM policies, and CloudWatch alarms are current and not deprecated in the checked documentation.
- The module pattern uses `null` to omit optional Terraform arguments conditionally, which is valid for modern Terraform configurations.
- The final link text says “creating Glue data catalogs” but links to an existing local Glue jobs post. This may be an editorial mismatch, but it is not a technical correctness issue in the Athena workgroup tutorial itself.
