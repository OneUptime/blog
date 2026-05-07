# Validation Summary: How to Configure Cross-Zone Load Balancing for IPv4 in AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Elastic Load Balancing
- Application Load Balancer (ALB)
- Network Load Balancer (NLB)
- AWS CLI
- Terraform
- Amazon CloudWatch

## Sources Consulted
- AWS Elastic Load Balancing User Guide: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS Application Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Network Load Balancer attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-load-balancer-attributes.html
- AWS Network Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Network Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-cloudwatch-metrics.html
- AWS CLI `describe-load-balancer-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-load-balancer-attributes.html
- AWS CLI `modify-target-group-attributes`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- Terraform `aws_lb` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb

## Issues Found
- The introduction described same-zone routing as the default for AWS load balancers in general. I changed this to describe behavior when cross-zone load balancing is off, because ALBs have cross-zone enabled at the load balancer level by default.
- The ALB section said cross-zone load balancing on ALBs cannot be disabled. I corrected this to distinguish between the load balancer level, where it cannot be changed, and the target group level, where ALB target groups can override the default.
- The NLB target group section omitted that target groups default to `use_load_balancer_configuration`. I updated the explanation so the override behavior matches AWS documentation.
- The CloudWatch validation example used `HealthyHostCount` with only `LoadBalancer` and `AvailabilityZone` dimensions, which is not the right metric for traffic distribution and does not match the documented dimensions for that metric. I replaced it with `NewFlowCount` and the correct `Sum` statistic for per-AZ traffic flow checks.
- The cost section used a hard-coded approximate inter-AZ transfer price. I replaced it with a region-aware note that points readers to current EC2 data transfer pricing instead of a fixed number.
- The conclusion said ALBs always use cross-zone load balancing. I corrected this to note that ALBs always enable it at the load balancer level, but target groups can override that behavior.

## Review Notes
- The post title references IPv4, but the cross-zone load balancing behavior described here is generally not specific to IPv4-only load balancers.
- The Terraform example remains valid with the current `hashicorp/aws` provider documentation for `aws_lb`.
