# Validation Summary: How to Set Up Multi-Region Load Balancing with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform fork)
- AWS Application Load Balancer (ALB)
- AWS Route 53 (latency-based routing, health checks)
- AWS ACM (referenced)
- AWS Auto Scaling (referenced)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- Terraform AWS provider — `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider — `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider — `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- AWS ELB SSL policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Terraform module providers meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/module-providers
- AWS ACM regional behavior: https://docs.aws.amazon.com/acm/latest/userguide/acm-regions.html

## Issues Found
No technical issues found.

All HCL resources, attribute names, and block structures match the current AWS Terraform provider schema. The `latency_routing_policy` block, `alias` block with `evaluate_target_health`, and `aws_route53_health_check` parameters (`failure_threshold = 3`, `request_interval = 30`) are valid. The SSL policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is a valid AWS ELB security policy. The provider alias syntax (`providers = { aws = aws.us_east }`) is the correct way to pass aliased providers to a module. OpenTofu CLI commands (`tofu init`, `tofu workspace new`, `tofu plan/apply -var-file=...`) are correct.

## Review Notes
- The example module references `aws_security_group.alb` and `aws_subnet.public` without showing their definitions — this is acknowledged as a partial snippet of `modules/region/main.tf`, so it's not an error, but readers should know they need to define these themselves.
- The `aws_route53_health_check` resource is defined in the post but not attached to the `aws_route53_record` resources via a `health_check_id` argument. The post mentions this in prose ("Apply the health check to the latency record"), but a concrete example showing `health_check_id = aws_route53_health_check.us_east.id` on each record would make the failover wiring more explicit. This is a completeness observation, not a technical error.
- The `aws_route53_zone` is created at the root, which is correct (Route 53 zones are global, not regional, so no provider alias is needed).
- ACM certificate ARNs must come from the same region as the ALB consuming them — the post correctly notes this in best practices.
- The post does not mention that for ALB health check targets, you typically want the target group health check (`aws_lb_target_group.health_check`) configured separately from the Route 53 health check. Both are useful for different layers of failover.
