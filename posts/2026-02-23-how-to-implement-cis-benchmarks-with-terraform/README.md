# How to Implement CIS Benchmarks with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CIS Benchmarks, Security, Compliance

Description: Implement CIS AWS Foundations Benchmark controls with Terraform including identity management, logging, monitoring, networking, and automated compliance checking.

---

The CIS AWS Foundations Benchmark is a set of security configuration best practices published by the Center for Internet Security. It covers identity and access management, logging, monitoring, and networking controls. Many organizations adopt these benchmarks as a baseline security standard, and auditors frequently reference them. Implementing these controls with Terraform means you can ensure every AWS account starts compliant and stays compliant.

This guide maps the key CIS benchmark controls to Terraform configurations.

## Section 1: Identity and Access Management

### 1.4: Ensure No Root Account Access Keys Exist

You cannot manage root access keys with Terraform, but you can monitor for them:

```hcl
# AWS Config rule to check for root access keys
resource "aws_config_config_rule" "no_root_access_keys" {
  name = "iam-root-access-key-check"

  source {
    owner             = "AWS"
    source_identifier = "IAM_ROOT_ACCESS_KEY_CHECK"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

### 1.5-1.8: MFA and Password Policy

```hcl
# CIS 1.8: Ensure IAM password policy requires minimum length of 14
resource "aws_iam_account_password_policy" "cis" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_uppercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  max_password_age               = 90
  password_reuse_prevention      = 24
  allow_users_to_change_password = true
}

