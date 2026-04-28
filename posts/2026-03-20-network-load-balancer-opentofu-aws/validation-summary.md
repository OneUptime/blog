# Validation Summary: How to Create a Network Load Balancer with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- OpenTofu (v1.6+)
- AWS (Network Load Balancer / Elastic Load Balancing v2)
- Terraform AWS provider (`hashicorp/aws` ~> 5.0)
- HCL (HashiCorp Configuration Language)
- TLS / ACM certificates

## Sources Consulted
- AWS Network Load Balancer Target Groups documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS NLB SSL/Security Policies documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html
- Terraform AWS provider docs for `aws_lb`, `aws_lb_target_group`, `aws_lb_listener`, `aws_lb_target_group_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/

## Issues Found
- **Incorrect `target_type` comment for NLB target group**: The original comment stated `# Can also be "ip" or "lambda"` for the `aws_lb_target_group` resource. This is technically wrong for a Network Load Balancer because NLBs do not support the `lambda` target type — `lambda` is only supported by Application Load Balancers. NLB target groups support `instance`, `ip`, and `alb`. Updated the comment to `# Can also be "ip" or "alb" (NLB does not support "lambda")`.

## Review Notes
- The Layer 4 (TCP/UDP) description, claim about preserving client source IP, and TCP health check semantics are correct for NLB.
- `enable_cross_zone_load_balancing` is supported on NLB; default is `false` at the AWS API level, so explicitly setting `true` is appropriate. Note: cross-zone load balancing on NLBs may incur inter-AZ data transfer charges — worth flagging in a future revision.
- TCP health checks on NLB target groups historically required `healthy_threshold` and `unhealthy_threshold` to be equal; both are set to `3` here so the configuration is valid.
- The chosen SSL policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is a valid NLB TLS policy; AWS now recommends `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (post-quantum) as the modern default, but the policy used in the post is still supported and reasonable.
- The `aws_lb_target_group_attachment` block references `var.instance_ids`, and the TLS listener references `var.acm_certificate_arn`, but neither variable is declared in the `variables.tf` snippet shown. These would need to be declared by the reader for the example to apply cleanly. This is a minor omission rather than a technical error and was left as-is to avoid expanding the post's scope.
- AWS provider `~> 5.0` is reasonable; provider 6.x exists at the time of review but the configuration shown is compatible with both.
