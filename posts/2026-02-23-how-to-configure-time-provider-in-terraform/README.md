# How to Configure Time Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Time, Scheduling, Infrastructure as Code

Description: A practical guide to the Time provider in Terraform for managing time-based resources like delays, offsets, rotating schedules, and sleep timers.

---

Timing matters in infrastructure automation. You might need to wait for a resource to become available before proceeding, calculate a future date for certificate expiry, schedule a rotation window, or simply add a delay between dependent resources. The Time provider in Terraform gives you time-based resources that integrate naturally with the Terraform lifecycle.

Unlike a simple `sleep` command, the Time provider's resources are stored in state and participate in Terraform's dependency graph. This means they work correctly with `terraform plan`, survive re-runs, and can trigger other resources when time-based values change.

## Prerequisites

- Terraform 1.0 or later
- No external services or credentials needed

## Declaring the Provider

```hcl
# versions.tf - Declare the Time provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }
}
```

No configuration needed.

```hcl
# provider.tf - Nothing to configure
provider "time" {}
```

## Resource Types

### time_sleep

The `time_sleep` resource adds a delay during create or destroy operations. This is useful when a resource needs time to become fully available even though the API reports it as ready.

```hcl
# Wait 30 seconds after creating a database before running migrations
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  # ... other configuration
}

resource "time_sleep" "wait_for_db" {
  depends_on = [aws_db_instance.main]

  # Wait 30 seconds after creation
  create_duration = "30s"

  # Wait 10 seconds before destruction (optional)
  destroy_duration = "10s"
}

# This resource will not be created until 30 seconds after the database
resource "null_resource" "db_migrations" {
  depends_on = [time_sleep.wait_for_db]

  provisioner "local-exec" {
    command = "python manage.py migrate"
  }
}
```

### time_offset

The `time_offset` resource calculates a timestamp offset from a base time. This is perfect for setting expiration dates, scheduling future events, or computing time windows.

```hcl
# Calculate a date 90 days from now for certificate expiry
resource "time_offset" "cert_expiry" {
  offset_days = 90
}

output "certificate_expires" {
  value = time_offset.cert_expiry.rfc3339
}

# Calculate a date 1 year from now
resource "time_offset" "annual_review" {
  offset_years = 1
}

# Calculate a date 2 hours from now
resource "time_offset" "maintenance_end" {
  offset_hours = 2
}
```

You can also set a specific base time instead of using the current time.

```hcl
# Calculate offset from a specific date
resource "time_offset" "from_launch" {
  base_rfc3339 = "2026-01-01T00:00:00Z"
  offset_months = 6
}

output "six_months_after_launch" {
  value = time_offset.from_launch.rfc3339
}
```

### time_rotating

The `time_rotating` resource tracks rotation periods. When the rotation period expires, the resource's `rotation_rfc3339` timestamp changes, which can trigger recreation of dependent resources.

```hcl
# Rotate API keys every 30 days
resource "time_rotating" "api_key_rotation" {
  rotation_days = 30
}

# Generate a new API key when the rotation period expires
resource "random_password" "api_key" {
  length  = 32
  special = false

  keepers = {
    rotation = time_rotating.api_key_rotation.rotation_rfc3339
  }
}

# Store the key in AWS Secrets Manager
resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id     = aws_secretsmanager_secret.api_key.id
  secret_string = random_password.api_key.result
}
```

Rotation periods can be specified in various units.

```hcl
# Rotate every 7 days
resource "time_rotating" "weekly" {
  rotation_days = 7
}

# Rotate every 4 hours
resource "time_rotating" "frequent" {
  rotation_hours = 4
}

# Rotate every 90 days
resource "time_rotating" "quarterly" {
  rotation_days = 90
}

# Rotate based on a specific end time
resource "time_rotating" "until_date" {
  rotation_rfc3339 = "2026-12-31T23:59:59Z"
}
```

### time_static

The `time_static` resource captures the current time and stores it in state. The value never changes unless the resource is explicitly tainted or recreated.

```hcl
# Capture the deployment time
resource "time_static" "deployment_time" {}

output "deployed_at" {
  value = time_static.deployment_time.rfc3339
}

# Use it as a tag on resources
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name        = "app-server"
    DeployedAt  = time_static.deployment_time.rfc3339
    DeployedDay = time_static.deployment_time.day
  }
}
```

