# Validation Summary: How to Pass Environment Variables to ECS Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS task definitions
- AWS Fargate
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon S3 environment files
- AWS IAM task execution roles and task roles
- AWS CLI
- Terraform AWS provider
- Python boto3

## Sources Consulted
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Pass environment variables to an Amazon ECS container: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html
- Pass Secrets Manager secrets through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Pass Systems Manager parameters through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Monitor Amazon ECS containers with ECS Exec: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
- AWS CLI `ssm put-parameter` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS CLI `ecs describe-task-definition` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-task-definition.html
- AWS CLI `ecs execute-command` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/execute-command.html
- Terraform AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition

## Issues Found
- The example ECR registry URL and several ARN examples used a 9-digit account ID (`123456789`). AWS account IDs in ARNs and ECR registry hostnames are 12 digits, so these were changed to `123456789012`.
- The precedence section claimed a full ordering across inline `environment`, `secrets`, and `environmentFiles`. AWS documents inline `environment` taking precedence over environment files, and documents duplicate handling across multiple environment files, but does not document a general `secrets` precedence order there. The section was narrowed to the documented env-file precedence behavior.
- The runtime configuration Python example used `@lru_cache(maxsize=None)` while describing dynamic updates without redeployment. That would cache each key indefinitely and prevent repeated reads from seeing updated SSM values. The cache decorator and unused `use_cache` argument were removed.
- The ECS Exec example used `--command "env | sort"`, which relies on shell interpretation for the pipe. It was changed to `--command "sh -c 'env | sort'"` so the pipeline is explicitly executed by a shell in the container.

## Review Notes
- ECS environment files from S3 have platform and syntax caveats that are technically relevant for production use: Linux Fargate tasks need platform version 1.4.0 or later, files must use the `.env` extension and UTF-8 encoding, and Windows containers do not support `environmentFiles`.
- Secrets injected into ECS environment variables are read at container startup. Secret or parameter changes require a new task unless the application reads from Secrets Manager or Parameter Store at runtime.
