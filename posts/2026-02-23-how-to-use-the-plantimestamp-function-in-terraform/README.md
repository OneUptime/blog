# How to Use the plantimestamp Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Plantimestamp, Time Function, Plan Stability, Infrastructure as Code

Description: Learn how to use Terraform's plantimestamp function for consistent timestamps across plan and apply phases, avoiding unnecessary resource changes on every run.

---

If you have ever used `timestamp()` in Terraform and been annoyed by every resource showing as "changed" on every plan, it is tempting to reach for `plantimestamp()`. Introduced in Terraform 1.5, `plantimestamp` returns a UTC timestamp for the current plan operation. It is consistent within that plan, but it changes on every new plan, so it is not a general-purpose fix for noisy resource diffs. This post explains how it works, when to use it, and how it differs from `timestamp()`.

## The Problem with timestamp()

The `timestamp()` function returns the current time when Terraform evaluates it during apply. This sounds reasonable, but the result changes every second and cannot be predicted during planning. When you use it directly in resource attributes, Terraform detects a change on every run:

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

The `plantimestamp()` function returns the time of the current plan operation as an RFC 3339 UTC timestamp string. Unlike `timestamp()`, Terraform can evaluate it during planning, which makes it useful for plan-time validation and comparisons:

```hcl
# Using plantimestamp() for a plan-time certificate check
check "terraform_io_certificate" {
  data "tls_certificate" "terraform_io" {
    url = "https://www.terraform.io/"
  }

  assert {
    condition     = timecmp(plantimestamp(), data.tls_certificate.terraform_io.certificates[0].not_after) < 0
    error_message = "terraform.io certificate has expired"
  }
}
```

Because `plantimestamp()` changes during every plan operation, Terraform recommends using it to compare against timestamps exported by providers, not to generate resource attribute values that you expect to remain stable in state.

## Basic Usage

```hcl
locals {
  # Get the plan timestamp - same value for this plan operation
  plan_time = plantimestamp()

  # Format it for display
  plan_date = formatdate("YYYY-MM-DD", local.plan_time)
  plan_time_of_day = formatdate("hh:mm:ss", local.plan_time)
}

output "plan_timestamp" {
  value = local.plan_time
  # Example: "2026-02-23T14:30:00Z"
}

output "plan_date" {
  value = local.plan_date
  # Example: "2026-02-23"
}
```

## timestamp vs plantimestamp Comparison

Here is a side-by-side comparison:

```hcl
locals {
  # timestamp() - returns current time when evaluated during apply
  # - Unknown during plan
  # - Causes resources to show as changed every time when used in attributes
  # - Good for rare cases where you intentionally need apply-time current time
  ts = timestamp()

  # plantimestamp() - returns time for the current plan operation
  # - Known during plan
  # - Changes on every new plan operation
  # - Good for plan-time validation and comparing provider-exported timestamps
  pts = plantimestamp()
}

# Practical difference in behavior:
resource "aws_instance" "example_ts" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    # This tag changes on every plan even if nothing else changed
    LastApply = timestamp()
  }
}

check "ami_recent_enough" {
  assert {
    # This compares the current plan time with a timestamp returned by the AWS provider
    condition     = timecmp(timeadd(data.aws_ami.latest.creation_date, "720h"), plantimestamp()) > 0
    error_message = "The selected AMI is more than 30 days old."
  }
}
```

Resource Tagging with Stable Timestamps

For deployment metadata that should be saved in state, use a stateful value such as the HashiCorp Time provider's `time_static` resource rather than `plantimestamp()`:

```hcl
resource "time_static" "deployment" {}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
    DeployedAt  = formatdate("YYYY-MM-DD'T'hh:mm:ssZ", time_static.deployment.rfc3339)
    DeployDate  = formatdate("YYYY-MM-DD", time_static.deployment.rfc3339)
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

When timestamps are part of resource names, a stateful timestamp prevents unnecessary recreation:

```hcl
resource "time_static" "deployment" {}

locals {
  # This creates a name that stays stable between runs
  deploy_id = formatdate("YYYYMMDDhhmm", time_static.deployment.rfc3339)
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

Track plan-time lifecycle information for checks and outputs:

```hcl
locals {
  lifecycle_metadata = {
    LastPlannedAt = formatdate("YYYY-MM-DD hh:mm:ss 'UTC'", plantimestamp())
    PlanMonth     = formatdate("YYYY-MM", plantimestamp())
    PlanQuarter   = format("Q%d-%s",
      ceil(tonumber(formatdate("M", plantimestamp())) / 3),
      formatdate("YYYY", plantimestamp())
    )
  }
}

output "plan_lifecycle_metadata" {
  value = local.lifecycle_metadata
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

check "access_key_rotation" {
  assert {
    condition     = timecmp(plantimestamp(), timeadd(aws_iam_access_key.deploy.create_date, "2160h")) < 0
    error_message = "The deploy access key should be rotated."
  }
}
```

## Using in Conditional Logic

Since `plantimestamp` returns an RFC 3339 string for the current plan, you can use it in conditional logic:

```hcl
locals {
  plan_time = plantimestamp()
  plan_hour = tonumber(formatdate("hh", local.plan_time))

  # Warn if planning outside business hours
  is_business_hours = local.plan_hour >= 9 && local.plan_hour < 17

  # Determine the deployment window
  deploy_window = local.is_business_hours ? "business-hours" : "off-hours"
}

output "deployment_window" {
  value = {
    window    = local.deploy_window
    plannedAt = formatdate("hh:mm 'UTC'", local.plan_time)
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

# Use plantimestamp() when you need the current plan time for validation
check "certificate_valid_now" {
  assert {
    condition     = timecmp(plantimestamp(), data.tls_certificate.service.certificates[0].not_after) < 0
    error_message = "The service certificate has expired."
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

If you are stuck on an older version, you can use `timestamp()` for apply-time current time or a stateful resource from the HashiCorp Time provider for stable timestamps. But upgrading to 1.5+ is the better path if you need plan-time timestamp validation.

## Best Practices

Here is a summary of when to use each function:

- Use `plantimestamp()` for plan-time validation, checks, and comparisons against timestamps exported by providers
- Use `timestamp()` for triggers that should fire on every apply, or for truly dynamic values where you want different results each time
- Use a stateful timestamp resource, such as `time_static`, for resource tags, deployment metadata, and naming conventions that should remain stable in Terraform state
- Format `plantimestamp()` with `formatdate()` for human-readable output
- Store `plantimestamp()` in a local value if you reference it in many places, though this is mainly for readability since the function returns the same value within a plan operation

## Summary

The `plantimestamp()` function gives you the timestamp of the current Terraform plan operation. It is useful for plan-time validation, checks, and comparisons against timestamps returned by providers. It does not solve noisy diffs for generated resource attributes, because its value changes on every new plan. Use a stateful value such as the Time provider's `time_static` resource for deployment tags, resource naming, and lifecycle metadata that should remain stable in Terraform state. Reserve `timestamp()` for cases where you genuinely want values to change on every apply.
