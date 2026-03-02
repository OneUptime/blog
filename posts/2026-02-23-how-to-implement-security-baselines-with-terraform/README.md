# How to Implement Security Baselines with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Baseline, AWS, Best Practices

Description: Learn how to define and enforce security baselines across your cloud infrastructure using Terraform modules and policies.

---

A security baseline is the minimum set of security controls that every resource in your environment must meet. Without a baseline, you end up with a patchwork of configurations where some resources are locked down tight and others are wide open. Terraform is an excellent tool for implementing security baselines because you can codify your requirements into reusable modules that enforce consistent security settings across all environments.

This guide walks through building security baselines for common AWS resources using Terraform, and how to make sure those baselines are actually followed.

## What Goes Into a Security Baseline

A security baseline typically covers:

- Encryption (at rest and in transit)
- Network access controls
- Logging and monitoring
- Identity and access management
- Resource tagging for accountability
- Backup and recovery settings

The specific settings depend on your compliance requirements and risk tolerance, but the approach is the same: define the baseline once, enforce it everywhere.

## Create a Baseline Module for S3 Buckets

S3 buckets are one of the most common sources of security incidents. Here is a module that enforces your baseline:

```hcl
# modules/secure-s3-bucket/main.tf

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  tags = merge(var.tags, {
    SecurityBaseline = "v1.0"
    ManagedBy        = "terraform"
  })
}

# Block all public access by default
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption with KMS
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_id
    }
    bucket_key_enabled = true
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable access logging
resource "aws_s3_bucket_logging" "this" {
  bucket = aws_s3_bucket.this.id

  target_bucket = var.logging_bucket_id
  target_prefix = "${var.bucket_name}/"
}

# Enforce SSL-only access
resource "aws_s3_bucket_policy" "ssl_only" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.this.arn,
          "${aws_s3_bucket.this.arn}/*"
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

# Lifecycle rule to manage costs and compliance
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = var.glacier_transition_days
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }
}
```

```hcl
# modules/secure-s3-bucket/variables.tf

variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for server-side encryption"
}

variable "logging_bucket_id" {
  type        = string
  description = "S3 bucket ID for access logging"
}

variable "glacier_transition_days" {
  type        = number
  description = "Days before transitioning objects to Glacier"
  default     = 90
}

variable "noncurrent_version_expiration_days" {
  type        = number
  description = "Days before deleting noncurrent object versions"
  default     = 30
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to the bucket"
  default     = {}
}
```

Teams use this module instead of creating raw `aws_s3_bucket` resources:

```hcl
module "data_bucket" {
  source = "../modules/secure-s3-bucket"

  bucket_name        = "my-app-data"
  kms_key_id         = aws_kms_key.main.id
  logging_bucket_id  = module.logging_bucket.bucket_id

  tags = {
    Team        = "backend"
    Environment = "production"
  }
}
```

## Create a Baseline Module for RDS

```hcl
# modules/secure-rds/main.tf

resource "aws_db_instance" "this" {
  identifier = var.identifier

  # Engine configuration
  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage

  # Security baseline requirements
  storage_encrypted    = true  # Always encrypted
  kms_key_id           = var.kms_key_id
  multi_az             = var.multi_az

  # Network security
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false  # Never public

  # Backup baseline
  backup_retention_period = max(var.backup_retention_period, 14)  # Minimum 14 days
  backup_window           = var.backup_window
  copy_tags_to_snapshot   = true

  # Monitoring baseline
  monitoring_interval          = 60
  monitoring_role_arn          = var.monitoring_role_arn
  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = var.log_exports

  # Maintenance
  auto_minor_version_upgrade = true
  maintenance_window         = var.maintenance_window
  deletion_protection        = var.deletion_protection

  # Authentication
  iam_database_authentication_enabled = true

  tags = merge(var.tags, {
    SecurityBaseline = "v1.0"
    ManagedBy        = "terraform"
  })
}
```

Notice how the module enforces certain values regardless of input:

- `storage_encrypted` is always `true`
- `publicly_accessible` is always `false`
- `backup_retention_period` is at least 14 days
- `monitoring_interval` and `performance_insights_enabled` are always on

## Create a Network Security Baseline

```hcl
# modules/secure-vpc/main.tf

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    SecurityBaseline = "v1.0"
  })
}

# Enable VPC Flow Logs (always required)
resource "aws_flow_log" "this" {
  vpc_id                   = aws_vpc.this.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = var.flow_log_role_arn
  max_aggregation_interval = 60

  tags = {
    Name = "${var.name}-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs/${var.name}"
  retention_in_days = var.flow_log_retention_days
  kms_key_id        = var.kms_key_id
}

# Default security group - deny all traffic
resource "aws_default_security_group" "this" {
  vpc_id = aws_vpc.this.id

  # No ingress rules - deny all inbound
  # No egress rules - deny all outbound

  tags = {
    Name = "${var.name}-default-deny-all"
  }
}
```

## Enforce Baselines with Policy-as-Code

Modules alone are not enough. Teams might bypass them or use raw resources. Use policy-as-code to enforce your baselines:

```rego
# policy/baseline_enforcement.rego
package terraform.baseline

# Deny unencrypted S3 buckets
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not has_encryption(resource)
  msg := sprintf("S3 bucket %s must use the secure-s3-bucket module with encryption enabled", [resource.address])
}

# Deny publicly accessible RDS instances
deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.publicly_accessible == true
  msg := sprintf("RDS instance %s must not be publicly accessible", [resource.address])
}

# Deny VPCs without flow logs
deny[msg] {
  vpc := input.resource_changes[_]
  vpc.type == "aws_vpc"
  vpc.change.actions[_] == "create"
  not has_flow_log(vpc.address)
  msg := sprintf("VPC %s must have flow logs enabled", [vpc.address])
}

has_flow_log(vpc_address) {
  flow_log := input.resource_changes[_]
  flow_log.type == "aws_flow_log"
  contains(flow_log.change.after_unknown.vpc_id, vpc_address)
}
```

## Track Baseline Compliance Over Time

Tag resources with the baseline version so you can track compliance:

```hcl
locals {
  baseline_tags = {
    SecurityBaseline        = "v1.0"
    BaselineAppliedDate     = "2026-02-23"
    ManagedBy               = "terraform"
  }
}

# Use AWS Config to check baseline compliance
resource "aws_config_config_rule" "s3_encryption" {
  name = "s3-bucket-server-side-encryption-enabled"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "rds_encryption" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_config_rule" "vpc_flow_logs" {
  name = "vpc-flow-logs-enabled"

  source {
    owner             = "AWS"
    source_identifier = "VPC_FLOW_LOGS_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Version Your Baselines

Security baselines evolve. Use semantic versioning for your baseline modules:

```hcl
# Pin baseline module versions
module "data_bucket" {
  source = "git::https://github.com/my-org/terraform-baselines.git//s3?ref=v1.2.0"

  bucket_name = "my-data-bucket"
  # ...
}
```

When you update a baseline, bump the version and give teams a migration window. Use `terraform plan` to show the impact of upgrading.

## Wrapping Up

Security baselines are the foundation of a secure cloud environment. By encoding them into Terraform modules and enforcing them with policy-as-code, you make it easy to do the right thing and hard to do the wrong thing. Start with the resources that matter most, build baseline modules, and gradually expand coverage. The investment pays for itself the first time a misconfiguration is caught before it reaches production.

For monitoring your baselined infrastructure, [OneUptime](https://oneuptime.com) offers comprehensive monitoring, alerting, and incident management to help you detect and respond to issues quickly.
