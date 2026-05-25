# Validation Summary: How to Build Zero-Downtime Deployment Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 Launch Templates
- Amazon EC2 Auto Scaling Groups and Instance Refresh
- Elastic Load Balancing Application Load Balancers and Target Groups
- Amazon RDS for PostgreSQL
- AWS Lambda
- Amazon Route 53 health checks and failover records
- Amazon CloudWatch alarms
- Amazon SNS

## Sources Consulted
- HashiCorp AWS Provider documentation: aws_launch_template - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- HashiCorp AWS Provider documentation: aws_autoscaling_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS EC2 Auto Scaling documentation: Undo changes with a manual or auto rollback - https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html
- AWS EC2 Auto Scaling documentation: Understand the default values for an instance refresh - https://docs.aws.amazon.com/autoscaling/ec2/userguide/understand-instance-refresh-default-values.html
- HashiCorp AWS Provider documentation: aws_lb and aws_lb_target_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Elastic Load Balancing documentation: HTTPS listener security policies - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html
- HashiCorp AWS Provider documentation: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Lambda documentation: Supported runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- HashiCorp AWS Provider documentation: aws_route53_health_check and aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Route 53 documentation: Values specific for failover alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- HashiCorp AWS Provider documentation: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The Auto Scaling Group used `version = "$Latest"` in its `launch_template` block while also relying on Terraform-managed instance refresh and `auto_rollback`. HashiCorp's AWS provider documentation states that an instance refresh will not start from launch template changes when the ASG uses `version = "$Latest"`; it recommends using the launch template resource's `latest_version` attribute. AWS EC2 Auto Scaling documentation also states that rollback is not available when the ASG is configured with `$Latest` or `$Default` launch template versions. I changed the snippet to `version = aws_launch_template.app.latest_version` so Terraform can trigger refreshes from launch template changes and AWS can roll back to a specific previous launch template version.
- The comment for `auto_rollback` said it rolls back "if too many instances fail." AWS describes auto rollback as occurring when the instance refresh fails, including failures caused by launch errors, health checks, or configured alarms. I adjusted the comment to match the documented behavior.

## Review Notes
- The infrastructure snippets reference supporting resources and variables, such as security groups, IAM roles, certificates, hosted zones, and CloudFront distribution configuration, that are intentionally outside the excerpt. The reviewed attributes and resource arguments are valid in current Terraform AWS provider documentation, but the snippets are not a complete standalone Terraform module.
- The RDS example uses PostgreSQL 15.4. That engine version is older than current PostgreSQL minor releases, but the post does not claim it is the latest version. For production use, readers should check currently supported RDS PostgreSQL versions in their target AWS region.
