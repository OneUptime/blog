# How to Build a PCI DSS Compliant Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, PCI DSS, Payment Security, Compliance, Cardholder Data

Description: Learn how to build PCI DSS compliant infrastructure with Terraform including network segmentation, cardholder data protection, access controls, and vulnerability management.

---

If your application processes, stores, or transmits credit card data, you need PCI DSS compliance. The Payment Card Industry Data Security Standard has 12 requirements and over 300 sub-requirements that cover everything from network architecture to access controls to vulnerability management. Building PCI-compliant infrastructure by hand is error-prone and hard to audit. Terraform lets you define every requirement as code, making compliance verifiable and repeatable.

## Understanding PCI DSS Scope

The first step in PCI DSS is defining your Cardholder Data Environment (CDE) - the systems that process, store, or transmit cardholder data. Everything in the CDE must be PCI compliant. The goal of good architecture is to minimize the CDE by isolating payment processing from the rest of your infrastructure. The smaller the scope, the easier the audit.

## Architecture Overview

Our PCI DSS infrastructure includes:

- Isolated CDE network segment
- Network segmentation between CDE and non-CDE
- Encryption for cardholder data at rest and in transit
- Strict firewall rules (Requirement 1)
- Access controls with MFA (Requirement 8)
- Logging and monitoring (Requirement 10)
- Vulnerability management (Requirement 5, 6)
- Regular testing infrastructure (Requirement 11)

## Network Segmentation (Requirement 1)

The CDE must be isolated from all other networks.

```hcl
# CDE VPC - completely isolated from other environments
resource "aws_vpc" "cde" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name       = "cde-${var.environment}"
    PCI_Scope  = "in-scope"
    PCI_Req    = "Req-1"
  }
}

# Non-CDE VPC for application components that do not handle cardholder data
resource "aws_vpc" "app" {
  cidr_block           = "10.200.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name      = "app-${var.environment}"
    PCI_Scope = "out-of-scope"
  }
}

# CDE private subnets - no public subnets in the CDE
resource "aws_subnet" "cde_private" {
  count             = 3
  vpc_id            = aws_vpc.cde.id
  cidr_block        = "10.100.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name      = "cde-private-${count.index}"
    PCI_Scope = "in-scope"
    Tier      = "payment-processing"
  }
}

# Database subnets within CDE
resource "aws_subnet" "cde_data" {
  count             = 3
  vpc_id            = aws_vpc.cde.id
  cidr_block        = "10.100.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name      = "cde-data-${count.index}"
    PCI_Scope = "in-scope"
    Tier      = "data"
  }
}

# Security group for payment processing service
resource "aws_security_group" "payment_service" {
  name        = "cde-payment-service"
  description = "PCI - Payment processing service"
  vpc_id      = aws_vpc.cde.id

  # Only allow traffic from the internal ALB
  ingress {
    from_port       = 8443
    to_port         = 8443
    protocol        = "tcp"
    security_groups = [aws_security_group.cde_alb.id]
    description     = "HTTPS from internal ALB"
  }

  # Only allow outbound to payment processor and database
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.cde_database.id]
    description     = "PostgreSQL to CDE database"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.payment_processor_ips
    description = "HTTPS to payment processor"
  }

  tags = {
    PCI_Scope = "in-scope"
    PCI_Req   = "Req-1"
  }
}

# Database security group - most restrictive
resource "aws_security_group" "cde_database" {
  name        = "cde-database"
  description = "PCI - Cardholder data database"
  vpc_id      = aws_vpc.cde.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.payment_service.id]
    description     = "PostgreSQL from payment service only"
  }

  # No egress rules - database does not initiate connections

  tags = {
    PCI_Scope = "in-scope"
    PCI_Req   = "Req-1"
  }
}

# VPC Flow Logs for the CDE
resource "aws_flow_log" "cde" {
  vpc_id                   = aws_vpc.cde.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.cde_flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60

  tags = {
    PCI_Req = "Req-10"
  }
}
```

## Cardholder Data Protection (Requirement 3, 4)

Encrypt stored cardholder data and protect it in transit.

