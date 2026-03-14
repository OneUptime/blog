# How to Format Dates and Times in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Date Formatting, Time Functions, Formatdate, Infrastructure as Code

Description: A comprehensive guide to formatting dates and times in Terraform using formatdate, timestamp, and related functions for tags, names, and configuration values.

---

Date and time formatting in Terraform comes up more often than you would expect. Resource tags, log file names, backup identifiers, certificate metadata, and deployment records all need human-readable dates. Terraform provides the `formatdate` function as the primary tool for converting timestamps into formatted strings. This post serves as a complete reference for date and time formatting in Terraform.

## The formatdate Function

The `formatdate` function converts an RFC 3339 timestamp into a formatted string:

```hcl
# formatdate(format_spec, timestamp)
formatdate("YYYY-MM-DD", "2026-02-23T14:30:00Z")
# Result: "2026-02-23"
```

The format specification uses letter-based tokens that get replaced with the corresponding date or time component.

## Complete Format Token Reference

Here is every token available in `formatdate`:

```hcl
locals {
  ts = "2026-02-23T14:05:09Z"

  # === Year Tokens ===
  year_4digit = formatdate("YYYY", local.ts)  # "2026"
  year_2digit = formatdate("YY", local.ts)    # "26"

  # === Month Tokens ===
  month_2digit = formatdate("MM", local.ts)    # "02"
  month_1digit = formatdate("M", local.ts)     # "2"
  month_full   = formatdate("MMMM", local.ts)  # "February"
  month_abbr   = formatdate("MMM", local.ts)   # "Feb"

  # === Day Tokens ===
  day_2digit = formatdate("DD", local.ts)  # "23"
  day_1digit = formatdate("D", local.ts)   # "23"

  # === Day of Week Tokens ===
  weekday_full  = formatdate("EEEE", local.ts)  # "Monday"
  weekday_abbr  = formatdate("EEE", local.ts)   # "Mon"
  weekday_short = formatdate("EE", local.ts)    # "Mo"

  # === Hour Tokens ===
  hour_24 = formatdate("HH", local.ts)  # "14"
  hour_12 = formatdate("hh", local.ts)  # "02"

  # === AM/PM Tokens ===
  ampm_upper = formatdate("AA", local.ts)  # "PM"
  ampm_lower = formatdate("aa", local.ts)  # "pm"

  # === Minute Token ===
  minute = formatdate("mm", local.ts)  # "05"

  # === Second Token ===
  second = formatdate("ss", local.ts)  # "09"

  # === Timezone Tokens ===
  tz_z     = formatdate("Z", local.ts)      # "Z"
  tz_colon = formatdate("ZZZZ", local.ts)   # "Z"
  tz_name  = formatdate("ZZZZZ", local.ts)  # "UTC"
}
```

## Common Date Formats

These are the formats you will use in practice:

```hcl
locals {
  ts = timestamp()

  # ISO 8601 formats
  iso_date     = formatdate("YYYY-MM-DD", local.ts)
  iso_datetime = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", local.ts)
  iso_compact  = formatdate("YYYYMMDDHHmmss", local.ts)

  # Regional formats
  us_date      = formatdate("MM/DD/YYYY", local.ts)
  eu_date      = formatdate("DD/MM/YYYY", local.ts)
  uk_date      = formatdate("DD-MMM-YYYY", local.ts)  # "23-Feb-2026"

  # Human-readable
  long_date    = formatdate("MMMM DD, YYYY", local.ts)           # "February 23, 2026"
  full_date    = formatdate("EEEE, MMMM DD, YYYY", local.ts)     # "Monday, February 23, 2026"
  short_date   = formatdate("MMM DD, YYYY", local.ts)             # "Feb 23, 2026"

  # Time formats
  time_24h     = formatdate("HH:mm:ss", local.ts)      # "14:05:09"
  time_12h     = formatdate("hh:mm AA", local.ts)       # "02:05 PM"
  time_short   = formatdate("HH:mm", local.ts)          # "14:05"

  # Combined date-time
  datetime_readable = formatdate("MMM DD, YYYY 'at' hh:mm AA", local.ts)
  datetime_log      = formatdate("YYYY-MM-DD HH:mm:ss", local.ts)
}
```

## Using Literal Text in Formats

Wrap literal text in single quotes to prevent it from being interpreted as format tokens:

```hcl
locals {
  ts = timestamp()

  # Include literal text
  deployed_msg = formatdate("'Deployed on' MMMM DD, YYYY", local.ts)
  # "Deployed on February 23, 2026"

  at_time = formatdate("YYYY-MM-DD 'at' HH:mm 'UTC'", local.ts)
  # "2026-02-23 at 14:05 UTC"

  date_label = formatdate("'Date:' YYYY-MM-DD", local.ts)
  # "Date: 2026-02-23"
}
```

## Date Formatting for Resource Tags

Consistent date formatting in tags helps with cost tracking and resource management:

