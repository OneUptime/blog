# How to Create Rotating Time Resources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Time Provider, Time Rotating, Secret Rotation, Infrastructure as Code

Description: Learn how to create rotating time resources with Terraform for automated secret rotation, certificate renewal, key cycling, and periodic infrastructure updates.

---

The time_rotating resource in Terraform creates a timestamp that automatically triggers resource recreation on a defined schedule. When the rotation period expires, the next Terraform apply detects that the rotation time has passed and marks dependent resources for recreation. This is the foundation for implementing automated secret rotation, certificate renewal, API key cycling, and any periodic infrastructure update.

In this guide, we will explore the time_rotating resource with practical examples for rotating passwords, certificates, encryption keys, and other time-sensitive infrastructure components.

## Understanding time_rotating

The time_rotating resource stores a rotation timestamp in Terraform state. When the current time exceeds the rotation timestamp plus the rotation period, Terraform plans the resource for recreation. This cascades to any resources that reference it through keepers or lifecycle rules, triggering their recreation as well.

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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

## Basic Rotation Schedule

```hcl
# basic.tf - Simple rotation schedules
# Rotate every 30 days
resource "time_rotating" "monthly" {
  rotation_days = 30
}

# Rotate every 7 days
resource "time_rotating" "weekly" {
  rotation_days = 7
}

# Rotate every 90 days
resource "time_rotating" "quarterly" {
  rotation_days = 90
}

# Rotate every 24 hours
resource "time_rotating" "daily" {
  rotation_hours = 24
}

output "rotation_info" {
  value = {
    monthly_rotation   = time_rotating.monthly.rotation_rfc3339
    weekly_rotation    = time_rotating.weekly.rotation_rfc3339
    quarterly_rotation = time_rotating.quarterly.rotation_rfc3339
    daily_rotation     = time_rotating.daily.rotation_rfc3339
  }
}
```

## Rotating Database Passwords

The most common use case is automated password rotation:

```hcl
# password-rotation.tf - Rotate database passwords on schedule
resource "time_rotating" "db_password" {
  rotation_days = 30  # Rotate every 30 days
}

# Password regenerates when the rotation triggers
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"

  keepers = {
    rotation = time_rotating.db_password.id
  }
}

# Store the current password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.environment}/database/password"
  description = "Database password - rotates every 30 days"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.database.result
}

# Apply the password to the RDS instance
resource "aws_db_instance" "main" {
  identifier     = "main-${var.environment}"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"
  allocated_storage = 100

  username = "admin"
  password = random_password.database.result

  skip_final_snapshot = true

  tags = {
    Environment      = var.environment
    PasswordRotation = time_rotating.db_password.rotation_rfc3339
  }
}
```

## Rotating API Keys

```hcl
# api-key-rotation.tf - Rotate API keys periodically
resource "time_rotating" "api_key" {
  rotation_days = 90  # Rotate every quarter
}

resource "random_password" "api_key" {
  length  = 48
  special = false

  keepers = {
    rotation = time_rotating.api_key.id
  }
}

# Store in SSM Parameter Store
resource "aws_ssm_parameter" "api_key" {
  name  = "/${var.environment}/api/key"
  type  = "SecureString"
  value = random_password.api_key.result

  tags = {
    NextRotation = time_rotating.api_key.rotation_rfc3339
    Environment  = var.environment
  }
}
```

## Rotating Encryption Keys

```hcl
# key-rotation.tf - KMS key rotation tracking
resource "time_rotating" "encryption_key" {
  rotation_days = 365  # Annual rotation
}

resource "aws_kms_key" "data" {
  description             = "Data encryption key for ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # AWS native rotation

  tags = {
    Environment     = var.environment
    RotationTracked = time_rotating.encryption_key.rotation_rfc3339
  }
}

resource "aws_kms_alias" "data" {
  name          = "alias/${var.environment}-data-key"
  target_key_id = aws_kms_key.data.key_id
}
```

