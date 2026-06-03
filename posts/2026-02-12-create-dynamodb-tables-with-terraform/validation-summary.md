# Validation Summary: How to Create DynamoDB Tables with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- Terraform
- HashiCorp AWS Provider
- AWS Application Auto Scaling
- AWS Lambda event source mappings
- AWS KMS

## Sources Consulted
- HashiCorp AWS Provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp AWS Provider `aws_appautoscaling_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS DynamoDB throughput capacity documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- AWS DynamoDB capacity mode switching documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/switching.capacitymode.html
- AWS DynamoDB secondary index quotas documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- AWS DynamoDB global tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- AWS DynamoDB global tables core concepts: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-CoreConcepts.html
- AWS DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html
- AWS Lambda DynamoDB event source mapping parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- OneUptime linked KMS post: https://oneuptime.com/blog/post/2026-02-12-create-kms-keys-with-terraform/view

## Issues Found
- The global tables example comment said DynamoDB Streams are required for global tables in general. AWS current documentation distinguishes MREC global tables, where Streams are enabled by default and used for replication, from MRSC global tables, which do not use Streams for replication. Updated the comment to say Streams are required for MREC global table replication.

## Review Notes
Terraform is not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL snippets were reviewed manually against the current HashiCorp AWS Provider documentation and AWS documentation. The examples reference resources such as `aws_kms_key.dynamodb` and `aws_lambda_function.stream_processor` that are intentionally assumed to be defined elsewhere.
