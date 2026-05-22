# Validation Summary: How to Use Dynamic Blocks for Load Balancer Listeners

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform `for_each`
- AWS Provider for Terraform
- AWS Application Load Balancer listeners
- AWS Application Load Balancer listener rules
- AWS load balancer listener certificates
- AWS target groups and health checks

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp AWS Provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- HashiCorp AWS Provider `aws_lb_listener_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- HashiCorp AWS Provider `aws_lb_listener_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_certificate
- HashiCorp AWS Provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- HashiCorp AWS Provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Elastic Load Balancing documentation for Application Load Balancer listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS Elastic Load Balancing documentation for Application Load Balancer listener rules: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS Elastic Load Balancing documentation for Network Load Balancer listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html

## Issues Found
- The introduction described the examples as applying to both ALBs and NLBs. The rule examples use ALB-specific listener rule conditions such as host headers, path patterns, and HTTP headers, so the wording was narrowed to ALBs.
- The introduction implied dynamic blocks create listener resources directly. Terraform dynamic blocks generate nested blocks, while the listener resources in the post are created with `for_each`, so the wording was corrected to mention both `for_each` and dynamic blocks.
- The additional certificates section said to use a dynamic block, but the example correctly uses the separate `aws_lb_listener_certificate` resource with `for_each`. The wording was corrected to match the resource model documented by the AWS provider.

## Review Notes
- The Terraform snippets use current AWS provider resource names and valid nested block names for listener actions, listener rule conditions, weighted target groups, access logs, and target group health checks.
- The listener rule variable type permits a rule object with no conditions, which would be invalid if such an object were supplied. The post frames these as routing rules based on conditions, and the generated resource is skipped by the default empty list, so no code change was made.
- The external OneUptime link in the summary returned HTTP 200 during review.
