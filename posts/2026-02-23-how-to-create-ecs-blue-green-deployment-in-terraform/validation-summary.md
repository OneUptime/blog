# Validation Summary: How to Create ECS Blue-Green Deployment in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+) with the HashiCorp AWS provider
- AWS ECS (Fargate launch type)
- AWS Application Load Balancer (ALB) with multiple target groups and listeners
- AWS CodeDeploy (compute platform ECS) for blue-green traffic shifting
- AWS IAM (managed policies, trust policies)
- AWS CloudWatch Logs (awslogs log driver)
- AWS ECR (referenced via variable)

## Sources Consulted
- Terraform AWS provider — `aws_codedeploy_deployment_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- Terraform AWS provider — `aws_codedeploy_deployment_config`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_config
- Terraform AWS provider — `aws_codedeploy_app`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_app
- Terraform AWS provider — `aws_ecs_service`, `aws_ecs_task_definition`, `aws_ecs_cluster`
- Terraform AWS provider — `aws_lb`, `aws_lb_target_group`, `aws_lb_listener`
- AWS Managed Policy reference — `AWSCodeDeployRoleForECS`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRoleForECS.html
- AWS Managed Policy reference — `AmazonECSTaskExecutionRolePolicy`
- AWS CodeDeploy built-in deployment configurations documentation (ECS predefined configs such as `CodeDeployDefault.ECSCanary10Percent5Minutes`)
- AWS Fargate task CPU/memory size combinations documentation

## Issues Found
No technical issues found.

Verified items:
- `traffic_routing_config` with `type`, `time_based_canary`, and `time_based_linear` sub-blocks (with `interval` and `percentage` arguments) is correctly structured.
- `blue_green_deployment_config` correctly uses `deployment_ready_option` (with `action_on_timeout` and `wait_time_in_minutes`) and `terminate_blue_instances_on_deployment_success` (with `action` and `termination_wait_time_in_minutes`).
- `load_balancer_info.target_group_pair_info` with `prod_traffic_route`, `test_traffic_route`, and two `target_group` blocks matches the provider schema for ECS blue/green.
- `deployment_style` with `deployment_option = "WITH_TRAFFIC_CONTROL"` and `deployment_type = "BLUE_GREEN"` is correct.
- `aws_codedeploy_app` with `compute_platform = "ECS"` is correct.
- `aws_ecs_service` `deployment_controller { type = "CODE_DEPLOY" }` is correct, and the recommended `lifecycle.ignore_changes` on `task_definition`, `load_balancer`, and `desired_count` matches AWS guidance for CodeDeploy-managed ECS services.
- IAM trust policies for `ecs-tasks.amazonaws.com` and `codedeploy.amazonaws.com` and the managed policy ARNs (`AWSCodeDeployRoleForECS`, `service-role/AmazonECSTaskExecutionRolePolicy`) are correct.
- The Fargate task size combo (CPU 512 / memory 1024 MiB) is a valid Fargate CPU/memory pair.
- `CodeDeployDefault.ECSCanary10Percent5Minutes` is a valid AWS-provided ECS deployment configuration.
- `aws_lb_listener` `lifecycle.ignore_changes = [default_action]` on both production and test listeners correctly accommodates CodeDeploy's runtime mutation of listener target groups during deployments.
- ALB target group `target_type = "ip"` is correct for Fargate tasks using `awsvpc` networking.

## Review Notes
- The post is accurate as written for current Terraform AWS provider and AWS APIs.
- Potential future enhancement (not an error): ECS now supports a newer Container Insights value `"enhanced"`; `"enabled"` is still valid and accepted.
- Potential future enhancement: For production setups, scoping the `ingress` `cidr_blocks` of the test listener (port 8080) to a corporate/VPN range, or fronting it via an internal mechanism, is generally safer than `0.0.0.0/0`. This is a hardening suggestion, not a correctness issue.
- Potential future enhancement: AWS recommends pairing blue/green deployments with CloudWatch alarms in `alarm_configuration` for automatic rollback based on metric breaches; the post mentions CloudWatch alarms in best practices but does not show the `alarm_configuration` block. This is omission for brevity, not an error.
- The `aws_lb_listener.test` resource initially points to the green target group; CodeDeploy will swap target group assignments between the production and test listeners during deployments, which is why `ignore_changes = [default_action]` is required on both.
