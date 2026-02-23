# How to Create Aurora Serverless V2 in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Aurora, Serverless, Database, Auto Scaling

Description: Learn how to deploy Aurora Serverless v2 with Terraform for automatic database scaling, including capacity configuration, mixed instance clusters, and cost optimization strategies.

---

Aurora Serverless v2 is the database equivalent of "set it and forget it" scaling. Instead of choosing a fixed instance size and hoping it is the right one, you define a minimum and maximum capacity range in Aurora Capacity Units (ACUs), and the database scales up and down within that range based on actual demand. Scaling happens in increments of 0.5 ACU and takes effect in seconds, not minutes.

This is different from the original Aurora Serverless v1, which had significant limitations like cold starts, limited availability zones, and no read replicas. V2 fixes all of that. It runs in your VPC just like provisioned Aurora, supports Multi-AZ, and can mix serverless and provisioned instances in the same cluster.

## Understanding ACUs

An Aurora Capacity Unit (ACU) is roughly equivalent to 2GB of memory and corresponding CPU. The range you can configure is:

- **Minimum**: 0.5 ACU (1GB memory) - the lowest your cluster will scale to
- **Maximum**: 128 ACU (256GB memory) - the ceiling for scaling

You pay for the ACUs you actually use, measured per second. When your database is idle, it scales down to the minimum. When a traffic spike hits, it scales up within seconds.

## Basic Aurora Serverless V2 Cluster

```hcl
# Aurora Serverless v2 cluster
resource "aws_rds_cluster" "serverless" {
  cluster_identifier = "myapp-serverless"

  engine         = "aurora-postgresql"
  engine_version = "16.2"
  engine_mode    = "provisioned"  # Yes, this is correct for Serverless v2

  # Database settings
  database_name   = "myapp"
  master_username = "app_admin"
  master_password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # THIS IS THE KEY - Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Scale down to 0.5 ACU when idle
    max_capacity = 16    # Scale up to 16 ACU under load
  }

  # Backup
  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"

  # Encryption
  storage_encrypted = true

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "myapp-serverless-final"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "myapp-serverless"
    Environment = var.environment
  }
}

# Serverless v2 writer instance
resource "aws_rds_cluster_instance" "serverless_writer" {
  identifier         = "myapp-serverless-writer"
  cluster_identifier = aws_rds_cluster.serverless.id

  # THIS makes it a Serverless v2 instance
  instance_class = "db.serverless"

  engine         = aws_rds_cluster.serverless.engine
  engine_version = aws_rds_cluster.serverless.engine_version

  # Monitoring
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  publicly_accessible = false

  tags = {
    Name = "myapp-serverless-writer"
    Role = "writer"
  }
}

# Serverless v2 reader instance
resource "aws_rds_cluster_instance" "serverless_reader" {
  identifier         = "myapp-serverless-reader"
  cluster_identifier = aws_rds_cluster.serverless.id

  instance_class = "db.serverless"

  engine         = aws_rds_cluster.serverless.engine
  engine_version = aws_rds_cluster.serverless.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  publicly_accessible = false
  promotion_tier      = 1

  tags = {
    Name = "myapp-serverless-reader"
    Role = "reader"
  }
}
```

A few things to note. The `engine_mode` is `"provisioned"`, not `"serverless"` - that was for v1. Serverless v2 uses the `serverlessv2_scaling_configuration` block on a provisioned cluster and `instance_class = "db.serverless"` on the instances.

## Mixed Cluster: Serverless + Provisioned

One of v2's best features is mixing serverless and provisioned instances in the same cluster. Use a provisioned writer for predictable baseline performance and serverless readers that scale with traffic:

```hcl
# Cluster with mixed instance types
resource "aws_rds_cluster" "mixed" {
  cluster_identifier = "myapp-mixed-cluster"

  engine         = "aurora-postgresql"
  engine_version = "16.2"
  engine_mode    = "provisioned"

  database_name   = "myapp"
  master_username = "app_admin"
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Scaling config still needed for the serverless instances
  serverlessv2_scaling_configuration {
    min_capacity = 1
    max_capacity = 32
  }

  backup_retention_period = 14
  storage_encrypted       = true
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "myapp-mixed-final"

  tags = {
    Name = "myapp-mixed-cluster"
  }
}

# Provisioned writer - fixed size, predictable performance
resource "aws_rds_cluster_instance" "provisioned_writer" {
  identifier         = "myapp-writer"
  cluster_identifier = aws_rds_cluster.mixed.id

  instance_class = "db.r6g.xlarge"  # Fixed provisioned instance

  engine         = aws_rds_cluster.mixed.engine
  engine_version = aws_rds_cluster.mixed.engine_version

  performance_insights_enabled = true
  promotion_tier               = 0

  tags = {
    Name = "myapp-writer"
    Type = "provisioned"
    Role = "writer"
  }
}

# Serverless reader - scales with read traffic
resource "aws_rds_cluster_instance" "serverless_readers" {
  count = 2

  identifier         = "myapp-serverless-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.mixed.id

  instance_class = "db.serverless"  # Scales within the cluster ACU range

  engine         = aws_rds_cluster.mixed.engine
  engine_version = aws_rds_cluster.mixed.engine_version

  performance_insights_enabled = true
  promotion_tier               = count.index + 1

  tags = {
    Name = "myapp-serverless-reader-${count.index}"
    Type = "serverless"
    Role = "reader"
  }
}
```

