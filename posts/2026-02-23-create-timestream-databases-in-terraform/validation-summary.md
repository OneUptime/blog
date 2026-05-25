# Validation Summary: How to Create Timestream Databases in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Timestream for LiveAnalytics
- AWS IAM
- AWS KMS
- Amazon S3
- Amazon SNS

## Sources Consulted
- Terraform Registry: `aws_timestreamwrite_database` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/timestreamwrite_database
- Terraform Registry: `aws_timestreamwrite_table` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/timestreamwrite_table
- Terraform Registry: `aws_timestreamquery_scheduled_query` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/timestreamquery_scheduled_query
- HashiCorp AWS Provider v5.85.0 release notes - https://github.com/hashicorp/terraform-provider-aws/releases/tag/v5.85.0
- AWS Timestream storage documentation - https://docs.aws.amazon.com/timestream/latest/developerguide/storage.html
- AWS Timestream writes documentation - https://docs.aws.amazon.com/timestream/latest/developerguide/data-ingest.html
- AWS Timestream IAM policy examples - https://docs.aws.amazon.com/timestream/latest/developerguide/security_iam_id-based-policy-examples.html
- AWS Service Authorization Reference for Amazon Timestream - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazontimestream.html

## Issues Found
- The provider constraint used `~> 5.0`, but `aws_timestreamquery_scheduled_query` was added in AWS provider v5.85.0. Updated the constraint to `>= 5.85, < 7.0` so all shown resources are available.
- The table schema section described strict type checking for measure values, but the Terraform `schema` block configures customer-defined composite partition keys. Updated the prose and comment to match the actual resource behavior.
- The scheduled query example used API/CloudFormation-style field names (`scheduled_query_execution_role_arn`, `dimension_mappings`, and `multi_measure_attribute_mappings`) instead of the AWS provider's Terraform names. Updated them to `execution_role_arn`, `dimension_mapping`, and `multi_measure_attribute_mapping`.
- The scheduled query target set `measure_name_column = "measure_name"` without selecting a `measure_name` result column. Removed it because the example already uses `target_multi_measure_name`.
- The scheduled query execution role omitted `timestream:SelectValues` and `s3:GetBucketAcl`, both included in AWS examples for scheduled query execution roles. Added the missing permissions.
- The application write policy scoped `timestream:DescribeEndpoints` to table ARNs, but that action requires `Resource = "*"`. Split it into a separate statement.

## Review Notes
The examples still use fixed S3 bucket names, which must be globally unique in a real AWS account. The snippets are appropriate for instructional use, but production code should also add least-privilege KMS key policies and S3 bucket policies for the configured error and rejected-record locations.
