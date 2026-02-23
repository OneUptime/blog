# How to Build a Government (FedRAMP) Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, FedRAMP, Government, Compliance, Security, GovCloud

Description: A practical guide to building FedRAMP-compliant government infrastructure with Terraform using AWS GovCloud, FIPS encryption, continuous monitoring, and NIST controls.

---

Selling to the US federal government requires FedRAMP authorization, and FedRAMP is one of the most rigorous cloud compliance frameworks out there. It is based on NIST 800-53 controls and requires specific technical implementations for everything from encryption to access control to incident response. Building FedRAMP-compliant infrastructure from scratch is a significant undertaking, but Terraform makes it manageable by codifying every control.

## Understanding FedRAMP

FedRAMP (Federal Risk and Authorization Management Program) standardizes security assessment for cloud services used by federal agencies. There are three impact levels: Low, Moderate, and High. Most organizations target Moderate, which requires implementing over 300 security controls. The good news is that many of these controls map directly to infrastructure configurations that Terraform can manage.

## Why AWS GovCloud?

AWS GovCloud (US) regions are isolated from commercial AWS regions and operated by US persons on US soil. Using GovCloud is typically required for FedRAMP High and strongly recommended for FedRAMP Moderate. GovCloud provides FIPS 140-2 compliant endpoints, ITAR support, and FedRAMP High authorization.

## Architecture Overview

Our FedRAMP infrastructure includes:

- AWS GovCloud deployment
- FIPS 140-2 encryption for all data
- Comprehensive access control with MFA
- Continuous monitoring with CloudWatch and Config
- Audit logging with CloudTrail
- Incident response automation
- Backup and disaster recovery
- Network segmentation

## GovCloud Provider Configuration

Configure Terraform to deploy in GovCloud.

```hcl
# AWS GovCloud provider
provider "aws" {
  region = "us-gov-west-1"

  default_tags {
    tags = {
      Compliance  = "FedRAMP"
      ImpactLevel = "Moderate"
      ManagedBy   = "terraform"
      System      = var.system_name
    }
  }
}

# DR region in GovCloud
provider "aws" {
  alias  = "dr"
  region = "us-gov-east-1"

  default_tags {
    tags = {
      Compliance  = "FedRAMP"
      ImpactLevel = "Moderate"
      ManagedBy   = "terraform"
      Purpose     = "disaster-recovery"
    }
  }
}
```

## FIPS 140-2 Compliant Encryption

FedRAMP requires FIPS 140-2 validated encryption modules.

```hcl
# KMS key with FIPS-compliant configuration
resource "aws_kms_key" "fedramp" {
  description             = "FedRAMP encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  is_enabled              = true
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  key_usage               = "ENCRYPT_DECRYPT"

  # GovCloud KMS endpoints are FIPS 140-2 validated
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws-us-gov:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "KeyAdmins"
        Effect = "Allow"
        Principal = {
          AWS = var.key_admin_arns
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion",
        ]
        Resource = "*"
      },
      {
        Sid    = "KeyUsers"
        Effect = "Allow"
        Principal = {
          AWS = var.key_user_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Control = "SC-13"  # NIST 800-53 Cryptographic Protection
  }
}
```

## Network Security

FedRAMP requires strict network boundaries and monitoring.

```hcl
# VPC with FedRAMP-compliant configuration
resource "aws_vpc" "fedramp" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name    = "fedramp-${var.environment}"
    Control = "SC-7"  # Boundary Protection
  }
}

# VPC endpoints to keep traffic within AWS network
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.fedramp.id
  service_name      = "com.amazonaws.us-gov-west-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
}

resource "aws_vpc_endpoint" "kms" {
  vpc_id              = aws_vpc.fedramp.id
  service_name        = "com.amazonaws.us-gov-west-1.kms"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# VPC Flow Logs - SC-7(3) Access Points
resource "aws_flow_log" "fedramp" {
  vpc_id                   = aws_vpc.fedramp.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60

  tags = {
    Control = "SC-7"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/fedramp/vpc-flow-logs"
  retention_in_days = 365  # 1 year minimum for FedRAMP Moderate
  kms_key_id        = aws_kms_key.fedramp.arn
}

# Network ACLs for additional layer of defense
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.fedramp.id
  subnet_ids = aws_subnet.private[*].id

  # Allow traffic within VPC
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = aws_vpc.fedramp.cidr_block
    from_port  = 0
    to_port    = 0
  }

  # Allow return traffic for outbound connections
  ingress {
    protocol   = "tcp"
    rule_no    = 200
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny everything else
  ingress {
    protocol   = "-1"
    rule_no    = 999
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Control = "SC-7"
  }
}
```

## Audit Logging (AU Controls)

FedRAMP requires comprehensive audit logging for all system events.

