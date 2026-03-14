# How to Use the timeadd Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Timeadd, Time Functions, Duration, Infrastructure as Code

Description: Learn how to use Terraform's timeadd function to calculate future and past timestamps for certificate expiry, maintenance windows, and time-based resource policies.

---

The `timeadd` function in Terraform adds a duration to a timestamp and returns the resulting time. It is the go-to function for calculating future dates (like certificate expiry, maintenance windows, or rotation schedules) and past dates (like log query ranges or retention cutoffs). This post covers the syntax, duration format, and practical uses you will encounter.

## Function Syntax

The `timeadd` function takes a timestamp and a duration string:

```hcl
# timeadd(timestamp, duration)
timeadd("2026-02-23T00:00:00Z", "24h")
# Result: "2026-02-24T00:00:00Z"
```

The timestamp must be in RFC 3339 format. The duration follows Go's duration format.

## Duration Format

Durations are strings made up of a number and a unit suffix. You can combine multiple units:

```hcl
locals {
  base_time = "2026-02-23T12:00:00Z"

  # Hours
  plus_1h   = timeadd(local.base_time, "1h")    # 2026-02-23T13:00:00Z
  plus_24h  = timeadd(local.base_time, "24h")   # 2026-02-24T12:00:00Z

  # Minutes
  plus_30m  = timeadd(local.base_time, "30m")   # 2026-02-23T12:30:00Z
  plus_90m  = timeadd(local.base_time, "90m")   # 2026-02-23T13:30:00Z

  # Seconds
  plus_300s = timeadd(local.base_time, "300s")  # 2026-02-23T12:05:00Z

  # Combined units
  plus_1h30m = timeadd(local.base_time, "1h30m")  # 2026-02-23T13:30:00Z

  # Negative durations (go back in time)
  minus_1h  = timeadd(local.base_time, "-1h")   # 2026-02-23T11:00:00Z
  minus_24h = timeadd(local.base_time, "-24h")  # 2026-02-22T12:00:00Z
}
```

The supported units are:
- `h` - hours
- `m` - minutes
- `s` - seconds

There is no direct support for days, weeks, months, or years. You have to convert them to hours.

## Converting Days, Weeks, and Months to Hours

Since `timeadd` only understands hours, minutes, and seconds, here are the common conversions:

```hcl
locals {
  now = timestamp()

  # Days to hours
  days_7   = timeadd(local.now, "${7 * 24}h")    # 1 week
  days_30  = timeadd(local.now, "${30 * 24}h")   # ~1 month
  days_90  = timeadd(local.now, "${90 * 24}h")   # ~3 months
  days_365 = timeadd(local.now, "${365 * 24}h")  # ~1 year

  # Using explicit multiplication
  one_week    = timeadd(local.now, "168h")   # 7 * 24
  one_month   = timeadd(local.now, "720h")   # 30 * 24
  three_months = timeadd(local.now, "2160h") # 90 * 24
  one_year    = timeadd(local.now, "8760h")  # 365 * 24
}
```

## Setting Certificate Expiry Dates

One of the most practical uses is tracking or setting expiration dates:

```hcl
locals {
  now = timestamp()

  # TLS certificate renewal reminder - 30 days before expiry
  cert_expiry = timeadd(local.now, "8760h")   # 1 year from now
  renewal_reminder = timeadd(local.cert_expiry, "-720h")  # 30 days before expiry
}

resource "tls_private_key" "ca" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name  = "My CA"
    organization = "My Org"
  }

  # Valid for 1 year
  validity_period_hours = 8760

  allowed_uses = [
    "cert_signing",
    "crl_signing",
  ]

  is_ca_certificate = true
}

output "certificate_info" {
  value = {
    created_at      = formatdate("YYYY-MM-DD", local.now)
    expires_at      = formatdate("YYYY-MM-DD", local.cert_expiry)
    renew_by        = formatdate("YYYY-MM-DD", local.renewal_reminder)
  }
}
```

## Maintenance Window Scheduling

Calculate maintenance windows relative to a base time:

```hcl
variable "maintenance_base_time" {
  type        = string
  description = "Base time for maintenance window (RFC 3339)"
  default     = "2026-03-01T02:00:00Z"
}

locals {
  maint_start = var.maintenance_base_time
  maint_end   = timeadd(var.maintenance_base_time, "4h")

  # Next maintenance windows (weekly)
  next_windows = [
    for i in range(4) : {
      start = timeadd(var.maintenance_base_time, "${i * 168}h")
      end   = timeadd(var.maintenance_base_time, "${i * 168 + 4}h")
    }
  ]
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "mydb-cluster"
  engine            = "aurora-postgresql"

  preferred_maintenance_window = "sun:02:00-sun:06:00"

  tags = {
    NextMaintenance = formatdate("YYYY-MM-DD HH:mm 'UTC'", local.maint_start)
    MaintenanceEnd  = formatdate("YYYY-MM-DD HH:mm 'UTC'", local.maint_end)
  }
}

output "maintenance_schedule" {
  value = [
    for window in local.next_windows : {
      start = formatdate("MMMM DD, YYYY HH:mm 'UTC'", window.start)
      end   = formatdate("MMMM DD, YYYY HH:mm 'UTC'", window.end)
    }
  ]
}
```

