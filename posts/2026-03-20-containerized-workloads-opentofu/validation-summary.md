# Validation Summary: How to Deploy Containerized Workloads with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HashiCorp Configuration Language (HCL)
- AWS ECS (Elastic Container Service) with Fargate
- AWS ECS Task Definitions and Services
- AWS CloudWatch Logs (awslogs driver)
- AWS VPC networking (subnets, security groups)
- AWS Application Load Balancer (target groups)
- Kubernetes (kubernetes_deployment resource)
- Terraform AWS Provider (`hashicorp/aws`)
- Terraform Kubernetes Provider (`hashicorp/kubernetes`)

## Sources Consulted
- Terraform AWS Provider — `aws_ecs_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_cluster
- Terraform AWS Provider — `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS Provider — `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS ECS Task Definition Parameters (container definitions schema): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Fargate task CPU/memory valid combinations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Terraform Kubernetes Provider — `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- OpenTofu documentation: https://opentofu.org/docs/

## Issues Found
No technical issues found.

The HCL is syntactically valid and uses current, non-deprecated APIs:
- `aws_ecs_cluster` with `name` argument is correct.
- `aws_ecs_task_definition` correctly uses `family`, `network_mode = "awsvpc"`, `requires_compatibilities = ["FARGATE"]`, `cpu = "256"`, `memory = "512"` (a valid Fargate CPU/memory combination), `execution_role_arn`, and `container_definitions = jsonencode(...)`.
- The container definition JSON uses the correct camelCase keys required by the ECS API (`portMappings`, `containerPort`, `protocol`, `logConfiguration`, `logDriver`, `awslogs-group`, `awslogs-region`, `awslogs-stream-prefix`).
- `aws_ecs_service` correctly uses the `network_configuration` and `load_balancer` nested blocks with valid arguments.
- `kubernetes_deployment` uses the correct nested-block schema (`metadata`, `spec`, `selector` with `match_labels`, `template`, `container`, `port`, `resources` with `limits`).

## Review Notes
- The post is intentionally minimal; in production, supporting resources (VPC, subnets, security groups, IAM roles, target groups, CloudWatch log groups) referenced by `aws_iam_role.ecs_execution`, `aws_subnet.private`, `aws_security_group.app`, `aws_lb_target_group.app`, and `aws_cloudwatch_log_group.app` are not defined here. This is acceptable for a focused walkthrough, but readers should know they need to define those.
- The Kubernetes provider's `kubernetes_deployment` resource is still supported, though `kubernetes_deployment_v1` is the alternative versioned name available in current provider releases. Both are valid; no change needed.
- `resources.limits` is set without `requests`. This is technically correct, though best practice is to also specify `requests` to give the scheduler accurate sizing data.
- Hardcoding the AWS region (`us-east-1`) inside the container definition is fine for an example but would typically be parameterized via a variable in a real module.
