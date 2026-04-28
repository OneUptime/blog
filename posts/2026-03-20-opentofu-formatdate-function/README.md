# How to Use the formatdate Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the formatdate function in OpenTofu to format timestamps into human-readable date strings for resource naming and expiration tracking.

## Introduction

The `formatdate` function in OpenTofu formats a timestamp string into a specified date format. It converts RFC 3339 timestamp strings (produced by `timestamp()`) into readable date formats for use in resource names, tags, and expiration dates.

## Syntax

```hcl
formatdate(spec, timestamp)
```

- **spec** - a format string using special tokens
- **timestamp** - an RFC 3339 timestamp string

## Format Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `YYYY` | 4-digit year | 2026 |
| `YY` | 2-digit year | 26 |
| `MM` | 2-digit month | 03 |
| `MMM` | Abbreviated month | Mar |
| `MMMM` | Full month | March |
| `DD` | 2-digit day | 20 |
| `hh` | Hour (24h) | 14 |
| `mm` | Minutes | 30 |
| `ss` | Seconds | 45 |
| `ZZZ` | Timezone | UTC |

## Basic Examples

```hcl
output "formatted_date" {
  value = formatdate("YYYY-MM-DD", "2026-03-20T14:30:00Z")
  # Returns "2026-03-20"
}

output "formatted_datetime" {
  value = formatdate("YYYY-MM-DD hh:mm", "2026-03-20T14:30:00Z")
  # Returns "2026-03-20 14:30"
}

output "human_readable" {
  value = formatdate("DD MMM YYYY", "2026-03-20T00:00:00Z")
  # Returns "20 Mar 2026"
}
```

## Practical Use Cases

### Versioned Resource Names

```hcl
locals {
  deploy_time = timestamp()
  date_stamp  = formatdate("YYYY-MM-DD", local.deploy_time)
}

resource "aws_s3_object" "deployment" {
  bucket = aws_s3_bucket.deployments.id
  key    = "releases/${local.date_stamp}/app.zip"
  source = "${path.module}/dist/app.zip"
}
```

### Expiration Date Tags

```hcl
locals {
  now             = timestamp()
  expiry_date     = timeadd(local.now, "720h")  # 30 days
  expiry_date_str = formatdate("YYYY-MM-DD", local.expiry_date)
}

resource "aws_iam_user" "temp" {
  name = "temp-deployment-user"

  tags = {
    Name       = "temp-deployment-user"
    ExpiresOn  = local.expiry_date_str
    CreatedAt  = formatdate("YYYY-MM-DD", local.now)
  }
}
```

### Snapshot Naming

```hcl
locals {
  snapshot_date = formatdate("YYYYMMDD-hhmm", timestamp())
}

resource "aws_db_snapshot" "manual" {
  db_instance_identifier = aws_db_instance.main.id
  db_snapshot_identifier = "snapshot-${local.snapshot_date}"
}
```

### CloudWatch Log Group with Date Retention

```hcl
resource "aws_cloudwatch_log_group" "app" {
  name              = "/app/${formatdate("YYYY/MM", timestamp())}/logs"
  retention_in_days = 30

  tags = {
    CreatedMonth = formatdate("YYYY-MM", timestamp())
  }
}
```

## Step-by-Step Usage

1. Get a timestamp (usually `timestamp()` or `timeadd(timestamp(), delta)`).
2. Call `formatdate(spec, timestamp)` with the desired format.
3. Test in `tofu console`:

```bash
tofu console

> formatdate("YYYY-MM-DD", timestamp())
"2026-03-20"
> formatdate("DD/MM/YYYY", "2026-03-20T00:00:00Z")
"20/03/2026"
```

## Important Note: Non-Idempotent

`formatdate(spec, timestamp())` changes on every `tofu plan` because `timestamp()` returns the current time. Store in `locals` with `timestamp()` called once, and consider `plantimestamp()` for stable plan-time values.

## Conclusion

The `formatdate` function gives you control over timestamp formatting in OpenTofu. Use it for versioned resource names, expiration date tags, and human-readable date stamps. Remember that dates derived from `timestamp()` change on every run, so use them for tags and tracking rather than resource identifiers.
