# Validation Summary: How to Create Athena Named Queries with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Athena
- AWS Glue Data Catalog
- Amazon S3
- AWS Identity and Access Management
- Amazon CloudWatch
- Terraform
- HashiCorp AWS Provider
- Athena SQL

## Sources Consulted
- Terraform AWS Provider documentation for `aws_athena_workgroup`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup
- Terraform AWS Provider documentation for `aws_athena_named_query`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query
- Terraform AWS Provider documentation for `aws_athena_database`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_database
- Terraform AWS Provider documentation for `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform language documentation for strings and heredocs: https://developer.hashicorp.com/terraform/language/expressions/strings
- Amazon Athena User Guide for `CREATE TABLE`: https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon Athena User Guide for Parquet SerDe: https://docs.aws.amazon.com/athena/latest/ug/parquet-serde.html
- Amazon Athena User Guide for partition projection: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- Amazon Athena User Guide for CloudWatch query metrics: https://docs.aws.amazon.com/athena/latest/ug/query-metrics-viewing.html
- Amazon Athena Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonathena.html
- Amazon Athena example workgroup policies: https://docs.aws.amazon.com/athena/latest/ug/example-policies-workgroup.html
- Amazon Athena federated query IAM access documentation for result bucket permissions: https://docs.aws.amazon.com/athena/latest/ug/federated-query-iam-access.html

## Issues Found
- The partition projection `storage.location.template` value used `${year}`, `${month}`, and `${day}` inside a Terraform heredoc. Terraform treats `${...}` as template interpolation in heredoc strings, so this would fail or interpolate the wrong value before Athena received the SQL. Changed the placeholders to `$${year}`, `$${month}`, and `$${day}` so Terraform emits literal Athena partition projection placeholders.
- The IAM statement for the Athena query results bucket allowed `s3:GetObject`, `s3:PutObject`, and `s3:GetBucketLocation`, but omitted `s3:ListBucket`. AWS Athena result bucket guidance includes `s3:ListBucket` and `s3:GetBucketLocation` for principals running queries. Added `s3:ListBucket` to the result bucket statement.

## Review Notes
The Terraform snippets are illustrative and do not include a full provider block or complete project layout, so I reviewed syntax and provider arguments against the current AWS provider documentation rather than running a full `terraform validate`. The `MSCK REPAIR TABLE` saved query is syntactically valid, but with partition projection enabled it is typically unnecessary because projected partitions are calculated at query time instead of loaded into the Glue Data Catalog.
