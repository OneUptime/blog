# How to Implement HIPAA-Compliant Infrastructure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HIPAA, Compliance, PHI, Healthcare, Encryption, Audit Logging, Infrastructure as Code

Description: Learn how to provision HIPAA-compliant AWS infrastructure using OpenTofu, covering encryption at rest and in transit, audit logging, access controls, and backup requirements for protected health...

---

HIPAA's Security Rule requires technical safeguards for electronic protected health information (ePHI), including access controls, audit controls, integrity controls, person or entity authentication, and transmission security. Encryption is an addressable implementation specification under the Security Rule, and OpenTofu can codify these safeguards so every ePHI environment is provisioned consistently and reviewed as code.

## HIPAA Technical Safeguard Requirements

```mermaid
graph TD
    A[HIPAA Technical Safeguards] --> B[Access Controls<br/>§164.312(a)]
    A --> C[Audit Controls<br/>§164.312(b)]
    A --> D[Integrity Controls<br/>§164.312(c)]
    A --> E[Person or Entity Authentication<br/>§164.312(d)]
    A --> F[Transmission Security<br/>§164.312(e)]
    B --> G[IAM, MFA, least privilege]
    C --> H[CloudTrail, VPC Flow Logs]
    D --> I[S3 versioning, checksums]
    E --> J[IAM Identity Center, role assumptions]
    F --> K[TLS, secure transport controls]
```

## Encryption at Rest

```hcl
# kms.tf

resource "aws_kms_key" "phi" {
  description             = "KMS key for PHI encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Optional, but commonly enabled

  tags = {
    PHI        = "true"
    Compliance = "HIPAA"
  }
}

# RDS with encryption
resource "aws_db_instance" "phi" {
  identifier              = "${var.environment}-phi-database"
  engine                  = "postgres"
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.phi.arn
  backup_retention_period = 35  # RDS automated backup maximum
  deletion_protection     = true
  multi_az                = true  # Supports availability and resilience
  publicly_accessible     = false

  lifecycle {
    prevent_destroy = true
  }
}
```

## Audit Logging

```hcl
# cloudtrail.tf - CloudTrail supports HIPAA audit controls
resource "aws_cloudtrail" "phi_audit" {
  name                          = "phi-audit-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true  # Detect tampering

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.phi_data.arn}/"]
    }
  }

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.audit.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn
}

# Example audit log retention policy
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "retain-6-years"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2190  # Example 6-year retention policy
    }
  }
}
```

## PHI Data Bucket

```hcl
# phi_storage.tf
resource "aws_s3_bucket" "phi_data" {
  bucket = "${var.environment}-phi-data"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "phi" {
  bucket = aws_s3_bucket.phi_data.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_object_lock_configuration" "phi" {
  bucket = aws_s3_bucket.phi_data.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      years = 6  # Example retention period aligned to policy
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "phi" {
  bucket = aws_s3_bucket.phi_data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.phi.arn
    }
  }
}
```

## Access Controls

```hcl
# iam_phi.tf
# Example identity policy for approved PHI access
resource "aws_iam_policy" "phi_access" {
  name = "phi-data-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.phi_data.arn}/*"
        Condition = {
          Bool = { "aws:MultiFactorAuthPresent" = "true" }
        }
      }
    ]
  })
}
```

## Best Practices

- Sign a Business Associate Agreement (BAA) with AWS before storing or processing PHI, and keep PHI workloads on HIPAA-eligible AWS services.
- Enable KMS key rotation if it fits your risk model - AWS KMS automatic rotation for customer-managed symmetric keys is optional and defaults to an annual schedule.
- Use S3 Object Lock in COMPLIANCE mode for WORM audit archives - compliance mode prevents any user, including the root user in your AWS account, from deleting protected object versions before retention expires.
- Enable CloudTrail log file validation to detect log modification or deletion and to strengthen your audit evidence.
- Test backup restoration regularly - HIPAA requires a data backup plan and periodic testing/revision of contingency plans, but it does not prescribe a quarterly cadence.
