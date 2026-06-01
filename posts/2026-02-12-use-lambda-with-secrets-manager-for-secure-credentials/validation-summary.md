# Validation Summary: How to Use Lambda with Secrets Manager for Secure Credentials

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS Secrets Manager
- AWS Parameters and Secrets Lambda Extension
- AWS CLI
- AWS IAM
- AWS KMS
- AWS CloudFormation
- JavaScript / Node.js
- Python / boto3
- PostgreSQL / psycopg2

## Sources Consulted
- AWS Lambda Developer Guide: Use Secrets Manager secrets in Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Systems Manager User Guide: AWS Parameters and Secrets Lambda Extension ARNs - https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- AWS CLI Command Reference: secretsmanager create-secret - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI Command Reference: secretsmanager get-secret-value - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- AWS CLI Command Reference: secretsmanager rotate-secret - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CloudFormation Template Reference: AWS::SecretsManager::RotationSchedule - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-secretsmanager-rotationschedule.html
- AWS CloudFormation Template Reference: AWS::SecretsManager::RotationSchedule HostedRotationLambda - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-secretsmanager-rotationschedule-hostedrotationlambda.html
- AWS Secrets Manager User Guide: Secret encryption and decryption - https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html
- AWS Lambda Developer Guide: Securing Lambda environment variables - https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html

## Issues Found
- The JavaScript SDK examples always called `JSON.parse(response.SecretString)`, but the post also creates a plain string API-key secret. That would throw for non-JSON string secrets. Updated the JavaScript examples to parse JSON when possible and otherwise return the string unchanged.
- The Lambda extension JavaScript example also always parsed `parsed.SecretString` as JSON. Updated it with the same JSON-or-plain-string handling so it works for both JSON secrets and simple string secrets.
- The Lambda extension setup command hardcoded an old regional layer ARN version. Replaced it with the official public SSM parameter lookup for the latest x86_64 extension ARN, then passes that ARN to `update-function-configuration`.
- The CloudFormation `HostedRotationLambda` example omitted the required `Transform: AWS::SecretsManager-2024-09-16`. Added the transform to make the template valid for hosted rotation Lambda generation.

## Review Notes
- The AWS CLI examples and IAM/KMS guidance are consistent with current AWS documentation.
- Local verification covered JavaScript syntax with `node --check`, Python syntax with `python3 -m py_compile`, and YAML parsing with a CloudFormation-tag-aware PyYAML loader.
- The local environment did not have the AWS CLI installed, so CLI behavior was verified against official AWS CLI documentation rather than local `--help` output.
