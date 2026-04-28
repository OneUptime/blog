# Validation Summary: How to Configure Multi-Region Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Application Load Balancer (`aws_lb`)
- AWS Route53 (health checks, latency routing, failover routing)
- Terraform AWS provider (`hashicorp/aws`)
- Terraform Google provider (`hashicorp/google`)
- GCP Global HTTP(S) Load Balancer (`google_compute_global_forwarding_rule`, `google_compute_backend_service`)
- GCP Network Endpoint Groups (NEGs) and Cloud CDN

## Sources Consulted
- Terraform AWS provider docs — `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider docs — `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS provider docs — `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Route53 health checker regions documentation (valid values for `regions` field)
- AWS Route53 latency-based routing and failover routing documentation
- Terraform Google provider docs — `google_compute_global_forwarding_rule`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_forwarding_rule
- Terraform Google provider docs — `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Google Cloud documentation on Global External HTTP(S) Load Balancer and Cloud CDN

## Issues Found
- **Missing `enable_cdn = true` in `google_compute_backend_service`**: The example included a `cdn_policy` block but did not set `enable_cdn = true`. Per the Google provider, `cdn_policy` is only effective when `enable_cdn` is explicitly enabled, so the configuration as written would not actually activate Cloud CDN. Added `enable_cdn = true` immediately above the `cdn_policy` block to match the clear intent of the example.

## Review Notes
- The Route53 health check `regions` argument requires at least 3 health-checker regions, and the values used (`us-east-1`, `eu-west-1`, `ap-southeast-1`) are all valid Route53 health checker regions.
- For latency routing records and failover routing records, both `set_identifier` and the corresponding `*_routing_policy` block are correctly used together with alias targets and `evaluate_target_health = true`.
- The active-passive failover example intentionally omits a health check on the SECONDARY record — this is the standard pattern (a secondary with no health check is treated as always-healthy and only receives traffic when the PRIMARY fails).
- For the GCP forwarding rule, `ip_address = google_compute_global_address.app.id` works because the Google provider resolves the resource self-link/path; using `.address` is the more common idiomatic form but `.id` is accepted.
- The post does not pin a specific provider version. Readers should pin `hashicorp/aws` and `hashicorp/google` provider versions in production to avoid drift.
