# Validation Summary: How to Create an Application Load Balancer with OpenTofu on AWS (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Application Load Balancer (ALB)
- AWS Elastic Load Balancing v2 (ELBv2)
- AWS ACM (Certificate Manager)
- AWS Terraform Provider (hashicorp/aws)

## Sources Consulted
- Terraform AWS provider docs: `aws_lb` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb)
- Terraform AWS provider docs: `aws_lb_target_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group)
- Terraform AWS provider docs: `aws_lb_listener` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener)
- Terraform AWS provider docs: `aws_lb_listener_rule` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule)
- AWS ELB documentation: predefined SSL security policies (https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)

## Issues Found
No technical issues found.

- `aws_lb` arguments (`name`, `internal`, `load_balancer_type`, `security_groups`, `subnets`, `enable_deletion_protection`, `tags`) all match the provider schema.
- `aws_lb_target_group` with `target_type = "ip"` and the inline `health_check` block (path, port, protocol, matcher, interval, timeout, healthy_threshold, unhealthy_threshold) is valid.
- HTTP listener with `default_action { type = "redirect" }` and a `redirect` sub-block using port "443", protocol "HTTPS", and status_code "HTTP_301" is the correct syntax.
- HTTPS listener uses a valid predefined SSL policy (`ELBSecurityPolicy-TLS13-1-2-2021-06`) and a forward action to the target group.
- `aws_lb_listener_rule` with `action { type = "forward" }` and a `condition { path_pattern { values = [...] } }` block is correct.
- `aws_lb.main.dns_name` is a valid attribute for the output.

## Review Notes
- The post intentionally omits the supporting resources it references (`aws_security_group.alb`, `aws_subnet.public`, `aws_vpc.main`, `aws_acm_certificate.main`, `aws_lb_target_group.api`); readers will need to define these elsewhere.
- For production use, consider enabling `enable_deletion_protection = true` and configuring access logs (`access_logs` block on `aws_lb`).
- AWS periodically introduces new predefined SSL policies (e.g., FIPS variants); the current policy is still supported but readers should consult the latest AWS documentation when picking a policy.
- The HTTPS listener has only a single certificate; for multi-domain setups, `aws_lb_listener_certificate` can attach additional certificates.
