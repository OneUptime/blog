# Validation Summary: How to Configure NLB Target Group Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Load Balancer
- Elastic Load Balancing target groups
- AWS CLI
- Terraform AWS provider
- Amazon CloudWatch metrics and alarms
- Amazon Route 53 DNS failover

## Sources Consulted
- AWS Elastic Load Balancing documentation: Target groups for Network Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS Elastic Load Balancing documentation: Health checks for Network Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS Elastic Load Balancing documentation: Update the target group health settings for your Network Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/modify-target-group-health-settings.html
- AWS CLI Command Reference: elbv2 create-listener - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS Elastic Load Balancing documentation: CloudWatch metrics for your Network Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-cloudwatch-metrics.html
- HashiCorp Terraform AWS provider documentation: aws_lb_target_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The post incorrectly described NLB target group failover as automatic primary-to-secondary target group switching on one listener. AWS documents NLB target group health failover as DNS failover and routing failover based on healthy target thresholds, so the explanation and diagram were corrected.
- The listener examples used two weighted target groups with a secondary target group weight of 0 and implied that NLB would automatically fail over to that target group. This is not how NLB target group health settings work, so the AWS CLI and Terraform examples were changed to a single listener forwarding to one target group.
- The `TargetFailover` explanation was inaccurate for NLB. The `target_failover.*` attributes are Gateway Load Balancer target group attributes, while NLB uses `target_group_health.dns_failover.*` and `target_group_health.unhealthy_state_routing.*`. The text was corrected to describe the NLB attributes actually used in the commands.
- The secondary target group monitoring and testing examples assumed failover traffic would move to a secondary target group. These were replaced with alarms and tests for the actual NLB target group health behavior.
- The active-passive and cross-region sections implied NLB listener configuration could provide DR failover between target groups. These sections were corrected to state that active-passive DR should use Route 53 failover records pointing to separate load balancers or backup resources.

## Review Notes
The local environment did not have the `aws` or `terraform` CLIs installed, so command and Terraform syntax were reviewed against official documentation rather than executed locally.
