# How to Use the plantimestamp Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, plantimestamp, Time Functions, Plan Stability, Infrastructure as Code

Description: Learn how to use Terraform's plantimestamp function for consistent timestamps across plan and apply phases, avoiding unnecessary resource changes on every run.

---

If you have ever used `timestamp()` in Terraform and been annoyed by every resource showing as "changed" on every plan, `plantimestamp()` is the function you need. Introduced in Terraform 1.5, `plantimestamp` returns the same timestamp value throughout a single plan-and-apply cycle, eliminating the phantom diffs that `timestamp()` causes. This post explains how it works, when to use it, and how it differs from `timestamp()`.

## The Problem with timestamp()

The `timestamp()` function returns the current time every time it is evaluated. This sounds reasonable, but Terraform evaluates expressions multiple times during a plan-apply cycle. Each evaluation can return a slightly different time, and this causes problems:

```hcl
# Using timestamp() - this will show as changed on EVERY plan
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "web-server"
    DeployedAt = timestamp()  # Changes every time you run plan
  }
}
```

Every time you run `terraform plan`, the `DeployedAt` tag shows as an update even if nothing else changed. This makes it hard to tell whether a plan has real changes or just timestamp noise.

## How plantimestamp Works

The `plantimestamp()` function captures the time once at the start of the plan phase and returns that same value for every reference throughout the entire plan and apply:

```hcl
# Using plantimestamp() - consistent across the entire run
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "web-server"
    DeployedAt = plantimestamp()  # Same value for entire plan-apply
  }
}
```

On the first run, the tag gets set. On subsequent plans where nothing else changes, Terraform sees the tag value has not changed and reports no diff.

## Basic Usage

```hcl
locals {
  # Get the plan timestamp - same value everywhere in the config
  plan_time = plantimestamp()

  # Format it for display
  deploy_date = formatdate("YYYY-MM-DD", plantimestamp())
  deploy_time = formatdate("HH:mm:ss", plantimestamp())
}

output "plan_timestamp" {
  value = local.plan_time
  # Example: "2026-02-23T14:30:00Z"
}

output "deploy_date" {
  value = local.deploy_date
  # Example: "2026-02-23"
}
```

## timestamp vs plantimestamp Comparison

Here is a side-by-side comparison:

```hcl
locals {
  # timestamp() - returns current time at each evaluation
  # - Different on plan vs apply
  # - Causes resources to show as changed every time
  # - Good for truly dynamic values that should always update
  ts = timestamp()

  # plantimestamp() - returns time frozen at plan start
  # - Same on plan and apply within one run
  # - Does not cause false diffs
  # - Good for deployment tracking tags
  pts = plantimestamp()
}

# Practical difference in behavior:
resource "aws_instance" "example_ts" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    # This tag changes on every plan even if nothing else changed
    LastPlan = timestamp()
  }
}

resource "aws_instance" "example_pts" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    # This tag only changes when the resource actually gets modified
    LastDeploy = plantimestamp()
  }
}
```

## Resource Tagging with plantimestamp

The most common use case is adding deployment metadata to resource tags:

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
    DeployedAt  = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", plantimestamp())
    DeployDate  = formatdate("YYYY-MM-DD", plantimestamp())
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(local.common_tags, {
    Name = "${var.project}-vpc"
  })
}

resource "aws_subnet" "private" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet("10.0.0.0/16", 8, count.index)
  tags       = merge(local.common_tags, {
    Name = "${var.project}-private-${count.index + 1}"
  })
}
```

## Naming Resources with Stable Timestamps

When timestamps are part of resource names, `plantimestamp` prevents unnecessary recreation:

```hcl
locals {
  # This creates a name that stays stable between runs
  deploy_id = formatdate("YYYYMMDDHHmm", plantimestamp())
}

