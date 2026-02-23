# How to Optimize Terraform State Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Performance, Optimization, DevOps

Description: Practical techniques to speed up Terraform plan and apply operations by optimizing how Terraform reads, refreshes, and writes state data.

---

Slow Terraform operations cost real time and productivity. When a plan takes five minutes, developers stop running plans frequently, which means they catch problems later instead of earlier. When an apply takes twenty minutes, your deployment pipeline becomes a bottleneck.

Most of the time, the bottleneck is the state refresh - Terraform querying your cloud provider for the current status of every resource. Here's how to make it faster.

## Measure Before You Optimize

Before changing anything, measure your baseline:

```bash
# Time a full plan
time terraform plan 2>&1 | tail -5

# Time just the refresh phase
time terraform plan -refresh-only 2>&1 | tail -5

# Time a plan without refresh to see configuration parsing overhead
time terraform plan -refresh=false 2>&1 | tail -5
```

If the refresh takes 90% of the total plan time (which is common), that's where to focus your optimization efforts.

```bash
# Enable debug logging to see where time is spent
TF_LOG=DEBUG terraform plan 2>&1 | grep -E "GET|POST|elapsed" | head -50
```

## Increase Parallelism

Terraform defaults to 10 concurrent operations. For large states, bumping this up can significantly reduce refresh time:

```bash
# Default parallelism (10 concurrent operations)
time terraform plan
# real    4m 12s

# Increased parallelism
time terraform plan -parallelism=25
# real    1m 48s

# Even higher (watch for rate limits)
time terraform plan -parallelism=50
# real    1m 05s
```

The optimal value depends on your cloud provider's API rate limits. Here are rough guidelines:

```
Provider    | Suggested Parallelism | Notes
AWS         | 20-30                 | Varies by service, watch for throttling
GCP         | 20-40                 | Generally higher limits than AWS
Azure       | 15-25                 | More conservative rate limits
```

Monitor for throttling errors. If you see HTTP 429 or "Rate exceeded" errors, dial it back:

```bash
# If you see rate limiting, reduce parallelism
TF_LOG=WARN terraform plan -parallelism=50 2>&1 | grep -i "throttl\|rate\|429"
```

## Skip Refresh When Safe

During development, you often don't need a full refresh:

```bash
# Skip refresh for rapid iteration
terraform plan -refresh=false

# Only refresh when you're ready to apply
terraform plan  # Full refresh
terraform apply
```

You can also separate the refresh from the plan:

```bash
# Refresh state once
terraform apply -refresh-only -auto-approve

# Then run multiple plans without refresh
terraform plan -refresh=false  # Fast
# Make changes...
terraform plan -refresh=false  # Still fast
# Ready to apply
terraform plan -refresh=false -out=plan.tfplan
terraform apply plan.tfplan
```

## Target Specific Resources

When working on a specific component, use `-target` to limit the scope:

```bash
# Only refresh and plan the resources you're changing
terraform plan -target=module.api_gateway

# Multiple targets
terraform plan \
  -target=aws_lambda_function.handler \
  -target=aws_api_gateway_rest_api.main
```

This reduces API calls from potentially thousands to just the resources you care about.

## Optimize Provider Configuration

### AWS Provider

```hcl
provider "aws" {
  region = "us-east-1"

  # Skip account ID lookup - saves an API call on every run
  skip_requesting_account_id = true

  # Configure retry behavior for API calls
  retry_mode  = "adaptive"
  max_retries = 5

  # Use default tags to reduce per-resource API overhead
  default_tags {
    tags = {
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}
```

### GCP Provider

```hcl
provider "google" {
  project = "my-project"
  region  = "us-central1"

  # Batch API calls where possible
  batching {
    send_after  = "3s"
    enable_batching = true
  }
}
```

## Use Data Sources Efficiently

Data sources are refreshed on every plan. If you have many data sources that don't change, consider alternatives:

