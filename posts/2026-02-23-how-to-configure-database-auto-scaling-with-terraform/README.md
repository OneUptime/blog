# How to Configure Database Auto Scaling with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, RDS, Aurora, Auto Scaling, Infrastructure as Code

Description: Learn how to configure database auto scaling with Terraform including storage auto scaling for RDS and read replica scaling for Aurora clusters.

---

Databases that cannot scale with demand create bottlenecks that bring down entire applications. Whether your workload experiences predictable traffic patterns or sudden spikes, auto scaling ensures your database can handle the load without manual intervention. In this guide, you will learn how to configure different types of database auto scaling using Terraform on AWS.

## Types of Database Auto Scaling

AWS offers several auto scaling mechanisms for databases:

1. **Storage Auto Scaling** - Automatically increases storage capacity when running low on space. Available for RDS instances.
2. **Read Replica Auto Scaling** - Automatically adds or removes Aurora read replicas based on demand.
3. **Aurora Serverless Scaling** - Automatically adjusts compute capacity for Aurora Serverless clusters.

Each approach addresses different scaling needs, and you may use multiple strategies together in a production environment.

## Prerequisites

Before getting started, ensure you have:

- Terraform 1.0 or later
- AWS credentials configured
- A VPC with appropriate subnets
- Basic knowledge of RDS and Aurora

## Storage Auto Scaling for RDS

The simplest form of auto scaling is storage auto scaling. When your RDS instance approaches its allocated storage limit, AWS automatically increases the storage capacity.

```hcl
# Configure the AWS provider
provider "aws" {
  region = "us-east-1"
}

# RDS instance with storage auto scaling enabled
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  # Initial storage allocation
  allocated_storage = 100

  # Enable storage auto scaling by setting a maximum
  # Storage will automatically grow when free space drops below 10%
  max_allocated_storage = 1000

  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "production"
  username = "dbadmin"
  password = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  multi_az            = true
  publicly_accessible = false

  # Backup settings
  backup_retention_period = 7

  tags = {
    Name        = "production-db"
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

The key parameter here is `max_allocated_storage`. When set to a value higher than `allocated_storage`, RDS will automatically increase storage when the available space drops below 10% of the allocated storage. The scaling happens in increments and will never exceed the maximum you specify.

## Aurora Read Replica Auto Scaling

For Aurora clusters, you can automatically scale the number of read replicas based on CPU utilization, connection count, or custom CloudWatch metrics. This is the most powerful database auto scaling option.

### Step 1: Create the Aurora Cluster

```hcl
# Aurora cluster with multiple reader instances
resource "aws_rds_cluster" "production" {
  cluster_identifier = "production-aurora"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "production"
  master_username    = "dbadmin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # Backup configuration
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"

  # Enable deletion protection in production
  deletion_protection = true

  tags = {
    Name        = "production-aurora"
    Environment = "production"
  }
}

# Writer instance (primary)
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "production-aurora-writer"
  cluster_identifier = aws_rds_cluster.production.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.production.engine
  engine_version     = aws_rds_cluster.production.engine_version

  tags = {
    Name = "production-aurora-writer"
  }
}

# Initial reader instances - auto scaling will manage additional ones
resource "aws_rds_cluster_instance" "reader" {
  count              = 1  # Start with one reader
  identifier         = "production-aurora-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.production.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.production.engine
  engine_version     = aws_rds_cluster.production.engine_version

  tags = {
    Name = "production-aurora-reader-${count.index}"
  }
}
```

### Step 2: Configure Application Auto Scaling

```hcl
# Register the Aurora cluster as a scalable target
resource "aws_appautoscaling_target" "aurora_replicas" {
  service_namespace  = "rds"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  resource_id        = "cluster:${aws_rds_cluster.production.id}"

  # Scale between 1 and 5 read replicas
  min_capacity = 1
  max_capacity = 5
}

# Target tracking scaling policy based on CPU utilization
resource "aws_appautoscaling_policy" "aurora_cpu" {
  name               = "aurora-cpu-auto-scaling"
  service_namespace  = aws_appautoscaling_target.aurora_replicas.service_namespace
  scalable_dimension = aws_appautoscaling_target.aurora_replicas.scalable_dimension
  resource_id        = aws_appautoscaling_target.aurora_replicas.resource_id
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    # Target 70% average CPU across readers
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300  # Wait 5 minutes before scaling in
    scale_out_cooldown = 300  # Wait 5 minutes before scaling out
  }
}

