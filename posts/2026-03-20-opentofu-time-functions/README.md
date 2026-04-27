# How to Use Date and Time Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Time

Description: Learn how to use formatdate, timestamp, timeadd, timecmp, and plantimestamp functions in OpenTofu for time-based operations.

OpenTofu provides time functions for working with dates and timestamps. These are useful for setting expiration dates, naming resources with timestamps, and implementing time-based logic.

## timestamp()

Returns the current UTC time as an RFC 3339 string. Note: this is evaluated at apply time and changes on every run:

```hcl
> timestamp()
"2026-03-20T10:30:00Z"
```

```hcl
locals {
  # Create a timestamped resource name (changes every run!)
  deployment_id = "deploy-${timestamp()}"
}
```

## plantimestamp()

Similar to `timestamp()` but is consistent throughout a plan - it returns the same value for all calls within a single plan execution:

```hcl
locals {
  plan_time = plantimestamp()
  # Same value used everywhere in this plan
  
  deploy_tag = formatdate("YYYY-MM-DD", local.plan_time)
}
```

## formatdate()

Formats a timestamp string using a format string:

```hcl
> formatdate("YYYY-MM-DD", "2026-03-20T10:30:00Z")
"2026-03-20"

> formatdate("DD MMM YYYY hh:mm:ss", "2026-03-20T10:30:00Z")
"20 Mar 2026 10:30:00"
```

Format tokens:

| Token | Description | Example |
|-------|-------------|---------|
| YYYY | 4-digit year | 2026 |
| YY | 2-digit year | 26 |
| MM | 2-digit month | 03 |
| MMM | Month abbreviation | Mar |
| DD | 2-digit day | 20 |
| hh | 2-digit hour (24h) | 10 |
| mm | 2-digit minute | 30 |
| ss | 2-digit second | 00 |

```hcl
locals {
  current_time = plantimestamp()
  date_tag     = formatdate("YYYY-MM-DD", local.current_time)
  year_month   = formatdate("YYYY-MM", local.current_time)
}

resource "aws_s3_bucket" "backups" {
  bucket = "myapp-backups-${local.year_month}"
  
  tags = {
    CreatedDate = local.date_tag
  }
}
```

## timeadd()

Adds a duration to a timestamp:

```hcl
> timeadd("2026-03-20T10:00:00Z", "24h")
"2026-03-21T10:00:00Z"

> timeadd("2026-03-20T10:00:00Z", "30m")
"2026-03-20T10:30:00Z"

> timeadd("2026-03-20T10:00:00Z", "-24h")
"2026-03-19T10:00:00Z"
```

Duration format: `Xh`, `Xm`, `Xs` (can combine: `1h30m`)

```hcl
locals {
  now         = plantimestamp()
  # Expire in 90 days
  expiry_date = timeadd(local.now, "${90 * 24}h")
}

resource "aws_acm_certificate" "api" {
  domain_name       = "api.example.com"
  validation_method = "DNS"
  
  tags = {
    ExpiresAfter = formatdate("YYYY-MM-DD", local.expiry_date)
  }
}
```

## timecmp()

Compares two timestamps. Returns -1, 0, or 1:

```hcl
> timecmp("2026-03-20T00:00:00Z", "2026-03-21T00:00:00Z")
-1  # first is before second

> timecmp("2026-03-21T00:00:00Z", "2026-03-20T00:00:00Z")
1   # first is after second

> timecmp("2026-03-20T00:00:00Z", "2026-03-20T00:00:00Z")
0   # equal
```

```hcl
variable "maintenance_window_start" {
  type    = string
  default = "2026-04-01T00:00:00Z"
}

locals {
  now                   = plantimestamp()
  in_maintenance_window = timecmp(local.now, var.maintenance_window_start) >= 0
}

resource "aws_instance" "web" {
  count = local.in_maintenance_window ? 0 : 1
  # Destroy instance during maintenance window
}
```

## Conclusion

Time functions enable time-aware infrastructure configurations. Use `plantimestamp()` (not `timestamp()`) when you need a consistent time value throughout a plan. Use `formatdate()` for human-readable date tags, `timeadd()` for calculating expiry dates, and `timecmp()` for conditional logic based on time comparisons.
