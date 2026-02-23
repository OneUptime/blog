# How to Create Time-Based Offsets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Time Provider, Time Offset, Infrastructure as Code, Scheduling

Description: Learn how to create time-based offsets with Terraform for certificate expiration, maintenance windows, resource lifecycle dates, and scheduled operations.

---

The time_offset resource in Terraform calculates a timestamp that is a specified duration before or after a base time. This is incredibly useful for setting certificate expiration dates, defining maintenance windows, scheduling resource cleanup, and any scenario where you need to compute a date relative to the current time or another reference point.

In this guide, we will explore the time_offset resource with detailed examples covering positive and negative offsets, custom base times, and integration with AWS resources that require time-based configuration.

## Understanding time_offset

The time_offset resource takes a base time (defaulting to the current time at creation) and applies an offset specified in years, months, days, hours, minutes, or seconds. The resulting timestamp is stored in Terraform state and available in multiple formats including RFC 3339, Unix timestamp, and individual date components.

## Provider Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Basic Time Offsets

```hcl
# basic-offsets.tf - Calculate dates relative to now
# 30 days from now
resource "time_offset" "thirty_days" {
  offset_days = 30
}

# One year from now
resource "time_offset" "one_year" {
  offset_years = 1
}

# 6 months from now
resource "time_offset" "six_months" {
  offset_months = 6
}

# 2 hours from now
resource "time_offset" "two_hours" {
  offset_hours = 2
}

# 90 days ago (negative offset)
resource "time_offset" "ninety_days_ago" {
  offset_days = -90
}

output "calculated_dates" {
  value = {
    now            = time_offset.thirty_days.base_rfc3339
    in_30_days     = time_offset.thirty_days.rfc3339
    in_1_year      = time_offset.one_year.rfc3339
    in_6_months    = time_offset.six_months.rfc3339
    in_2_hours     = time_offset.two_hours.rfc3339
    ninety_days_ago = time_offset.ninety_days_ago.rfc3339
  }
}
```

## Setting Certificate Expiration Dates

One of the most practical uses of time_offset is calculating certificate validity periods:

```hcl
# certificates.tf - Certificate with calculated expiration
resource "time_offset" "cert_expiry" {
  offset_days = 365  # Valid for one year
}

resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name  = "server.${var.environment}.example.com"
    organization = "Example Corp"
  }

  # Use the calculated expiry date for validity
  validity_period_hours = 24 * 365  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

# Store the expiry date for monitoring
resource "aws_ssm_parameter" "cert_expiry" {
  name  = "/${var.environment}/tls/cert-expiry-date"
  type  = "String"
  value = time_offset.cert_expiry.rfc3339

  tags = {
    ExpiresAt   = time_offset.cert_expiry.rfc3339
    Environment = var.environment
  }
}
```

## Defining Maintenance Windows

Calculate maintenance window start and end times:

```hcl
# maintenance.tf - Scheduled maintenance windows
variable "maintenance_start_hour" {
  description = "Hour (UTC) when maintenance window starts"
  type        = number
  default     = 2  # 2 AM UTC
}

variable "maintenance_duration_hours" {
  description = "Duration of maintenance window in hours"
  type        = number
  default     = 4
}

# Calculate next maintenance window
resource "time_offset" "next_maintenance_start" {
  offset_days = 7  # Next week
}

resource "time_offset" "next_maintenance_end" {
  offset_days  = 7
  offset_hours = var.maintenance_duration_hours
}

# Use for RDS maintenance window
resource "aws_db_instance" "main" {
  identifier     = "main-${var.environment}"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  allocated_storage = 100
  username       = "admin"
  password       = "temporary-password"

  # Maintenance window format: ddd:hh24:mi-ddd:hh24:mi
  maintenance_window = "sun:02:00-sun:06:00"

  skip_final_snapshot = true

  tags = {
    NextScheduledMaintenance = time_offset.next_maintenance_start.rfc3339
    Environment              = var.environment
  }
}
```

## Resource Lifecycle Dates

Set up resource expiration and cleanup schedules:

