# How to Handle Database Failover with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Failover, High Availability, RDS, Aurora, Infrastructure as Code

Description: Learn how to configure and manage database failover strategies using Terraform for RDS, Aurora, ElastiCache, and other AWS managed database services.

---

Database failover is the process of switching from a failed primary database to a standby or replica when something goes wrong. Properly configured failover ensures that your application experiences minimal downtime during hardware failures, network issues, or availability zone outages. In this guide, we will cover how to configure database failover across AWS managed database services using Terraform.

## Understanding Failover Mechanisms

Different AWS database services handle failover in different ways. RDS Multi-AZ maintains a synchronous standby replica in a different availability zone and automatically fails over to it. Aurora maintains multiple replicas across AZs and promotes one automatically. ElastiCache with Multi-AZ promotes a replica to primary. The key is to configure these mechanisms properly in Terraform so they work when you need them.

Failover typically happens automatically when the primary becomes unhealthy, but you can also trigger it manually for testing or maintenance. The failover time varies by service, ranging from about 30 seconds for Aurora to 1-2 minutes for standard RDS Multi-AZ.

## Setting Up the Provider

```hcl
# Configure Terraform
terraform {
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

## RDS Multi-AZ Failover

Multi-AZ is the primary failover mechanism for standard RDS instances:

```hcl
# RDS instance with Multi-AZ for automatic failover
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  # Enable Multi-AZ for automatic failover
  multi_az = true

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  # Backup and maintenance
  backup_retention_period = 7
  backup_window           = "02:00-02:30"
  maintenance_window      = "sun:05:00-sun:05:30"

  # Security
  storage_encrypted = true

  # Protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "production-db-final"

  tags = {
    Environment     = "production"
    ManagedBy       = "terraform"
    HighAvailability = "multi-az"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

When Multi-AZ is enabled, AWS maintains a synchronous standby replica. The DNS endpoint automatically points to the current primary, so your application does not need to change its connection configuration during failover.

## Aurora Cluster Failover

Aurora handles failover through its cluster architecture with multiple instances:

```hcl
# Aurora cluster with failover configuration
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  backup_retention_period = 14
  storage_encrypted       = true

  # Enable deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "aurora-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Aurora instances with failover priority
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "aurora-writer"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  # Failover priority (0 is highest, 15 is lowest)
  promotion_tier = 0  # First to be promoted if writer fails

  tags = {
    Environment = "production"
    Role        = "writer"
  }
}

resource "aws_rds_cluster_instance" "reader_1" {
  identifier         = "aurora-reader-1"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  # Second priority for failover
  promotion_tier = 1

  tags = {
    Environment = "production"
    Role        = "reader-priority-1"
  }
}

resource "aws_rds_cluster_instance" "reader_2" {
  identifier         = "aurora-reader-2"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  # Third priority for failover
  promotion_tier = 2

  tags = {
    Environment = "production"
    Role        = "reader-priority-2"
  }
}
```

The `promotion_tier` setting controls which replica gets promoted to writer during failover. Lower numbers get higher priority. If multiple replicas have the same priority, Aurora selects the one that is the same size as the primary.

## ElastiCache Redis Failover

```hcl
# ElastiCache Redis with automatic failover
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Redis with automatic failover"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3

  # Enable automatic failover
  automatic_failover_enabled = true

  # Enable Multi-AZ to distribute replicas across AZs
  multi_az_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Notification for failover events
  notification_topic_arn = aws_sns_topic.redis_events.arn

  tags = {
    Environment = "production"
    Failover    = "automatic"
  }
}

resource "aws_sns_topic" "redis_events" {
  name = "redis-failover-events"
}
```

## DocumentDB Failover

```hcl
# DocumentDB cluster with failover configuration
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier = "app-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"
  master_username    = "docdbadmin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "docdb-final"

  tags = {
    Environment = "production"
  }
}

# DocumentDB instances with failover priority
resource "aws_docdb_cluster_instance" "primary" {
  identifier         = "docdb-primary"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = "db.r6g.large"
  engine             = "docdb"

  # Failover priority (0 is highest)
  promotion_tier = 0

  tags = {
    Role = "primary"
  }
}

resource "aws_docdb_cluster_instance" "replicas" {
  count = 2

  identifier         = "docdb-replica-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = "db.r6g.large"
  engine             = "docdb"

  promotion_tier = count.index + 1

  tags = {
    Role = "replica-${count.index + 1}"
  }
}
```

## Cross-Region Failover with Aurora Global Database

For disaster recovery across regions:

```hcl
# Primary region provider
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

# Secondary region provider
provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

# Aurora Global Database
resource "aws_rds_global_cluster" "global" {
  provider = aws.primary

  global_cluster_identifier = "global-aurora"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  storage_encrypted         = true
}

# Primary cluster
resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier        = "global-aurora-primary"
  global_cluster_identifier = aws_rds_global_cluster.global.id
  engine                    = aws_rds_global_cluster.global.engine
  engine_version            = aws_rds_global_cluster.global.engine_version
  database_name             = "appdb"
  master_username           = "dbadmin"
  master_password           = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_sg.id]
  storage_encrypted      = true

  skip_final_snapshot = true

  tags = {
    Environment = "production"
    Region      = "us-east-1"
    Role        = "primary"
  }
}

# Primary cluster instances
resource "aws_rds_cluster_instance" "primary_instances" {
  provider = aws.primary
  count    = 2

  identifier         = "primary-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version
}

# Secondary cluster (read-only in normal operation)
resource "aws_rds_cluster" "secondary" {
  provider = aws.secondary

  cluster_identifier        = "global-aurora-secondary"
  global_cluster_identifier = aws_rds_global_cluster.global.id
  engine                    = aws_rds_global_cluster.global.engine
  engine_version            = aws_rds_global_cluster.global.engine_version

  db_subnet_group_name   = aws_db_subnet_group.secondary.name
  vpc_security_group_ids = [aws_security_group.secondary_sg.id]
  storage_encrypted      = true

  skip_final_snapshot = true

  depends_on = [aws_rds_cluster.primary]

  tags = {
    Environment = "production"
    Region      = "us-west-2"
    Role        = "secondary"
  }
}

# Secondary cluster instances
resource "aws_rds_cluster_instance" "secondary_instances" {
  provider = aws.secondary
  count    = 2

  identifier         = "secondary-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version
}
```

## Monitoring Failover Events

```hcl
# CloudWatch Events rule for RDS failover events
resource "aws_cloudwatch_event_rule" "failover_events" {
  name        = "database-failover-events"
  description = "Capture database failover events"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail_type = ["RDS DB Instance Event", "RDS DB Cluster Event"]
    detail = {
      EventCategories = ["failover"]
    }
  })
}

resource "aws_cloudwatch_event_target" "failover_notification" {
  rule      = aws_cloudwatch_event_rule.failover_events.name
  target_id = "failover-notification"
  arn       = aws_sns_topic.failover_alerts.arn
}

resource "aws_sns_topic" "failover_alerts" {
  name = "database-failover-alerts"
}

resource "aws_sns_topic_policy" "failover_alerts" {
  arn = aws_sns_topic.failover_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.failover_alerts.arn
      }
    ]
  })
}

# CloudWatch alarm for high replication lag (potential failover indicator)
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "aurora-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1000  # 1 second in milliseconds
  alarm_description   = "Aurora replication lag is too high"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.failover_alerts.arn]
}
```

For comprehensive monitoring of your database failover events and availability, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides real-time dashboards to track failover status and database health.

## Testing Failover

Regularly test failover to verify your configuration works:

```hcl
# You can trigger failover via AWS CLI (not directly in Terraform)
# For RDS: aws rds reboot-db-instance --db-instance-identifier production-db --force-failover
# For Aurora: aws rds failover-db-cluster --db-cluster-identifier production-aurora
# For ElastiCache: aws elasticache test-failover --replication-group-id app-redis --node-group-id 0001
```

## Best Practices

Always enable Multi-AZ for production RDS instances. For Aurora, maintain at least two instances across different availability zones. Set explicit promotion tiers on Aurora and DocumentDB replicas to control failover behavior. For ElastiCache, enable automatic failover and Multi-AZ together. Monitor replication lag as an early warning for potential failover issues. Test failover regularly in non-production environments. Configure SNS notifications for failover events so your team is alerted immediately. Use global databases for cross-region disaster recovery when RPO and RTO requirements demand it.

## Conclusion

Database failover is your safety net against infrastructure failures. Terraform makes it straightforward to configure the failover mechanisms for every AWS database service. By enabling Multi-AZ, setting promotion priorities, monitoring replication lag, and testing failover regularly, you can ensure your databases remain available even during unexpected failures. Build failover configuration into your standard database provisioning templates.
