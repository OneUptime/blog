# How to Use the timecmp Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Timecmp, Time Comparison, Conditional Logic, Infrastructure as Code

Description: Learn how to use Terraform's timecmp function to compare timestamps for maintenance windows, certificate expiry checks, and conditional infrastructure deployments.

---

The `timecmp` function in Terraform compares two timestamps and tells you which one is earlier, later, or if they are the same. It returns -1, 0, or 1, just like a classic comparator function. This is useful for conditional logic based on dates, checking if certificates have expired, determining if you are inside a maintenance window, and gating deployments based on time.

## Function Syntax

```hcl
# timecmp(timestamp_a, timestamp_b)
# Returns: -1 if a < b, 0 if a == b, 1 if a > b

timecmp("2026-01-01T00:00:00Z", "2026-06-01T00:00:00Z")
# Result: -1 (January is before June)

timecmp("2026-06-01T00:00:00Z", "2026-01-01T00:00:00Z")
# Result: 1 (June is after January)

timecmp("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")
# Result: 0 (same time)
```

Both timestamps must be valid RFC 3339 strings.

## Basic Time Comparisons

```hcl
locals {
  deploy_date   = "2026-02-23T14:00:00Z"
  cutoff_date   = "2026-03-01T00:00:00Z"
  same_date     = "2026-02-23T14:00:00Z"

  # Is deploy_date before cutoff?
  is_before = timecmp(local.deploy_date, local.cutoff_date) < 0
  # Result: true

  # Is deploy_date after cutoff?
  is_after = timecmp(local.deploy_date, local.cutoff_date) > 0
  # Result: false

  # Are they the same?
  is_same = timecmp(local.deploy_date, local.same_date) == 0
  # Result: true
}
```

## Checking Certificate Expiry

One of the most practical uses is checking whether a certificate or credential has expired:

```hcl
variable "cert_expiry_date" {
  type        = string
  description = "Certificate expiry date in RFC 3339 format"
  default     = "2026-06-15T00:00:00Z"
}

locals {
  now = timestamp()

  # Has the certificate expired?
  cert_expired = timecmp(local.now, var.cert_expiry_date) >= 0

  # Will it expire within 30 days?
  thirty_days_from_now = timeadd(local.now, "720h")
  cert_expiring_soon = timecmp(local.thirty_days_from_now, var.cert_expiry_date) >= 0

  # Days until expiry (approximate)
  cert_status = local.cert_expired ? "EXPIRED" : (
    local.cert_expiring_soon ? "EXPIRING_SOON" : "VALID"
  )
}

output "certificate_status" {
  value = {
    status     = local.cert_status
    expires_at = var.cert_expiry_date
    checked_at = formatdate("YYYY-MM-DD HH:mm 'UTC'", local.now)
  }
}
```

## Maintenance Window Logic

Determine if the current time falls within a maintenance window:

```hcl
variable "maintenance_start" {
  type    = string
  default = "2026-02-23T02:00:00Z"
}

variable "maintenance_end" {
  type    = string
  default = "2026-02-23T06:00:00Z"
}

locals {
  now = timestamp()

  # Check if we are inside the maintenance window
  after_start  = timecmp(local.now, var.maintenance_start) >= 0
  before_end   = timecmp(local.now, var.maintenance_end) < 0
  in_maintenance = local.after_start && local.before_end
}

output "maintenance_status" {
  value = local.in_maintenance ? "IN MAINTENANCE WINDOW" : "Normal operations"
}
```

## Conditional Resource Deployment

Deploy resources only after a certain date:

```hcl
variable "feature_launch_date" {
  type        = string
  description = "Date when the new feature should go live"
  default     = "2026-03-01T00:00:00Z"
}

locals {
  now = timestamp()
  feature_active = timecmp(local.now, var.feature_launch_date) >= 0
}

# Only create the new API gateway after the launch date
resource "aws_api_gateway_rest_api" "new_feature" {
  count = local.feature_active ? 1 : 0

  name        = "new-feature-api"
  description = "API for the new feature"
}

output "feature_status" {
  value = local.feature_active ? "Feature is LIVE" : "Feature launches on ${formatdate("MMMM DD, YYYY", var.feature_launch_date)}"
}
```

## Comparing Resource Timestamps

Compare timestamps from different resources to determine ordering:

```hcl
locals {
  # Assume these come from data sources or resource attributes
  backup_timestamp  = "2026-02-20T03:00:00Z"
  deploy_timestamp  = "2026-02-22T14:30:00Z"

  # Was the backup taken before or after the last deployment?
  backup_before_deploy = timecmp(local.backup_timestamp, local.deploy_timestamp) < 0

  backup_age_status = local.backup_before_deploy ? "Backup is from before the last deployment - consider taking a fresh backup" : "Backup is current"
}

output "backup_status" {
  value = local.backup_age_status
}
```

## Implementing Time-Based Feature Flags