resource "aws_launch_template" "app" {
  name_prefix = "app-${local.deploy_id}-"
  image_id    = var.ami_id

  tag_specifications {
    resource_type = "instance"
    tags = {
      DeployBatch = local.deploy_id
    }
  }
}
```

## Using plantimestamp in Lifecycle Metadata

Track when infrastructure was last planned and applied:

```hcl
locals {
  lifecycle_tags = {
    LastPlannedAt = formatdate("YYYY-MM-DD HH:mm:ss 'UTC'", plantimestamp())
    PlanWeek      = formatdate("YYYY-'W'WW", plantimestamp())
    PlanQuarter   = format("Q%d-%s",
      ceil(tonumber(formatdate("M", plantimestamp())) / 3),
      formatdate("YYYY", plantimestamp())
    )
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(local.lifecycle_tags, {
    Name = "app-server"
  })
}
```

## Combining with timeadd

You can calculate future dates based on the plan timestamp:

```hcl
locals {
  plan_time = plantimestamp()

  # Calculate a review date 30 days from now
  review_date = formatdate(
    "YYYY-MM-DD",
    timeadd(local.plan_time, "720h")  # 30 days
  )

  # Calculate a rotation date 90 days from now
  rotation_date = formatdate(
    "YYYY-MM-DD",
    timeadd(local.plan_time, "2160h")  # 90 days
  )
}

resource "aws_iam_access_key" "deploy" {
  user = aws_iam_user.deploy.name

  tags = {
    CreatedAt = formatdate("YYYY-MM-DD", local.plan_time)
    RotateBy  = local.rotation_date
    ReviewBy  = local.review_date
  }
}
```

## Using in Conditional Logic

Since `plantimestamp` returns a stable RFC 3339 string, you can use it in conditional logic:

```hcl
locals {
  plan_time = plantimestamp()
  plan_hour = tonumber(formatdate("HH", local.plan_time))

  # Warn if deploying outside business hours
  is_business_hours = local.plan_hour >= 9 && local.plan_hour < 17

  # Determine the deployment window
  deploy_window = local.is_business_hours ? "business-hours" : "off-hours"
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name         = "app-server"
    DeployWindow = local.deploy_window
    PlannedAt    = formatdate("HH:mm 'UTC'", local.plan_time)
  }
}
```

## When to Still Use timestamp()

There are cases where `timestamp()` is still the right choice:

```hcl
# Use timestamp() when you WANT the value to change every time
# For example, forcing a null_resource to always re-execute
resource "null_resource" "always_run" {
  triggers = {
    always = timestamp()  # Forces this to run on every apply
  }

  provisioner "local-exec" {
    command = "echo Running at $(date)"
  }
}

# Use plantimestamp() when you want stable deployment metadata
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "web-server"
    DeployedAt = plantimestamp()  # Only changes when resource changes
  }
}
```

## Version Requirements

The `plantimestamp()` function was introduced in Terraform 1.5. Make sure your configuration specifies the minimum version:

```hcl
terraform {
  required_version = ">= 1.5.0"
}
```

If you are stuck on an older version, you can approximate the behavior by using a `null_resource` with a `local-exec` provisioner that writes the timestamp to a file, then reading it with `file()`. But upgrading to 1.5+ is the better path.

## Best Practices

Here is a summary of when to use each function:

- Use `plantimestamp()` for resource tags, deployment metadata, naming conventions, and any value that should stay consistent within a plan-apply cycle
- Use `timestamp()` for triggers that should fire on every apply, or for truly dynamic values where you want different results each time
- Format `plantimestamp()` with `formatdate()` for human-readable output
- Store `plantimestamp()` in a local value if you reference it in many places, though this is mainly for readability since the function always returns the same value within a run

## Summary

The `plantimestamp()` function solves the practical problem of noisy diffs caused by `timestamp()`. It captures the time once at plan start and returns that same value everywhere. Use it for deployment tags, resource naming, and lifecycle metadata. Reserve `timestamp()` for cases where you genuinely want values to change on every run. This small change in function choice significantly improves the signal-to-noise ratio in your Terraform plans.
