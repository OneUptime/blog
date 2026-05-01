# Validation Summary: How to Design a Load Balancer Module for OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Configuration Language (HCL)
- AWS Provider for Terraform/OpenTofu
- AWS Application Load Balancer (ALB)
- AWS target groups and listener rules
- AWS security groups

## Sources Consulted
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu type constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- HCL native syntax specification: https://raw.githubusercontent.com/hashicorp/hcl/main/hclsyntax/spec.md
- AWS provider `aws_lb`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS provider `aws_lb_listener`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener.html.markdown
- AWS provider `aws_lb_listener_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener_rule.html.markdown
- AWS provider `aws_lb_target_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown
- AWS ALB target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS ALB listener rules: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS ALB target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS ALB security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html

## Issues Found
- Several `variable` blocks used one-line HCL with both `type` and `default` separated by semicolons. The HCL native syntax allows only a single argument in a one-line block, so I rewrote the multi-argument variable declarations into valid multi-line blocks.
- The post claimed the module supported multiple target groups and routing rules, but the original listeners never forwarded traffic to any target group and no `aws_lb_listener_rule` resources were defined. AWS documents that target groups receive traffic only when referenced by a listener default action or listener rule, so I added `default_target_group_key`, default forward actions, and optional listener-rule resources.
- The original `target_groups` input accepted arbitrary `protocol` and `target_type` strings even though Application Load Balancer target groups support only `HTTP` and `HTTPS`, and this module's health-check layout is intended for `instance` or `ip` targets. I added input validation and normalized the values with `upper()` and `lower()` before passing them to the provider.

## Review Notes
- `ELBSecurityPolicy-TLS13-1-2-2021-06` is still a valid ALB HTTPS listener policy as of 2026-05-01, although AWS now also lists newer `*-PQ-2025-09` policies.
- The module still assumes `var.name` and `"${var.name}-${each.key}"` satisfy AWS naming limits for load balancers and target groups. A future revision could add explicit validation for those constraints.
- `tofu` and `terraform` CLIs were not installed in this workspace, so the review was completed against official documentation and a manual HCL logic pass rather than local CLI validation.
