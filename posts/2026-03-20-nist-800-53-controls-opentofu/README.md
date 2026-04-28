# How to Implement NIST 800-53 Controls with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, NIST 800-53, Compliance, Security Controls, Infrastructure as Code

Description: Learn how to implement key NIST SP 800-53 security control families with OpenTofu to support federal compliance requirements on AWS.

NIST SP 800-53 defines security and privacy controls for federal information systems. OpenTofu lets you codify the most infrastructure-relevant control families - access control, audit logging, system integrity, and system and communications protection - as verifiable, version-controlled resources.

## AC - Access Control

```hcl
# AC-2: Account Management - least-privilege IAM roles

resource "aws_iam_role" "app_role" {
  name = "app-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "app_least_privilege" {
  role = aws_iam_role.app_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = ["arn:aws:s3:::myapp-data/*"]
    }]
  })
}

# AC-3: Access Enforcement - S3 bucket policy denies non-HTTPS
resource "aws_s3_bucket_policy" "enforce_tls" {
  bucket = aws_s3_bucket.data.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyHTTP"
      Effect = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = ["arn:aws:s3:::${aws_s3_bucket.data.bucket}/*"]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}
```

## AU - Audit and Accountability

```hcl
# AU-2, AU-3: Audit Events - CloudTrail with all management events
resource "aws_cloudtrail" "nist" {
  name                          = "nist-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

# AU-9: Protection of Audit Information - encrypted CloudTrail logs
resource "aws_cloudtrail" "nist_encrypted" {
  kms_key_id = aws_kms_key.audit.arn
  # ...
}

# AU-11: Audit Record Retention - 7-year log retention
resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/cloudtrail/nist"
  retention_in_days = 2557  # 7 years
}
```

## SI - System and Information Integrity

```hcl
# SI-2: Flaw Remediation - AWS Systems Manager Patch Manager
resource "aws_ssm_patch_baseline" "nist" {
  name             = "nist-patch-baseline"
  operating_system = "AMAZON_LINUX_2023"

  approval_rule {
    approve_after_days = 7  # Patch within 7 days of release

    patch_filter {
      key    = "CLASSIFICATION"
      values = ["Security", "Bugfix"]
    }
    patch_filter {
      key    = "SEVERITY"
      values = ["Critical", "Important"]
    }
  }
}

# SI-3: Malicious Code Protection - GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes { enable = true }
      }
    }
  }
}
```

## SC - System and Communications Protection

```hcl
# SC-8: Transmission Confidentiality - ALB HTTPS only
resource "aws_alb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# SC-28: Protection of Information at Rest - KMS encryption
resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}
```

## IA - Identification and Authentication

```hcl
# IA-5: Authenticator Management - require MFA via SCP
resource "aws_organizations_policy" "require_mfa" {
  name = "RequireMFA"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyWithoutMFA"
      Effect = "Deny"
      Action = ["*"]
      Resource = "*"
      Condition = {
        BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" }
        StringNotEquals = { "aws:PrincipalType" = "Service" }
      }
    }]
  })
}
```

## Conclusion

NIST 800-53 controls map directly to AWS services - CloudTrail for audit logging, GuardDuty for malicious code protection, KMS for encryption at rest, TLS policies for in-transit protection, and IAM for access control. Implement them with OpenTofu to make compliance posture visible in code reviews, detectable in CI drift checks, and auditable through version history.