# Config rule to check MFA is enabled for all IAM users
resource "aws_config_config_rule" "mfa_enabled" {
  name = "iam-user-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_MFA_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Config rule for root MFA
resource "aws_config_config_rule" "root_mfa" {
  name = "root-account-mfa-enabled"

  source {
    owner             = "AWS"
    source_identifier = "ROOT_ACCOUNT_MFA_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

### 1.16: Ensure IAM Policies Are Attached to Groups or Roles

```hcl
resource "aws_config_config_rule" "no_policies_on_users" {
  name = "iam-user-no-policies-check"

  source {
    owner             = "AWS"
    source_identifier = "IAM_USER_NO_POLICIES_CHECK"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Section 2: Storage

### 2.1.1-2.1.2: S3 Bucket Security

```hcl
# Module for CIS-compliant S3 buckets
resource "aws_s3_bucket" "compliant" {
  bucket = var.bucket_name

  tags = {
    CISBenchmark = "2.1"
  }
}

# CIS 2.1.1: Ensure S3 bucket policy denies HTTP requests
resource "aws_s3_bucket_policy" "deny_http" {
  bucket = aws_s3_bucket.compliant.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.compliant.arn,
          "${aws_s3_bucket.compliant.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# CIS 2.1.2: Ensure S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "compliant" {
  bucket = aws_s3_bucket.compliant.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "compliant" {
  bucket = aws_s3_bucket.compliant.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Account-level S3 public access block
resource "aws_s3_account_public_access_block" "account" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### 2.2.1: Ensure EBS Volume Encryption

```hcl
# CIS 2.2.1: Enable EBS encryption by default
resource "aws_ebs_encryption_by_default" "enabled" {
  enabled = true
}

resource "aws_ebs_default_kms_key" "default" {
  key_arn = aws_kms_key.ebs.arn
}

# Config rule to verify
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

### 2.3.1: RDS Encryption

```hcl
resource "aws_config_config_rule" "rds_encrypted" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_public_access" {
  name = "rds-instance-public-access-check"

  source {
    owner             = "AWS"
    source_identifier = "RDS_INSTANCE_PUBLIC_ACCESS_CHECK"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Section 3: Logging

### 3.1-3.4: CloudTrail Configuration

```hcl
# CIS 3.1: Ensure CloudTrail is enabled in all regions
# CIS 3.2: Ensure CloudTrail log file validation is enabled
# CIS 3.4: Ensure CloudTrail trails are integrated with CloudWatch Logs
resource "aws_cloudtrail" "cis" {
  name                          = "cis-compliant-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true  # CIS 3.1
  enable_logging                = true
  enable_log_file_validation    = true  # CIS 3.2
  kms_key_id                    = aws_kms_key.cloudtrail.arn  # CIS 3.7

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"  # CIS 3.4
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_logs.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }

  tags = {
    CISBenchmark = "3.1,3.2,3.4,3.7"
  }
}

# CIS 3.3: Ensure the S3 bucket used for CloudTrail is not publicly accessible
resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CIS 3.5: Ensure AWS Config is enabled in all regions
resource "aws_config_configuration_recorder" "main" {
  name     = "config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "config-delivery"
  s3_bucket_name = aws_s3_bucket.config.id

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}
```

### 3.6: Ensure S3 Bucket Access Logging

```hcl
resource "aws_s3_bucket_logging" "cloudtrail" {
  bucket        = aws_s3_bucket.cloudtrail.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "s3-access-logs/cloudtrail/"
}
```

## Section 4: Monitoring

### 4.1-4.14: CloudWatch Metric Filters and Alarms

CIS requires metric filters and alarms for specific security events. Here is a reusable pattern:

```hcl
locals {
  cis_alarms = {
    "unauthorized-api-calls" = {
      pattern     = "{ ($.errorCode = \"*UnauthorizedAccess*\") || ($.errorCode = \"AccessDenied*\") }"
      description = "CIS 4.1 - Unauthorized API calls"
    }
    "console-without-mfa" = {
      pattern     = "{ ($.eventName = \"ConsoleLogin\") && ($.additionalEventData.MFAUsed != \"Yes\") }"
      description = "CIS 4.2 - Console login without MFA"
    }
    "root-account-usage" = {
      pattern     = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"
      description = "CIS 4.3 - Root account usage"
    }
    "iam-policy-changes" = {
      pattern     = "{ ($.eventName=DeleteGroupPolicy) || ($.eventName=DeleteRolePolicy) || ($.eventName=DeleteUserPolicy) || ($.eventName=PutGroupPolicy) || ($.eventName=PutRolePolicy) || ($.eventName=PutUserPolicy) || ($.eventName=CreatePolicy) || ($.eventName=DeletePolicy) || ($.eventName=CreatePolicyVersion) || ($.eventName=DeletePolicyVersion) || ($.eventName=AttachRolePolicy) || ($.eventName=DetachRolePolicy) || ($.eventName=AttachUserPolicy) || ($.eventName=DetachUserPolicy) || ($.eventName=AttachGroupPolicy) || ($.eventName=DetachGroupPolicy) }"
      description = "CIS 4.4 - IAM policy changes"
    }
    "cloudtrail-changes" = {
      pattern     = "{ ($.eventName = CreateTrail) || ($.eventName = UpdateTrail) || ($.eventName = DeleteTrail) || ($.eventName = StartLogging) || ($.eventName = StopLogging) }"
      description = "CIS 4.5 - CloudTrail configuration changes"
    }
    "security-group-changes" = {
      pattern     = "{ ($.eventName = AuthorizeSecurityGroupIngress) || ($.eventName = AuthorizeSecurityGroupEgress) || ($.eventName = RevokeSecurityGroupIngress) || ($.eventName = RevokeSecurityGroupEgress) || ($.eventName = CreateSecurityGroup) || ($.eventName = DeleteSecurityGroup) }"
      description = "CIS 4.10 - Security group changes"
    }
    "nacl-changes" = {
      pattern     = "{ ($.eventName = CreateNetworkAcl) || ($.eventName = CreateNetworkAclEntry) || ($.eventName = DeleteNetworkAcl) || ($.eventName = DeleteNetworkAclEntry) || ($.eventName = ReplaceNetworkAclEntry) || ($.eventName = ReplaceNetworkAclAssociation) }"
      description = "CIS 4.11 - NACL changes"
    }
    "vpc-changes" = {
      pattern     = "{ ($.eventName = CreateVpc) || ($.eventName = DeleteVpc) || ($.eventName = ModifyVpcAttribute) || ($.eventName = AcceptVpcPeeringConnection) || ($.eventName = CreateVpcPeeringConnection) || ($.eventName = DeleteVpcPeeringConnection) || ($.eventName = RejectVpcPeeringConnection) || ($.eventName = AttachClassicLinkVpc) || ($.eventName = DetachClassicLinkVpc) || ($.eventName = DisableVpcClassicLink) || ($.eventName = EnableVpcClassicLink) }"
      description = "CIS 4.14 - VPC changes"
    }
  }
}

# Create metric filters and alarms for each CIS control
resource "aws_cloudwatch_log_metric_filter" "cis" {
  for_each = local.cis_alarms

  name           = each.key
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = each.value.pattern

  metric_transformation {
    name      = each.key
    namespace = "CISBenchmark"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "cis" {
  for_each = local.cis_alarms

  alarm_name          = "cis-${each.key}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = each.key
  namespace           = "CISBenchmark"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = each.value.description
  alarm_actions       = [aws_sns_topic.cis_alarms.arn]
}

resource "aws_sns_topic" "cis_alarms" {
  name              = "cis-benchmark-alarms"
  kms_master_key_id = aws_kms_key.alerts.id
}
```

## Section 5: Networking

### 5.1: Ensure No Network ACLs Allow 0.0.0.0/0 to Admin Ports

```hcl
# Config rule for unrestricted SSH
resource "aws_config_config_rule" "restricted_ssh" {
  name = "restricted-ssh"

  source {
    owner             = "AWS"
    source_identifier = "INCOMING_SSH_DISABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Config rule for unrestricted RDP
resource "aws_config_config_rule" "restricted_rdp" {
  name = "restricted-common-ports"

  source {
    owner             = "AWS"
    source_identifier = "RESTRICTED_INCOMING_TRAFFIC"
  }

  input_parameters = jsonencode({
    blockedPort1 = "3389"
    blockedPort2 = "22"
  })

  depends_on = [aws_config_configuration_recorder.main]
}

# Lock down the default security group (CIS 5.4)
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
  # No rules - effectively disables it
}
```

### 5.2: Ensure VPC Flow Logging

```hcl
# CIS 5.2: VPC Flow Logs enabled
resource "aws_flow_log" "cis" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60

  tags = {
    CISBenchmark = "5.2"
  }
}
```

## Automated Compliance Checking

Use Security Hub to continuously validate CIS compliance:

```hcl
resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}
```

## Summary

Implementing CIS Benchmarks with Terraform converts security best practices into reproducible infrastructure code. The key areas are IAM configuration, storage encryption, comprehensive logging with CloudTrail and Config, monitoring with CloudWatch metric filters and alarms, and networking controls. By wrapping these in Terraform modules, you can apply them to every new account automatically and use Security Hub for continuous compliance verification.

For more on compliance, see [how to handle Terraform with compliance frameworks](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-with-compliance-frameworks-soc2-pci-hipaa/view) and [how to implement Security Hub with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-security-hub-with-terraform/view).
