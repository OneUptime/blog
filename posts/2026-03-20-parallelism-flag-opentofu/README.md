# How to Use the -parallelism Flag in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the -parallelism flag in OpenTofu to control the number of concurrent resource operations during plan and apply for performance optimization.

## Introduction

OpenTofu processes resources in parallel to speed up operations. The `-parallelism` flag controls how many resource operations happen concurrently. The default is 10 concurrent operations. Tuning this value can significantly affect performance and API rate limit behavior.

## Basic Usage

```bash
# Default parallelism (10 concurrent operations)

tofu apply

# Increase parallelism for faster applies
tofu apply -parallelism=20

# Decrease parallelism to avoid rate limits
tofu apply -parallelism=3

# Works with plan and destroy too
tofu plan -parallelism=25
tofu destroy -parallelism=5
```

## When to Increase Parallelism

```bash
# Large deployments with many independent resources
# Example: creating 100 S3 buckets or EC2 instances
tofu apply -parallelism=30

# During state refresh with many resources
tofu plan -parallelism=20
```

## When to Decrease Parallelism

### API Rate Limits

AWS has default service quotas. Common rate limits:
- EC2: 100 API calls/second
- S3: 3,500 PUT/second, 5,500 GET/second
- IAM: 1,000 calls/second

```bash
# AWS rate limit hit:
# Error: RateLimitExceeded: Rate exceeded

# Reduce parallelism to stay within limits
tofu apply -parallelism=3
```

### Provider-Specific Limits

```bash
# Some providers have strict rate limits
# GitHub API: 5,000 requests/hour (unauthenticated: 60/hour)
tofu apply -parallelism=2  # Very conservative for rate-limited APIs
```

## Setting Default Parallelism

```bash
# Set in environment (persists for current session)
export TF_CLI_ARGS_plan="-parallelism=20"
export TF_CLI_ARGS_apply="-parallelism=20"
```

Or in the CLI configuration:

```hcl
# ~/.tofurc
# Note: parallelism can't be set in config, use environment variables
```

## Parallelism and Dependencies

OpenTofu respects resource dependencies regardless of parallelism:

```hcl
# These are created in parallel (no dependency):
resource "aws_s3_bucket" "a" { ... }
resource "aws_s3_bucket" "b" { ... }

# These are sequential (b depends on a):
resource "aws_s3_bucket" "a" { ... }
resource "aws_s3_bucket_policy" "a" {
  bucket = aws_s3_bucket.a.id  # Must wait for a
}
```

Higher parallelism helps when many resources are independent. It doesn't help when resources form a long dependency chain.

## Monitoring Concurrent Operations

```bash
# Watch operations during apply (in another terminal)
watch -n 1 'ps aux | grep tofu'

# Or use debug logging
TF_LOG=DEBUG tofu apply -parallelism=20 2>&1 | grep -E "(Creating|Modifying|Destroying)"
```

## Performance Benchmarking

```bash
# Time with default parallelism
time tofu plan

# Time with increased parallelism
time tofu plan -parallelism=20

# Find the sweet spot for your infrastructure
```

## Conclusion

The `-parallelism` flag is a performance tuning knob for OpenTofu operations. Increase it for large configurations with many independent resources, and decrease it when hitting API rate limits. The default of 10 is appropriate for most use cases. Always test parallelism changes in non-production environments first, and monitor for rate limit errors when increasing concurrency.
