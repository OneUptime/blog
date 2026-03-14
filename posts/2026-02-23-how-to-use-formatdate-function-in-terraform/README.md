# How to Use formatdate Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Formatdate, Date Formatting, Time Functions, Infrastructure as Code

Description: Learn how to use Terraform's formatdate function to convert timestamps into human-readable date strings for resource tags, naming, and configuration values.

---

Terraform's `formatdate` function converts a timestamp into a human-readable string using a format specification. This is useful for tagging resources with deployment dates, creating time-based resource names, generating expiry dates for certificates, and building audit trails. This post covers the syntax, format specifiers, and practical examples you need to start using `formatdate` effectively.

## Function Syntax

The `formatdate` function takes two arguments: a format string and a timestamp in RFC 3339 format:

```hcl
# formatdate(spec, timestamp)
formatdate("YYYY-MM-DD", "2026-02-23T14:30:00Z")
# Result: "2026-02-23"
```

The timestamp must be a string in RFC 3339 format (like `2026-02-23T14:30:00Z`). In practice, you will usually get this from the `timestamp()` function or from a resource attribute.

## Format Specifiers

The `formatdate` function uses letter-based specifiers. Here are all the available ones:

```hcl
locals {
  ts = "2026-02-23T14:05:09Z"

  # Year
  full_year  = formatdate("YYYY", local.ts)    # "2026"
  short_year = formatdate("YY", local.ts)       # "26"

  # Month
  month_num    = formatdate("MM", local.ts)      # "02"
  month_name   = formatdate("MMMM", local.ts)    # "February"
  month_abbrev = formatdate("MMM", local.ts)     # "Feb"
  month_single = formatdate("M", local.ts)       # "2" (no zero padding)

  # Day
  day_padded = formatdate("DD", local.ts)        # "23"
  day_single = formatdate("D", local.ts)         # "23"

  # Day of week
  day_name   = formatdate("EEEE", local.ts)      # "Monday"
  day_abbrev = formatdate("EEE", local.ts)       # "Mon"
  day_short  = formatdate("EE", local.ts)        # "Mo"

  # Hour (24-hour)
  hour_24 = formatdate("HH", local.ts)          # "14"

  # Hour (12-hour)
  hour_12 = formatdate("hh", local.ts)          # "02"
  ampm    = formatdate("AA", local.ts)           # "PM"
  ampm_lc = formatdate("aa", local.ts)           # "pm"

  # Minute
  minute = formatdate("mm", local.ts)            # "05"

  # Second
  second = formatdate("ss", local.ts)            # "09"

  # Timezone
  tz_offset = formatdate("Z", local.ts)          # "Z"
  tz_colon  = formatdate("ZZZZ", local.ts)       # "Z"
  tz_name   = formatdate("ZZZZZ", local.ts)      # "UTC"
}
```

## Common Date Formats

Here are the formats you will use most often:

```hcl
locals {
  now = timestamp()

  # ISO 8601 date
  iso_date = formatdate("YYYY-MM-DD", local.now)
  # Example: "2026-02-23"

  # ISO 8601 datetime
  iso_datetime = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", local.now)
  # Example: "2026-02-23T14:30:00Z"

  # US date format
  us_date = formatdate("MM/DD/YYYY", local.now)
  # Example: "02/23/2026"

  # European date format
  eu_date = formatdate("DD/MM/YYYY", local.now)
  # Example: "23/02/2026"

  # Human-readable
  readable = formatdate("MMMM DD, YYYY", local.now)
  # Example: "February 23, 2026"

  # Compact format (good for resource names)
  compact = formatdate("YYYYMMDDHHmmss", local.now)
  # Example: "20260223143000"

  # Short compact
  short_compact = formatdate("YYYYMMDD", local.now)
  # Example: "20260223"
}
```

## Tagging Resources with Deploy Dates

One of the most practical uses is adding deployment timestamps to resource tags:

```hcl
locals {
  deploy_date = formatdate("YYYY-MM-DD", timestamp())
  deploy_time = formatdate("HH:mm:ss", timestamp())

  common_tags = {
    DeployDate  = local.deploy_date
    DeployTime  = local.deploy_time
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  tags          = merge(local.common_tags, {
    Name = "web-server"
  })
}

resource "aws_s3_bucket" "logs" {
  bucket = "logs-${formatdate("YYYYMMDD", timestamp())}"
  tags   = local.common_tags
}
```

