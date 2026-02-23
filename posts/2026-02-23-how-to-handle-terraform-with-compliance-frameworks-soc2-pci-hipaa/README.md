# How to Handle Terraform with Compliance Frameworks (SOC2 PCI HIPAA)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compliance, SOC2, PCI DSS, HIPAA, Security, Infrastructure as Code

Description: Map SOC2, PCI DSS, and HIPAA requirements to Terraform configurations with practical examples for encryption, access control, logging, and audit trails.

---

Compliance frameworks like SOC2, PCI DSS, and HIPAA translate business and legal requirements into technical controls. When your infrastructure is defined in Terraform, those controls become code that can be tested, reviewed, and audited. This is a significant advantage over manually configured infrastructure where proving compliance means screenshots and spreadsheets.

This guide maps common requirements from SOC2, PCI DSS, and HIPAA to specific Terraform configurations. The goal is not to cover every control in every framework but to show how Terraform serves as both the implementation and the evidence for your compliance program.

## Shared Requirements Across Frameworks

All three frameworks share core requirements around encryption, access control, logging, and network security. Start here to cover the most ground.

### Encryption Everywhere

SOC2 (CC6.1), PCI DSS (Req 3.4, 4.1), and HIPAA (164.312(a)(2)(iv)) all require encryption of sensitive data at rest and in transit.

```hcl
# Module for creating compliant S3 buckets
module "compliant_bucket" {
  source = "./modules/compliant-s3"

  bucket_name        = "${var.project}-${var.environment}-data"
  kms_key_arn        = aws_kms_key.compliance.arn
  log_bucket_id      = aws_s3_bucket.access_logs.id
  allowed_principals = var.data_access_roles
}

# modules/compliant-s3/main.tf
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = {
    Compliance  = join(",", var.compliance_frameworks)
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_logging" "this" {
  bucket        = aws_s3_bucket.this.id
  target_bucket = var.log_bucket_id
  target_prefix = "s3-access-logs/${var.bucket_name}/"
}
```

### Comprehensive Audit Logging

SOC2 (CC7.2), PCI DSS (Req 10), and HIPAA (164.312(b)) all require detailed audit trails.

```hcl
# CloudTrail configuration that satisfies all three frameworks
resource "aws_cloudtrail" "compliance" {
  name                          = "${var.project}-compliance-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true
  enable_log_file_validation    = true  # Integrity verification
  kms_key_id                    = aws_kms_key.audit.arn

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.audit.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_logs.arn

  # Log data events for sensitive buckets
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = [for b in var.sensitive_bucket_arns : "${b}/"]
    }
  }

  tags = {
    Compliance = "SOC2,PCI-DSS,HIPAA"
  }
}

# Log retention - PCI requires 1 year, keep longer for safety
resource "aws_cloudwatch_log_group" "audit" {
  name              = "/compliance/cloudtrail"
  retention_in_days = 400  # Over 1 year to satisfy PCI requirement
  kms_key_id        = aws_kms_key.audit.arn
}
```

### Network Segmentation

PCI DSS (Req 1) requires segmentation of the cardholder data environment. SOC2 and HIPAA also require network controls.

```hcl
# Separate VPC for compliance workloads
resource "aws_vpc" "compliance" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name       = "${var.project}-compliance-vpc"
    Compliance = "SOC2,PCI-DSS,HIPAA"
  }
}

# Private subnets for data processing
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.compliance.id
  cidr_block        = cidrsubnet(aws_vpc.compliance.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  # No public IPs
  map_public_ip_on_launch = false

  tags = {
    Name = "${var.project}-private-${var.availability_zones[count.index]}"
    Tier = "private"
  }
}

# VPC Flow Logs - required for network monitoring
resource "aws_flow_log" "compliance" {
  vpc_id                   = aws_vpc.compliance.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60  # 1-minute granularity

  tags = {
    Compliance = "SOC2,PCI-DSS,HIPAA"
  }
}
```

## SOC2-Specific Controls

SOC2 Trust Services Criteria focus on security, availability, processing integrity, confidentiality, and privacy.

### Change Management (CC8.1)

Terraform inherently supports change management through code review and version control. Add automated checks:

