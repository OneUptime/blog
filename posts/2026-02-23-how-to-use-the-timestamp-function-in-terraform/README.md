# How to Use the timestamp Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, timestamp, Time Functions, Resource Triggers, Infrastructure as Code

Description: Learn how to use Terraform's timestamp function to get the current time in UTC, format it for tags and names, and understand its behavior during plan and apply.

---

The `timestamp()` function in Terraform returns the current date and time in UTC as an RFC 3339 string. It is one of the simplest functions in Terraform, but its behavior during plan and apply can catch you off guard if you do not understand how it works. This post covers everything from basic usage to the subtle behaviors that matter in production.

## Basic Usage

The function takes no arguments and returns the current UTC time:

```hcl
# Returns the current UTC time in RFC 3339 format
output "current_time" {
  value = timestamp()
  # Example: "2026-02-23T14:30:05Z"
}
```

The return value always follows this format: `YYYY-MM-DDTHH:MM:SSZ`. The trailing `Z` indicates UTC timezone.

## Formatting the Timestamp

The raw RFC 3339 format is useful for machines but not great for humans. Use `formatdate()` to convert it:

```hcl
locals {
  now = timestamp()

  # Different date formats
  date_only     = formatdate("YYYY-MM-DD", local.now)        # "2026-02-23"
  time_only     = formatdate("HH:mm:ss", local.now)          # "14:30:05"
  human_date    = formatdate("MMMM DD, YYYY", local.now)     # "February 23, 2026"
  compact       = formatdate("YYYYMMDDHHmmss", local.now)    # "20260223143005"
  with_day      = formatdate("EEE, MMM DD YYYY", local.now)  # "Mon, Feb 23 2026"
}
```

## Using timestamp for Resource Tags

Adding deployment timestamps to resource tags is one of the most common uses:

```hcl
locals {
  deploy_tags = {
    DeployedAt  = timestamp()
    DeployDate  = formatdate("YYYY-MM-DD", timestamp())
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags          = merge(local.deploy_tags, {
    Name = "web-server"
  })
}
```

Important caveat: because `timestamp()` returns a different value on every evaluation, these tags will show as changed on every `terraform plan`, even when nothing else is different. If this annoys you, consider using `plantimestamp()` instead (available in Terraform 1.5+).

## Forcing Resource Recreation

One of the most useful patterns with `timestamp()` is forcing a resource to update on every apply:

```hcl
# This null_resource will always trigger on every apply
resource "null_resource" "deployment" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOF
      echo "Deploying at $(date)"
      ./scripts/deploy.sh ${var.environment}
    EOF
  }
}
```

By putting `timestamp()` in the triggers map, you guarantee the resource is "tainted" on every plan, causing it to be destroyed and recreated.

## Time-Based Resource Names

Creating unique names for one-off resources like snapshots or backups:

```hcl
resource "aws_db_snapshot" "pre_migration" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_snapshot_identifier = "pre-migration-${formatdate("YYYY-MM-DD-HHmmss", timestamp())}"

  tags = {
    Name    = "Pre-migration snapshot"
    Created = timestamp()
  }
}

resource "aws_ami_from_instance" "backup" {
  name               = "backup-${formatdate("YYYYMMDD-HHmmss", timestamp())}"
  source_instance_id = aws_instance.web.id

  tags = {
    Name    = "Instance backup"
    Created = formatdate("YYYY-MM-DD", timestamp())
  }
}
```

## Understanding the Plan vs Apply Behavior

This is the most important thing to understand about `timestamp()`. The function is evaluated at the time of evaluation, which means:

1. During `terraform plan`, it returns the time when the plan runs
2. During `terraform apply`, it returns the time when the apply runs
3. These are different times, so the actual applied value differs from what the plan showed

```hcl
# Demonstration of the timing behavior
output "deploy_time" {
  value = timestamp()
  # Plan output:  "2026-02-23T14:30:00Z"  (time of plan)
  # Apply output: "2026-02-23T14:32:15Z"  (time of apply, ~2 min later)
}
```

