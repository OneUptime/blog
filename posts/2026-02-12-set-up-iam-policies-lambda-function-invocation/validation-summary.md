# Validation Summary: How to Set Up IAM Policies for Lambda Function Invocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS IAM
- AWS CLI
- CloudWatch Logs
- API Gateway
- Amazon S3 event notifications
- Amazon EventBridge
- Amazon SNS
- Amazon SQS event source mappings
- DynamoDB
- Secrets Manager
- Terraform AWS provider
- Python boto3

## Sources Consulted
- AWS Lambda Developer Guide: Managing permissions in AWS Lambda - https://docs.aws.amazon.com/lambda/latest/dg/lambda-permissions.html
- AWS Lambda Developer Guide: Granting Lambda function access to AWS services - https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html
- AWS Lambda Developer Guide: Granting Lambda function access to other accounts - https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-cross-account.html
- AWS Lambda Developer Guide: Sending Lambda function logs to CloudWatch Logs - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI Command Reference: lambda create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS Service Authorization Reference: Amazon CloudWatch Logs actions/resources - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html
- Terraform Registry: aws_lambda_permission - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Boto3 documentation: Lambda client invoke - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/lambda/client/invoke.html

## Issues Found
- The API Gateway permission explanation said that omitting `source-arn` would allow any API Gateway in the account to invoke the function. AWS documents a broader confused-deputy risk for service principals without a source restriction, including resources in other accounts. Updated the explanation to reflect that.
- The cross-account invocation section showed the caller invoking after adding a resource-based policy but did not state that the caller still needs an identity-based `lambda:InvokeFunction` allow. Added a sentence clarifying the required caller-side permission.
- The Terraform example used `nodejs20.x`, which AWS Lambda lists as deprecated on April 30, 2026. Updated the runtime to `nodejs24.x`, which is currently supported.

## Review Notes
- The AWS CLI is not installed in this workspace, so command syntax was checked against the official AWS CLI command reference instead of local `--help` output.
- The IAM examples are generally least-privilege oriented, but production deployments may need extra permissions depending on configuration, such as `kms:Decrypt` for encrypted SQS queues or Secrets Manager secrets using customer-managed KMS keys.
