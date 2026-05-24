# Validation Summary: How to Create IAM Roles for ECS Tasks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS IAM
- Amazon ECS (Fargate and EC2 launch types)
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS KMS
- Amazon ECR
- Amazon CloudWatch Logs
- Amazon S3, DynamoDB, SQS (as example task-role targets)
- ECS Exec (SSM Session Manager)

## Sources Consulted
- Terraform AWS Provider — `aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy_attachment`, `aws_iam_policy_document`, `aws_ecs_task_definition` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- AWS ECS Task Execution IAM Role docs (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
- AWS ECS Task IAM Role docs (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- `AmazonECSTaskExecutionRolePolicy` managed policy reference (https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html)
- AWS ECS — Specifying sensitive data using Secrets Manager / SSM Parameter Store (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
- AWS ECS Exec IAM permissions (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html)
- Fargate task CPU/memory combinations (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html)

## Issues Found
No technical issues found.

Spot-checks confirmed:
- Trust principal `ecs-tasks.amazonaws.com` is correct for both the task execution role and the task role.
- Managed policy ARN `arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy` is correct (lives in the `service-role/` path).
- `AmazonECSTaskExecutionRolePolicy` does not grant `secretsmanager:GetSecretValue` for arbitrary secrets, so the supplemental inline policy in the "Adding Secrets Access" section is appropriately scoped.
- ECS Exec channel actions (`ssmmessages:CreateControlChannel`, `CreateDataChannel`, `OpenControlChannel`, `OpenDataChannel`) match the documented requirements and belong on the task role (not the execution role) as the post states.
- `aws_ecs_task_definition` arguments (`family`, `network_mode`, `requires_compatibilities`, `cpu`, `memory`, `execution_role_arn`, `task_role_arn`, `container_definitions`) and the Fargate-valid 256 CPU / 512 MB memory combination are correct.
- Container `secrets` block with `name` / `valueFrom` keys matches the ECS task definition schema.
- `awslogs` log driver options (`awslogs-group`, `awslogs-region`, `awslogs-stream-prefix`) are correct.
- Terraform HCL syntax (including the trailing comma after the last argument to `concat(...)` and the `for_each` / `flatten` / `for` expressions) is valid.

## Review Notes
- The KMS statement uses `arn:aws:kms:us-east-1:*:key/*`, which is broad. The post itself recommends resource-level permissions in the Best Practices section; users following the example for real workloads should narrow this to the specific CMK ARN used to encrypt their secrets.
- The execution role's trust statement does not include a `aws:SourceAccount` / `aws:SourceArn` condition. This is acceptable for the simple tutorial case, but the AWS confused-deputy guidance recommends adding such conditions in production. The post does not claim otherwise.
- The post assumes `us-east-1` throughout the example ARNs; readers in other regions must substitute the correct region partition.
- Terraform 1.0+ as the stated minimum is reasonable; nothing in the snippets requires a newer language feature.
