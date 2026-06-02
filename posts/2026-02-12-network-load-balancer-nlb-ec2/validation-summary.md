# Validation Summary: How to Set Up a Network Load Balancer (NLB) for EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Load Balancer
- Amazon EC2
- AWS Elastic Load Balancing v2
- AWS CLI
- Amazon EC2 Auto Scaling
- Terraform AWS provider
- CloudWatch metrics

## Sources Consulted
- AWS Elastic Load Balancing: Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html
- AWS Elastic Load Balancing: Target groups for Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Elastic Load Balancing: Health checks for Network Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS Elastic Load Balancing: Edit target group attributes for Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Elastic Load Balancing: Security groups for Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-security-groups.html
- AWS Elastic Load Balancing: Register targets for Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-register-targets.html
- AWS CLI Command Reference: elbv2 create-load-balancer - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI Command Reference: elbv2 create-target-group - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: elbv2 create-listener - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: ec2 allocate-address - https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Terraform Registry: aws_lb - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform Registry: aws_lb_target_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform Registry: aws_lb_listener - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The post claimed NLB latency is measured in single-digit microseconds. AWS documents NLBs as high-throughput and low-latency, but does not support that exact latency guarantee. I changed the wording to "very low latency."
- The client IP preservation section said TCP targets preserve client IPs by default. AWS's default depends on target type and protocol: instance target groups have client IP preservation enabled by default, while TCP/TLS IP target groups have it disabled by default. I made the distinction explicit.
- The TLS listener example used an ACM ARN in `us-east-1`, which can be misleading because the certificate must be usable in the load balancer's Region. I changed the example to a different concrete Region (`us-west-2`) rather than implying that `us-east-1` is universally correct.
- The security group section described only the older behavior where targets must allow client IP ranges when client IP preservation is enabled. AWS now supports security groups on NLBs, and AWS recommends referencing the NLB security group from target security groups when one is associated. I updated the guidance and kept the no-NLB-security-group case.

## Review Notes
- The AWS CLI commands and Terraform resource arguments are current and match official AWS CLI and Terraform AWS provider documentation.
- The post's internal OneUptime links were checked and returned HTTP 200.