# Additional scaling policy based on connections
resource "aws_appautoscaling_policy" "aurora_connections" {
  name               = "aurora-connections-auto-scaling"
  service_namespace  = aws_appautoscaling_target.aurora_replicas.service_namespace
  scalable_dimension = aws_appautoscaling_target.aurora_replicas.scalable_dimension
  resource_id        = aws_appautoscaling_target.aurora_replicas.resource_id
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    # Target 70% average database connections across readers
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageDatabaseConnections"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}
```

## Aurora Serverless v2 Auto Scaling

Aurora Serverless v2 provides the most granular auto scaling, adjusting compute capacity in fine-grained increments measured in Aurora Capacity Units (ACUs).

```hcl
# Aurora Serverless v2 cluster
resource "aws_rds_cluster" "serverless" {
  cluster_identifier = "production-serverless"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"  # Serverless v2 uses provisioned mode
  engine_version     = "15.4"
  database_name      = "production"
  master_username    = "dbadmin"
  master_password    = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # Serverless v2 scaling configuration
  # ACUs range from 0.5 to 128
  serverlessv2_scaling_configuration {
    min_capacity = 2    # Minimum 2 ACUs (4 GB RAM)
    max_capacity = 64   # Maximum 64 ACUs (128 GB RAM)
  }

  backup_retention_period = 7
  deletion_protection     = true

  tags = {
    Name        = "production-serverless"
    Environment = "production"
  }
}

# Serverless v2 instance
resource "aws_rds_cluster_instance" "serverless_instance" {
  cluster_identifier = aws_rds_cluster.serverless.id
  instance_class     = "db.serverless"  # This enables Serverless v2
  engine             = aws_rds_cluster.serverless.engine
  engine_version     = aws_rds_cluster.serverless.engine_version

  tags = {
    Name = "production-serverless-instance"
  }
}
```

## Scheduled Scaling for Predictable Patterns

If your workload has predictable patterns, you can use scheduled scaling to proactively adjust capacity before traffic spikes.

```hcl
# Scale out during business hours (Mon-Fri 8am)
resource "aws_appautoscaling_scheduled_action" "scale_out" {
  name               = "aurora-scale-out-business-hours"
  service_namespace  = aws_appautoscaling_target.aurora_replicas.service_namespace
  scalable_dimension = aws_appautoscaling_target.aurora_replicas.scalable_dimension
  resource_id        = aws_appautoscaling_target.aurora_replicas.resource_id
  schedule           = "cron(0 8 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 3
    max_capacity = 5
  }
}

# Scale in after business hours (Mon-Fri 8pm)
resource "aws_appautoscaling_scheduled_action" "scale_in" {
  name               = "aurora-scale-in-after-hours"
  service_namespace  = aws_appautoscaling_target.aurora_replicas.service_namespace
  scalable_dimension = aws_appautoscaling_target.aurora_replicas.scalable_dimension
  resource_id        = aws_appautoscaling_target.aurora_replicas.resource_id
  schedule           = "cron(0 20 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 1
    max_capacity = 3
  }
}
```

## Monitoring Auto Scaling Events

Set up CloudWatch alarms to track your auto scaling behavior.

```hcl
# SNS topic for scaling notifications
resource "aws_sns_topic" "scaling_alerts" {
  name = "database-scaling-alerts"
}

# Alarm for high replica lag during scaling
resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  alarm_name          = "aurora-high-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 100  # 100 milliseconds
  alarm_description   = "Aurora replica lag is above 100ms"
  alarm_actions       = [aws_sns_topic.scaling_alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.production.cluster_identifier
  }
}

# Alarm when approaching max replica count
resource "aws_cloudwatch_metric_alarm" "high_cpu_at_max" {
  alarm_name          = "aurora-high-cpu-at-max-replicas"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "CPU remains high - may need to increase max replicas"
  alarm_actions       = [aws_sns_topic.scaling_alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.production.cluster_identifier
  }
}
```

## Best Practices for Database Auto Scaling

When configuring database auto scaling, consider these recommendations. Set your scale-out cooldown shorter than your scale-in cooldown to respond quickly to traffic increases while avoiding premature scale-in. Monitor replica lag during scaling events because new replicas need time to warm up their buffer caches. Use multiple scaling policies together, such as CPU-based and connection-based, so that scaling triggers on whichever metric reaches its threshold first.

For storage auto scaling, always set `max_allocated_storage` generously. Running out of storage can cause database outages, and storage scaling only increases capacity - it never shrinks.

## Monitoring with OneUptime

Database auto scaling events should be tracked alongside your application metrics. With [OneUptime](https://oneuptime.com), you can monitor database performance, track scaling events, and correlate them with application behavior to ensure your auto scaling configuration is working as expected.

## Conclusion

Database auto scaling with Terraform gives you the ability to handle variable workloads without manual intervention. Storage auto scaling is the simplest approach and works for all RDS engines. Aurora read replica auto scaling is ideal for read-heavy workloads where you need to distribute query load. Aurora Serverless v2 provides the most granular scaling for unpredictable workloads. By combining these strategies with proper monitoring, you can build database infrastructure that scales smoothly with your application needs.

For related topics, check out our guide on [multi-AZ database deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-create-multi-az-database-deployments-with-terraform/view) and [managed database clusters](https://oneuptime.com/blog/post/2026-02-23-how-to-create-managed-database-clusters-with-terraform/view).
