# How to Handle Terraform for Stateful Application Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Stateful Applications, Databases, Storage, Infrastructure as Code

Description: Learn how to manage stateful application infrastructure with Terraform, including databases, persistent volumes, message queues, and caches, with strategies for protecting data during infrastructure changes.

---

Stateful infrastructure - databases, caches, message queues, and persistent storage - requires special care with Terraform. Unlike stateless compute resources that can be destroyed and recreated without consequence, stateful resources contain data that must be preserved. A misconfigured Terraform change that destroys and recreates a production database is catastrophic.

In this guide, we will cover how to safely manage stateful infrastructure with Terraform.

## Protecting Stateful Resources

The most important Terraform feature for stateful resources is lifecycle management:

```hcl
# stateful/database.tf
# Production database with comprehensive protection

resource "aws_db_instance" "production" {
  identifier     = "app-production"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_encrypted     = true

  multi_az                = true
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "app-production-final-${formatdate("YYYY-MM-DD", timestamp())}"
  backup_retention_period = 35
  copy_tags_to_snapshot   = true

  lifecycle {
    # CRITICAL: Prevent accidental destruction
    prevent_destroy = true

    # Ignore changes that happen outside Terraform
    ignore_changes = [
      latest_restorable_time,
      # Ignore password changes managed through rotation
      password
    ]
  }

  tags = {
    DataClassification = "sensitive"
    BackupRequired     = "true"
  }
}

# ElastiCache cluster
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "app-cache-production"
  description          = "Production Redis cluster"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3
  engine               = "redis"
  engine_version       = "7.0"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"

  lifecycle {
    prevent_destroy = true
  }
}

# S3 bucket for persistent data
resource "aws_s3_bucket" "data" {
  bucket = "app-production-data"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

## Handling Stateful Resource Updates

Some changes to stateful resources force replacement. Know which ones:

```hcl
# These changes are SAFE (in-place update):
# - instance_class (causes brief downtime for non-Multi-AZ)
# - allocated_storage (increase only)
# - engine_version (minor upgrades)
# - backup_retention_period
# - monitoring_interval

# These changes are DANGEROUS (force replacement):
# - identifier (destroys and recreates!)
# - engine (destroys and recreates!)
# - storage_encrypted (destroys and recreates!)

# Safe pattern for risky changes: use moved blocks
moved {
  from = aws_db_instance.old_name
  to   = aws_db_instance.new_name
}
```

## EBS Volume Management

```hcl
# stateful/volumes.tf
# Persistent EBS volumes managed separately from instances

resource "aws_ebs_volume" "data" {
  availability_zone = var.availability_zone
  size              = 500
  type              = "gp3"
  iops              = 3000
  throughput        = 250
  encrypted         = true

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name       = "app-data-volume"
    Persistent = "true"
  }
}

# Attach volume to instance
# If instance is replaced, volume survives
resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id

  # Do not force detach - wait for clean detach
  force_detach = false
}
```

## Message Queue Infrastructure

```hcl
# stateful/queues.tf
# SQS queues that hold in-flight messages

resource "aws_sqs_queue" "orders" {
  name                       = "orders-production"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20

  # Encryption
  sqs_managed_sse_enabled = true

  # Dead letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 5
  })

  lifecycle {
    # Prevent queue deletion which would lose messages
    prevent_destroy = true
  }
}
```

## Backup and Recovery

```hcl
# stateful/backups.tf
# Automated backup configuration for all stateful resources

resource "aws_backup_plan" "stateful" {
  name = "stateful-resources-backup"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"  # 3 AM daily

    lifecycle {
      delete_after = 35  # Keep for 35 days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_region.arn
      lifecycle {
        delete_after = 90  # Keep DR copy for 90 days
      }
    }
  }
}

resource "aws_backup_selection" "stateful" {
  name         = "stateful-resources"
  plan_id      = aws_backup_plan.stateful.id
  iam_role_arn = aws_iam_role.backup.arn

  # Select resources by tag
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "BackupRequired"
    value = "true"
  }
}
```

## Best Practices

Always use prevent_destroy on production stateful resources. This is your last line of defense against accidental data loss.

Enable deletion_protection at the resource level too. This provides a second layer of protection beyond Terraform lifecycle rules.

Backup before making any changes. Even in-place updates can go wrong. Always have a recent backup before modifying stateful resources.

Separate stateful and stateless resources into different state files. This reduces the blast radius of any Terraform operation.

Test stateful changes in staging first. Verify that database upgrades, storage changes, and configuration updates work correctly before applying to production.

Monitor stateful resource health proactively. Set up alerts for disk usage, connection counts, replication lag, and backup completion.

## Conclusion

Managing stateful infrastructure with Terraform requires extra caution and discipline. By using lifecycle rules to prevent accidental destruction, separating stateful resources into their own state files, implementing comprehensive backups, and testing changes thoroughly, you can enjoy the benefits of infrastructure as code while protecting the data your business depends on. The investment in safety mechanisms pays off every time a risky change is caught before it causes data loss.
