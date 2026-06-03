# Validation Summary: How to Set Up Cross-Zone Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Load Balancing
- Application Load Balancer (ALB)
- Network Load Balancer (NLB)
- Gateway Load Balancer (GWLB)
- Classic Load Balancer (CLB)
- Amazon EC2 Auto Scaling
- AWS CLI
- Amazon CloudWatch
- Terraform AWS provider

## Sources Consulted
- AWS Elastic Load Balancing User Guide: How Elastic Load Balancing works - https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS Application Load Balancer documentation: Cross-zone load balancing - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#cross-zone-load-balancing
- AWS Network Load Balancer documentation: Cross-zone load balancing - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html#cross-zone-load-balancing
- AWS Network Load Balancer target group attributes - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html#cross-zone-load-balancing
- AWS Gateway Load Balancer attributes - https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/gateway-load-balancers.html
- AWS CLI v2 Command Reference: elbv2 modify-load-balancer-attributes - https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-load-balancer-attributes.html
- AWS CLI v2 Command Reference: elbv2 modify-target-group-attributes - https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS CLI v2 Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon EC2 Auto Scaling Availability Zone distribution - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-availability-zone-balanced.html
- Terraform AWS provider aws_lb resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider aws_lb_target_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Global Network FAQs: data transfer charges - https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/
- AWS Elastic Load Balancing pricing - https://aws.amazon.com/elasticloadbalancing/pricing/

## Issues Found
- The opening statement said load balancer nodes only route to targets in their own Availability Zone by default. That is not true for ALBs, where cross-zone is enabled at the load balancer level by default. Changed the statement to describe behavior when cross-zone load balancing is disabled.
- The load balancer behavior table said ALB cross-zone cannot be disabled. AWS documents that it cannot be changed at the load balancer level, but can be disabled at the target group level. Updated the wording.
- The table said Classic Load Balancer cross-zone is disabled by default. AWS documents that the default depends on creation method: enabled by default in the console, disabled by default through API/CLI. Updated the table.
- The table said Gateway Load Balancer has no extra cross-zone charge. AWS documentation and FAQs indicate cross-AZ data transfer charges apply when GWLB cross-zone load balancing is enabled. Updated the table.
- The Terraform target group example used `connection_termination = false` while describing target-group-level cross-zone load balancing. Replaced it with the correct Terraform AWS provider attribute, `load_balancing_cross_zone_enabled = "true"`.
- The cost section treated inter-AZ transfer as a single-direction charge. AWS pricing references describe inter-AZ transfer as charged in each direction. Updated the explanation and example estimate from `$15/month` to `$30/month`.
- The monitoring section described a CloudWatch query as checking per-target request counts, but the command queried `HealthyHostCount` by Availability Zone. Updated the text and comment to match the metric.

## Review Notes
The AWS CLI examples use valid `elbv2`, `elb`, `autoscaling`, and `cloudwatch` command shapes based on the current AWS CLI documentation. The pricing example remains an estimate; AWS data transfer prices vary by region and should be checked against the current AWS pricing page before production cost planning.