This means you should not rely on the exact value shown in the plan matching what gets applied.

## Using timestamp with timeadd

Calculate future or past times relative to now:

```hcl
locals {
  now = timestamp()

  # 24 hours from now
  tomorrow = timeadd(local.now, "24h")

  # 30 days from now
  expiry_date = timeadd(local.now, "720h")

  # 1 hour ago
  one_hour_ago = timeadd(local.now, "-1h")
}

output "dates" {
  value = {
    now       = formatdate("YYYY-MM-DD HH:mm", local.now)
    tomorrow  = formatdate("YYYY-MM-DD HH:mm", local.tomorrow)
    expiry    = formatdate("YYYY-MM-DD", local.expiry_date)
    hour_ago  = formatdate("YYYY-MM-DD HH:mm", local.one_hour_ago)
  }
}
```

## Comparing Timestamps

Use `timecmp` to compare the current time with other timestamps:

```hcl
variable "maintenance_window_start" {
  type    = string
  default = "2026-03-01T00:00:00Z"
}

locals {
  # Check if we are past the maintenance window
  past_maintenance = timecmp(timestamp(), var.maintenance_window_start) >= 0
}

output "maintenance_status" {
  value = local.past_maintenance ? "Maintenance window has passed" : "Before maintenance window"
}
```

## Avoiding Unnecessary Changes

The biggest challenge with `timestamp()` is preventing unwanted diffs. Here are strategies:

### Strategy 1: Use lifecycle ignore_changes

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "web-server"
    DeployedAt = timestamp()
  }

  # Ignore changes to the DeployedAt tag after initial creation
  lifecycle {
    ignore_changes = [tags["DeployedAt"]]
  }
}
```

### Strategy 2: Use plantimestamp() instead

```hcl
# Available in Terraform 1.5+
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "web-server"
    DeployedAt = plantimestamp()  # Stable within a plan-apply cycle
  }
}
```

### Strategy 3: Only use timestamp in triggers

```hcl
# The timestamp only matters for deciding whether to re-run
resource "null_resource" "config_update" {
  triggers = {
    config_hash = sha256(jsonencode(var.config))
    # Do NOT add timestamp() here unless you want it to run every time
  }

  provisioner "local-exec" {
    command = "echo Config updated at $(date)"
  }
}
```

## Storing Deployment Metadata

A practical pattern is to record deployment information in a separate resource:

```hcl
resource "local_file" "deploy_info" {
  filename = "${path.module}/deploy-info.json"
  content = jsonencode({
    deployed_at = timestamp()
    environment = var.environment
    version     = var.app_version
    terraform_version = "1.5+"
  })

  # This file will be updated on every apply
}
```

## Using timestamp in Data Sources

You can use timestamps to create time-based queries:

```hcl
locals {
  # Get logs from the last 24 hours
  log_start_time = timeadd(timestamp(), "-24h")
  log_start_formatted = formatdate("YYYY-MM-DD'T'HH:mm:ss'Z'", local.log_start_time)
}
```

## Common Mistakes

Here are the pitfalls people fall into:

1. Using `timestamp()` in resource names that should not change. If a resource name includes a timestamp and the timestamp changes, Terraform will try to destroy and recreate the resource.

2. Not understanding that `timestamp()` returns different values on plan and apply. If you save the plan to a file and apply it later, the applied value will still differ.

3. Using `timestamp()` in count or for_each conditions. Since the value changes every time, it can cause unexpected resource creation or destruction.

4. Putting `timestamp()` in module inputs without understanding that the downstream module will see a changed value on every plan.

## Summary

The `timestamp()` function returns the current UTC time as an RFC 3339 string. It is straightforward but has an important behavioral characteristic: it returns a new value on every evaluation, which means resources referencing it will show as changed on every plan. Use it intentionally for triggers that should fire on every apply, time-stamped resource names for one-off resources, and deployment metadata. For stable timestamp tagging, prefer `plantimestamp()` when your Terraform version supports it.