```hcl
# Use Terraform Cloud/Enterprise for policy enforcement
# Or add pre-commit hooks for local development

# Tag resources with change tracking metadata
locals {
  change_management_tags = {
    ManagedBy      = "terraform"
    Repository     = var.repository_url
    LastModifiedBy = var.ci_actor
    ChangeTicket   = var.change_ticket
  }
}

# Apply to all resources
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(local.change_management_tags, {
    Name = "${var.project}-app"
  })
}
```

### Monitoring and Alerting (CC7.2, CC7.3)

```hcl
# GuardDuty for threat detection
resource "aws_guardduty_detector" "compliance" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

# Config rules for continuous compliance monitoring
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "s3_bucket_encryption" {
  name = "s3-bucket-encryption"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## PCI DSS-Specific Controls

PCI DSS has very prescriptive requirements around cardholder data protection.

### Restrict Access to Cardholder Data (Req 7)

```hcl
# Dedicated IAM role for cardholder data access
resource "aws_iam_role" "cardholder_data_access" {
  name = "cardholder-data-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = var.payment_processing_role_arns
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          IpAddress = {
            "aws:SourceIp" = var.trusted_network_cidrs
          }
        }
      }
    ]
  })
}

# Only allow access to specific cardholder data resources
resource "aws_iam_role_policy" "cardholder_data" {
  name = "cardholder-data-policy"
  role = aws_iam_role.cardholder_data_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.cardholder_data.arn
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.region
          }
        }
      }
    ]
  })
}
```

### Web Application Firewall (Req 6.6)

```hcl
# WAF for payment processing endpoints
resource "aws_wafv2_web_acl" "payment" {
  name        = "payment-waf"
  scope       = "REGIONAL"
  description = "WAF for PCI DSS Requirement 6.6"

  default_action {
    allow {}
  }

  rule {
    name     = "aws-managed-common-rules"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleMetrics"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    sampled_requests_enabled   = true
    metric_name                = "PaymentWAFMetrics"
  }
}
```

## HIPAA-Specific Controls

HIPAA focuses on protecting electronic protected health information (ePHI).

### Access Controls (164.312(a)(1))

```hcl
# Session timeout for HIPAA compliance
resource "aws_iam_account_password_policy" "hipaa" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_uppercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  max_password_age               = 90
  password_reuse_prevention      = 24
  allow_users_to_change_password = true
}
```

### Backup and Recovery (164.308(a)(7))

```hcl
# HIPAA backup plan
resource "aws_backup_plan" "hipaa" {
  name = "hipaa-backup-plan"

  rule {
    rule_name         = "daily-ephi-backup"
    target_vault_name = aws_backup_vault.hipaa.name
    schedule          = "cron(0 2 * * ? *)"

    lifecycle {
      cold_storage_after = 30
      delete_after       = 2555  # 7 years
    }

    # Cross-region copy for disaster recovery
    copy_action {
      destination_vault_arn = aws_backup_vault.hipaa_dr.arn
      lifecycle {
        cold_storage_after = 30
        delete_after       = 2555
      }
    }
  }
}

resource "aws_backup_vault" "hipaa" {
  name        = "hipaa-backup-vault"
  kms_key_arn = aws_kms_key.hipaa.arn

  tags = {
    Compliance = "HIPAA"
  }
}
```

## Compliance as Code Testing

Use policy-as-code tools to continuously validate compliance:

```bash
# Run checkov against your Terraform code
checkov -d . --framework terraform --check CKV_AWS_145,CKV_AWS_19,CKV_AWS_18

# Run tfsec with compliance-specific checks
tfsec . --tfvars-file production.tfvars
```

## Summary

Terraform turns compliance requirements into verifiable, repeatable infrastructure code. SOC2, PCI DSS, and HIPAA share common ground in encryption, logging, access control, and network segmentation. By building reusable modules that encode these requirements, you can ensure every new environment starts compliant and stays compliant through continuous monitoring with AWS Config, Security Hub, and policy-as-code tools.

For more on specific controls, see [how to implement CloudTrail logging with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cloudtrail-logging-with-terraform/view) and [how to implement CIS Benchmarks with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cis-benchmarks-with-terraform/view).
