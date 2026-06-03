# Validation Summary: How to Configure ALB Slow Start Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- AWS Elastic Load Balancing target groups
- AWS CLI
- Terraform AWS provider
- AWS CloudFormation
- Amazon EC2 Auto Scaling
- Amazon CloudWatch metrics
- Python

## Sources Consulted
- AWS Elastic Load Balancing documentation: Edit target group attributes for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CLI Command Reference: elbv2 modify-target-group-attributes: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- Terraform AWS provider documentation: aws_lb_target_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS CloudFormation Template Reference: AWS::ElasticLoadBalancingV2::TargetGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-targetgroup.html
- AWS CLI Command Reference: autoscaling put-scaling-policy: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- AWS Elastic Load Balancing documentation: CloudWatch metrics for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- OneUptime blog link referenced in the post: https://oneuptime.com/blog/post/2026-02-12-use-weighted-target-groups-with-alb/view

## Issues Found
- The Auto Scaling example described target tracking cooldowns and included `ScaleInCooldown` / `ScaleOutCooldown` inside the target tracking configuration. EC2 Auto Scaling target tracking policies use `--estimated-instance-warmup` for this case, so the text and command were updated.
- The `RequestCountPerTarget` CloudWatch example used `Average`. AWS documents `Sum` as the appropriate statistic for this Application Load Balancer metric, so the command was changed to `--statistics Sum`.
- The `TargetResponseTime` CloudWatch example used `--statistics 'p99'`. CloudWatch percentiles must be requested with `--extended-statistics`, so the command was changed to `--extended-statistics p99`.
- The `TargetResponseTime` example only supplied the `TargetGroup` dimension. The command was updated to include a `LoadBalancer` dimension for the target-group/load-balancer metric view.
- The limitations section said slow start does not apply when targets recover from failed health checks. AWS documents that a target that becomes unhealthy while in slow start exits slow start and re-enters slow start when healthy again, so the limitation was corrected.
- The limitations section said ALB uses round-robin during the slow start period when least outstanding requests is enabled. AWS documents that slow start cannot be enabled with least outstanding requests or weighted random, so the limitation was corrected.
- The limitations section omitted the AWS documented caveat that newly registered targets enter slow start only when the target group already has at least one healthy target that is not in slow start. This caveat was added.
- The Python warm-up helper's p95 index calculation selected the next element above the nearest-rank position. The index calculation was adjusted to avoid the off-by-one result.

## Review Notes
The main slow start attribute, valid duration range, AWS CLI `modify-target-group-attributes` syntax, Terraform `slow_start` argument, and CloudFormation `TargetGroupAttributes` usage were verified as current and correct.
