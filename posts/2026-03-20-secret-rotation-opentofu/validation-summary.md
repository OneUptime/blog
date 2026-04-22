# Validation Summary: How to Configure Secret Rotation with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform AWS provider
- AWS Secrets Manager
- AWS Lambda
- AWS Serverless Application Repository
- AWS IAM
- AWS KMS
- Amazon EventBridge
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform AWS provider documentation for `aws_serverlessapplicationrepository_application`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/serverlessapplicationrepository_application
- Terraform AWS provider documentation for `aws_serverlessapplicationrepository_cloudformation_stack`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/serverlessapplicationrepository_cloudformation_stack
- Terraform AWS provider documentation for `aws_lambda_function` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/lambda_function
- Terraform AWS provider documentation for EventBridge rule and target resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider documentation for `aws_sns_topic_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- AWS Secrets Manager API Reference for `RotationRulesType`: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_RotationRulesType.html
- AWS Secrets Manager User Guide for rotation schedules: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_schedule.html
- AWS Secrets Manager User Guide for Lambda rotation functions and execution role permissions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html and https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-required-permissions-function.html
- AWS Lambda documentation for supported runtimes and VPC execution role permissions: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html and https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Secrets Manager CloudWatch monitoring documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudwatch.html
- AWS Secrets Manager CloudTrail rotation events documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/cloudtrail_log_entries.html
- Amazon EventBridge reference for AWS Secrets Manager events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-secretsmanager.html

## Issues Found
- The rotation schedule combined `automatically_after_days` with a `duration` comment that described a completion deadline. Updated the example to use `schedule_expression = "rate(30 days)"` with `duration = "2h"`, which matches AWS's current rotation-window model.
- The database rotation example referenced `aws_lambda_function.db_rotator.arn`, but the AWS-provided rotation Lambda is created by a Serverless Application Repository CloudFormation stack, not by an `aws_lambda_function` resource in the post. Added an `aws_lambda_function` data source lookup for the deployed function and updated the rotation resource to use it.
- The Serverless Application Repository example pinned a specific semantic version. Removed the pin so the data source resolves the latest application version by default, avoiding stale rotation template versions.
- The Lambda execution role omitted permissions commonly required by the shown rotation workflow: `secretsmanager:GetRandomPassword`, KMS `DescribeKey`, CloudWatch Logs permissions, and EC2 network-interface permissions for the VPC-enabled Lambda. Added these permissions and allowed the role to access both example secrets referenced by the post.
- The monitoring example used a CloudWatch metric alarm for `AWS/SecretsManager` metric `RotationFailed`, but AWS documents rotation failures as CloudTrail/EventBridge events rather than a Secrets Manager CloudWatch metric. Replaced it with an EventBridge rule for `RotationFailed` and `TestRotationFailed`, an SNS topic policy, and an EventBridge target.
- Updated the conclusion to refer to EventBridge `RotationFailed` events instead of CloudWatch `RotationFailed` metrics.

## Review Notes
The remaining snippets are still illustrative and assume supporting resources such as the KMS key, SNS topic, security group, subnet variables, and API key secret exist elsewhere in the OpenTofu configuration. For private RDS databases, the AWS-provided rotation Lambda also needs network access to the database through appropriate VPC configuration.