## Rotating TLS Certificates

```hcl
# cert-rotation.tf - Rotate self-signed certificates
resource "time_rotating" "certificate" {
  rotation_days = 60  # Rotate every 60 days
}

resource "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "server" {
  private_key_pem = tls_private_key.server.private_key_pem

  subject {
    common_name  = "api.${var.environment}.example.com"
    organization = "Example Corp"
  }

  validity_period_hours = 24 * 90  # Valid for 90 days (buffer beyond rotation)

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]

  # Recreate when rotation triggers
  lifecycle {
    replace_triggered_by = [time_rotating.certificate.id]
  }
}

# Store certificate in ACM
resource "aws_acm_certificate" "server" {
  private_key       = tls_private_key.server.private_key_pem
  certificate_body  = tls_self_signed_cert.server.cert_pem

  lifecycle {
    create_before_destroy = true
    replace_triggered_by  = [time_rotating.certificate.id]
  }

  tags = {
    NextRotation = time_rotating.certificate.rotation_rfc3339
    Environment  = var.environment
  }
}
```

## Multiple Rotation Schedules for Different Services

```hcl
# multi-rotation.tf - Different rotation periods for different services
variable "rotation_policies" {
  description = "Rotation policies for different secret types"
  type = map(object({
    rotation_days = number
    length        = number
    special       = bool
    description   = string
  }))
  default = {
    "database-password" = {
      rotation_days = 30
      length        = 32
      special       = true
      description   = "Database master password"
    }
    "redis-password" = {
      rotation_days = 60
      length        = 24
      special       = false
      description   = "Redis authentication token"
    }
    "jwt-secret" = {
      rotation_days = 90
      length        = 64
      special       = false
      description   = "JWT signing secret"
    }
    "api-key" = {
      rotation_days = 180
      length        = 48
      special       = false
      description   = "External API key"
    }
  }
}

resource "time_rotating" "secrets" {
  for_each      = var.rotation_policies
  rotation_days = each.value.rotation_days
}

resource "random_password" "secrets" {
  for_each = var.rotation_policies

  length  = each.value.length
  special = each.value.special

  keepers = {
    rotation = time_rotating.secrets[each.key].id
  }
}

resource "aws_secretsmanager_secret" "secrets" {
  for_each    = var.rotation_policies
  name        = "${var.environment}/${each.key}"
  description = each.value.description
}

resource "aws_secretsmanager_secret_version" "secrets" {
  for_each      = var.rotation_policies
  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = random_password.secrets[each.key].result
}

output "rotation_schedule" {
  description = "Next rotation date for each secret"
  value = {
    for k, v in time_rotating.secrets : k => v.rotation_rfc3339
  }
}
```

## Monitoring Rotation Status

```hcl
# monitoring.tf - Alert when rotation is approaching
resource "aws_cloudwatch_metric_alarm" "rotation_check" {
  for_each = var.rotation_policies

  alarm_name          = "${each.key}-rotation-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SecretRotationAge"
  namespace           = "Custom/SecretRotation"
  period              = 86400
  statistic           = "Maximum"
  threshold           = each.value.rotation_days - 7  # Warn 7 days before rotation
  alarm_description   = "${each.key} secret rotation approaching"

  alarm_actions = [var.alert_topic_arn]
}

variable "alert_topic_arn" {
  type    = string
  default = "arn:aws:sns:us-east-1:123456789:alerts"
}
```

## Conclusion

The time_rotating resource is the key to implementing automated rotation policies in Terraform. By linking rotation schedules to secrets, certificates, and keys through keepers, you ensure that sensitive credentials are regularly refreshed without manual intervention. The important thing to remember is that rotation happens on the next Terraform apply after the rotation period expires, so you need regular Terraform runs (through CI/CD pipelines) to enforce your rotation schedule. For more time-based patterns, see our guides on [time-based offsets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-time-based-offsets-with-terraform/view) and [the time provider overview](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-time-provider-in-terraform/view).
