# How to Implement S3 Bucket Security with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, S3, AWS, Data Protection

Description: A complete guide to securing AWS S3 buckets with Terraform, covering access controls, encryption, logging, versioning, and policy enforcement.

---

S3 buckets are involved in more public data breaches than probably any other AWS service. The reason is simple: S3 is used for everything, and it is easy to misconfigure. A single checkbox or policy statement can make an entire bucket publicly readable. Terraform gives you the power to define your S3 security configuration as code, making it reviewable, repeatable, and enforceable.

This guide covers every aspect of S3 security that you should implement with Terraform.

## Block Public Access First

The most important S3 security setting is the public access block. Enable it at both the account level and the bucket level:

```hcl
# Account-level public access block
resource "aws_s3_account_public_access_block" "account" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket-level public access block
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

Each setting does something different:

- `block_public_acls`: Prevents setting public ACLs on the bucket or objects
- `block_public_policy`: Prevents setting bucket policies that grant public access
- `ignore_public_acls`: Ignores any existing public ACLs
- `restrict_public_buckets`: Restricts access to AWS principals and authorized users only

## Enable Server-Side Encryption

Every S3 bucket should have encryption enabled:

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-secure-data-bucket"

  tags = {
    Name        = "secure-data"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true  # Reduces KMS API call costs
  }
}
```

## Enable Versioning

Versioning protects against accidental deletions and overwrites:

```hcl
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

With versioning enabled, deleted objects can be recovered, and overwritten objects retain their previous versions.

## Enable Access Logging

Know who is accessing your buckets and when:

```hcl
# Logging bucket (needs its own configuration)
resource "aws_s3_bucket" "access_logs" {
  bucket = "my-s3-access-logs"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging on the data bucket
resource "aws_s3_bucket_logging" "data" {
  bucket = aws_s3_bucket.data.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "data-bucket/"
}
```

## Create a Comprehensive Bucket Policy

Combine multiple security requirements into a single bucket policy:

```hcl
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyOldTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          NumericLessThan = {
            "s3:TlsVersion" = 1.2
          }
        }
      },
      {
        Sid       = "DenyUnencryptedUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid       = "RestrictToVPCEndpoint"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          StringNotEquals = {
            "aws:sourceVpce" = aws_vpc_endpoint.s3.id
          }
        }
      }
    ]
  })
}
```

## Lifecycle Rules for Cost and Compliance

Manage object lifecycle to reduce costs and meet retention requirements:

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"

    # Move to Intelligent-Tiering after 30 days
    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 7 years (compliance requirement)
    expiration {
      days = 2555  # ~7 years
    }

    # Clean up old versions
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Object Lock for Immutable Backups

For compliance scenarios where objects must not be modified or deleted:

```hcl
resource "aws_s3_bucket" "compliance" {
  bucket        = "compliance-records"
  object_lock_enabled = true
}

resource "aws_s3_bucket_object_lock_configuration" "compliance" {
  bucket = aws_s3_bucket.compliance.id

  rule {
    default_retention {
      mode = "COMPLIANCE"  # Cannot be overridden, even by root
      days = 365
    }
  }
}

resource "aws_s3_bucket_versioning" "compliance" {
  bucket = aws_s3_bucket.compliance.id

  versioning_configuration {
    status = "Enabled"  # Required for Object Lock
  }
}
```

## Cross-Region Replication for Disaster Recovery

```hcl
resource "aws_s3_bucket_replication_configuration" "data" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.data_replica.arn
      storage_class = "STANDARD_IA"

      # Encrypt with a KMS key in the destination region
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.s3_replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.data]
}
```

## Monitoring and Alerting

Set up alerts for suspicious S3 activity:

```hcl
# CloudTrail data events for S3
resource "aws_cloudtrail" "s3_data_events" {
  name           = "s3-data-events"
  s3_bucket_name = aws_s3_bucket.audit_logs.id

  event_selector {
    read_write_type           = "All"
    include_management_events = false

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.data.arn}/"]
    }
  }
}

# Detect public access attempts
resource "aws_cloudwatch_metric_alarm" "s3_public_access" {
  alarm_name          = "s3-public-access-attempt"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4xxError"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "High number of 4xx errors may indicate public access attempts"

  dimensions = {
    BucketName = aws_s3_bucket.data.id
    FilterId   = "AllRequests"
  }

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}
```

## The Complete Secure Bucket Module

Putting it all together into a reusable module:

```hcl
# Usage
module "secure_bucket" {
  source = "./modules/secure-s3-bucket"

  bucket_name       = "my-application-data"
  kms_key_arn       = aws_kms_key.s3.arn
  logging_bucket_id = aws_s3_bucket.access_logs.id
  vpc_endpoint_id   = aws_vpc_endpoint.s3.id

  lifecycle_rules = {
    glacier_transition_days    = 90
    expiration_days            = 2555
    noncurrent_expiration_days = 90
  }

  tags = {
    Team        = "backend"
    Environment = "production"
  }
}
```

## Wrapping Up

S3 security is not about any single setting. It is about layering multiple controls: public access blocks prevent accidental exposure, encryption protects data at rest and in transit, versioning guards against data loss, logging provides visibility, and lifecycle rules manage retention. Build these into a reusable module so that every bucket in your organization starts with a secure baseline.

For monitoring your S3 buckets and overall infrastructure health, [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and incident management to help you stay on top of potential issues.
