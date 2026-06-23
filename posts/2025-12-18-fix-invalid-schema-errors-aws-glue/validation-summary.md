# Validation Summary: How to Fix Invalid Schema Errors in AWS Glue

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- AWS Glue Data Catalog
- AWS Glue crawlers
- Terraform AWS provider
- AWS CLI
- Hive-compatible table schemas
- JSON, Parquet, CSV, and ORC SerDes

## Sources Consulted
- AWS Glue API Reference: StorageDescriptor and column metadata - https://docs.aws.amazon.com/glue/latest/webapi/API_StorageDescriptor.html
- AWS Glue API / AWS CLI Reference: create-table, StorageDescriptor, PartitionKeys, SerDeInfo - https://docs.aws.amazon.com/cli/latest/reference/glue/create-table.html
- AWS CLI Reference: glue start-crawler - https://docs.aws.amazon.com/cli/latest/reference/glue/start-crawler.html
- AWS CLI Reference: glue get-crawler - https://docs.aws.amazon.com/cli/latest/reference/glue/get-crawler.html
- Amazon Athena User Guide: supported data types for Glue Data Catalog tables - https://docs.aws.amazon.com/athena/latest/ug/data-types.html
- Apache Hive Language Manual: primitive and complex type syntax - https://hive.apache.org/docs/latest/language/languagemanual-types/
- Terraform AWS Provider documentation: aws_glue_catalog_table - https://github.com/hashicorp/terraform-provider-aws/blob/master/website/docs/r/glue_catalog_table.html.markdown
- Amazon Athena User Guide: OpenX JSON SerDe - https://docs.aws.amazon.com/athena/latest/ug/openx-json-serde.html
- Amazon Athena User Guide: Parquet SerDe - https://docs.aws.amazon.com/athena/latest/ug/parquet-serde.html
- Amazon Athena User Guide: LazySimpleSerDe for CSV/TSV/custom-delimited files - https://docs.aws.amazon.com/athena/latest/ug/lazy-simple-serde.html

## Issues Found
- The post incorrectly described `integer` as an unsupported Glue table column type and instructed readers to use `int` instead. Athena's Hive-compatible DDL type list includes `INT, INTEGER`, and Hive documents `INTEGER` as a synonym for `INT`. I changed the intentionally bad example to use `number`, which is not a valid Hive/Athena column type, while keeping the corrected example as `int`.
- The post said `terraform plan` catches schema issues before they reach AWS. Terraform can catch HCL syntax and provider schema/configuration errors, but Glue service-side schema validation errors can still occur during `terraform apply`. I clarified this distinction.

## Review Notes
- The AWS CLI commands use current Glue subcommands and options, but the crawler commands demonstrate starting and inspecting a crawler rather than validating a Terraform table definition directly.
- The CSV module example uses `LazySimpleSerDe`, which is valid for simple delimited files. Quoted CSV data may require `OpenCSVSerde` instead.