You can also trigger recreation based on other values.

```hcl
# Update the timestamp when the AMI changes
resource "time_static" "ami_deploy_time" {
  triggers = {
    ami_id = var.ami_id
  }
}
```

## Practical Patterns

### Waiting for DNS Propagation

```hcl
# Create a DNS record
resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}

# Wait for DNS to propagate before requesting a certificate
resource "time_sleep" "dns_propagation" {
  depends_on = [aws_route53_record.api]

  create_duration = "60s"
}

# Request the certificate after DNS is ready
resource "aws_acm_certificate" "api" {
  depends_on = [time_sleep.dns_propagation]

  domain_name       = "api.example.com"
  validation_method = "DNS"
}
```

### Password Rotation Schedule

```hcl
# Set up a 90-day password rotation
resource "time_rotating" "db_password_rotation" {
  rotation_days = 90
}

resource "random_password" "db_password" {
  length  = 24
  special = true

  keepers = {
    rotation = time_rotating.db_password_rotation.rotation_rfc3339
  }
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = random_password.db_password.result
}
```

### Certificate Expiry Tracking

```hcl
# Track when a certificate was created
resource "time_static" "cert_created" {
  triggers = {
    cert_id = aws_acm_certificate.main.id
  }
}

# Calculate the expiry date (1 year from creation)
resource "time_offset" "cert_expiry" {
  base_rfc3339 = time_static.cert_created.rfc3339
  offset_years = 1
}

output "certificate_info" {
  value = {
    created_at = time_static.cert_created.rfc3339
    expires_at = time_offset.cert_expiry.rfc3339
  }
}
```

### Staggered Resource Creation

```hcl
# Create resources with delays between them to avoid rate limiting
resource "aws_instance" "batch" {
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.medium"
}

resource "time_sleep" "between_batches" {
  depends_on      = [aws_instance.batch]
  create_duration = "30s"
}

resource "aws_instance" "batch_2" {
  depends_on    = [time_sleep.between_batches]
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.medium"
}
```

### Tagging with Deployment Timestamps

```hcl
# Capture the deployment time once
resource "time_static" "deploy" {
  triggers = {
    # Recreate when any of these change
    app_version = var.app_version
    config_hash = sha256(jsonencode(var.app_config))
  }
}

locals {
  common_tags = {
    Environment = var.environment
    DeployedAt  = time_static.deploy.rfc3339
    AppVersion  = var.app_version
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  tags          = merge(local.common_tags, { Name = "app-server" })
}

resource "aws_lb" "app" {
  name = "app-lb"
  tags = local.common_tags
}
```

## Time Attributes

All time resources expose the timestamp broken into components.

```hcl
resource "time_static" "now" {}

output "time_parts" {
  value = {
    full    = time_static.now.rfc3339   # "2026-02-23T10:30:00Z"
    year    = time_static.now.year      # 2026
    month   = time_static.now.month     # 2
    day     = time_static.now.day       # 23
    hour    = time_static.now.hour      # 10
    minute  = time_static.now.minute    # 30
    second  = time_static.now.second    # 0
    unix    = time_static.now.unix      # 1771929000
  }
}
```

## Best Practices

1. Use `time_sleep` sparingly. If you find yourself adding sleeps everywhere, it might indicate a problem with the provider's resource readiness reporting. File a bug report with the provider maintainer.

2. Use `time_rotating` for credential rotation instead of manually tracking dates. It integrates cleanly with `random_password` keepers.

3. Use `time_static` with triggers to capture meaningful timestamps like deployment times or configuration change times.

4. Keep sleep durations reasonable. A 30-second sleep is fine. A 10-minute sleep during `terraform apply` is painful.

5. Document why a `time_sleep` exists. Future maintainers need to know whether the delay is still necessary.

## Wrapping Up

The Time provider fills an important gap in Terraform's resource management. From simple delays to rotation schedules and timestamp tracking, it gives you clean, state-tracked time-based resources that work within Terraform's dependency system. While it is a small provider, it appears in many production configurations.

For monitoring time-sensitive aspects of your infrastructure like certificate expiration, scheduled tasks, and rotation windows, check out [OneUptime](https://oneuptime.com) for proactive alerting and observability.
