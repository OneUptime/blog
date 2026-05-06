# Validation Summary: How to Implement Blue-Green Deployments with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Application Load Balancer
- AWS Elastic Container Service
- AWS Certificate Manager
- AWS Provider for Terraform / OpenTofu

## Sources Consulted
- OpenTofu docs: Provider requirements - https://opentofu.org/docs/language/providers/requirements/
- OpenTofu docs: `tofu apply` - https://opentofu.org/docs/cli/commands/apply/
- Amazon ECS Developer Guide: Use an Application Load Balancer for Amazon ECS - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Elastic Load Balancing docs: Action types for listener rules - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- Elastic Load Balancing docs: Target groups for your Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Elastic Load Balancing docs: Security policies for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Terraform Registry: `aws_lb_listener` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS CloudFormation reference: `AWS::ECS::Service NetworkConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-networkconfiguration.html
- AWS CloudFormation reference: `AWS::ElasticLoadBalancingV2::TargetGroup` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html

## Issues Found
- Both ECS services set `desired_count` based on traffic weight. That broke the deployment workflow because `blue_weight=100` would scale the green service to zero, so there would be no green environment to validate before shifting traffic. I changed both services to keep `desired_count = var.desired_count`, which matches an actual blue-green deployment and also preserves fast rollback.
- The ALB target groups were missing `target_type = "ip"`. Because the ECS services use `network_configuration`, they are using `awsvpc` networking, and AWS requires `ip` target groups for that case. I added `target_type = "ip"` to both target groups.
- The workflow comments described `blue_weight=0` and `blue_weight=100` as immediate full cutovers. With target group stickiness enabled, existing clients can continue following their stickiness cookie until it expires. I updated the comments to describe these steps as routing new traffic while existing sticky sessions drain naturally.
- The introduction described the traffic switch as atomic and the rollback as instant. That overstated the behavior of ALB listener updates with stickiness enabled, so I adjusted the wording to describe a load-balancer-based shift that can be rolled back quickly.

## Review Notes
- The AWS provider version constraint `~> 5.30` is older than the current provider line as of May 6, 2026, but the syntax used in the post remains valid.
- The post assumes supporting resources such as ECS task definitions, variables, and security groups exist elsewhere in the configuration. That is acceptable for a focused blog example.
