# Validation Summary: How to Deploy a Fargate Service with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS ECS
- AWS Fargate
- AWS Application Load Balancer
- AWS CloudWatch Logs
- AWS Application Auto Scaling
- AWS Systems Manager Parameter Store
- Amazon ECR

## Sources Consulted
- OpenTofu `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider documentation for `aws_ecs_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_cluster.html.markdown
- AWS provider documentation for `aws_ecs_task_definition`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- AWS provider documentation for `aws_ecs_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- AWS provider documentation for `aws_appautoscaling_target`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_target.html.markdown
- AWS provider documentation for `aws_appautoscaling_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/appautoscaling_policy.html.markdown
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS task networking options for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- ECS `LogConfiguration` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-taskdefinition-logconfiguration.html
- Create a target tracking scaling policy for Amazon ECS service auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/target-tracking-create-policy.html
- Application Auto Scaling predefined metric specification: https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html

## Issues Found
- The `aws_ecs_service` example used `maximum_percent` and `minimum_healthy_percent` inside a `deployment_configuration` block. In the current AWS provider, those settings are exposed as the top-level arguments `deployment_maximum_percent` and `deployment_minimum_healthy_percent`, so I moved them.
- The Fargate task definition did not declare a `runtime_platform`. Current ECS/Fargate guidance requires specifying the operating system for Fargate tasks, so I added `runtime_platform { operating_system_family = "LINUX" }`.
- The task definition hard-coded the CloudWatch log group name even though an `aws_cloudwatch_log_group` resource was declared separately. That prevented Terraform from establishing a dependency, so I changed `awslogs-group` to `aws_cloudwatch_log_group.app.name`.
- The prerequisites and load balancer guidance omitted that `awsvpc`/Fargate services must use target groups with `ip` targets, and the conclusion incorrectly implied that private subnets are always required. I clarified both points.

## Review Notes
- The container health check uses `curl`, so the example assumes the application image includes `curl`.
- If the service runs in private subnets, image pulls and secret retrieval still need outbound access, typically through a NAT gateway or VPC endpoints for ECR, SSM, and Secrets Manager.
