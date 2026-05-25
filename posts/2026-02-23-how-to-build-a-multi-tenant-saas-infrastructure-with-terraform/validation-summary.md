# Validation Summary: How to Build a Multi-Tenant SaaS Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon DynamoDB
- Amazon Cognito
- AWS Lambda
- Amazon ECS on Fargate
- Application Auto Scaling
- Amazon RDS for PostgreSQL
- Amazon S3
- Amazon API Gateway HTTP APIs
- Amazon CloudWatch Logs and CloudWatch Alarms
- Amazon SNS
- Multi-tenant SaaS architecture patterns

## Sources Consulted
- Terraform AWS Provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS Provider documentation for `aws_cognito_user_pool`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS Provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider documentation for `aws_ecs_cluster`, `aws_ecs_task_definition`, and `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider documentation for `aws_appautoscaling_target` and `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- Terraform AWS Provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider documentation for S3 bucket encryption: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon S3 policy condition key documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Terraform AWS Provider documentation for `aws_apigatewayv2_stage` and `aws_apigatewayv2_authorizer`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_authorizer
- Terraform AWS Provider documentation for `aws_cloudwatch_log_metric_filter` and `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS SaaS Tenant Isolation Strategies whitepaper: https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/the-bridge-model.html

## Issues Found
- The Cognito user pool example used `pre_token_generation`, which the current Terraform AWS Provider documents as a legacy setting for new pre-token generation triggers. Updated the snippet to use `pre_token_generation_config` with `lambda_arn` and `lambda_version`.
- The Cognito resource server comment said "per-tenant resource servers" even though the snippet defines one API resource server with scopes. Updated the comment to avoid implying per-tenant resource-server creation.
- The ECS section claimed task-level tenant isolation while the example runs one shared application service. Updated the explanation to state that tenant isolation is enforced by the application and IAM boundaries.
- The RDS examples omitted required DB instance creation inputs. Added `allocated_storage`, `max_allocated_storage`, `username`, and `manage_master_user_password = true` to both the shared DB example and the dedicated-tenant module example.
- The S3 IAM policy combined `s3:ListBucket` with object-level actions against an object ARN. Split it into a bucket-level `ListBucket` statement with an `s3:prefix` condition and a separate object-level statement for object actions.
- The API Gateway stage comment described "per-tenant rate limiting via stage variables", but the snippet only configures default stage route throttling. Updated the comment to describe default stage throttling.
- The CloudWatch Logs metric filter used both `dimensions` and `default_value`, which the Terraform AWS Provider marks as conflicting. Removed `default_value`.
- The CloudWatch alarm targeted a metric emitted with a `TenantId` dimension but did not specify a dimension. Added a `TenantId` dimension using `var.monitored_tenant_id` and clarified that the alarm is for a monitored tenant.

## Review Notes
- The post remains an architectural Terraform guide, not a complete deployable module. Several referenced resources and variables, such as IAM roles, log groups, security groups, target groups, subnets, and Cognito user pool client, are intentionally outside the snippets.
- PostgreSQL `15.4` is valid as an example engine version pattern, but production Terraform should verify currently available RDS engine versions in the target AWS region before applying.
