# Validation Summary: How to Build a Centralized Config Management System on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS AppConfig
- Amazon EventBridge
- AWS Lambda
- Amazon SNS
- AWS CloudFormation
- Python
- boto3

## Sources Consulted
- AWS Systems Manager PutParameter API Reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html
- boto3 SSM put_parameter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/put_parameter.html
- boto3 SSM add_tags_to_resource documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/add_tags_to_resource.html
- AWS Systems Manager EventBridge event reference: https://docs.aws.amazon.com/systems-manager/latest/userguide/reference-eventbridge-events.html
- AWS Systems Manager Parameter Store EventBridge notifications: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-cwe.html
- AWS Secrets Manager UpdateSecretVersionStage API Reference: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_UpdateSecretVersionStage.html
- boto3 Secrets Manager update_secret_version_stage documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/update_secret_version_stage.html
- AWS Secrets Manager Lambda rotation function documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager and Parameter Store integration documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_parameterstore.html
- AWS CloudFormation AWS::Events::Rule documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS CloudFormation AWS::Lambda::Permission documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- Python ast parser used locally to validate Python snippet syntax.

## Issues Found
- The Parameter Store bootstrap script passed `Tags` directly to `put_parameter` while also using `Overwrite=True`. AWS documents that tags for an existing Systems Manager parameter should be added with `AddTagsToResource`, so the script now writes the value with `put_parameter` and applies tags with `ssm.add_tags_to_resource`.
- The Secrets Manager section said sensitive values should go in Secrets Manager, not Parameter Store. Parameter Store supports encrypted `SecureString` values and can reference Secrets Manager secrets, so the wording now recommends Secrets Manager specifically for sensitive values that need automatic rotation rather than implying Parameter Store cannot store sensitive data.
- The Secrets Manager rotation handler moved `AWSCURRENT` with `MoveToVersionId` but did not supply `RemoveFromVersionId`. AWS documents that moving a staging label already attached to another version requires `RemoveFromVersionId`, so the example now finds the current version and passes it when finishing rotation.
- The EventBridge CloudFormation snippet created an `AWS::Events::Rule` with a Lambda target but omitted the Lambda resource-based permission needed for EventBridge to invoke the function. The snippet now includes an `AWS::Lambda::Permission` resource scoped to the rule ARN.

## Review Notes
- The examples are illustrative and still omit production hardening such as IAM policies, retry behavior, full secret rotation safety checks, AppConfig hosted configuration profile setup, and concrete database update/test implementations.
- The Python snippets were checked with `ast.parse` and are syntactically valid after the edits.
