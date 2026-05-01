# How to Use the enabled Meta-Argument in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Enabled, Meta-Arguments, Infrastructure as Code, DevOps

Description: A guide to using the enabled meta-argument in OpenTofu to conditionally enable or disable resources and data sources.

## Introduction

Introduced in OpenTofu v1.11, the `enabled` meta-argument provides a clean way to conditionally include or exclude single resources, data sources, or modules from your configuration. When `enabled = false`, OpenTofu excludes the object from the configuration. Disabled resources evaluate to `null`, so any attribute access must be guarded. This is more expressive than the `count = 0` pattern and clearly communicates intent.

## Basic enabled Usage

```hcl
variable "create_bastion" {
  type    = bool
  default = false
}

resource "aws_instance" "bastion" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name = "bastion-host"
  }

  lifecycle {
    enabled = var.create_bastion # Skip this resource if false
  }
}
```

## Comparing enabled vs count = 0

```hcl
# Old pattern: count = 0 to disable

resource "aws_instance" "bastion_old" {
  count = var.create_bastion ? 1 : 0

  ami           = var.ami_id
  instance_type = "t3.micro"
  # Accessing: aws_instance.bastion_old[0].id
}

# New pattern: enabled for clarity
resource "aws_instance" "bastion_new" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  # Accessing: aws_instance.bastion_new.id (no index needed)

  lifecycle {
    enabled = var.create_bastion
  }
}
```

## Environment-Specific Resources

```hcl
variable "environment" {
  type = string
}

# Only create enhanced monitoring in production
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [aws_sns_topic.alerts.arn]

  lifecycle {
    enabled = var.environment == "prod"
  }
}

# Only enable WAF in staging and production
resource "aws_wafv2_web_acl_association" "app" {
  resource_arn = aws_lb.app.arn
  web_acl_arn  = aws_wafv2_web_acl.app.arn

  lifecycle {
    enabled = contains(["staging", "prod"], var.environment)
  }
}
```

## Feature Flags with enabled

```hcl
variable "features" {
  type = object({
    enable_vpc_flow_logs    = bool
    enable_config_rules     = bool
    enable_guardduty        = bool
    enable_security_hub     = bool
  })
  default = {
    enable_vpc_flow_logs    = true
    enable_config_rules     = false
    enable_guardduty        = true
    enable_security_hub     = false
  }
}

resource "aws_flow_log" "vpc" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn

  lifecycle {
    enabled = var.features.enable_vpc_flow_logs
  }
}

resource "aws_guardduty_detector" "main" {
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  lifecycle {
    enabled = var.features.enable_guardduty
  }
}

resource "aws_securityhub_account" "main" {
  lifecycle {
    enabled = var.features.enable_security_hub
  }
}
```

## enabled with Data Sources

```hcl
variable "use_existing_vpc" {
  type    = bool
  default = false
}

# Only fetch existing VPC if we're using it
data "aws_vpc" "existing" {
  id      = var.existing_vpc_id

  lifecycle {
    enabled = var.use_existing_vpc
  }
}

# Create new VPC only if not using existing
resource "aws_vpc" "new" {
  cidr_block = var.vpc_cidr

  lifecycle {
    enabled = !var.use_existing_vpc
  }
}
```

## Conditional Module Features

```hcl
variable "enable_backup" {
  type        = bool
  description = "Whether to enable automated backups"
  default     = true
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

resource "aws_backup_plan" "main" {
  name    = "main-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 ? * * *)"

    lifecycle {
      delete_after = var.backup_retention_days
    }
  }

  lifecycle {
    enabled = var.enable_backup
  }
}

resource "aws_backup_selection" "main" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "main-selection"
  plan_id      = aws_backup_plan.main.id

  resources = ["*"]

  lifecycle {
    enabled = var.enable_backup
  }
}
```

## enabled in Modules

```hcl
# modules/monitoring/main.tf
variable "enabled" {
  type    = bool
  default = true
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "main-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 3
        properties = {
          markdown = "# Monitoring"
        }
      }
    ]
  })

  lifecycle {
    enabled = var.enabled
  }
}

# Root module calling the monitoring module
module "monitoring" {
  source = "./modules/monitoring"

  lifecycle {
    enabled = var.environment == "prod"
  }
}
```

## Outputs with enabled Resources

```hcl
resource "aws_instance" "bastion" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    enabled = var.create_bastion
  }
}

# Output is null when resource is disabled
output "bastion_ip" {
  value = aws_instance.bastion != null ? aws_instance.bastion.public_ip : null
}
```

## Conclusion

The `enabled` meta-argument, introduced in OpenTofu v1.11, makes conditional resource creation more expressive and readable than the `count = 0` pattern. It clearly communicates that a resource exists in configuration but is intentionally disabled, rather than creating zero instances of a multi-instance resource. Use `enabled` for feature flags, environment-specific resources, and optional infrastructure components. Resources, data sources, and modules with `enabled = false` are excluded from the configuration, and references to disabled resources should guard attribute access because the resource evaluates to `null`.
