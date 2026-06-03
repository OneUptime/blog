# Validation Summary: How to Set Up ECS with Parameter Store for Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Container Service (ECS)
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (KMS)
- AWS CLI
- AWS CDK v2
- Python boto3

## Sources Consulted
- Amazon ECS documentation: Pass Systems Manager parameters through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Amazon ECS documentation: Task definition parameters and `secrets.valueFrom`: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Systems Manager Parameter Store overview and tiers: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS Systems Manager endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/ssm.html
- AWS Systems Manager API Reference: `GetParameter`: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameter.html
- AWS Systems Manager CLI examples for parameter versions and labels: https://docs.aws.amazon.com/systems-manager/latest/userguide/example_ssm_GetParameter_section.html
- AWS CLI Command Reference: `ssm put-parameter`: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS CLI Command Reference: `ecs update-service`: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CDK v2 API Reference: `aws_ssm.StringParameter`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.StringParameter.html
- AWS CDK v2 API Reference: `aws_ecs.Secret.fromSsmParameter`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.Secret.html
- AWS CloudFormation Template Reference: `AWS::SSM::Parameter`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ssm-parameter.html

## Issues Found
- The IAM, task definition, ECR image, and Parameter Store ARN examples used `123456789`, which is not a valid 12-digit AWS account ID. Updated those examples to `123456789012`.
- The CDK example attempted to create an SSM `SecureString` with `new ssm.StringParameter(... type: ssm.ParameterType.SECURE_STRING ...)`. CDK's `StringParameter.type` is deprecated and CloudFormation `AWS::SSM::Parameter` does not support creating `SecureString` parameters. Updated the example to create the plain String parameter in CDK and import the SecureString parameter with `ssm.StringParameter.fromSecureStringParameterAttributes`.
- The Parameter Store limits table incorrectly tied higher throughput to the Advanced tier and listed `GetParameter` higher throughput as 1,000 TPS. Updated the table to show the default 40 TPS shared limit for both Standard and Advanced parameters, and added the current higher-throughput quotas: `GetParameter` 10,000 TPS, `GetParameters` 1,000 TPS, and `GetParametersByPath` 100 TPS.
- The pinned task definition example used an ARN with a version suffix. Updated it to the documented Systems Manager selector form, `/production/myapp/api_url:3`, which ECS can use as a same-Region Parameter Store name.

## Review Notes
- The core ECS pattern is correct: values from Systems Manager Parameter Store are injected via the container definition `secrets` field, require task execution role permissions, and are loaded when the task starts.
- The AWS CLI was not installed in the local workspace, so CLI commands were checked against the official AWS CLI command reference instead of local `aws --help` output.
- Runtime fetching correctly notes that SSM permissions must be granted to the task role rather than the task execution role.
