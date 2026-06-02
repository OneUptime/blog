# Validation Summary: How to Fix Lambda 'Permission Denied' When Accessing Other Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Lambda
- AWS IAM
- AWS CLI
- Amazon DynamoDB
- Amazon S3
- Amazon SQS
- Amazon SNS
- AWS Secrets Manager
- AWS KMS
- AWS SAM / CloudFormation

## Sources Consulted
- AWS Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda VPC permissions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS managed policies for Lambda: https://docs.aws.amazon.com/lambda/latest/dg/security-iam-awsmanpol.html
- DynamoDB IAM policy for tables and indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/iam-policy-specific-table-indexes.html
- IAM example policy for S3 bucket read/write access: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_rw-bucket.html
- Secrets Manager identity-based policies: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_iam-policies.html
- Secrets Manager secret ARN format: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- Amazon SQS key management and KMS permissions: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
- DynamoDB encryption at rest usage notes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.usagenotes.html
- AWS CLI get-function-configuration: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html
- AWS CLI simulate-principal-policy: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS SAM policy template list: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html

## Issues Found
- The Secrets Manager policy used `arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-*`. AWS documents that secret ARNs include a six-character random suffix and recommends `??????` when matching that suffix by name. Changed the resource ARN to `my-secret-??????` and updated the note to explain why this is more precise.
- The custom Lambda VPC permissions snippet listed only `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, and `ec2:DeleteNetworkInterface`. Current AWS Lambda documentation also lists `ec2:DescribeSubnets`, `ec2:AssignPrivateIpAddresses`, and `ec2:UnassignPrivateIpAddresses` for a custom policy. Added those actions to the example.

## Review Notes
The remaining AWS CLI commands, IAM policy syntax, Lambda trust policy, DynamoDB table/index ARNs, S3 bucket/object ARN split, SQS/SNS examples, KMS guidance, and SAM policy template names were consistent with current AWS documentation. The local AWS CLI was not installed in the review environment, so command syntax was verified against AWS CLI documentation rather than local `--help` output.
