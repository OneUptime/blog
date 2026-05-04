# Validation Summary: How to Create ECS Services with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Elastic Container Service (ECS)
- AWS Fargate
- AWS IAM (roles, managed policies)
- AWS CloudWatch Logs
- AWS Secrets Manager
- AWS VPC Security Groups
- AWS Application Load Balancer (ALB) integration
- Terraform AWS Provider (hashicorp/aws)

## Sources Consulted
- Terraform AWS Provider — `aws_ecs_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform AWS Provider — `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS Provider — `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider — `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider — `aws_cloudwatch_log_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider — `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS ECS Task Definition Parameters (Container Definitions): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Managed Policy `AmazonECSTaskExecutionRolePolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html
- AWS ECS awslogs Log Driver: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- OpenTofu Language Documentation (lifecycle, jsonencode): https://opentofu.org/docs/language/

## Issues Found
No technical issues found.

All the resource arguments, container-definition JSON keys (`portMappings`, `containerPort`, `logConfiguration`, `healthCheck`), trust-policy principal (`ecs-tasks.amazonaws.com`), managed policy ARN (`arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`), Fargate requirements (`network_mode = "awsvpc"`, `requires_compatibilities = ["FARGATE"]`), and the `deployment_circuit_breaker` / `network_configuration` / `load_balancer` blocks on `aws_ecs_service` match the official AWS provider schema and AWS API.

## Review Notes
- The post references `aws_secretsmanager_secret.db_url`, `aws_security_group.alb`, `aws_lb_target_group.app`, and `aws_lb_listener.https` resources that are not declared in the snippets shown. This is acceptable for a focused tutorial — the surrounding resources are clearly placeholders the reader is expected to provide elsewhere — but a complete end-to-end example would need to define them.
- Using `aws_ecs_cluster.main.id` for the service's `cluster` argument is fine: the AWS provider's `aws_ecs_cluster.id` attribute is the cluster ARN, which is what the service expects.
- The `lifecycle { ignore_changes = [task_definition, desired_count] }` pattern is correct and idiomatic when an external CI/CD pipeline manages task-definition revisions and/or autoscaling drives `desired_count`. Readers who do *not* use external deployment tooling should drop this so OpenTofu can roll out new task-definition revisions itself.
- Container Insights is enabled here via the `setting { name = "containerInsights" value = "enabled" }` block, which is still supported. Newer enhanced Container Insights ("enhanced") is also available as a value if the reader wants the upgraded observability tier.
- The CloudWatch log group's `retention_in_days = 30` is a reasonable default; production workloads may want longer retention or a KMS key (`kms_key_id`) for encryption.
