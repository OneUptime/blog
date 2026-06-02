# Validation Summary: How to Pass Secrets to ECS Tasks from Secrets Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS IAM task execution roles
- AWS KMS
- AWS CLI
- Terraform AWS provider
- Python boto3

## Sources Consulted
- Amazon ECS: Pass Secrets Manager secrets through environment variables: https://docs.aws.amazon.com/AmazonECS/latest/userguide/secrets-envvar-secrets-manager.html
- Amazon ECS: Task execution IAM role permissions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS: Task definition parameters and `secrets` field: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS CLI `secretsmanager create-secret` reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI `ecs update-service` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS Secrets Manager: Secret ARN format and random suffix: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- AWS Account Management: 12-digit AWS account IDs: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- Amazon ECS: Pass Systems Manager parameters through environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Terraform AWS provider `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Referenced OneUptime article: https://oneuptime.com/blog/post/2026-02-12-pass-environment-variables-ecs-tasks/view

## Issues Found
- Several example ARNs and an ECR image URI used a 9-digit placeholder account ID (`123456789`). AWS account IDs are 12 digits, and official AWS examples use 12-digit account IDs in ARNs and registry URIs. Updated the examples to use `123456789012`.
- The description mentioned file-based access patterns, but the post only covers environment-variable injection through ECS `secrets`. Updated the description to match the actual content.

## Review Notes
The ECS `secrets` syntax for Secrets Manager JSON keys, version stages, and version IDs is correct. The execution-role permission guidance is correct, including the custom KMS key caveat. The rotation behavior is correct: running tasks do not automatically receive rotated environment variable values and need new tasks or a forced service deployment. The Terraform examples are illustrative and reference resources that would need to exist in a full configuration.
