# Validation Summary: How to Create AWS Athena Views Programmatically with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon Athena
- AWS Glue Data Catalog
- AWS CLI
- Amazon S3 lifecycle configuration
- HCL
- SQL

## Sources Consulted
- AWS Athena User Guide: Work with views - https://docs.aws.amazon.com/athena/latest/ug/views.html
- AWS Athena User Guide: CREATE VIEW and CREATE PROTECTED MULTI DIALECT VIEW - https://docs.aws.amazon.com/athena/latest/ug/create-view.html
- AWS Athena User Guide: Use Data Catalog views in Athena - https://docs.aws.amazon.com/athena/latest/ug/views-glue.html
- AWS CLI Command Reference: athena start-query-execution - https://docs.aws.amazon.com/cli/latest/reference/athena/start-query-execution.html
- AWS CLI Command Reference: athena get-query-execution - https://docs.aws.amazon.com/cli/latest/reference/athena/get-query-execution.html
- Terraform AWS Provider documentation: aws_glue_catalog_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_catalog_table
- Terraform AWS Provider documentation: aws_athena_named_query - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query
- Terraform AWS Provider documentation: aws_athena_workgroup - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup
- Terraform AWS Provider documentation: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- The post described direct `aws_glue_catalog_table` view creation as "the most reliable way" to create Athena views. AWS documents Athena `CREATE VIEW` and protected multi-dialect Data Catalog views separately, so the wording was narrowed to describe this as a Terraform-native way to manage classic Athena view metadata.
- The direct Glue view example used a Parquet SerDe name for a virtual view. Changed the view SerDe block to placeholder values so it does not imply the view stores or reads Parquet data directly.
- The `local-exec` Athena example started the query asynchronously and did not verify that `CREATE OR REPLACE VIEW` completed successfully. Updated it to capture the `QueryExecutionId`, poll `get-query-execution`, return success only on `SUCCEEDED`, and fail Terraform on `FAILED` or `CANCELLED`.
- The reusable module used one `type` value for both Glue/Hive column metadata and Athena/Presto view JSON. This is incorrect for types such as Hive `string` vs Presto `varchar`. Updated the module interface to accept `hive_type` and `presto_type` separately and use them in the appropriate places.
- The SQL file example had a misleading code comment naming the SQL file inside an HCL snippet. Changed the comment to `main.tf`.

## Review Notes
- The post now distinguishes the Terraform-managed classic Athena view metadata approach from AWS Glue Data Catalog protected multi-dialect views. Modern Terraform AWS Provider versions also expose a `view_definition` block for protected Data Catalog views, but adding a full protected-view workflow would require Lake Formation and definer-role setup beyond this post's current scope.
- The snippets are illustrative and still assume supporting IAM permissions, existing S3 data locations, and AWS CLI credentials for the `local-exec` example.
