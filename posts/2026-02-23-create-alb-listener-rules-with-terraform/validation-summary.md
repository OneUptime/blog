# Validation Summary: How to Create ALB Listener Rules with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Application Load Balancer
- ALB listeners and listener rules
- ALB rule conditions and actions

## Sources Consulted
- Terraform AWS Provider `aws_lb_listener_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS Provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS Elastic Load Balancing documentation, Listener rules for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS Elastic Load Balancing documentation, Action types for listener rules: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- AWS Elastic Load Balancing documentation, Security policies for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html

## Issues Found
- The query string routing example used direct `key` and `value` arguments inside `query_string`. Current Terraform AWS Provider documentation defines query-string matches using nested `values` blocks under `query_string`, so the example was updated to use `values { key = "version", value = "beta" }`.
- The redirect example was captioned as redirecting old API paths "to new ones", but ALB redirect interpolation with `#{path}` preserves the whole original path without the leading slash. The caption was changed to "under a new prefix" to match the actual behavior of `path = "/api/v2/#{path}"`.

## Review Notes
Terraform CLI was not installed in the local environment, so syntax was reviewed against the official Terraform AWS Provider documentation rather than validated with `terraform validate`.
