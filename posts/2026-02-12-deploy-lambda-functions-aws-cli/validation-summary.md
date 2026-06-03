# Validation Summary: How to Deploy Lambda Functions with the AWS CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS CLI
- AWS IAM execution roles
- Python Lambda runtime
- Lambda deployment packages
- Lambda versions and aliases
- Lambda weighted alias routing / canary deployments
- API Gateway HTTP APIs
- Amazon S3 event notifications
- Amazon EventBridge scheduled rules
- Bash deployment scripting

## Sources Consulted
- AWS CLI Command Reference: lambda create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS Lambda Developer Guide: Working with Lambda environment variables - https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda Developer Guide: Manage Lambda function versions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html
- AWS Lambda Developer Guide: Create an alias for a Lambda function - https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html
- AWS Lambda Developer Guide: Implement Lambda canary deployments using a weighted alias - https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CLI Command Reference: lambda invoke - https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS CLI Command Reference: apigatewayv2 create-api - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api.html
- AWS CLI Command Reference: s3api put-bucket-notification-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS Lambda Developer Guide: Process Amazon S3 event notifications with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Info-ZIP command help for zip 3.0, confirming that the default action adds or replaces entries in an existing archive.

## Issues Found
- The packaging commands rebuilt `deployment.zip` with `zip -r` without removing any existing archive first. Because `zip` adds or replaces entries and does not automatically remove archive entries for source files that were deleted, repeated deployments could include stale files. Added `rm -f deployment.zip` before each package rebuild command.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and AWS service documentation.
- Python 3.12 is a currently supported Lambda runtime in the AWS CLI documentation. Newer Python runtimes are also listed, but the post's use of Python 3.12 is not deprecated.
- The API Gateway, S3, and EventBridge examples use placeholder account IDs, bucket names, regions, and ARNs. Readers must replace these with values from their own AWS account and region.
