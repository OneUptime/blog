# How to Speed Up tofu plan in Large Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Performance, Plan, Large Configurations, Infrastructure as Code, DevOps

Description: Learn proven strategies to reduce tofu plan execution time in large OpenTofu configurations, including parallelism tuning, refresh skipping, and configuration splitting.

## Introduction

As infrastructure grows, `tofu plan` can take 5–30 minutes in large configurations. Most of this time is spent refreshing hundreds of resources from cloud APIs. Understanding and addressing each bottleneck brings plan time from minutes to seconds.

## Measuring Where Time is Spent

```bash
# Time the plan

time tofu plan

# Enable debug logging to inspect refresh activity
TF_LOG=DEBUG TF_LOG_PATH=/tmp/plan-timing.log tofu plan
grep -i "refresh" /tmp/plan-timing.log | head
```

## Optimization 1: Skip Refresh for Known-Stable Infrastructure

```bash
# Skip the refresh phase - use state as the source of truth
# Only safe when you are confident no out-of-band changes occurred
tofu plan -refresh=false

# Typical speedup: 50-80% for large configurations
```

## Optimization 2: Increase Parallelism for Refresh

```bash
# Default parallelism is 10 - increase for refresh-heavy plans
tofu plan -parallelism=50   # More concurrent API calls = faster refresh

# Test at different levels to find the sweet spot without hitting rate limits
tofu plan -parallelism=20
tofu plan -parallelism=30
```

## Optimization 3: Target Specific Resources

```bash
# Focus planning on a module or whole resource address while developing
tofu plan -target=module.eks
tofu plan -target=aws_instance.web -target=aws_security_group.web

# Use targeting sparingly - always run a full plan before merging
```

## Optimization 4: Split Configuration into Smaller State Files

The single biggest improvement for very large configs is splitting them:

```text
Before:
  one-config/ (500 resources, 15-minute plan)

After:
  networking/ (50 resources, 1-minute plan)
  databases/ (30 resources, 45-second plan)
  compute/ (100 resources, 2-minute plan)
  applications/ (300 resources, 3-minute plan)
```

## Optimization 5: Cache Providers

Provider binary downloads during `tofu init` add startup time in fresh working directories or CI runs:

```bash
# Configure a plugin cache directory
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

# Add to ~/.bashrc or ~/.zshrc for permanence
echo 'export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"' >> ~/.zshrc
```

## Optimization 6: Reduce Data Sources

Many provider data sources make API calls. Consolidate or eliminate unnecessary reads:

```hcl
# BAD - 10 separate data source calls for availability zones
data "aws_availability_zone" "a" { name = "us-east-1a" }
data "aws_availability_zone" "b" { name = "us-east-1b" }
# ...

# GOOD - single call that returns all AZs
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}
```

## Optimization 7: Use Remote State Data Sources

Instead of computing shared values with data sources, read outputs from another state file:

```hcl
# Read networking outputs without refreshing networking resources
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-state-bucket"
    key    = "networking/tofu.tfstate"
    region = "us-east-1"
  }
}

locals {
  vpc_id     = data.terraform_remote_state.networking.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

## Conclusion

Speeding up `tofu plan` requires a layered approach: use `-refresh=false` for quick iteration, increase parallelism to accelerate refresh, split configurations for long-term scalability, and cache providers to reduce startup overhead. The biggest gains come from splitting large configurations so each plan only refreshes a subset of resources.
