# Validation Summary: How to Create Network Load Balancer with TLS in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (1.0+)
- AWS Network Load Balancer (NLB)
- AWS Certificate Manager (ACM)
- AWS Route53
- AWS VPC, Subnets, Internet Gateway, Elastic IPs
- TLS termination and TLS passthrough
- AWS CloudWatch metrics/alarms
- Terraform AWS provider resources: `aws_lb`, `aws_lb_listener`, `aws_lb_target_group`, `aws_lb_listener_certificate`, `aws_acm_certificate`, `aws_acm_certificate_validation`, `aws_eip`, `aws_route53_record`

## Sources Consulted
- Terraform AWS provider docs — `aws_lb` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb)
- Terraform AWS provider docs — `aws_lb_listener` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener)
- Terraform AWS provider docs — `aws_lb_target_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group)
- Terraform AWS provider docs — `aws_eip` (`domain` argument replacing deprecated `vpc`)
- Terraform AWS provider docs — `aws_acm_certificate` and `aws_acm_certificate_validation`
- AWS Documentation — Network Load Balancers (https://docs.aws.amazon.com/elasticloadbalancing/latest/network/)
- AWS Documentation — TLS listeners for Network Load Balancers
- AWS Documentation — Predefined SSL security policies for ELB
- AWS Documentation — CloudWatch metrics for Network Load Balancers (`AWS/NetworkELB` namespace)
- AWS Documentation — NLB target group health checks and stickiness

## Issues Found
No technical issues found.

Spot checks confirmed:
- `aws_eip` uses the current `domain = "vpc"` syntax (the legacy `vpc = true` argument is deprecated in newer AWS provider versions).
- `aws_lb` for NLB correctly uses `load_balancer_type = "network"` along with valid `enable_cross_zone_load_balancing` and `enable_deletion_protection` top-level arguments.
- The `subnet_mapping` dynamic block correctly attaches Elastic IPs via `allocation_id`.
- TLS listener uses a valid SSL policy (`ELBSecurityPolicy-TLS13-1-2-2021-06`) and the correct `protocol = "TLS"` with `certificate_arn`.
- TLS passthrough is correctly implemented with `protocol = "TCP"` (not "TLS") on the listener so the LB does not terminate TLS.
- Target group `protocol = "TCP"` after TLS termination is correct; the NLB decrypts TLS and forwards plain TCP to backends.
- NLB stickiness `type = "source_ip"` is the valid value for TCP target groups (cookie-based stickiness is ALB-only).
- CloudWatch namespace `AWS/NetworkELB` and `UnHealthyHostCount` metric are correct for NLB.
- ACM DNS validation pattern using `for_each` over `domain_validation_options` matches the canonical Terraform pattern.
- Route53 alias record correctly uses `aws_lb.main.dns_name` and `aws_lb.main.zone_id`.

## Review Notes
- The `aws_lb_listener_certificate.additional` example references `aws_acm_certificate.additional_domain` which is not defined elsewhere in the post. This is clearly illustrative (showing how to add additional certificates for SNI), but readers will need to define their own additional certificate resource for it to apply. Not a technical inaccuracy.
- The inline comment `# NLB supports 10 or 30 second intervals` reflects the historical/long-standing constraint for NLB target group health checks. AWS has since expanded the supported `HealthCheckIntervalSeconds` range for NLBs (5–300), though 10 and 30 remain the canonical defaults and the values most commonly used in practice. The comment is not wrong for the configured value but is slightly conservative versus the current allowed range.
- `deregistration_delay = 300` matches the default; included explicitly for clarity, which is fine.
- The `aws_internet_gateway` is declared but no route table associations or NAT gateways are shown — acceptable for a focused NLB+TLS guide, just worth noting it is not a fully wired VPC blueprint.
- Cross-zone load balancing for NLB incurs inter-AZ data transfer charges; the post enables it without that caveat. Technically correct, just a cost consideration worth mentioning in a future revision.
