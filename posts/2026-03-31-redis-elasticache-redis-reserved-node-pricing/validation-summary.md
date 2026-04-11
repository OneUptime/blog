# Validation Summary: How to Optimize ElastiCache Redis Reserved Node Pricing

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS ElastiCache (Redis)
- AWS CloudWatch
- AWS CLI (elasticache and cloudwatch subcommands)
- Python (for cost calculation)
- AWS Reserved Nodes pricing model
- AWS Savings Plans (ElastiCache Serverless)

## Sources Consulted
- AWS CLI Reference: `purchase-reserved-cache-nodes-offering` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/purchase-reserved-cache-nodes-offering.html
- AWS CLI Reference: `describe-reserved-cache-nodes-offerings` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-reserved-cache-nodes-offerings.html
- AWS CLI Reference: `describe-reserved-cache-nodes` — https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-reserved-cache-nodes.html
- AWS ElastiCache CloudWatch Metrics documentation — https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.Redis.html
- AWS ElastiCache Reserved Nodes documentation — https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/reserved-nodes.html
- Manual verification of Python savings calculation math

## Issues Found
No technical issues found.

## Review Notes
- The discount percentages in the reservation options table (28%–55%) are approximate (marked with "~") and will vary by instance type and region. This is appropriately communicated.
- The Python savings estimate comment says "~$705" while the exact computed value is $706.68 — the approximation is reasonable and correctly prefixed with "~".
- The post presents the purchase command before the describe-offerings command (with a note "Find the offering ID first:"), which is reverse order but is a stylistic choice, not a technical error.
- AWS documentation recommends using `EngineCPUUtilization` in addition to `CPUUtilization` for smaller instances (2 vCPUs or fewer) to get more accurate engine-specific CPU monitoring. The post's use of `CPUUtilization` is valid but readers with small instances may benefit from also checking `EngineCPUUtilization`.
- Pricing values (on-demand hourly rate of $0.218 and reserved cost of $1,203.00 for cache.r7g.large in us-east-1) are illustrative and may change over time; this is inherent to any pricing-focused content.
