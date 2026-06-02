# Validation Summary: How to Create Secrets Manager Secrets with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- AWS Secrets Manager
- Amazon RDS
- AWS Lambda
- Amazon ECS and Fargate
- AWS KMS
- TypeScript
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS CDK API Reference: Secret construct: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_secretsmanager.Secret.html
- AWS CDK API Reference: RDS module and credential rotation examples: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html
- AWS CDK API Reference: PostgresEngineVersion: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.PostgresEngineVersion.html
- AWS CDK API Reference: ECS module secret injection examples: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS CDK API Reference: RotationScheduleProps: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_secretsmanager.RotationScheduleProps.html
- AWS CloudFormation Reference: AWS::SecretsManager::SecretTargetAttachment: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-secretsmanager-secrettargetattachment.html
- AWS Secrets Manager User Guide: Lambda rotation functions: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager User Guide: JSON structure of Secrets Manager secrets: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html

## Issues Found
- The RDS example used `rds.PostgresEngineVersion.VER_15_4`, which current AWS CDK documentation marks as no longer supported by Amazon RDS. Changed it to `rds.PostgresEngineVersion.VER_17_7`, which is listed in the current AWS CDK API reference examples.
- The Database Credentials section said there was a specialized construct, but the example used a regular `secretsmanager.Secret` with `rds.Credentials.fromSecret`. Updated the wording to describe the actual pattern shown in the code.
- The multi-user rotation example omitted the required secret structure caveat. Added a note that the application user secret must include `masterarn`, and that `rds.DatabaseSecret` with `masterSecret` handles that structure.
- The ECS JSON-key secret injection example omitted the Fargate platform requirement. Added the AWS CDK-documented caveat that JSON key injection requires Fargate platform version 1.4.0 or later.

## Review Notes
The examples are illustrative snippets and assume surrounding CDK context such as `vpc`, `appUserSecret`, and relevant imports. The Lambda runtime retrieval pattern is technically correct, though production code should also handle missing `SECRET_ARN`, binary secrets, JSON parse failures, and cache refresh after rotation.
