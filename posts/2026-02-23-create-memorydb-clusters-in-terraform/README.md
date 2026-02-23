# How to Create MemoryDB Clusters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, MemoryDB, Redis, In-Memory Database, Infrastructure as Code

Description: Learn how to create Amazon MemoryDB for Redis clusters with multi-AZ deployment, ACL authentication, and snapshot configuration using Terraform.

---

Amazon MemoryDB for Redis is a durable, in-memory database that delivers ultra-fast performance with Redis compatibility. Unlike ElastiCache, MemoryDB stores data durably using a multi-AZ transaction log, which means you can use it as your primary database rather than just a cache layer. If you need microsecond read latency and single-digit millisecond write latency with durability guarantees, MemoryDB is the service to look at.

This guide walks through creating MemoryDB clusters, configuring ACLs for authentication, setting up parameter groups, and managing the whole thing with Terraform.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- A VPC with subnets in multiple availability zones
- Basic Redis knowledge

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Subnet Group

MemoryDB clusters need a subnet group that defines which subnets the nodes run in.

```hcl
# Subnet group spanning multiple availability zones
resource "aws_memorydb_subnet_group" "main" {
  name        = "memorydb-subnet-group"
  description = "MemoryDB subnet group for production cluster"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Environment = "production"
  }
}
```

## Creating a Parameter Group

Parameter groups let you customize Redis configuration settings for your cluster.

```hcl
# Custom parameter group based on Redis 7
resource "aws_memorydb_parameter_group" "custom" {
  name        = "custom-redis7-params"
  family      = "memorydb_redis7"
  description = "Custom parameter group for production workloads"

  # Configure Redis parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  tags = {
    Environment = "production"
  }
}
```

## Creating ACLs for Authentication

MemoryDB uses Access Control Lists (ACLs) with Redis ACL users to manage authentication and authorization.

```hcl
# Create a MemoryDB user
resource "aws_memorydb_user" "app_user" {
  user_name     = "app-user"
  access_string = "on ~app:* &* +@all -@dangerous"

  authentication_mode {
    type      = "password"
    passwords = [var.memorydb_app_password]
  }

  tags = {
    Role = "application"
  }
}

# Create a read-only user
resource "aws_memorydb_user" "readonly_user" {
  user_name     = "readonly-user"
  access_string = "on ~* &* +@read -@dangerous"

  authentication_mode {
    type      = "password"
    passwords = [var.memorydb_readonly_password]
  }

  tags = {
    Role = "readonly"
  }
}

# Create an admin user
resource "aws_memorydb_user" "admin_user" {
  user_name     = "admin-user"
  access_string = "on ~* &* +@all"

  authentication_mode {
    type      = "password"
    passwords = [var.memorydb_admin_password]
  }

  tags = {
    Role = "admin"
  }
}

# ACL that includes the users
resource "aws_memorydb_acl" "app_acl" {
  name       = "app-acl"
  user_names = [
    aws_memorydb_user.app_user.user_name,
    aws_memorydb_user.readonly_user.user_name,
    aws_memorydb_user.admin_user.user_name,
  ]

  tags = {
    Environment = "production"
  }
}
```

## Creating the MemoryDB Cluster

Now we put it all together and create the cluster.

```hcl
# Security group for the MemoryDB cluster
resource "aws_security_group" "memorydb" {
  name        = "memorydb-cluster-sg"
  description = "Security group for MemoryDB cluster"
  vpc_id      = aws_vpc.main.id

  # Redis port
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Redis from internal networks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "memorydb-cluster-sg"
  }
}

# KMS key for encryption
resource "aws_kms_key" "memorydb" {
  description             = "KMS key for MemoryDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# Production MemoryDB cluster
resource "aws_memorydb_cluster" "production" {
  name                   = "production-cluster"
  description            = "Production MemoryDB cluster for application data"
  node_type              = "db.r7g.xlarge"
  engine_version         = "7.1"
  port                   = 6379
  num_shards             = 3
  num_replicas_per_shard = 2

  # Authentication
  acl_name = aws_memorydb_acl.app_acl.name

  # Networking
  subnet_group_name  = aws_memorydb_subnet_group.main.name
  security_group_ids = [aws_security_group.memorydb.id]

  # Configuration
  parameter_group_name = aws_memorydb_parameter_group.custom.name

  # Encryption
  tls_enabled = true
  kms_key_arn = aws_kms_key.memorydb.arn

  # Snapshots
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"

  # Maintenance
  maintenance_window = "sun:05:00-sun:06:00"

  # Enable auto minor version upgrades
  auto_minor_version_upgrade = true

  # SNS notifications for cluster events
  sns_topic_arn = aws_sns_topic.memorydb_events.arn

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# SNS topic for cluster event notifications
resource "aws_sns_topic" "memorydb_events" {
  name = "memorydb-cluster-events"
}

# Output the cluster endpoint
output "memorydb_cluster_endpoint" {
  value       = aws_memorydb_cluster.production.cluster_endpoint
  description = "MemoryDB cluster endpoint for application connections"
}
```

