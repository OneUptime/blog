# Validation Summary: How to Create Lambda Functions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Terraform
- HashiCorp AWS Provider
- HashiCorp Archive Provider
- AWS IAM
- AWS Systems Manager Parameter Store
- AWS Lambda Layers
- Amazon S3 event notifications
- Amazon SQS event source mappings
- Amazon EventBridge / CloudWatch Events scheduled rules
- Amazon VPC configuration for Lambda
- Amazon CloudWatch Logs
- Amazon API Gateway timeout behavior

## Sources Consulted
- AWS Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda managed policies: https://docs.aws.amazon.com/lambda/latest/dg/permissions-managed-policies.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda secrets guidance: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda SQS event source parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- Amazon API Gateway timeout update: https://aws.amazon.com/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/
- Amazon API Gateway HTTP API quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_layer_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider `aws_s3_bucket_notification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Terraform AWS provider `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform Archive provider `archive_file`: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- HashiCorp sensitive state guidance: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables

## Issues Found
- The secrets example fetched the SSM parameter value with Terraform and placed it directly in Lambda environment variables. AWS recommends using Secrets Manager or Parameter Store for sensitive values rather than storing secrets in Lambda environment variables, and Terraform can store sensitive values in state. Changed the example to pass the parameter name as an environment variable and grant `ssm:GetParameter` to the Lambda execution role so the function can retrieve the secret at runtime.
- The timeout note said API Gateway has a hard 29-second limit. AWS now supports increasing the integration timeout beyond 29 seconds for Regional and private REST APIs, while HTTP APIs still have a 30-second maximum. Updated the note to describe API Gateway-specific integration timeout limits accurately.

## Review Notes
The Terraform snippets are partial examples and assume supporting resources or variables exist, such as `aws_s3_bucket.uploads`, `aws_sqs_queue.my_queue`, `aws_security_group.lambda_sg`, `var.private_subnet_ids`, `var.db_host`, `var.db_password_parameter_name`, and `var.db_password_parameter_arn`. The Lambda layer example is syntactically valid, but in a production configuration adding `source_code_hash` to the layer can improve update detection.
