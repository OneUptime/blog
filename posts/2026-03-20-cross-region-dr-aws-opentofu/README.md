# How to Set Up Cross-Region Disaster Recovery with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Disaster Recovery, Cross-Region, OpenTofu, RDS, S3, Route53

Description: Learn how to implement cross-region disaster recovery on AWS using OpenTofu with RDS read replicas, S3 cross-region replication, and Route53 health-check failover.

## Overview

AWS cross-region DR uses read replicas for database replication, S3 cross-region replication for data durability, and Route53 failover routing with health checks for automatic DNS failover. OpenTofu provisions the complete DR infrastructure in both regions.

## Step 1: RDS Cross-Region Read Replica

```hcl
# main.tf - RDS with cross-region read replica

provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

# Primary RDS instance
resource "aws_db_instance" "primary" {
  provider              = aws.primary
  identifier            = "app-db-primary"
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = "db.r6g.xlarge"
  allocated_storage     = 100
  storage_encrypted     = true
  backup_retention_period = 7

  # Enable automated backups (required for cross-region replica)
  backup_window = "03:00-04:00"
}

# Cross-region read replica for DR
resource "aws_db_instance" "dr_replica" {
  provider            = aws.dr
  identifier          = "app-db-dr-replica"
  replicate_source_db = aws_db_instance.primary.arn
  instance_class      = "db.r6g.large"  # Smaller DR instance

  # Encrypted independently in DR region
  kms_key_id = aws_kms_key.dr_rds.arn
}
```

## Step 2: S3 Cross-Region Replication

```hcl
# Enable versioning (required for CRR)
resource "aws_s3_bucket_versioning" "primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.dr.id
  versioning_configuration { status = "Enabled" }
}

# Replication configuration on primary bucket
resource "aws_s3_bucket_replication_configuration" "to_dr" {
  provider = aws.primary
  bucket   = aws_s3_bucket.primary.id
  role     = aws_iam_role.replication.arn

  # Versioning must be enabled on both buckets before replication can be configured
  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.dr,
  ]

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.dr.arn
      storage_class = "STANDARD_IA"  # Cost-efficient in DR

      # Replicate encryption with DR region KMS key
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.dr_s3.arn
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}
```

## Step 3: Route53 Failover Routing

```hcl
# Health check on primary ALB
resource "aws_route53_health_check" "primary" {
  fqdn              = aws_lb.primary.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "primary-health-check" }
}

# Primary DNS record
resource "aws_route53_record" "primary" {
  zone_id        = aws_route53_zone.app.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "primary"

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary.id
}

# DR DNS record (secondary failover)
resource "aws_route53_record" "dr" {
  zone_id        = aws_route53_zone.app.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "dr"

  alias {
    name                   = aws_lb.dr.dns_name
    zone_id                = aws_lb.dr.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }
}
```

## Step 4: AMI Cross-Region Copy

```hcl
# Copy primary AMI to DR region for EC2 recovery
resource "aws_ami_copy" "dr" {
  provider          = aws.dr
  name              = "app-ami-dr"
  description       = "DR copy of application AMI"
  source_ami_id     = data.aws_ami.app.id
  source_ami_region = "us-east-1"
  encrypted         = true
  kms_key_id        = aws_kms_key.dr_ebs.arn
}
```

## Summary

AWS cross-region DR configured with OpenTofu achieves an RTO of minutes and near-zero RPO using RDS cross-region read replicas and S3 CRR. Route53 failover routing with health checks automatically redirects DNS within 60 seconds of a primary region failure. The DR environment runs at reduced capacity (smaller RDS instance class) to minimize cost while maintaining the ability to scale up during a real DR event.
