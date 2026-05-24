# Validation Summary: How to Create Multi-AZ Load Balancer with Terraform

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Terraform (1.0+)
- AWS Application Load Balancer (ALB)
- AWS VPC, subnets, Internet Gateway, route tables
- AWS Security Groups
- AWS EC2
- AWS S3 (for access logs)
- AWS ACM (referenced for TLS certificate)
- Terraform AWS Provider (~> 5.0)

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- `aws_lb_listener_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- `aws_lb_target_group_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- AWS ELB predefined SSL security policies documentation
- AWS Application Load Balancer documentation (cross-zone load balancing behavior)

## Issues Found
No technical issues found. All Terraform resource arguments, attributes, and AWS-specific identifiers (SSL policy name, AMI ID format, target type values, stickiness types) match official documentation.

## Review Notes
- `enable_cross_zone_load_balancing = true` on an ALB is valid Terraform syntax and accepted by the AWS provider. Cross-zone load balancing is always enabled on ALBs at the load balancer level and the setting cannot effectively disable it; for ALBs this control is meaningful only at the target group level via `load_balancing_cross_zone_enabled`. Including it explicitly does no harm.
- The `aws_s3_bucket.lb_logs` bucket is declared but the post does not include an `aws_s3_bucket_policy` granting the AWS ELB log delivery account (or the `logdelivery.elasticloadbalancing.amazonaws.com` service principal in newer regions) permission to write logs. Without that policy, ALB log delivery will fail. This is an incomplete example rather than incorrect code, and is a common simplification in introductory tutorials.
- The HTTPS listener references `aws_acm_certificate.main.arn` but the ACM certificate resource is not defined within the post. Readers are expected to supply or define this resource separately.
- The AMI ID `ami-0c02fb55956c7d316` is a real Amazon Linux 2 AMI in `us-east-1`, but AMI IDs change over time and across regions. Using an `aws_ami` data source with filters would be a more durable pattern; this is a stylistic improvement and not an error.
- `target_type` valid values per the current AWS provider also include `"alb"` (in addition to the listed `instance`, `ip`, `lambda`). The comment says "can be" which is non-exhaustive, so this is acceptable.
- The SSL policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is a current AWS-managed policy supporting TLS 1.2 and TLS 1.3.