```hcl
# CloudTrail with FedRAMP-compliant configuration
resource "aws_cloudtrail" "fedramp" {
  name                       = "fedramp-audit-trail"
  s3_bucket_name             = aws_s3_bucket.audit_logs.id
  is_multi_region_trail      = true
  enable_log_file_validation = true
  kms_key_id                 = aws_kms_key.fedramp.arn

  # Log all management events
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  # Log data events for S3 and Lambda
  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws-us-gov:s3"]
    }

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws-us-gov:lambda"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  tags = {
    Control = "AU-2"  # Audit Events
  }
}

# Audit log S3 bucket with immutability
resource "aws_s3_bucket" "audit_logs" {
  bucket = "fedramp-audit-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Control = "AU-9"  # Protection of Audit Information
  }
}

resource "aws_s3_bucket_object_lock_configuration" "audit" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.fedramp.arn
    }
  }
}
```

## Continuous Monitoring (CA-7)

FedRAMP requires continuous monitoring of security controls.

```hcl
# AWS Config for continuous compliance monitoring
resource "aws_config_configuration_recorder" "fedramp" {
  name     = "fedramp-config"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# FedRAMP-relevant Config rules
resource "aws_config_config_rule" "encryption_at_rest" {
  name = "fedramp-encryption-at-rest"
  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }
  tags = { Control = "SC-28" }
}

resource "aws_config_config_rule" "s3_encryption" {
  name = "fedramp-s3-encryption"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
  tags = { Control = "SC-28" }
}

resource "aws_config_config_rule" "mfa_enabled" {
  name = "fedramp-mfa-enabled"
  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_MFA_ENABLED"
  }
  tags = { Control = "IA-2" }  # Identification and Authentication
}

resource "aws_config_config_rule" "root_mfa" {
  name = "fedramp-root-mfa"
  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }
  tags = { Control = "IA-2" }
}

resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "fedramp-cloudtrail"
  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }
  tags = { Control = "AU-2" }
}

resource "aws_config_config_rule" "vpc_flow_logs" {
  name = "fedramp-vpc-flow-logs"
  source {
    owner             = "AWS"
    source_identifier = "VPC_FLOW_LOGS_ENABLED"
  }
  tags = { Control = "AU-12" }  # Audit Generation
}

# GuardDuty for threat detection (SI-4)
resource "aws_guardduty_detector" "fedramp" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Control = "SI-4"  # Information System Monitoring
  }
}

# Security Hub for centralized security findings
resource "aws_securityhub_account" "fedramp" {}

resource "aws_securityhub_standards_subscription" "nist" {
  standards_arn = "arn:aws-us-gov:securityhub:${var.region}::standards/nist-800-53/v/5.0.0"
}
```

## Incident Response (IR Controls)

Automate incident response for faster containment.

```hcl
# SNS topic for security incidents
resource "aws_sns_topic" "security_incidents" {
  name              = "fedramp-security-incidents"
  kms_master_key_id = aws_kms_key.fedramp.id

  tags = {
    Control = "IR-6"  # Incident Reporting
  }
}

# EventBridge rule for high-severity GuardDuty findings
resource "aws_cloudwatch_event_rule" "guardduty_high" {
  name = "high-severity-findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [{ numeric = [">=", 7] }]
    }
  })

  tags = {
    Control = "IR-4"  # Incident Handling
  }
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_high.name
  target_id = "security-incident-notification"
  arn       = aws_sns_topic.security_incidents.arn
}

# Auto-quarantine Lambda for compromised instances
resource "aws_lambda_function" "quarantine" {
  filename         = "quarantine.zip"
  function_name    = "auto-quarantine"
  role             = aws_iam_role.quarantine.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60
  kms_key_arn      = aws_kms_key.fedramp.arn

  environment {
    variables = {
      SNS_TOPIC_ARN     = aws_sns_topic.security_incidents.arn
      QUARANTINE_SG_ID  = aws_security_group.quarantine.id
    }
  }

  tags = {
    Control = "IR-4"
  }
}

# Quarantine security group - no ingress, no egress
resource "aws_security_group" "quarantine" {
  name        = "quarantine"
  description = "Quarantine - blocks all traffic"
  vpc_id      = aws_vpc.fedramp.id

  # No ingress rules
  # No egress rules

  tags = {
    Purpose = "incident-response-quarantine"
    Control = "IR-4"
  }
}
```

## Wrapping Up

FedRAMP-compliant infrastructure requires implementing hundreds of NIST 800-53 controls. Terraform makes this achievable by codifying each control as infrastructure configuration. Encryption is enforced by KMS key policies. Access control is defined in IAM policies. Audit logging is configured through CloudTrail and Config. Continuous monitoring runs through Security Hub and GuardDuty.

The beauty of using Terraform for FedRAMP is that your infrastructure code becomes part of your System Security Plan (SSP). Auditors can trace each control to a specific Terraform resource. Updates to controls go through code review. And new environments automatically inherit all compliance configurations.

For monitoring your FedRAMP-authorized infrastructure with NIST-aligned dashboards and automated control validation, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-government-fedramp-infrastructure-with-terraform/view) for government-grade infrastructure observability.