## Development Cluster

For development, use a smaller, single-shard cluster to save costs.

```hcl
# Minimal ACL for development
resource "aws_memorydb_acl" "dev_acl" {
  name       = "dev-acl"
  user_names = [aws_memorydb_user.admin_user.user_name]

  tags = {
    Environment = "development"
  }
}

# Development cluster - single shard, one replica
resource "aws_memorydb_cluster" "development" {
  name                   = "dev-cluster"
  description            = "Development MemoryDB cluster"
  node_type              = "db.t4g.small"
  engine_version         = "7.1"
  port                   = 6379
  num_shards             = 1
  num_replicas_per_shard = 1

  acl_name           = aws_memorydb_acl.dev_acl.name
  subnet_group_name  = aws_memorydb_subnet_group.main.name
  security_group_ids = [aws_security_group.memorydb.id]

  tls_enabled = true

  # Shorter snapshot retention for dev
  snapshot_retention_limit = 1
  snapshot_window          = "04:00-05:00"

  maintenance_window = "sun:05:00-sun:06:00"

  tags = {
    Environment = "development"
  }
}
```

## Snapshots and Recovery

You can create manual snapshots and restore clusters from them.

```hcl
# Create a manual snapshot
resource "aws_memorydb_snapshot" "before_migration" {
  cluster_name  = aws_memorydb_cluster.production.name
  name          = "pre-migration-snapshot"

  tags = {
    Purpose = "pre-migration-backup"
  }
}

# Restore a cluster from a snapshot
resource "aws_memorydb_cluster" "restored" {
  name                   = "restored-cluster"
  description            = "Cluster restored from snapshot"
  node_type              = "db.r7g.xlarge"
  num_shards             = 3
  num_replicas_per_shard = 2
  snapshot_name          = aws_memorydb_snapshot.before_migration.name

  acl_name           = aws_memorydb_acl.app_acl.name
  subnet_group_name  = aws_memorydb_subnet_group.main.name
  security_group_ids = [aws_security_group.memorydb.id]

  tls_enabled = true
  kms_key_arn = aws_kms_key.memorydb.arn

  tags = {
    RestoredFrom = "pre-migration-snapshot"
  }
}
```

## Variables

```hcl
variable "memorydb_app_password" {
  type        = string
  sensitive   = true
  description = "Password for the application MemoryDB user"

  validation {
    condition     = length(var.memorydb_app_password) >= 16
    error_message = "Password must be at least 16 characters long."
  }
}

variable "memorydb_readonly_password" {
  type        = string
  sensitive   = true
  description = "Password for the read-only MemoryDB user"
}

variable "memorydb_admin_password" {
  type        = string
  sensitive   = true
  description = "Password for the admin MemoryDB user"
}
```

## Monitoring with CloudWatch

Set up CloudWatch alarms to monitor your cluster health.

```hcl
# Alarm for high memory usage
resource "aws_cloudwatch_metric_alarm" "memorydb_memory" {
  alarm_name          = "memorydb-high-memory-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/MemoryDB"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "MemoryDB cluster memory usage exceeds 80%"
  alarm_actions       = [aws_sns_topic.memorydb_events.arn]

  dimensions = {
    ClusterName = aws_memorydb_cluster.production.name
  }
}

# Alarm for high CPU
resource "aws_cloudwatch_metric_alarm" "memorydb_cpu" {
  alarm_name          = "memorydb-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/MemoryDB"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "MemoryDB cluster CPU utilization exceeds 75%"
  alarm_actions       = [aws_sns_topic.memorydb_events.arn]

  dimensions = {
    ClusterName = aws_memorydb_cluster.production.name
  }
}
```

## Best Practices

1. **Use TLS everywhere.** Always set `tls_enabled = true`. MemoryDB supports in-transit encryption and there is no good reason to skip it.

2. **Right-size your shards.** Start with the number of shards based on your data size and throughput requirements. You can scale horizontally by adding shards.

3. **Use at least 2 replicas per shard in production.** This gives you read scaling and protection against node failures.

4. **Configure appropriate ACLs.** Use the principle of least privilege. Application users should not have admin access to Redis commands.

5. **Set snapshot retention.** Automated snapshots are your safety net. Keep at least 7 days of snapshots in production.

6. **Monitor memory usage.** Unlike ElastiCache, MemoryDB holds your primary data. Running out of memory means your database stops accepting writes.

## Conclusion

Amazon MemoryDB for Redis gives you the speed of in-memory data stores with the durability of traditional databases. Managing it through Terraform ensures that your cluster configuration, authentication setup, and monitoring are all codified and reproducible. Start with the right node type and shard count for your workload, enable encryption, and set up proper ACLs to control access.
