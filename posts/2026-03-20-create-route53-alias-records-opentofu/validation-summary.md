# Validation Summary: How to Create Route53 Alias Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Route 53 (DNS)
- AWS Provider for Terraform (`hashicorp/aws ~> 5.0`)
- AWS Application Load Balancer (ALB) — `aws_lb`
- AWS CloudFront — `aws_cloudfront_distribution`
- AWS S3 static website hosting — `aws_s3_bucket_website_configuration`
- AWS API Gateway — `aws_api_gateway_domain_name`
- Route 53 latency-based routing policies

## Sources Consulted
- AWS Route 53 Developer Guide — Values specific for simple alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- AWS Route 53 API Reference — AliasTarget: https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- Terraform AWS provider — `aws_route53_record` resource docs (source markdown on GitHub)
- Terraform AWS provider — `aws_s3_bucket_website_configuration` resource docs (confirmed `website_endpoint` is an exported attribute)
- Terraform AWS provider — `aws_api_gateway_domain_name` resource docs (confirmed `cloudfront_domain_name` and `cloudfront_zone_id` for edge-optimized APIs)

## Issues Found
- **Misleading comment in the latency-based routing example.** The second record (`api_eu_west`) was labelled `# Failover record`, but it actually uses `latency_routing_policy` — not `failover_routing_policy` (which would require a `type` of `PRIMARY`/`SECONDARY`). The label could mislead readers about which routing policy is in use. Updated the comment to `# Secondary region in eu-west-1` so it accurately reflects what the resource does without changing the routing policy itself.

## Review Notes
- The provider configuration uses the standard `terraform {}` block, which OpenTofu accepts for backward compatibility (an alternative `tofu {}` block exists but is not required).
- All Terraform attribute references for alias targets are correct: `aws_lb.*.dns_name` / `aws_lb.*.zone_id`, `aws_cloudfront_distribution.*.domain_name` / `*.hosted_zone_id`, `aws_s3_bucket_website_configuration.*.website_endpoint` paired with `aws_s3_bucket.*.hosted_zone_id`, and `aws_api_gateway_domain_name.*.cloudfront_domain_name` / `*.cloudfront_zone_id` (edge-optimized).
- `evaluate_target_health = false` for CloudFront and edge-optimized API Gateway aliases is correct — Route 53 cannot health-check those targets.
- `evaluate_target_health = true` for the S3 alias is permitted by the API (no special restriction in the AWS API reference), though the Route 53 Developer Guide notes that for highly available services like S3 the setting "provides no operational benefit." Left as-is since it is not technically incorrect; for failover scenarios with S3, AWS recommends Route 53 health checks instead.
- The section heading "Alias to Another Route53 Record (Latency-Based Routing)" is somewhat of a misnomer — the example actually demonstrates aliasing to ALBs with latency-based routing rather than aliasing to another Route 53 record. This is a structural/naming concern rather than a technical error, so it was left unchanged per the no-restructuring guidance.
- The conclusion's phrase "zero-cost, health-checked DNS routing" slightly oversimplifies — health checks via `evaluate_target_health` only apply to targets Route 53 can evaluate (e.g., ELB), not CloudFront/edge-API Gateway. Not strictly wrong in context, so left unchanged.