```hcl
locals {
  now = plantimestamp()

  standard_tags = {
    DeployDate     = formatdate("YYYY-MM-DD", local.now)
    DeployTime     = formatdate("HH:mm:ss 'UTC'", local.now)
    DeployDatetime = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", local.now)
    DeployMonth    = formatdate("YYYY-MM", local.now)
    DeployQuarter  = format("Q%d-%s",
      ceil(tonumber(formatdate("M", local.now)) / 3),
      formatdate("YYYY", local.now)
    )
    DeployWeek     = formatdate("YYYY-'W'WW", local.now)
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags          = merge(local.standard_tags, {
    Name = "web-server"
  })
}
```

## Date Formatting for File Names and Resource Names

Dates in resource names need to be sortable and free of special characters:

```hcl
locals {
  now = timestamp()

  # Formats safe for resource names (no special chars)
  name_date     = formatdate("YYYYMMDD", local.now)           # "20260223"
  name_datetime = formatdate("YYYYMMDDHHmmss", local.now)     # "20260223140509"
  name_compact  = formatdate("YYMMDD-HHmm", local.now)        # "260223-1405"

  # Use in resource names
  snapshot_name = "db-snapshot-${local.name_datetime}"
  backup_name   = "backup-${local.name_date}"
  log_file      = "deploy-${local.name_compact}.log"
}
```

## Formatting Dates from Other Sources

You can format timestamps that come from data sources or resource attributes:

```hcl
# Format a date from an ACM certificate
data "aws_acm_certificate" "main" {
  domain   = "*.example.com"
  statuses = ["ISSUED"]
}

output "certificate_info" {
  value = {
    domain     = data.aws_acm_certificate.main.domain
    expires_at = formatdate("MMMM DD, YYYY", data.aws_acm_certificate.main.not_after)
  }
}
```

## Building Date-Based Outputs

Create informative outputs with formatted dates:

```hcl
output "deployment_summary" {
  value = <<-EOF
    Deployment Summary
    ==================
    Date:        ${formatdate("EEEE, MMMM DD, YYYY", plantimestamp())}
    Time:        ${formatdate("hh:mm AA 'UTC'", plantimestamp())}
    Environment: ${var.environment}
    Region:      ${var.region}
    Version:     ${var.app_version}
  EOF
}
```

## Date Arithmetic with Formatting

Combine `timeadd` with `formatdate` for date calculations:

```hcl
locals {
  now = timestamp()

  dates = {
    today          = formatdate("YYYY-MM-DD", local.now)
    tomorrow       = formatdate("YYYY-MM-DD", timeadd(local.now, "24h"))
    next_week      = formatdate("YYYY-MM-DD", timeadd(local.now, "168h"))
    next_month     = formatdate("YYYY-MM-DD", timeadd(local.now, "720h"))
    three_months   = formatdate("MMMM DD, YYYY", timeadd(local.now, "2160h"))
    six_months     = formatdate("MMMM DD, YYYY", timeadd(local.now, "4380h"))
    one_year       = formatdate("MMMM DD, YYYY", timeadd(local.now, "8760h"))
  }
}

output "important_dates" {
  value = local.dates
}
```

## Conditional Date Formatting

Format dates differently based on context:

```hcl
variable "environment" {
  type    = string
  default = "production"
}

locals {
  now = plantimestamp()

  # More verbose timestamps for production
  deploy_tag = var.environment == "production" ? formatdate("YYYY-MM-DD'T'HH:mm:ssZ", local.now) : formatdate("YYYYMMDD", local.now)

  # Include day name only for readable formats
  readable_date = var.environment == "production" ? formatdate("EEEE, MMMM DD, YYYY 'at' HH:mm 'UTC'", local.now) : formatdate("MMM DD HH:mm", local.now)
}
```

## Working with Week Numbers

Terraform does not have a built-in week number format token, but you can calculate it:

```hcl
locals {
  now = timestamp()

  # Approximate week of year (not ISO 8601 week, but close enough for tagging)
  day_of_year = tonumber(formatdate("DD", local.now)) + (tonumber(formatdate("M", local.now)) - 1) * 30
  week_of_year = ceil(local.day_of_year / 7)

  weekly_tag = format("%s-W%02d", formatdate("YYYY", local.now), local.week_of_year)
}
```

## Formatting for Different Cloud Provider Requirements

Different services expect different date formats:

```hcl
locals {
  now = timestamp()

  # AWS CloudWatch - ISO 8601
  cloudwatch_time = formatdate("YYYY-MM-DD'T'HH:mm:ss'Z'", local.now)

  # GCP - RFC 3339
  gcp_time = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", local.now)

  # Azure - ISO 8601 with timezone offset
  azure_time = formatdate("YYYY-MM-DD'T'HH:mm:ss'+00:00'", local.now)

  # Unix-style log format
  log_time = formatdate("DD/MMM/YYYY:HH:mm:ss '+0000'", local.now)
}
```

## Summary

Date and time formatting in Terraform centers on the `formatdate` function. The key is knowing the tokens: `YYYY` for year, `MM` for month, `DD` for day, `HH` for 24-hour, `hh` for 12-hour, `mm` for minutes, and `ss` for seconds. Use single quotes for literal text, `plantimestamp()` for stable deployment dates, and `timeadd()` when you need calculated dates. Keep date formats consistent across your resources by defining them in locals and referencing them everywhere.
