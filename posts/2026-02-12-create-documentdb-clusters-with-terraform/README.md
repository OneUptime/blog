# How to Create DocumentDB Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, DocumentDB, MongoDB, Database

Description: Step-by-step guide to deploying Amazon DocumentDB clusters with Terraform, covering cluster setup, instances, encryption, parameter groups, and monitoring.

---

Amazon DocumentDB is AWS's managed document database service that's compatible with MongoDB 3.6, 4.0, and 5.0. If you're running MongoDB workloads and want to offload the operational burden of managing replica sets, backups, and patching, DocumentDB is worth considering. It uses a cluster architecture similar to Aurora - a shared storage layer with separate compute instances for reads and writes.

Setting up a DocumentDB cluster through the console takes a while and is error-prone. Let's do it properly with Terraform.

## Network Setup

DocumentDB clusters run inside a VPC and need a subnet group that covers at least two availability zones:

```hcl
# Subnet group for DocumentDB
resource "aws_docdb_subnet_group" "main" {
  name       = "docdb-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "docdb-subnet-group"
    Environment = var.environment
  }
}

# Security group
resource "aws_security_group" "docdb" {
  name_prefix = "docdb-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB protocol from app layer"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "docdb-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

DocumentDB uses port 27017, same as MongoDB. Keep access locked down to only the security groups that need it.

## Parameter Group

The cluster parameter group controls engine behavior. A few settings are worth customizing:

```hcl
# Cluster parameter group
resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb5.0"
  name        = "custom-docdb-params"
  description = "Custom DocumentDB parameter group"

  # Enable audit logging
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Enable profiler for slow queries
  parameter {
    name  = "profiler"
    value = "enabled"
  }

  # Log queries slower than 100ms
  parameter {
    name  = "profiler_threshold_ms"
    value = "100"
  }

  # Enable TTL (time to live) for documents
  parameter {
    name  = "ttl_monitor"
    value = "enabled"
  }

  # Enable change streams
  parameter {
    name  = "change_stream_log_retention_duration"
    value = "10800"  # 3 hours in seconds
  }

  tags = {
    Environment = var.environment
  }
}
```

The profiler is incredibly useful for identifying slow queries. Setting the threshold to 100ms captures queries that might be causing latency issues without flooding your logs.

## The DocumentDB Cluster

Here's the core cluster configuration:

```hcl
# KMS key for encryption
resource "aws_kms_key" "docdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# DocumentDB cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier = "app-docdb-cluster"
  engine             = "docdb"
  engine_version     = "5.0.0"

  # Credentials
  master_username = "docdbadmin"
  master_password = var.master_password

  # Networking
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb.id]
  port                   = 27017

  # Parameters
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  # Encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.docdb.arn

  # Backup
  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  # Deletion protection
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "app-docdb-final-snapshot"

  # CloudWatch log exports
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

The `enabled_cloudwatch_logs_exports` setting sends both audit logs and profiler output to CloudWatch. This is essential for production because you'll need these logs for troubleshooting and compliance.

## Cluster Instances

Like Aurora, DocumentDB separates the cluster from its instances. You need at least one instance, and you should have more for high availability:

```hcl
# DocumentDB instances
resource "aws_docdb_cluster_instance" "instances" {
  count              = var.instance_count
  identifier         = "app-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class
  engine             = "docdb"

  auto_minor_version_upgrade = true

  tags = {
    Name = "docdb-instance-${count.index}"
    Role = count.index == 0 ? "writer" : "reader"
  }
}
```

For production, use at least 3 instances across different availability zones. The first instance becomes the writer, and the rest serve reads. Common instance classes for DocumentDB are `db.r6g.large` for moderate workloads and `db.r6g.xlarge` for heavier ones.

## Connecting to DocumentDB

DocumentDB requires TLS connections by default. You'll need to download the AWS CA certificate bundle. Here's an example connection string pattern:

```hcl
# Output the connection string (without password)
output "connection_string" {
  description = "DocumentDB connection string template"
  value       = "mongodb://${aws_docdb_cluster.main.master_username}:<password>@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
}
```

A few things to note about the connection string:

- `retryWrites=false` is required because DocumentDB doesn't support retryable writes
- `readPreference=secondaryPreferred` routes reads to reader instances when available
- `replicaSet=rs0` is the replica set name that DocumentDB uses

## Secrets Manager Integration

Don't hardcode the master password. Use Secrets Manager:

```hcl
# Generate a random password
resource "random_password" "docdb" {
  length  = 32
  special = false  # DocumentDB doesn't support all special chars
}

# Store the credentials in Secrets Manager
resource "aws_secretsmanager_secret" "docdb" {
  name                    = "docdb/app-cluster/credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "docdb" {
  secret_id = aws_secretsmanager_secret.docdb.id

  secret_string = jsonencode({
    username = aws_docdb_cluster.main.master_username
    password = random_password.docdb.result
    host     = aws_docdb_cluster.main.endpoint
    port     = aws_docdb_cluster.main.port
    engine   = "docdb"
  })
}
```

## Event Subscription

Stay informed about cluster events like failovers, maintenance, and errors:

```hcl
# SNS topic for DocumentDB events
resource "aws_sns_topic" "docdb_events" {
  name = "docdb-events"
}

# Event subscription
resource "aws_docdb_event_subscription" "main" {
  name             = "docdb-cluster-events"
  sns_topic_arn    = aws_sns_topic.docdb_events.arn
  source_type      = "db-cluster"
  source_ids       = [aws_docdb_cluster.main.id]
  event_categories = ["failover", "failure", "maintenance", "notification"]
}
```

## Monitoring

Set up CloudWatch alarms for the metrics that matter:

```hcl
# CPU utilization alarm
resource "aws_cloudwatch_metric_alarm" "docdb_cpu" {
  alarm_name          = "docdb-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.docdb_events.arn]

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }
}

# Freeable memory alarm
resource "aws_cloudwatch_metric_alarm" "docdb_memory" {
  alarm_name          = "docdb-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = 1000000000  # 1 GB in bytes
  alarm_actions       = [aws_sns_topic.docdb_events.arn]

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }
}
```

For a broader look at database monitoring strategies, check out our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).

## Variables

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}

variable "app_security_group_id" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "instance_count" {
  type    = number
  default = 3
}

variable "instance_class" {
  type    = string
  default = "db.r6g.large"
}
```

## Summary

You now have a production-ready DocumentDB cluster with encryption, audit logging, slow query profiling, and monitoring. The configuration handles everything from networking to secrets management. Keep in mind that DocumentDB isn't a full MongoDB replacement - it has compatibility gaps, especially around aggregation pipeline stages and certain index types. Test your application thoroughly before migrating.
