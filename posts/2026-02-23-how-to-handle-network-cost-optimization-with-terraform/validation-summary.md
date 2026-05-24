# Validation Summary: How to Handle Network Cost Optimization with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS Terraform provider (hashicorp/aws)
- AWS VPC, VPC Endpoints (Gateway and Interface)
- AWS NAT Gateway, Elastic IPs
- AWS Application Load Balancer (ALB)
- AWS CloudFront
- AWS ElastiCache (Redis replication groups)
- AWS Budgets / Cost Explorer
- AWS Security Groups, Route Tables

## Sources Consulted
- AWS CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Terraform AWS provider — `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider — `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS provider — `aws_vpc_endpoint`, `aws_nat_gateway`, `aws_lb`, `aws_lb_listener`, `aws_elasticache_replication_group`, `aws_budgets_budget`
- AWS ELB SSL/TLS security policies: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS data transfer pricing (cross-AZ at $0.01/GB each direction)

## Issues Found
1. **CloudFront `cache_policy_id` combined with legacy TTL fields (`min_ttl`, `default_ttl`, `max_ttl`)** — When using a managed cache policy via `cache_policy_id`, the legacy TTL fields are mutually exclusive with it. Setting both can cause Terraform apply failures or have the TTL values silently ignored (the policy's own TTLs win). Fixed by removing `min_ttl`, `default_ttl`, and `max_ttl` from the `default_cache_behavior` block and adding a clarifying comment that TTLs come from the cache policy itself.

## Review Notes
- The `aws_eip` resource correctly uses the modern `domain = "vpc"` syntax instead of the deprecated `vpc = true`.
- The CachingOptimized managed cache policy ID (`658327ea-f89d-4fab-a63d-7e88639e58f6`) is correct.
- The ALB SSL policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is a valid current TLS 1.3 policy.
- Cross-AZ data transfer pricing ($0.01/GB each direction) is accurate as of the time of writing.
- The AWS Budgets `cost_filter` using `name = "Service"` and the listed service display names is syntactically correct. However, note that a significant portion of "network" cost (NAT Gateway data processing, cross-AZ traffic) is typically billed under "EC2 - Other" / "Amazon Elastic Compute Cloud" rather than "Amazon Virtual Private Cloud". A reader using only the listed three services for the budget filter may under-count their true network spend. The author may want to expand the filter list in a future revision.
- Several Terraform references (e.g., `aws_security_group.alb`, `aws_lb_target_group.services`, `aws_elasticache_subnet_group.main`) are not defined in the snippets but are typical of focused blog-post examples; this is acceptable.
- `aws_elasticache_replication_group` uses the legacy `num_cache_clusters` argument, which is still supported for non-cluster-mode replication groups but is gradually being deprecated in favor of `num_node_groups` / `replicas_per_node_group`. Not an error today.
