# How to Build a SOC2 Compliant Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, SOC2, Compliance, Security, Trust Services Criteria

Description: Learn how to build SOC2 compliant infrastructure with Terraform covering the five Trust Services Criteria with encryption, access controls, monitoring, availability, and incident response.

---

SOC2 has become the baseline compliance requirement for any SaaS company. Enterprise customers will not buy from you without a SOC2 report, and for good reason. It validates that you have controls in place for security, availability, processing integrity, confidentiality, and privacy. Unlike prescriptive frameworks like PCI DSS, SOC2 is principle-based, which means you have flexibility in how you implement controls. Terraform helps you build those controls into your infrastructure from the start.

## Understanding SOC2 Trust Services Criteria

SOC2 is organized around five Trust Services Criteria (TSC):

1. **Security** - Protection against unauthorized access
2. **Availability** - System is operational and accessible
3. **Processing Integrity** - System processing is complete, valid, and accurate
4. **Confidentiality** - Information designated as confidential is protected
5. **Privacy** - Personal information is collected, used, and retained properly

Most companies start with Type I (point-in-time assessment) and then move to Type II (assessment over a period of time, typically 6-12 months). Your infrastructure needs to maintain controls continuously for Type II.

## Architecture Overview

Our SOC2 infrastructure covers:

- Encryption at rest and in transit (Security, Confidentiality)
- Access controls with MFA and least privilege (Security)
- High availability architecture (Availability)
- Audit logging and monitoring (Security, Processing Integrity)
- Change management via IaC (Processing Integrity)
- Incident response automation (Security)
- Data classification and protection (Confidentiality, Privacy)

## Security Controls

Start with the foundation: encryption, access controls, and network security.

```hcl
# KMS key for data encryption
resource "aws_kms_key" "main" {
  description             = "Primary encryption key for SOC2 compliance"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    SOC2_Criteria = "CC6.1"  # Logical and physical access controls
    Purpose       = "data-encryption"
  }
}

# VPC with proper network controls
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name          = "production-${var.environment}"
    SOC2_Criteria = "CC6.1"
  }
}

# VPC Flow Logs for network monitoring
resource "aws_flow_log" "main" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60

  tags = {
    SOC2_Criteria = "CC7.2"  # Monitors system components
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/soc2/vpc-flow-logs"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# Security groups with least privilege
resource "aws_security_group" "app" {
  name        = "app-service"
  description = "Application tier - minimal access"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow traffic from ALB only"
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
    description     = "Allow database access"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS outbound for API calls"
  }

  tags = {
    SOC2_Criteria = "CC6.1"
  }
}

# IAM password policy
resource "aws_iam_account_password_policy" "soc2" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 12
}

# MFA enforcement policy
resource "aws_iam_policy" "require_mfa" {
  name = "require-mfa"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = [
          "iam:GetAccountPasswordPolicy",
          "iam:ListVirtualMFADevices",
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ResyncMFADevice",
          "iam:ListMFADevices",
        ]
        Resource = [
          "arn:aws:iam::*:mfa/$${aws:username}",
          "arn:aws:iam::*:user/$${aws:username}",
        ]
      },
      {
        Sid    = "DenyAllExceptListedIfNoMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ListMFADevices",
          "iam:GetUser",
          "iam:ChangePassword",
          "sts:GetSessionToken",
        ]
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
```

## Availability Controls

SOC2 requires that systems are available for operation and use.

```hcl
# Multi-AZ RDS for database availability
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "production-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "app"
  master_username         = "admin"
  master_password         = var.db_password
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.main.arn
  deletion_protection     = true
  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    SOC2_Criteria = "A1.2"  # Environmental protections
  }
}

# Multiple reader instances for availability
resource "aws_rds_cluster_instance" "instances" {
  count              = 3
  identifier         = "production-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
}

# Auto-scaling for application availability
resource "aws_autoscaling_group" "app" {
  name                = "app-${var.environment}"
  min_size            = 3
  max_size            = 30
  desired_capacity    = 3
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "SOC2_Criteria"
    value               = "A1.1"
    propagate_at_launch = true
  }
}

# Route53 health check for external availability monitoring
resource "aws_route53_health_check" "app" {
  fqdn              = "app.company.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    SOC2_Criteria = "A1.1"  # Capacity planning and performance
  }
}

# Backup plan for disaster recovery
resource "aws_backup_plan" "soc2" {
  name = "soc2-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 90
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn
      lifecycle {
        delete_after = 90
      }
    }
  }

  tags = {
    SOC2_Criteria = "A1.2"
  }
}
```

## Audit Logging and Monitoring

Comprehensive logging is essential for SOC2 Type II.

