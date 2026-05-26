# Validation Summary: How to Configure ALB Health Checks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Application Load Balancer
- AWS ELBv2 target groups and health checks
- AWS CLI
- Flask health endpoint example
- gRPC health checks

## Sources Consulted
- HashiCorp AWS Provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS Provider source documentation for `aws_lb_target_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown
- AWS Elastic Load Balancing documentation, health checks for Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Elastic Load Balancing documentation, target groups for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Elastic Load Balancing documentation, target group attributes including deregistration delay and slow start: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CLI `elbv2 describe-target-health` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- AWS CLI `ec2 describe-security-groups` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html

## Issues Found
- The gRPC Terraform target group example used `protocol_version = "gRPC"`. The current AWS provider documents the valid Terraform value as `GRPC`, so the snippet was updated to `protocol_version = "GRPC"`.
- The gRPC health check example used `matcher = "0-99"`, which is a valid range but would treat every gRPC status code as healthy. For the standard gRPC health check service, the example now uses `matcher = "0"` for OK.
- The timing section presented threshold multiplied by interval as exact. AWS documents the health check interval as approximate, and timeout behavior can affect observed detection time, so the wording was changed to describe the calculation as an estimate.
- The deregistration delay section said it applies when a target fails health checks. AWS documents deregistration delay for deregistering/draining targets, so the section was corrected to refer to deregistration rather than health-check failure.
- The troubleshooting section suggested `slow_start` for applications that have not started yet. Slow start ramps traffic after a target is healthy; it does not make failed health checks pass. The recommendation was corrected to mention Auto Scaling or ECS health check grace periods.

## Review Notes
Terraform and AWS CLI binaries were not installed in the local environment, so CLI and Terraform syntax checks were verified against official documentation rather than local execution.
