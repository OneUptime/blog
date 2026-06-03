# Validation Summary: How to Set Up an Application Load Balancer (ALB) for EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- Amazon EC2
- AWS CLI
- Elastic Load Balancing target groups, listeners, health checks, and access logs
- Amazon EC2 Auto Scaling
- Terraform AWS provider
- AWS Certificate Manager
- Amazon CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: elbv2 create-load-balancer - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI Command Reference: elbv2 create-listener - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: autoscaling create-auto-scaling-group - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS Elastic Load Balancing: Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Elastic Load Balancing: Security policies for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing: Enable access logs for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- Terraform Registry: aws_lb - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform Registry: aws_lb_target_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform Registry: aws_lb_listener - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform Registry: aws_lb_target_group_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment

## Issues Found
- The ALB creation text said the command created an ALB across two public subnets, but the command listed three subnet IDs. Updated the wording to match the command.
- The EC2 security-group example used `--description` as a top-level option with `aws ec2 authorize-security-group-ingress`. The AWS CLI supports descriptions inside `--ip-permissions`, but not as a top-level option in that simplified form. Removed the unsupported flag.
- The access-log guidance pointed readers to the regional ELB account ID. AWS now recommends granting access to the `logdelivery.elasticloadbalancing.amazonaws.com` service principal, while the regional account-ID policy is legacy. Updated the wording to point readers to the current log delivery service principal and bucket policy.

## Review Notes
The remaining AWS CLI and Terraform examples use current resource names and options. Placeholder VPC, subnet, security group, certificate, and instance IDs still need to be replaced with real account-specific values before use.