This pattern gives you a writer that never scales down (important for write-heavy workloads) and readers that shrink during quiet periods.

## Choosing the Right Capacity Range

Setting min and max capacity requires some thought:

```hcl
locals {
  # Capacity ranges per environment
  capacity = {
    production = {
      min = 2    # Never go below 2 ACU (4GB memory) in prod
      max = 64   # Allow scaling up to 64 ACU (128GB memory)
    }
    staging = {
      min = 0.5  # Scale down fully when idle
      max = 8    # Cap at 8 ACU
    }
    development = {
      min = 0.5  # Minimum possible
      max = 2    # Keep costs low
    }
  }
}

resource "aws_rds_cluster" "serverless" {
  # ...

  serverlessv2_scaling_configuration {
    min_capacity = local.capacity[var.environment].min
    max_capacity = local.capacity[var.environment].max
  }
}
```

Setting `min_capacity` too low in production can lead to slow response times when the database scales up from near-zero. A higher minimum means faster response to sudden traffic increases, at the cost of a higher baseline bill.

## Monitoring Serverless V2 Scaling

Aurora Serverless v2 publishes a `ServerlessDatabaseCapacity` metric that shows current ACU usage:

```hcl
# Alarm when capacity is near the maximum
resource "aws_cloudwatch_metric_alarm" "capacity_high" {
  alarm_name          = "aurora-serverless-capacity-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ServerlessDatabaseCapacity"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 14  # Alert at 14 out of 16 max ACU
  alarm_description   = "Aurora Serverless v2 is approaching max capacity"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.serverless.cluster_identifier
  }

  alarm_actions = [var.sns_topic_arn]
}

# Track ACU usage for cost analysis
resource "aws_cloudwatch_metric_alarm" "capacity_baseline" {
  alarm_name          = "aurora-serverless-capacity-baseline"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 12  # 1 hour at 5-min periods
  metric_name         = "ServerlessDatabaseCapacity"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 8
  alarm_description   = "Sustained high capacity - consider provisioned instances"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.serverless.cluster_identifier
  }

  alarm_actions = [var.sns_topic_arn]
}
```

If your database consistently runs near max capacity, switching to provisioned instances would likely be cheaper.

## Supporting Resources

```hcl
resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-serverless-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "aurora-serverless-subnets" }
}

resource "aws_security_group" "aurora" {
  name_prefix = "aurora-serverless-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
  tags = { Name = "aurora-serverless-sg" }
}

resource "aws_iam_role" "rds_monitoring" {
  name = "aurora-serverless-monitoring"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Outputs

```hcl
output "cluster_endpoint" {
  value = aws_rds_cluster.serverless.endpoint
}

output "reader_endpoint" {
  value = aws_rds_cluster.serverless.reader_endpoint
}

output "cluster_arn" {
  value = aws_rds_cluster.serverless.arn
}
```

## When to Use Serverless V2 vs Provisioned

Use Serverless v2 when your workload is unpredictable, has significant idle periods, or varies widely throughout the day. It is great for development environments, staging, and production workloads with variable traffic patterns.

Stick with provisioned instances when your workload is steady and predictable. If you consistently use 16 ACU worth of capacity, a provisioned `db.r6g.xlarge` (4 vCPU, 32GB) would cost less and give you the same performance.

The mixed cluster approach gives you the best of both worlds and is often the right choice for production.

## Summary

Aurora Serverless v2 in Terraform is a provisioned cluster with `serverlessv2_scaling_configuration` and instances using `instance_class = "db.serverless"`. You define min and max ACU capacity, and Aurora handles the scaling. The mixed cluster pattern - provisioned writer with serverless readers - is a particularly effective setup for production workloads that need both write consistency and read scalability. Monitor the `ServerlessDatabaseCapacity` metric to understand your scaling patterns and optimize costs.
