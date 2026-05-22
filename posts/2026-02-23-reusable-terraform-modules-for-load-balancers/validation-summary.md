# Validation Summary: How to Create Reusable Terraform Modules for Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Application Load Balancer
- AWS Elastic Load Balancing listeners and listener rules
- AWS Elastic Load Balancing target groups
- AWS Certificate Manager
- Amazon S3 access logs
- Route 53 alias records

## Sources Consulted
- Terraform AWS Provider documentation for `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS Provider documentation for `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS Provider documentation for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform language documentation for optional object attributes and defaults: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- AWS Elastic Load Balancing documentation for Application Load Balancer security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Elastic Load Balancing documentation for enabling Application Load Balancer access logs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html

## Issues Found
- The HTTPS listener used `target_group_arn = length(aws_lb_target_group.this) > 0 ? aws_lb_target_group.this[0].arn : null`. A `forward` listener action needs a real target group ARN for the single-target-group form, so allowing `null` would make the module invalid when no target groups were provided. I made `target_groups` require at least one item and changed the listener to always forward to `aws_lb_target_group.this[0].arn`.
- The target group resource used `create_before_destroy = true` while also using fixed target group names. AWS target group names must be unique per account and region, so replacements with the same name can fail because the replacement cannot be created before the original is destroyed. I removed that lifecycle block.
- The access logging example did not mention the required S3 bucket policy for Elastic Load Balancing log delivery. I clarified the variable description and usage example so readers know the bucket must allow ELB to write logs.

## Review Notes
- Terraform is not installed in the local workspace, so I could not run `terraform validate`. The HCL was reviewed manually against the current official Terraform AWS Provider and Terraform language documentation.
- The module uses optional object attributes with defaults, so callers should use a Terraform version that supports stable optional object attributes.
- The selected SSL policy, `ELBSecurityPolicy-TLS13-1-2-2021-06`, is still a valid ALB policy and supports TLS 1.2 and TLS 1.3. AWS now also documents newer post-quantum TLS policies, but the existing policy is not technically incorrect.
