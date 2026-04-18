# How to Troubleshoot tofu plan Hanging or Slow Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Performance, Plan, Infrastructure as Code

Description: Learn how to diagnose and fix slow or hanging tofu plan operations caused by API throttling, large state files, slow data sources, and provider issues.

## Introduction

`tofu plan` can become slow or appear to hang for several reasons: excessive data source API calls, large state files, API rate limiting, provider bugs, or connectivity issues. This guide covers systematic diagnosis and fixes.

## Enabling Diagnostic Output

```bash
# Show timing information during plan

TF_LOG=INFO tofu plan 2>&1 | grep -E "Refreshing|Reading|Fetching|ms"

# Full provider debug for a specific provider
TF_LOG_PROVIDER=DEBUG tofu plan 2>&1 | grep -i "aws\|throttl\|rate"

# Show which resource is currently being refreshed
TF_LOG=TRACE tofu plan 2>&1 | grep -i "refresh\|reading"
```

## Root Cause 1: Too Many Data Sources

```bash
# Identify which data sources take the longest
TF_LOG=INFO tofu plan 2>&1 | grep "Refreshing state" | \
  awk '{print $1, $NF}' | sort

# Common offenders:
# - data.aws_ami.latest (scans all AMIs)
# - data.aws_subnets.all (lists all subnets)
# - data.aws_instances.all (lists all instances)
```

Fix: Replace slow data sources with variables or cached values.

```hcl
# SLOW: Scans all AMIs every plan
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/*"]
  }
}

# FAST: Use a variable (update manually when needed)
variable "ubuntu_ami_id" {
  type    = string
  default = "ami-0c7217cdde317cfec"
}
```

## Root Cause 2: API Throttling

```text
AWS: ThrottlingException: Rate exceeded
```

```bash
# Check for throttling in debug log
TF_LOG=DEBUG tofu plan 2>&1 | grep -i "throttl\|rate exceeded\|retry"

# Apply with reduced parallelism to lower API call rate
tofu plan -parallelism=3  # default is 10

# Some providers have retry configuration
provider "aws" {
  region = "us-east-1"

  # AWS provider respects retry settings
  # These are set via environment variables:
  # AWS_MAX_ATTEMPTS=10
  # AWS_RETRY_MODE=adaptive
}
```

## Root Cause 3: Large State File

```bash
# Check state file size
tofu state pull | wc -c
# If > 10MB, state is too large

# Count resources
tofu state list | wc -l
# If > 500 resources, split the state

# Use -refresh=false to skip state refresh (uses cached state)
tofu plan -refresh=false  # much faster for development
```

## Root Cause 4: Plan Appears Hung

```bash
# Is it actually running or stuck?
ps aux | grep tofu

# Check which system call it's blocked on (Linux)
strace -p $(pgrep tofu) -e trace=network 2>&1 | head -20

# Check for locked state
aws s3 ls s3://my-state-bucket/ | grep .tflock
# If lock file exists from a crashed run, investigate before removing
```

## Root Cause 5: Provider Binary Issues

```bash
# Check if provider is responding
TF_LOG=DEBUG tofu plan 2>&1 | grep -i "starting provider\|plugin\|reattach"

# If provider is crashing:
# Error: Plugin process exited unexpectedly
rm -rf .terraform/
tofu init
tofu plan

# Update providers to latest version
tofu init -upgrade
```

## Performance Optimization Strategies

```bash
# 1. Skip state refresh when developing
tofu plan -refresh=false

# 2. Target specific resources for faster iteration
tofu plan -target=module.app_service

# 3. Use partial configuration for large deployments
# Focus on the layers that changed

# 4. Consider splitting state by layer
# networking state: plan takes 10 seconds (20 resources)
# application state: plan takes 30 seconds (100 resources)
# vs monolith: plan takes 20 minutes (2000 resources)
```

## Summary

Slow `tofu plan` is most commonly caused by excessive data source API calls (replace with variables), API throttling (reduce parallelism, enable adaptive retry mode), or large monolithic state files (split into smaller states). Use `TF_LOG=INFO` to see which resource is currently being processed and identify bottlenecks. For development iteration, `-refresh=false` and `-target` flags significantly reduce plan times without sacrificing correctness.
