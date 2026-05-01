# Validation Summary: How to Create ECS Task Definitions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS ECS
- AWS Fargate
- IAM roles and policies
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS CLI
- Datadog ECS sidecar container

## Sources Consulted
- OpenTofu `jsonencode` function: https://opentofu.org/docs/language/functions/jsonencode/
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS task IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Pass Secrets Manager secrets through Amazon ECS environment variables: https://docs.aws.amazon.com/AmazonECS/latest/userguide/secrets-envvar-secrets-manager.html
- AWS CLI `ecs describe-task-definition`: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-task-definition.html
- Datadog Amazon ECS on AWS Fargate: https://docs.datadoghq.com/integrations/aws-fargate/

## Issues Found
- The description said the post covered both Fargate and EC2 launch types, but the content only documents Fargate task definitions. I corrected the description to match the actual scope and to mention both Secrets Manager and Parameter Store.
- The task definition comment implied the execution role was only for image pulls and CloudWatch Logs. I corrected the prerequisite text and inline comment because ECS also uses the task execution role to retrieve referenced Secrets Manager secrets and SSM parameters.
- The `secrets` example hand-built ARNs and referenced `data.aws_caller_identity.current.account_id` without defining that data source. I replaced those values with explicit ARN variables so the example no longer depends on an undeclared data source or brittle ARN string construction.
- The ECS Exec comment sat beside task-role permissions, but the post did not distinguish that from secret injection permissions. I clarified that ECS Exec uses the task role while secret injection uses the task execution role.
- The deployment note said the CLI command described the latest task definition revision. I corrected it to the latest `ACTIVE` revision, which is what `aws ecs describe-task-definition --task-definition <family>` returns.
- The conclusion overstated `essential` usage and incorrectly said secrets injected through `secrets` do not appear in environment variable listings. I corrected this to reflect ECS behavior: at least one container must be essential, multiple containers can be essential, and injected secrets become environment variables inside the container while staying out of plaintext task-definition fields.

## Review Notes
- The `healthCheck` command assumes `curl` is present in the application image. If the image does not include it, the health check command must be adjusted to a tool that exists in the container.
- The examples use `latest` image tags in the multi-container section. Pinning a specific tag or digest would make deployments more reproducible.
- The Datadog sidecar example is valid, but storing `DD_API_KEY` through the `secrets` array would be a stronger default than passing it as a normal environment variable.