## Time-Based Resource Naming

Create unique resource names that include the deployment date:

```hcl
locals {
  # Date-stamped snapshot name
  snapshot_name = format(
    "%s-%s-snapshot-%s",
    var.project,
    var.environment,
    formatdate("YYYY-MM-DD-HHmm", timestamp())
  )
  # Example: "myapp-prod-snapshot-2026-02-23-1430"

  # Weekly backup naming
  backup_name = format(
    "backup-%s-week%s",
    formatdate("YYYY", timestamp()),
    formatdate("WW", timestamp())
  )
}
```

## Using formatdate with Lifecycle Policies

Build expiration dates for resources:

```hcl
locals {
  # Current time plus 90 days for certificate expiry tracking
  deploy_timestamp = timestamp()
  deploy_date      = formatdate("YYYY-MM-DD", local.deploy_timestamp)

  # Tag with quarter information
  quarter = ceil(tonumber(formatdate("M", local.deploy_timestamp)) / 3)
  fiscal_quarter = format("Q%d-%s", local.quarter, formatdate("YYYY", local.deploy_timestamp))
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name           = "app-server"
    DeployDate     = local.deploy_date
    FiscalQuarter  = local.fiscal_quarter  # "Q1-2026"
  }
}
```

## Literal Characters in Format Strings

To include literal text that should not be interpreted as format specifiers, wrap it in single quotes:

```hcl
locals {
  ts = timestamp()

  # "Deployed on February 23, 2026 at 14:30"
  message = formatdate("'Deployed on' MMMM DD, YYYY 'at' HH:mm", local.ts)

  # "Date: 2026-02-23"
  labeled = formatdate("'Date:' YYYY-MM-DD", local.ts)
}
```

## Building Audit Trail Entries

```hcl
locals {
  audit_entry = format(
    "[%s] Resource deployed by Terraform in %s environment",
    formatdate("YYYY-MM-DD HH:mm:ss 'UTC'", timestamp()),
    var.environment
  )
  # "[2026-02-23 14:30:00 UTC] Resource deployed by Terraform in production environment"
}
```

## Using formatdate in Outputs

Outputs with formatted dates help operators quickly see when infrastructure was deployed:

```hcl
output "deployment_info" {
  value = {
    deployed_at  = formatdate("MMMM DD, YYYY 'at' hh:mm AA", timestamp())
    deployed_by  = "terraform"
    environment  = var.environment
    date_compact = formatdate("YYYYMMDD", timestamp())
  }
}
```

## Combining formatdate with Other Functions

```hcl
locals {
  # Use formatdate with timeadd for future dates
  now            = timestamp()
  thirty_days    = timeadd(local.now, "720h")
  expiry_date    = formatdate("YYYY-MM-DD", local.thirty_days)

  # Format a date from an external data source
  cert_expiry_raw = data.aws_acm_certificate.main.not_after
  cert_expiry     = formatdate("MMMM DD, YYYY", local.cert_expiry_raw)
}
```

## Gotchas to Watch For

A few things to keep in mind:

1. The `timestamp()` function returns a new value every time Terraform evaluates it. This means resources that depend on it will show as changed on every plan. Use `plantimestamp()` if you want a consistent value within a single plan run.

2. The format specifiers are case-sensitive. `MM` is month, `mm` is minute. `HH` is 24-hour, `hh` is 12-hour. Getting these mixed up is a common mistake.

3. All timestamps are in UTC. If you need local time, you will have to calculate the offset manually with `timeadd`.

4. The format string does not support arbitrary text without quoting. Letters that match specifiers will be interpreted as format verbs unless wrapped in single quotes.

## Summary

The `formatdate` function is essential for creating human-readable dates in Terraform. Use it for resource tags, naming conventions, audit trails, and deployment metadata. Remember the key specifiers: `YYYY` for year, `MM` for month, `DD` for day, `HH` for 24-hour, `mm` for minutes, and `ss` for seconds. Combine it with `timestamp()` for current time or with other time functions for calculated dates.