## Secret Rotation Policies

Track when secrets should be rotated:

```hcl
locals {
  now = timestamp()

  rotation_schedule = {
    api_key = {
      created  = local.now
      rotate_by = timeadd(local.now, "2160h")  # 90 days
    }
    db_password = {
      created  = local.now
      rotate_by = timeadd(local.now, "720h")   # 30 days
    }
    ssh_key = {
      created  = local.now
      rotate_by = timeadd(local.now, "8760h")  # 365 days
    }
  }
}

resource "aws_secretsmanager_secret" "api_key" {
  name = "api-key-${var.environment}"

  tags = {
    CreatedAt   = formatdate("YYYY-MM-DD", local.now)
    RotateBy    = formatdate("YYYY-MM-DD", local.rotation_schedule.api_key.rotate_by)
    MaxAgeHours = "2160"
  }
}
```

## Log Query Time Ranges

Build time ranges for querying logs or metrics:

```hcl
locals {
  now = timestamp()

  # Time ranges for different alert lookback periods
  lookback = {
    last_5m  = timeadd(local.now, "-5m")
    last_15m = timeadd(local.now, "-15m")
    last_1h  = timeadd(local.now, "-1h")
    last_24h = timeadd(local.now, "-24h")
    last_7d  = timeadd(local.now, "-168h")
  }
}

output "time_ranges" {
  value = {
    for period, start_time in local.lookback :
    period => {
      start = formatdate("YYYY-MM-DD'T'HH:mm:ss'Z'", start_time)
      end   = formatdate("YYYY-MM-DD'T'HH:mm:ss'Z'", local.now)
    }
  }
}
```

## Backup Retention Calculations

Calculate when backups should expire:

```hcl
variable "backup_retention_days" {
  type    = number
  default = 30
}

locals {
  now = timestamp()
  backup_expiry = timeadd(local.now, "${var.backup_retention_days * 24}h")
}

resource "aws_db_instance" "main" {
  identifier     = "mydb"
  engine         = "postgres"
  instance_class = "db.t3.medium"

  backup_retention_period = var.backup_retention_days

  tags = {
    BackupRetention = "${var.backup_retention_days} days"
    OldestBackup    = formatdate("YYYY-MM-DD", timeadd(local.now, "-${var.backup_retention_days * 24}h"))
  }
}
```

## Chaining timeadd Calls

You can chain multiple `timeadd` calls for complex calculations:

```hcl
locals {
  deployment_time = timestamp()

  # Canary deployment schedule
  canary_start    = local.deployment_time                          # Deploy starts
  canary_5pct     = timeadd(local.canary_start, "15m")            # 5% after 15 min
  canary_25pct    = timeadd(local.canary_5pct, "30m")             # 25% after 45 min total
  canary_50pct    = timeadd(local.canary_25pct, "1h")             # 50% after 1h45m total
  canary_100pct   = timeadd(local.canary_50pct, "2h")             # 100% after 3h45m total
}

output "canary_schedule" {
  value = {
    "5_percent"   = formatdate("HH:mm 'UTC'", local.canary_5pct)
    "25_percent"  = formatdate("HH:mm 'UTC'", local.canary_25pct)
    "50_percent"  = formatdate("HH:mm 'UTC'", local.canary_50pct)
    "100_percent" = formatdate("HH:mm 'UTC'", local.canary_100pct)
  }
}
```

## Building TTL-Based Cleanup Tags

Tag resources with expiration dates for automated cleanup:

```hcl
variable "ttl_hours" {
  type        = number
  description = "Hours before this resource should be cleaned up"
  default     = 72
}

locals {
  expiry_time = timeadd(timestamp(), "${var.ttl_hours}h")
}

resource "aws_instance" "temp" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name      = "temp-instance"
    TTL       = "${var.ttl_hours}h"
    ExpiresAt = local.expiry_time
    ExpiresOn = formatdate("YYYY-MM-DD", local.expiry_time)
  }
}
```

## Limitations

There are a few things to keep in mind:

1. No month or year units. You have to calculate the hours yourself. A "month" is ambiguous (28-31 days), so Terraform avoids this.

2. No timezone support. All timestamps are in UTC. If you need to work with local time zones, you have to add or subtract the UTC offset manually.

3. `timeadd` does not account for daylight saving time. It works purely in UTC, which is usually what you want for infrastructure.

4. The input timestamp must be valid RFC 3339. If you pass a malformed string, Terraform will error at plan time.

## Summary

The `timeadd` function is your tool for date arithmetic in Terraform. It adds or subtracts a duration from a timestamp, giving you the ability to calculate expiry dates, maintenance windows, rotation schedules, and retention periods. Remember that durations use hours, minutes, and seconds only - convert days by multiplying by 24. Combined with `formatdate` and `timestamp()` or `plantimestamp()`, `timeadd` covers most time-based logic you will need in infrastructure code.