```hcl
# lifecycle.tf - Resource lifecycle management
# Resources created today
resource "time_static" "created" {}

# Resource expires in 90 days
resource "time_offset" "expire_date" {
  base_rfc3339 = time_static.created.rfc3339
  offset_days  = 90
}

# Warning date 14 days before expiry
resource "time_offset" "warning_date" {
  base_rfc3339 = time_static.created.rfc3339
  offset_days  = 76  # 90 - 14
}

# Review date at 30 days
resource "time_offset" "review_date" {
  base_rfc3339 = time_static.created.rfc3339
  offset_days  = 30
}

# Tag resources with lifecycle dates
locals {
  lifecycle_tags = {
    CreatedAt    = time_static.created.rfc3339
    ReviewBy     = time_offset.review_date.rfc3339
    WarningDate  = time_offset.warning_date.rfc3339
    ExpiresAt    = time_offset.expire_date.rfc3339
    Environment  = var.environment
  }
}

resource "aws_instance" "temp" {
  ami           = "ami-12345678"
  instance_type = "t3.medium"

  tags = merge(local.lifecycle_tags, {
    Name = "temp-instance-${var.environment}"
  })
}
```

## Using Custom Base Times

Calculate offsets from a specific date rather than the current time:

```hcl
# custom-base.tf - Offsets from specific dates
variable "project_start_date" {
  type    = string
  default = "2026-01-01T00:00:00Z"
}

# Sprint end dates from project start
resource "time_offset" "sprint_1_end" {
  base_rfc3339 = var.project_start_date
  offset_days  = 14
}

resource "time_offset" "sprint_2_end" {
  base_rfc3339 = var.project_start_date
  offset_days  = 28
}

resource "time_offset" "milestone_1" {
  base_rfc3339 = var.project_start_date
  offset_months = 3
}

# Quarter boundaries from a fiscal year start
variable "fiscal_year_start" {
  type    = string
  default = "2026-04-01T00:00:00Z"
}

resource "time_offset" "q2_start" {
  base_rfc3339 = var.fiscal_year_start
  offset_months = 3
}

resource "time_offset" "q3_start" {
  base_rfc3339 = var.fiscal_year_start
  offset_months = 6
}

resource "time_offset" "q4_start" {
  base_rfc3339 = var.fiscal_year_start
  offset_months = 9
}

output "fiscal_quarters" {
  value = {
    q1_start = var.fiscal_year_start
    q2_start = time_offset.q2_start.rfc3339
    q3_start = time_offset.q3_start.rfc3339
    q4_start = time_offset.q4_start.rfc3339
  }
}
```

## Combining Multiple Offset Components

Apply multiple offset components at once:

```hcl
# combined-offsets.tf - Multiple offset components
resource "time_offset" "complex" {
  offset_years  = 1
  offset_months = 3
  offset_days   = 15
  offset_hours  = 6
}

output "complex_offset" {
  value = {
    base   = time_offset.complex.base_rfc3339
    result = time_offset.complex.rfc3339
  }
}
```

## Accessing Individual Date Components

The time_offset resource exposes individual date components:

```hcl
# components.tf - Access individual date parts
resource "time_offset" "example" {
  offset_days = 90
}

output "date_components" {
  value = {
    year    = time_offset.example.year
    month   = time_offset.example.month
    day     = time_offset.example.day
    hour    = time_offset.example.hour
    minute  = time_offset.example.minute
    second  = time_offset.example.second
    unix    = time_offset.example.unix
    rfc3339 = time_offset.example.rfc3339
  }
}
```

## Conclusion

The time_offset resource is a fundamental building block for time-dependent infrastructure. From certificate expiration dates to maintenance windows to resource lifecycle management, it provides a clean, declarative way to calculate dates within your Terraform configuration. By combining time_offset with other time provider resources like [time_rotating](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rotating-time-resources-with-terraform/view) and [time_sleep](https://oneuptime.com/blog/post/2026-02-23-how-to-create-time-based-sleep-resources-with-terraform/view), you can build sophisticated time-based infrastructure management workflows.
