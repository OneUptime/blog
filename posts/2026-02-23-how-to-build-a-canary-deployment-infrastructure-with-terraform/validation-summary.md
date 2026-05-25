# Validation Summary: How to Build a Canary Deployment Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Terraform
- AWS Application Load Balancer
- AWS CodeDeploy
- Amazon ECS on AWS Fargate
- Amazon CloudWatch alarms
- Amazon EventBridge
- AWS Lambda
- Amazon SNS

## Sources Consulted
- Terraform AWS provider `aws_lb_listener` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_codedeploy_deployment_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- Terraform AWS provider `aws_codedeploy_deployment_config` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_config
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_cloudwatch_event_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS CodeDeploy documentation for ECS deployments: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html
- AWS Elastic Load Balancing documentation for weighted target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- AWS ECS `LoadBalancer` API documentation for `awsvpc` target group type requirements: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LoadBalancer.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- The architecture list said the setup included Step Functions, but the post did not configure Step Functions. Changed that bullet to EventBridge scheduled canary analysis, which matches the Terraform snippet.
- The ALB target groups were used by a Fargate task definition with `awsvpc` networking but did not specify `target_type = "ip"`. Added `target_type = "ip"` to both target groups because Fargate/`awsvpc` tasks register by elastic network interface IP address, not instance ID.
- The CodeDeploy ECS deployment group omitted the explicit `deployment_style` block. Added `deployment_option = "WITH_TRAFFIC_CONTROL"` and `deployment_type = "BLUE_GREEN"` to match ECS blue/green traffic shifting examples.
- The ECS service used a Fargate task definition but did not set `launch_type = "FARGATE"` or a capacity provider strategy. Added `launch_type = "FARGATE"`.
- The EventBridge rule used deprecated Terraform argument `is_enabled`. Replaced it with `state = "DISABLED"`.
- The scheduled Lambda target was missing an `aws_lambda_permission` resource allowing EventBridge to invoke the function. Added the permission resource.

## Review Notes
The examples remain illustrative and still omit surrounding prerequisites such as IAM policies, security groups, ACM validation, CloudWatch log groups, Lambda package contents, and the CodeDeploy AppSpec deployment artifact. Those omissions are acceptable for a focused blog snippet, but a production-ready module would need them.
