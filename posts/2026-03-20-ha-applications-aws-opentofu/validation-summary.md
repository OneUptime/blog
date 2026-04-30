# Validation Summary: How to Deploy Highly Available Applications with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- Amazon EC2 Auto Scaling
- Application Load Balancer (ALB)
- Terraform AWS Provider
- `terraform-aws-modules/vpc/aws`

## Sources Consulted
- OpenTofu Language Documentation: https://opentofu.org/docs/language/
- OpenTofu Providers Documentation: https://opentofu.org/docs/language/providers/
- Terraform AWS Provider `aws_autoscaling_group` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS Provider `aws_autoscaling_policy` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy
- Terraform AWS Provider `aws_lb` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- `terraform-aws-modules/vpc/aws` module docs: https://github.com/terraform-aws-modules/terraform-aws-vpc
- Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- Health checks for Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Edit target group attributes for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#modify-target-group-health-settings
- Target tracking scaling policies for Amazon EC2 Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html
- Scaling cooldowns for Amazon EC2 Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html
- How an instance refresh works in an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- Undo changes with a manual or auto rollback: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html
- Auto Scaling group Availability Zone distribution: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-availability-zone-balanced.html

## Issues Found
- The VPC example selected all available Availability Zones while only defining three public and three private subnets. I changed `azs` to `slice(data.aws_availability_zones.available.names, 0, 3)` so the module configuration matches the subnet lists.
- The target tracking policy used `customized_scaling_in_cooldown`, which is not a valid argument for `aws_autoscaling_policy`. I replaced it with the supported top-level `estimated_instance_warmup = 300`.
- The post described the Auto Scaling Group update behavior as a “circuit breaker,” but the code only configured an instance refresh. I updated the description and inline comment to refer to rolling instance refreshes.
- The ALB comment around cross-zone load balancing was imprecise. I corrected it to match AWS documentation that cross-zone load balancing is always enabled at the Application Load Balancer level.
- The summary overstated HA behavior by saying zone failures do not cause downtime and that ALB health checks ensure traffic only reaches fully initialized instances. I softened that wording to match AWS behavior more accurately.

## Review Notes
- The example still sets `desired_capacity = 6` while also attaching a target tracking policy. The AWS provider docs note that teams often omit or ignore `desired_capacity` when autoscaling policies manage live capacity, to avoid future applies resetting the group size.
- The VPC example now explicitly uses the first three available AZs and therefore assumes the chosen AWS region exposes at least three AZs to the account.
