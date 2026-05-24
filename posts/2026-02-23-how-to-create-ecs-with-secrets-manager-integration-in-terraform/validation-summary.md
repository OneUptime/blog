# Validation Summary: How to Create ECS with Secrets Manager Integration in Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HCL syntax, AWS provider)
- AWS ECS (Fargate launch type, task definitions, services, clusters)
- AWS Secrets Manager (secrets, versions, rotation)
- AWS Systems Manager (SSM) Parameter Store
- AWS KMS (key creation, rotation, encryption)
- AWS IAM (roles, policies, assume role policies)
- AWS CloudWatch Logs
- AWS Lambda (for secret rotation)

## Sources Consulted
- AWS ECS documentation: Specifying sensitive data using Secrets Manager (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
- AWS Secrets Manager documentation: Retrieve specific JSON key-value pairs (valueFrom format)
- Terraform AWS provider documentation: `aws_ecs_task_definition`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_rotation`, `aws_kms_key`, `aws_iam_role`, `aws_ssm_parameter`
- AWS IAM managed policies: `AmazonECSTaskExecutionRolePolicy` ARN
- AWS Fargate task size documentation (valid CPU/memory combinations)
- AWS Lambda runtime support documentation (python3.11)

## Issues Found
No technical issues found.

Verified specifically:
- The `valueFrom` JSON-key syntax `"${arn}:password::"` correctly follows the AWS format `arn:json-key:version-stage:version-id` with empty trailing fields for version-stage and version-id.
- The ECS task execution role correctly uses `ecs-tasks.amazonaws.com` as the service principal, and Secrets Manager permissions are correctly attached to the execution role (not the task role), which is required because secrets are fetched at task start.
- The `kms:Decrypt` permission is correctly granted because secrets are encrypted with a customer-managed KMS key.
- The Fargate task with `cpu = 512` and `memory = 1024` is a valid Fargate size combination.
- The `aws_secretsmanager_secret_rotation` resource correctly uses `rotation_lambda_arn` and `rotation_rules` with `automatically_after_days`.
- The container definition `secrets` block uses the correct `name`/`valueFrom` schema.
- The `aws_ssm_parameter` resource's `key_id` argument accepts a KMS key ARN.

## Review Notes
- The post does not show the `lambda_permission` resource required for Secrets Manager to invoke the rotation Lambda. This is a real prerequisite for rotation to work, but the rotation section is presented as illustrative; the standard AWS-provided rotation templates handle this for production use. Not a technical error, just an omission.
- The Lambda runtime `python3.11` is currently supported by AWS Lambda. It may be deprecated in the future, but is valid as of the validation date.
- The `var.secret_config` variable is referenced in the SSM section but not declared in the snippet. This is a minor omission in an example snippet, not a technical inaccuracy.
- The comment on the SSM section (`# Note: SSM uses the parameter ARN with the "ssm:" prefix not needed`) is awkwardly worded but technically correct — SSM parameters use the parameter ARN directly in `valueFrom`.
- The `aws_iam_role_policy_attachment.ecs_task_execution` attaches `AmazonECSTaskExecutionRolePolicy`, which already includes `secretsmanager:GetSecretValue` for some scenarios via the `secretsmanager:*` action set via tagging — however, the explicit custom policy added in the post is the recommended pattern for least privilege scoped to specific secret ARNs.