```hcl
# BAD: This makes an API call every plan
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# BETTER: Pin the AMI ID and only update when needed
variable "ubuntu_ami" {
  type    = string
  default = "ami-0123456789abcdef0"  # Update this periodically
}
```

For data sources that you need but don't change often, consider caching the results:

```hcl
# Instead of multiple data source lookups
# Use locals to compute values once
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  partition  = data.aws_partition.current.partition

  # Build ARN prefix once, use everywhere
  arn_prefix = "arn:${local.partition}:iam::${local.account_id}"
}
```

## Reduce Resource Count

Every resource in state adds to refresh time. Look for opportunities to reduce the count:

### Use for_each Instead of Multiple Separate Resources

```hcl
# BAD: Three separate resources = 3 state entries with separate refresh calls
resource "aws_route53_record" "web_a" { ... }
resource "aws_route53_record" "web_aaaa" { ... }
resource "aws_route53_record" "web_cname" { ... }

# BETTER: One resource with for_each = still 3 state entries but more organized
resource "aws_route53_record" "web" {
  for_each = {
    A     = { type = "A",     records = ["1.2.3.4"] }
    AAAA  = { type = "AAAA",  records = ["2001:db8::1"] }
    CNAME = { type = "CNAME", records = ["web.example.com"] }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "web"
  type    = each.value.type
  ttl     = 300
  records = each.value.records
}
```

### Consolidate Where Possible

```hcl
# BAD: Separate security group rules create many state entries
resource "aws_security_group_rule" "http" {
  type              = "ingress"
  security_group_id = aws_security_group.web.id
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "https" {
  type              = "ingress"
  security_group_id = aws_security_group.web.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

# BETTER: Define rules inline within the security group
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Backend Performance

The backend itself can be a bottleneck for large state files.

### S3 Backend Optimization

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true

    # Use path-style URLs for potentially faster resolution
    force_path_style = false
  }
}
```

Consider using an S3 bucket in the same region where you run Terraform to minimize latency.

### Terraform Cloud Performance

If using Terraform Cloud, remote operations run on HashiCorp's infrastructure, which has low-latency access to the state. This can be faster than local operations that need to download large state files.

## CI/CD Pipeline Optimization

### Caching State Locally

In CI/CD, you can cache the state between pipeline steps:

```yaml
# GitHub Actions example
jobs:
  terraform:
    steps:
      - name: Cache Terraform state
        uses: actions/cache@v3
        with:
          path: .terraform
          key: terraform-${{ hashFiles('**/*.tf') }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -parallelism=25 -out=plan.tfplan
```

### Separating Plan and Apply

Run plan and apply as separate jobs to avoid redundant refresh:

```yaml
jobs:
  plan:
    steps:
      - run: terraform plan -out=plan.tfplan
      - uses: actions/upload-artifact@v3
        with:
          name: plan
          path: plan.tfplan

  apply:
    needs: plan
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: plan
      # Apply uses the saved plan - no refresh needed
      - run: terraform apply plan.tfplan
```

## Profiling Terraform Operations

For detailed profiling, use Terraform's built-in logging:

```bash
# Enable trace-level logging to see every API call
TF_LOG=TRACE terraform plan 2> trace.log

# Find the slowest API calls
grep "HTTP response" trace.log | sort -t= -k2 -n -r | head -20

# Count API calls by service
grep "HTTP request" trace.log | grep -oP 'https://[^/]+' | sort | uniq -c | sort -rn
```

This helps you identify which services or resources are causing the most latency.

## Wrapping Up

Terraform state performance optimization is about reducing the number and duration of API calls during the refresh phase. Start with easy wins - increase parallelism, skip refresh during development, and target specific resources. For larger gains, split your state into smaller units and reduce your overall resource count.

Measure before and after each change. What works for one configuration might not work for another, depending on which cloud services you're using and how many resources you have.

For more context, see our posts on [handling large state files](https://oneuptime.com/blog/post/2026-02-23-handle-large-terraform-state-files/view) and [using the -refresh=false flag](https://oneuptime.com/blog/post/2026-02-23-terraform-refresh-false-flag/view).
