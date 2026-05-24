# Validation Summary: How to Fix Error Creating ECS Service InvalidParameterException

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (AWS provider)
- AWS ECS (Elastic Container Service)
- AWS Fargate
- AWS IAM (service-linked roles, execution roles)
- AWS ELB (Application Load Balancer, target groups, listeners)
- AWS CLI
- AWS VPC networking (awsvpc mode, security groups, subnets)

## Sources Consulted
- AWS ECS Service-Linked Role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-service-linked-roles.html
- Terraform AWS Provider `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS Provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS Provider `aws_iam_service_linked_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_service_linked_role
- Terraform AWS Provider `aws_lb_target_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Fargate Task CPU and Memory documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
- AWS ECS Task Execution IAM Role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- AWS Elastic Load Balancing Target Type documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html#target-type

## Issues Found
No technical issues found.

All technical claims were verified against official documentation:
- `AWSServiceRoleForECS` is the correct service-linked role name.
- `ecs.amazonaws.com` is the correct service principal for the ECS service-linked role.
- `ecs-tasks.amazonaws.com` is the correct service principal for ECS task execution roles.
- `AmazonECSTaskExecutionRolePolicy` ARN is correct (`arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`).
- Fargate requirements (`awsvpc` network mode, `target_type = "ip"`, `network_configuration` block, `requires_compatibilities = ["FARGATE"]`) are all accurate.
- CPU/Memory combinations listed match AWS Fargate documentation:
  - 256 (.25 vCPU): 512, 1024, 2048 MB
  - 512 (.5 vCPU): 1024-4096 MB in 1024 increments
  - 1024 (1 vCPU): 2048-8192 MB in 1024 increments
  - 2048 (2 vCPU): 4096-16384 MB in 1024 increments
  - 4096 (4 vCPU): 8192-30720 MB in 1024 increments
- Terraform HCL syntax is valid (attribute names, resource types, block structure).
- AWS CLI commands (`aws iam get-role`, `aws iam create-service-linked-role`) use correct syntax and flags.
- The `depends_on = [aws_lb_listener.http]` pattern correctly addresses the documented requirement that the listener exists before the ECS service is created.

## Review Notes
- Fargate now supports additional CPU/memory tiers (8192 and 16384 CPU, added in 2022) that are not listed in the table. The existing table is accurate for what it covers but could be expanded for completeness. Not a correctness issue.
- The `hostPort` field in awsvpc networking mode must equal `containerPort` (or be omitted), which the examples respect.
- The post correctly notes the common gotcha that target groups must be attached to a listener before being referenced by an ECS service.
