# Validation Summary: How to Create Application Load Balancers with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- AWS Elastic Load Balancing target groups and listeners
- Terraform AWS provider
- AWS Certificate Manager
- Amazon Route 53
- Amazon CloudWatch metrics

## Sources Consulted
- Terraform AWS provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_lb_listener_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS provider `aws_acm_certificate` and `aws_acm_certificate_validation` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- Terraform AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Elastic Load Balancing documentation for creating Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-application-load-balancer.html
- AWS Elastic Load Balancing listener documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Terraform language documentation for `for_each` and dynamic blocks: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each and https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks

## Issues Found
- The description and introduction claimed the guide covered WAF integration, but the post did not include any WAF configuration. Removed the WAF integration claim so the scope matches the actual content.
- The basic setup section stated that an ALB needs a load balancer, target group, and listener. AWS supports listeners with redirect or fixed-response actions that do not forward to a target group, so the statement was narrowed to a typical ALB setup that forwards traffic to an application.
- The section titled "Using Dynamic Blocks for Rules" used `for_each`, not Terraform `dynamic` blocks. Renamed the section and explanatory sentence to describe `for_each`, while keeping the existing link as a related reference for repeated nested blocks.

## Review Notes
- Terraform CLI is not installed in this workspace, so `terraform fmt` and `terraform validate` could not be run. The snippets were reviewed against the current Terraform AWS provider documentation and AWS service documentation.
- The ALB access-log snippet assumes `var.access_logs_bucket` refers to an S3 bucket whose policy already allows Elastic Load Balancing log delivery.
- The weighted target group example uses a catch-all path rule. In a complete listener configuration, its priority would need to be chosen carefully so it does not unintentionally shadow more specific path-based rules.
