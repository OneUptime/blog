# Validation Summary: How to Configure AWS NLB with IPv6 Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Network Load Balancer (NLB)
- Amazon VPC IPv6 and dual-stack networking
- Elastic Load Balancing target groups
- AWS CLI `elbv2`
- Terraform AWS provider

## Sources Consulted
- AWS Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html
- AWS target groups for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS register targets for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-register-targets.html
- AWS target group attributes for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS security groups for Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-security-groups.html
- AWS health checks for Network Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS CLI `create-load-balancer`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI `create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI `register-targets`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/register-targets.html
- Terraform AWS provider `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_lb_target_group_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment

## Issues Found
- The description referred to "dual-stack listeners", but dualstack is a load balancer IP address type rather than a listener setting. I corrected the description to refer to dual-stack load balancers.
- The instance target group example did not actually configure an IPv6 target group. I added `ip_address_type = "ipv6"` and clarified that registered instances must have a primary IPv6 address.
- The source IP preservation section stated source IP preservation too broadly. I updated it to match AWS behavior: preservation works for same-family traffic, while IPv4-to-IPv6 and IPv6-to-IPv4 translation replaces the client IP with an NLB address unless the application uses Proxy Protocol v2.
- The target security group guidance incorrectly implied that targets should allow traffic from NLB node IP ranges. I replaced that with the current AWS-recommended pattern of associating a security group with the NLB and referencing that security group from the targets.
- The IPv6 target registration examples used a documentation IPv6 address without explaining the AWS restriction. I added notes that real IPv6 target addresses must come from the VPC or a peered VPC IPv6 CIDR.

## Review Notes
- Network Load Balancer security groups must be associated when the load balancer is created; if none are attached at creation time, AWS does not let you add them later.
- IPv6 target groups must be used with a dualstack load balancer.
- Health check settings shown in the post are within the currently documented Network Load Balancer limits.
