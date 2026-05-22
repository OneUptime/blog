# Validation Summary: How to Implement Lambda Security with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Terraform AWS Provider
- AWS IAM
- Amazon VPC and VPC endpoints
- AWS Secrets Manager
- AWS KMS
- Lambda Function URLs
- Amazon SQS dead letter queues
- AWS Signer / Lambda code signing

## Sources Consulted
- AWS Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda VPC configuration and required permissions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda internet access for VPC-connected functions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- Amazon VPC gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda encryption at rest: https://docs.aws.amazon.com/lambda/latest/dg/security-encryption-at-rest.html
- AWS Secrets Manager with Lambda: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Lambda Function URL access control: https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda reserved concurrency API: https://docs.aws.amazon.com/lambda/latest/api/API_PutFunctionConcurrency.html
- AWS Lambda asynchronous invocation destinations and dead letter queues: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda code signing: https://docs.aws.amazon.com/lambda/latest/dg/configuration-codesigning.html
- Terraform AWS Provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider `aws_lambda_function_url`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_url
- Terraform AWS Provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS Provider `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- The VPC Lambda example attached only `AWSLambdaBasicExecutionRole`. AWS requires additional EC2 network interface permissions when a Lambda function is attached to a customer VPC. Added the `AWSLambdaVPCAccessExecutionRole` policy attachment.
- The Lambda function example used `nodejs20.x`, which reached its AWS Lambda deprecation date on April 30, 2026. Updated the runtime to `nodejs22.x`.
- The Function URL `NONE` example suggested restricting unauthenticated access with a specific-account resource-based policy. AWS documents `NONE` as bypassing IAM authentication for callers, so the text now states that `NONE` should be treated as public and validated in function code.
- The dead letter queue section implied the Lambda function-level DLQ applied broadly to failed invocations. AWS documents function-level DLQs for asynchronous invocations and recommends configuring the DLQ on the SQS queue when SQS is the event source, so the wording was corrected.

## Review Notes
The remaining Terraform snippets use valid resource names and arguments for the AWS Provider patterns shown. The examples are partial snippets and still assume supporting resources such as queues, route tables, security groups, KMS keys, signing profiles, and database resources exist elsewhere in the Terraform configuration.
