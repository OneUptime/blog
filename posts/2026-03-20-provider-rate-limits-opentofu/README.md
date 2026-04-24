# How to Handle Provider Rate Limits in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Rate Limit, Provider, AWS, GitHub, Best Practice

Description: Learn how to handle provider-specific rate limits in OpenTofu for AWS, GitHub, and other providers using retry configuration and request batching strategies.

## Introduction

Every cloud provider and third-party API has rate limits. OpenTofu providers implement retry logic, but large applies can still exhaust limits. This guide covers provider-specific rate limit handling and general mitigation strategies.

## AWS Provider Rate Limits

```hcl
provider "aws" {
  region = var.region

  # Increase retry attempts (default: 25)
  max_retries = 30

  # Credentials can also be supplied via environment variables
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_PROFILE
}
```

Common AWS rate-limited APIs vary by service and operation. Examples:
- **STS**: 600 req/sec per account per Region for credential APIs such as `AssumeRole` and `GetCallerIdentity`
- **EC2**: non-mutating APIs are throttled per API; for example, `DescribeHosts` has a bucket size of 100 and a refill rate of 20 req/sec
- **CloudWatch**: `PutMetricAlarm` is 3 req/sec per Region by default

```bash
# For rate-limit-prone applies, reduce parallelism

tofu apply -parallelism=3 -var-file=production.tfvars
```

## GitHub Provider Rate Limits

```hcl
provider "github" {
  token = var.github_token
  owner = var.github_org

  # Personal access tokens are typically limited to 5,000 req/hour
  # GitHub App installation tokens start at 5,000 req/hour and can scale
  # higher depending on org size or GitHub Enterprise Cloud
}
```

For organizations with many repositories:

```hcl
# Split large repository sets by team into separate configurations
# or separate runs
module "team_alpha_repos" {
  source = "./modules/github-repos"
  repos  = var.team_alpha_repos
}
```

## Datadog Provider Rate Limits

```hcl
provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key

  # Datadog API rate limits vary by endpoint and are exposed in
  # X-RateLimit-* response headers
  # For large monitor configurations, split changes into smaller applies
}

# Create monitors in smaller groups when you need to reduce API pressure
resource "datadog_monitor" "service_monitors" {
  for_each = var.service_monitors
  # ...
}
```

## General Rate Limit Mitigation Patterns

### 1. Request Batching

Where possible, use resource types that batch multiple operations.

```hcl
# Instead of individual IAM policy attachments (one API call each)
resource "aws_iam_role_policy_attachment" "individual" {
  count      = length(var.policy_arns)
  role       = aws_iam_role.app.name
  policy_arn = var.policy_arns[count.index]
}

# Use inline policy (single API call) for simpler cases
resource "aws_iam_role_policy" "inline" {
  role   = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [for statement in var.policy_statements : statement]
  })
}
```

### 2. Apply During Off-Peak Hours

```bash
# Schedule large applies during low-traffic hours
# Use at where available
echo "tofu apply production.tfplan" | at 02:00
```

### 3. Caching with Data Sources

Define shared lookups once and reuse them.

```hcl
# Reuse a shared AMI lookup
locals {
  # Reference the looked-up AMI ID through a local
  ubuntu_ami_id = data.aws_ami.ubuntu.id
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*"]
  }
}

# All instances use the cached value
resource "aws_instance" "servers" {
  count = 20
  ami   = local.ubuntu_ami_id
  # ...
}
```

## Detecting Rate Limit Errors

```bash
# Enable debug logging to see rate limit errors
TF_LOG=DEBUG tofu apply 2>&1 | grep -i "throttl\|rate limit\|429\|RequestThrottled"
```

## Summary

Provider rate limits require a combination of reduced parallelism, increased retry counts, request batching, and off-peak scheduling for large applies. Understanding each provider's specific limits and reusing shared data lookups reduces unnecessary API calls - making large applies more reliable.