Use time comparisons to roll out features on a schedule:

```hcl
variable "feature_flags" {
  type = map(object({
    enabled_after = string  # RFC 3339 timestamp
    description   = string
  }))
  default = {
    new_dashboard = {
      enabled_after = "2026-03-01T00:00:00Z"
      description   = "New monitoring dashboard"
    }
    v2_api = {
      enabled_after = "2026-04-01T00:00:00Z"
      description   = "Version 2 API endpoints"
    }
    dark_mode = {
      enabled_after = "2026-02-15T00:00:00Z"
      description   = "Dark mode support"
    }
  }
}

locals {
  now = timestamp()

  active_features = {
    for name, flag in var.feature_flags :
    name => flag
    if timecmp(local.now, flag.enabled_after) >= 0
  }

  pending_features = {
    for name, flag in var.feature_flags :
    name => flag
    if timecmp(local.now, flag.enabled_after) < 0
  }
}

output "feature_status" {
  value = {
    active  = [for name, _ in local.active_features : name]
    pending = {
      for name, flag in local.pending_features :
      name => formatdate("MMMM DD, YYYY", flag.enabled_after)
    }
  }
}
```

## Enforcing Minimum Age Requirements

Check that a timestamp is old enough before proceeding:

```hcl
variable "last_backup_time" {
  type        = string
  description = "Timestamp of the last successful backup"
  default     = "2026-02-22T00:00:00Z"
}

locals {
  now = timestamp()

  # Check if backup is less than 24 hours old
  max_backup_age = timeadd(local.now, "-24h")
  backup_is_fresh = timecmp(var.last_backup_time, local.max_backup_age) > 0

  # Check if backup is less than 7 days old
  max_weekly_age = timeadd(local.now, "-168h")
  backup_within_week = timecmp(var.last_backup_time, local.max_weekly_age) > 0
}

output "backup_freshness" {
  value = {
    last_backup    = var.last_backup_time
    within_24h     = local.backup_is_fresh
    within_7_days  = local.backup_within_week
    recommendation = local.backup_is_fresh ? "Backup is recent" : "Consider running a fresh backup before proceeding"
  }
}
```

## Sorting Events by Timestamp

While Terraform does not have a general-purpose sort for timestamps, you can use `timecmp` to find the earliest or latest:

```hcl
locals {
  events = {
    deployment = "2026-02-20T14:30:00Z"
    backup     = "2026-02-21T03:00:00Z"
    migration  = "2026-02-19T10:00:00Z"
    rollback   = "2026-02-22T09:15:00Z"
  }

  # Find the most recent event
  latest_event = [
    for name, ts in local.events :
    name
    if alltrue([
      for other_ts in values(local.events) :
      timecmp(ts, other_ts) >= 0
    ])
  ][0]

  # Find the oldest event
  oldest_event = [
    for name, ts in local.events :
    name
    if alltrue([
      for other_ts in values(local.events) :
      timecmp(ts, other_ts) <= 0
    ])
  ][0]
}

output "event_timeline" {
  value = {
    most_recent = local.latest_event  # "rollback"
    oldest      = local.oldest_event  # "migration"
  }
}
```

## Validating Time-Based Inputs

Use `timecmp` in validation blocks to enforce time constraints:

```hcl
variable "scheduled_time" {
  type        = string
  description = "Scheduled deployment time (must be in the future)"

  validation {
    condition = timecmp(var.scheduled_time, plantimestamp()) > 0
    error_message = "Scheduled time must be in the future."
  }
}

variable "time_range" {
  type = object({
    start = string
    end   = string
  })
  description = "Time range for the operation"

  validation {
    condition = timecmp(var.time_range.start, var.time_range.end) < 0
    error_message = "Start time must be before end time."
  }
}
```

## Combining timecmp with Other Functions

```hcl
locals {
  now = timestamp()
  deadlines = {
    phase_1 = "2026-03-01T00:00:00Z"
    phase_2 = "2026-04-01T00:00:00Z"
    phase_3 = "2026-05-01T00:00:00Z"
  }

  # Determine the current phase
  current_phase = (
    timecmp(local.now, local.deadlines.phase_1) < 0 ? "Phase 1 - Planning" :
    timecmp(local.now, local.deadlines.phase_2) < 0 ? "Phase 2 - Development" :
    timecmp(local.now, local.deadlines.phase_3) < 0 ? "Phase 3 - Testing" :
    "Phase 4 - Production"
  )
}

output "project_phase" {
  value = local.current_phase
}
```

## Summary

The `timecmp` function is Terraform's way of answering the question "which timestamp is earlier?" It returns -1, 0, or 1, letting you build conditional logic around time. The most common uses are checking expiry dates, gating deployments to specific time windows, implementing time-based feature flags, and validating that user-provided timestamps make sense. Combined with `timestamp()`, `timeadd()`, and `formatdate()`, it gives you a complete toolkit for time-aware infrastructure code.
