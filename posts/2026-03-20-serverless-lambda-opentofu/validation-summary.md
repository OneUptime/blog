# Validation Summary: How to Deploy Serverless Lambda Functions with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform AWS provider resources
- Terraform Archive provider `archive_file`
- AWS Lambda
- AWS IAM
- Amazon CloudWatch Logs
- AWS X-Ray
- Amazon VPC networking for Lambda
- Amazon SQS event source mappings
- Amazon API Gateway v2 HTTP APIs
- Lambda Function URLs
- AWS Secrets Manager
- Amazon S3

## Sources Consulted
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda X-Ray tracing: https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- AWS managed policy `AWSXRayDaemonWriteAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- AWS Lambda SQS event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS managed policy `AWSLambdaSQSQueueExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaSQSQueueExecutionRole.html
- AWS Lambda VPC configuration and Hyperplane ENIs: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Function URL access control: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS API Gateway HTTP API Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- Terraform AWS provider `aws_lambda_function` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- Terraform AWS provider `aws_lambda_event_source_mapping` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_event_source_mapping.html.markdown
- Terraform AWS provider `aws_lambda_function_url` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function_url.html.markdown
- Terraform AWS provider `aws_apigatewayv2_integration` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/apigatewayv2_integration.html.markdown
- Terraform AWS provider `aws_lambda_permission` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_permission.html.markdown
- Terraform Archive provider `archive_file` docs: https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/data-sources/file.md

## Issues Found
- Active X-Ray tracing was enabled on the Lambda function, but the execution role did not include X-Ray write permissions. Added an `aws_iam_role_policy_attachment` for `arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess`.
- The SQS queue visibility timeout was set to 60 seconds with a 30-second Lambda timeout, while AWS recommends at least six times the function timeout for SQS event sources. Changed it to 180 seconds and corrected the comment.
- The SQS trigger example used `aws_lambda_permission` for `sqs.amazonaws.com`, but SQS event source mappings are poll-based and require the Lambda execution role to read from SQS. Replaced that permission block with `AWSLambdaSQSQueueExecutionRole`.
- The SQS event source mapping did not explicitly depend on the SQS execution-role policy attachment. Added `depends_on` so OpenTofu does not create the mapping before the required IAM permission is attached.
- The VPC Lambda comment said VPC Lambdas need longer timeout for cold start. Current Lambda VPC networking uses Hyperplane ENIs, so the comment was changed to focus on allowing enough time for private resource calls.
- The conclusion said to allocate enough subnet IP addresses to handle concurrent executions. Updated this to the current Hyperplane ENI model: selected subnets need available private IPs for Lambda-managed Hyperplane ENIs, not one IP per concurrent execution.
- The `source_code_hash` wording implied OpenTofu only updates the function when code changes. Updated it to state that `source_code_hash` updates the deployed package when the archive changes.

## Review Notes
- The HCL snippets were reviewed against provider and AWS documentation, but `tofu validate` was not run because the post contains excerpts that reference variables and resources defined outside the snippets.
- `python3.12` is still a supported AWS Lambda runtime as of this review date.
- The API Gateway v2 integration is valid with the AWS provider default payload format, but future revisions could set `payload_format_version` explicitly if the handler expects a specific HTTP API event shape.
