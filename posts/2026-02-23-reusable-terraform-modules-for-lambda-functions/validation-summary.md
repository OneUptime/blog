# Validation Summary: How to Create Reusable Terraform Modules for Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- Amazon SQS event source mappings
- Lambda VPC configuration

## Sources Consulted
- Terraform AWS provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider documentation for `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS provider documentation for `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform language documentation for optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform language documentation for `filebase64sha256`: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda execution role documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda managed policy documentation: https://docs.aws.amazon.com/lambda/latest/dg/permissions-managed-policies.html
- AWS Lambda SQS event source mapping documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html

## Issues Found
- The post claimed the module managed event source mappings for SQS, DynamoDB Streams, and Kinesis, but the provided module code only defines SQS event source variables and an SQS `aws_lambda_event_source_mapping`. Updated the claim to SQS only so it matches the implementation.
- The post used `nodejs20.x` in the runtime examples. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, so the examples were updated to `nodejs22.x`.
- The SQS consumer example created an SQS event source mapping but did not attach the required SQS polling permissions to the Lambda execution role. Added `AWSLambdaSQSQueueExecutionRole` through the module's existing `additional_policy_arns` input.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL snippets were reviewed manually against the current Terraform language and AWS provider documentation.
- The module includes a `versions.tf` file in the structure but does not show its contents. A production version of the post could add explicit Terraform and AWS provider constraints, especially because the module uses optional object attributes.
- For SQS event sources, AWS requires the queue visibility timeout to be at least the Lambda function timeout; the example does not define the queue, so this is a deployment consideration rather than an error in the shown module.
