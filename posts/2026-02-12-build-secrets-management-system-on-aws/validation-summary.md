# Validation Summary: How to Build a Secrets Management System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS KMS
- AWS Lambda
- AWS Parameters and Secrets Lambda Extension
- AWS CDK v2
- Amazon RDS for PostgreSQL
- CloudTrail, CloudWatch Logs, and CloudWatch alarms
- JavaScript / Node.js AWS SDK v3
- TypeScript

## Sources Consulted
- AWS Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- AWS Systems Manager pricing for Parameter Store: https://aws.amazon.com/systems-manager/pricing/
- AWS CloudFormation `AWS::SSM::Parameter` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ssm-parameter.html
- AWS CDK `StringParameter` and `ParameterType` API docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.StringParameter.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.ParameterType.html
- AWS Parameters and Secrets Lambda Extension docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- AWS Lambda Secrets Manager integration docs: https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- AWS Lambda runtime support docs: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Secrets Manager rotation Lambda docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager cross-account access docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html
- AWS Secrets Manager secret JSON structure docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html
- AWS CDK RDS and Secrets Manager attachment docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html
- AWS Secrets Manager encryption docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html

## Issues Found
- The CDK example attempted to create an SSM `SecureString` with `ssm.StringParameter` and `ParameterType.SECURE_STRING`. CloudFormation does not support creating `SecureString` parameters, and CDK marks this parameter type path as deprecated. Changed the example to use `AwsCustomResource` to call `SSM.PutParameter` with `Type: SecureString` and explicit SSM/KMS permissions.
- The Lambda extension CDK example used `lambda.Runtime.NODEJS_18_X`, which is deprecated as of September 1, 2025. Updated it to `lambda.Runtime.NODEJS_22_X`, which is a supported Lambda runtime.
- The RDS rotation example rotated the original secret without first attaching the database target. Added `dbCredentials.attach(database)` and rotated the attached secret so Secrets Manager receives connection metadata such as host, port, and engine.
- The custom rotation Lambda said Secrets Manager handles version-stage promotion in `finishSecret`. For custom rotation functions, the rotation Lambda must move `AWSCURRENT` to the pending version. Added `DescribeSecretCommand` and `UpdateSecretVersionStageCommand` logic to promote the pending version.
- The cross-account sharing example granted only `secretsmanager:GetSecretValue`. Cross-account access also requires a customer-managed KMS key and decrypt permission because the AWS managed `aws/secretsmanager` key cannot be used for cross-account access. Added a customer-managed KMS key and `grantDecrypt` for the target account.

## Review Notes
The pricing figures in the post matched current AWS pricing pages at review time. The hard-coded Lambda extension layer ARN was updated only indirectly by noting the official latest-ARN mechanism in the review; the snippet still uses a region-specific ARN, so future revisions could improve portability by resolving `/aws/service/aws-parameters-and-secrets-lambda-extension/x86/latest` from SSM.