```hcl
# CloudTrail for API audit logging
resource "aws_cloudtrail" "soc2" {
  name                       = "soc2-audit-trail"
  s3_bucket_name             = aws_s3_bucket.audit_logs.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.main.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  tags = {
    SOC2_Criteria = "CC7.2"
  }
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/soc2/cloudtrail"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# Immutable audit log storage
resource "aws_s3_bucket" "audit_logs" {
  bucket = "soc2-audit-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    SOC2_Criteria = "CC7.2"
  }
}

resource "aws_s3_bucket_versioning" "audit" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "audit" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# AWS Config for continuous compliance monitoring
resource "aws_config_configuration_recorder" "soc2" {
  name     = "soc2-config"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Config rules aligned with SOC2 criteria
resource "aws_config_config_rule" "encryption" {
  name = "soc2-encryption-enabled"
  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }
  tags = { SOC2_Criteria = "CC6.1" }
}

resource "aws_config_config_rule" "s3_encryption" {
  name = "soc2-s3-encryption"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
  tags = { SOC2_Criteria = "CC6.1" }
}

resource "aws_config_config_rule" "mfa" {
  name = "soc2-mfa-enabled"
  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_MFA_ENABLED"
  }
  tags = { SOC2_Criteria = "CC6.1" }
}

resource "aws_config_config_rule" "cloudtrail" {
  name = "soc2-cloudtrail-enabled"
  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }
  tags = { SOC2_Criteria = "CC7.2" }
}

resource "aws_config_config_rule" "restricted_ssh" {
  name = "soc2-restricted-ssh"
  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }
  tags = { SOC2_Criteria = "CC6.1" }
}
```

## Incident Detection and Response

Automate incident detection for SOC2 CC7.3 and CC7.4.

```hcl
# GuardDuty for automated threat detection
resource "aws_guardduty_detector" "soc2" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
  }

  tags = {
    SOC2_Criteria = "CC7.3"  # Detect security events
  }
}

# Security Hub for centralized findings
resource "aws_securityhub_account" "soc2" {}

# SNS topic for security alerts
resource "aws_sns_topic" "security" {
  name              = "soc2-security-alerts"
  kms_master_key_id = aws_kms_key.main.id

  tags = {
    SOC2_Criteria = "CC7.4"  # Respond to security events
  }
}

resource "aws_sns_topic_subscription" "security_team" {
  topic_arn = aws_sns_topic.security.arn
  protocol  = "email"
  endpoint  = "security@company.com"
}

# EventBridge rule for GuardDuty findings
resource "aws_cloudwatch_event_rule" "security_findings" {
  name = "soc2-security-findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 4] }]
    }
  })

  tags = {
    SOC2_Criteria = "CC7.3"
  }
}

resource "aws_cloudwatch_event_target" "security_sns" {
  rule      = aws_cloudwatch_event_rule.security_findings.name
  target_id = "security-notification"
  arn       = aws_sns_topic.security.arn
}

# Config compliance change notifications
resource "aws_cloudwatch_event_rule" "compliance_change" {
  name = "soc2-compliance-change"

  event_pattern = jsonencode({
    source      = ["aws.config"]
    detail-type = ["Config Rules Compliance Change"]
    detail = {
      messageType = ["ComplianceChangeNotification"]
      newEvaluationResult = {
        complianceType = ["NON_COMPLIANT"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "compliance_sns" {
  rule      = aws_cloudwatch_event_rule.compliance_change.name
  target_id = "compliance-notification"
  arn       = aws_sns_topic.security.arn
}
```

## Data Classification and Confidentiality

Protect confidential data with proper access controls and encryption.

```hcl
# S3 bucket for confidential data
resource "aws_s3_bucket" "confidential" {
  bucket = "company-confidential-${var.environment}"

  tags = {
    DataClassification = "confidential"
    SOC2_Criteria      = "C1.1"  # Confidential information
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "confidential" {
  bucket = aws_s3_bucket.confidential.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "confidential" {
  bucket = aws_s3_bucket.confidential.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "confidential" {
  bucket        = aws_s3_bucket.confidential.id
  target_bucket = aws_s3_bucket.audit_logs.id
  target_prefix = "s3-access-logs/confidential/"
}
```

## Wrapping Up

SOC2 compliance is about proving that your controls work consistently over time. Unlike point-in-time frameworks, SOC2 Type II requires sustained compliance. Terraform is the perfect tool for this because your controls are defined as code, deployed automatically, and monitored continuously.

The key insight is that SOC2 is not just about security. Availability, processing integrity, confidentiality, and privacy are equally important. Your infrastructure needs multi-AZ deployments for availability, audit logging for integrity, encryption for confidentiality, and data lifecycle policies for privacy.

When auditors review your SOC2 Type II report, they want to see evidence that controls operated effectively throughout the audit period. Terraform state files, Config compliance history, and CloudTrail logs together provide that evidence.

For monitoring your SOC2 controls and getting real-time alerts when compliance drift occurs, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-soc2-compliant-infrastructure-with-terraform/view) for compliance-aware infrastructure observability.
