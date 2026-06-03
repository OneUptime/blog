# Validation Summary: How to Access Secrets Manager Secrets from Lambda Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS Secrets Manager
- AWS Parameters and Secrets Lambda Extension
- AWS IAM
- AWS KMS
- AWS CLI
- Terraform AWS Provider
- Python / boto3
- Node.js / AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda: Use Secrets Manager secrets in Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Systems Manager: Using Parameter Store parameters in AWS Lambda functions / AWS Parameters and Secrets Lambda Extension - https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- AWS Secrets Manager: Secret encryption and decryption - https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Secrets Manager: Retrieve secrets with Python / boto3 - https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets-python-sdk.html
- AWS SDK for JavaScript v3: Secrets Manager GetSecretValue examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_secrets-manager_code_examples.html
- AWS Lambda: Working with environment variables - https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda: Runtime environment lifecycle - https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html
- AWS Secrets Manager: Using a VPC endpoint - https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html
- AWS Lambda: VPC internet access behavior - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Terraform AWS Provider: aws_lambda_function resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- The introduction said the guide covered environment variable injection, but the post did not include that approach. Changed it to accurately describe the two approaches actually covered.
- The direct SDK section said the problem was one Secrets Manager API call per cold start, but the shown code calls Secrets Manager on every invocation. Updated the wording to match the code and explain module-level caching for warm invocations.
- The module initialization section said the init phase has its own timeout separate from the handler timeout. AWS Lambda init behavior is more nuanced, so the wording now focuses on the accurate optimization: one fetch per execution environment instead of every invocation.
- The Lambda extension section said the extension handles refreshing when rotation occurs. AWS documentation says the extension does not detect changes before TTL expiry. Updated the text to say it fetches fresh values after TTL expiry.
- The extension layer examples used an outdated us-east-1 layer version. Updated the CLI example to the current documented us-east-1 x86_64 layer version and changed the Terraform example to read the latest layer ARN from AWS's public SSM parameter.
- The post claimed the extension adds about 50MB to function memory usage. I did not find official documentation supporting that specific memory figure, so it now says the extension adds some resource overhead.
- The KMS permission guidance implied KMS decrypt permission is always separately required. Updated it to specify the customer managed KMS key case and align with Secrets Manager/KMS documentation.

## Review Notes
The code examples use current AWS SDK APIs and are syntactically plausible for their languages. The Terraform snippet still assumes surrounding resources such as the secret, KMS key, region data source, VPC variables, and security group exist in the caller's configuration.
