# Validation Summary: How to Enable Sticky Sessions on an Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- AWS Elastic Load Balancing target groups
- AWS CLI
- Amazon EC2
- Auto Scaling
- Amazon CloudWatch
- Terraform AWS provider
- Bash and curl

## Sources Consulted
- AWS Elastic Load Balancing documentation: Edit target group attributes for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CLI Command Reference: elbv2 modify-target-group-attributes: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS Elastic Load Balancing documentation: CloudWatch metrics for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Terraform AWS provider documentation/source for aws_lb_target_group stickiness configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group and https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/elbv2/target_group.go

## Issues Found
- Clarified duration-based cookie behavior. The post said the configured duration controls how long the cookie is valid. AWS documents that ALB-generated cookies have their own expiry and that the configured duration controls how long stickiness remains valid, with expiry reset after requests. Updated the wording to distinguish cookie expiry from stickiness duration.
- Corrected application-based cookie details. The post referred to a single `AWSALBAPP` cookie and implied stickiness breaks when the application changes its cookie value. AWS documents that ALB-generated application cookies use an `AWSALBAPP-` prefix, clients must return both the custom application cookie and ALB-generated cookie, and ALB validates the configured custom cookie name rather than its value or expiry. Updated the wording accordingly.
- Fixed the CloudWatch metric example. `RequestCountPerTarget` uses `Sum` as its only valid statistic, even though the value represents an average per target. Updated the command from `--statistics Average` to `--statistics Sum`.
- Clarified monitoring guidance. `RequestCountPerTarget` is a target-group average, not a per-target distribution view. Updated the note to recommend ALB access logs or application-level per-instance metrics when checking distribution across specific targets.

## Review Notes
The AWS CLI commands and target group attribute names are current. The Terraform `aws_lb_target_group` examples match the provider schema for ALB `lb_cookie` and `app_cookie` stickiness, including `cookie_name` and `cookie_duration`.
