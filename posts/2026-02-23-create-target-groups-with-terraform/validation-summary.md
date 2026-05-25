# Validation Summary: How to Create Target Groups with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Elastic Load Balancing v2
- Application Load Balancer target groups
- Network Load Balancer target groups
- AWS Lambda targets
- Amazon ECS services with awsvpc networking
- Amazon EC2 Auto Scaling target group registration

## Sources Consulted
- HashiCorp AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS provider `aws_lb_target_group_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- AWS Application Load Balancer target groups documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Network Load Balancer target groups documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Network Load Balancer health checks documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS Lambda functions as ALB targets documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html
- Amazon ECS load balancer documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LoadBalancer.html
- Amazon EC2 Auto Scaling load balancer attachment documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/attach-load-balancer-asg.html

## Issues Found
- The post said the guide covered all target group types and that AWS supports three target types. Updated this to clarify that the listed three target types apply to Application Load Balancers, while Terraform and AWS also support the `alb` target type for Network Load Balancer target groups.
- The IP target description referred broadly to "external IP addresses." Updated it to "private on-premises IP addresses" because AWS target groups do not support publicly routable IP addresses as IP targets.
- The `availability_zone = "all"` comment said it is required for cross-AZ IP targets. Updated it to state that Terraform requires this value when the IP address is outside the target group's VPC.
- The NLB protocol description listed only TCP, UDP, and TLS. Updated it to include QUIC and combined protocols such as TCP_UDP and TCP_QUIC, matching the current AWS provider and AWS ELB documentation.

## Review Notes
The Terraform snippets are illustrative and reference resources such as VPCs, instances, listeners, and security groups that are not defined in the post. That is acceptable for a focused guide, but complete runnable examples would need those surrounding resources and provider configuration.