```hcl
# KMS key for cardholder data encryption
resource "aws_kms_key" "cardholder_data" {
  description             = "Encryption key for cardholder data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Strict key policy - only payment service role can use
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "PaymentServiceOnly"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.payment_service.arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    PCI_Scope = "in-scope"
    PCI_Req   = "Req-3"
  }
}

# RDS for cardholder data with encryption
resource "aws_db_instance" "cde" {
  identifier     = "cde-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  # Encryption at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.cardholder_data.arn

  # Security
  multi_az                = true
  deletion_protection     = true
  publicly_accessible     = false
  iam_database_authentication_enabled = true

  # Backup
  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.cde.name
  vpc_security_group_ids = [aws_security_group.cde_database.id]

  # Audit logging
  enabled_cloudwatch_logs_exports = ["postgresql"]
  parameter_group_name            = aws_db_parameter_group.cde_audit.name

  tags = {
    PCI_Scope = "in-scope"
    PCI_Req   = "Req-3"
  }
}

resource "aws_db_parameter_group" "cde_audit" {
  name   = "cde-audit"
  family = "postgres15"

  parameter {
    name  = "shared_preload_libraries"
    value = "pgaudit"
  }

  parameter {
    name  = "pgaudit.log"
    value = "all"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  # Force SSL
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

# ACM certificate for TLS in transit
resource "aws_acm_certificate" "cde" {
  domain_name       = "payment.internal.company.com"
  validation_method = "DNS"

  tags = {
    PCI_Req = "Req-4"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Access Control (Requirement 7, 8)

Restrict access to cardholder data on a need-to-know basis with MFA.

```hcl
# IAM role for payment service - minimal permissions
resource "aws_iam_role" "payment_service" {
  name = "cde-payment-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    PCI_Scope = "in-scope"
    PCI_Req   = "Req-7"
  }
}

# Minimal permissions for payment service
resource "aws_iam_role_policy" "payment_service" {
  name = "cde-payment-service-policy"
  role = aws_iam_role.payment_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
        ]
        Resource = aws_kms_key.cardholder_data.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Resource = aws_secretsmanager_secret.payment_db.arn
      }
    ]
  })
}

# IAM policy requiring MFA for CDE access
resource "aws_iam_policy" "cde_mfa_required" {
  name = "cde-mfa-required"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}

# Password policy (Req 8)
resource "aws_iam_account_password_policy" "pci" {
  minimum_password_length        = 12
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 4
}
```

## Logging and Monitoring (Requirement 10)

Track all access to cardholder data and network resources.

```hcl
# CloudTrail for CDE audit logging
resource "aws_cloudtrail" "cde" {
  name                       = "cde-audit-trail"
  s3_bucket_name             = aws_s3_bucket.cde_audit.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.cardholder_data.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cde_cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  tags = {
    PCI_Req = "Req-10"
  }
}

resource "aws_cloudwatch_log_group" "cde_cloudtrail" {
  name              = "/pci/cde/cloudtrail"
  retention_in_days = 365  # 1 year minimum for PCI
  kms_key_id        = aws_kms_key.cardholder_data.arn
}

# Tamper-proof log storage
resource "aws_s3_bucket" "cde_audit" {
  bucket = "cde-audit-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    PCI_Req = "Req-10"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "cde_audit" {
  bucket = aws_s3_bucket.cde_audit.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}

# Alert on suspicious CDE activity
resource "aws_cloudwatch_metric_alarm" "cde_unauthorized_access" {
  alarm_name          = "cde-unauthorized-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAccessCount"
  namespace           = "PCI/CDE"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.security.arn]
}

# GuardDuty for threat detection
resource "aws_guardduty_detector" "cde" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    PCI_Req = "Req-11"
  }
}
```

## Vulnerability Management (Requirement 5, 6, 11)

Regular scanning and patching are PCI requirements.

```hcl
# AWS Inspector for vulnerability scanning
resource "aws_inspector2_enabler" "cde" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["EC2", "ECR", "LAMBDA"]
}

# Systems Manager for patch management
resource "aws_ssm_patch_baseline" "cde" {
  name             = "cde-patch-baseline"
  operating_system = "AMAZON_LINUX_2023"

  approval_rule {
    approve_after_days = 7

    patch_filter {
      key    = "CLASSIFICATION"
      values = ["Security"]
    }

    patch_filter {
      key    = "SEVERITY"
      values = ["Critical", "Important"]
    }
  }

  tags = {
    PCI_Req = "Req-6"
  }
}

resource "aws_ssm_maintenance_window" "cde_patching" {
  name              = "cde-patching-window"
  schedule          = "cron(0 4 ? * SUN *)"  # Sunday 4 AM
  duration          = 4
  cutoff            = 1
  allow_unassociated_targets = false

  tags = {
    PCI_Req = "Req-6"
  }
}

# WAF for web application protection (Req 6.6)
resource "aws_wafv2_web_acl" "cde" {
  name  = "cde-waf"
  scope = "REGIONAL"

  default_action { allow {} }

  rule {
    name     = "owasp-top-10"
    priority = 1
    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "cde-owasp"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "cde-waf"
  }
}
```

## Wrapping Up

PCI DSS compliance comes down to protecting cardholder data through network segmentation, encryption, access controls, logging, and regular testing. The most effective strategy is to minimize your CDE scope by isolating payment processing into a small, well-controlled segment of your infrastructure.

Terraform makes PCI compliance manageable by encoding every requirement as infrastructure code. Security groups enforce network segmentation. KMS keys enforce encryption. IAM policies enforce access controls. CloudTrail and Config enforce logging. Each resource can be tagged with the PCI requirement it satisfies, making audits straightforward.

For monitoring your PCI DSS compliant infrastructure and getting real-time alerts on security events in the CDE, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-pci-dss-compliant-infrastructure-with-terraform/view) for payment infrastructure observability.
