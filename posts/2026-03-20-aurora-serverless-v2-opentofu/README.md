# How to Deploy Aurora Serverless v2 with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Aurora, Serverless, Auto-Scaling, Cost Optimization, Infrastructure as Code

Description: Learn how to deploy Aurora Serverless v2 with OpenTofu to automatically scale database capacity between minimum and maximum ACUs based on actual workload demand.

## Introduction

Aurora Serverless v2 scales database capacity in fine-grained increments (0.5 Aurora Capacity Units) based on workload demand, eliminating the need to provision for peak capacity. It integrates with Aurora's Multi-AZ architecture, supports read replicas, and works with many Aurora features including Performance Insights, IAM auth, and RDS Proxy.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS/Aurora permissions
- Aurora Serverless v2 supported Aurora PostgreSQL engine version for your AWS Region

## Step 1: Create Aurora Serverless v2 Cluster

```hcl
resource "aws_rds_cluster" "serverless_v2" {
  cluster_identifier = "${var.project_name}-aurora-serverless-v2"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "16.1"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.master_password

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.rds_security_group_id]

  # Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Minimum 0.5 ACUs (~1 GB RAM)
    max_capacity = 32    # Maximum 32 ACUs (~64 GB RAM)
  }

  storage_encrypted = true
  kms_key_id        = var.kms_key_arn

  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"

  iam_database_authentication_enabled = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-serverless-v2-final"

  tags = {
    Name        = "${var.project_name}-aurora-serverless-v2"
    Environment = var.environment
  }
}
```

## Step 2: Create Serverless v2 Instances

```hcl
# Writer instance using db.serverless instance class

resource "aws_rds_cluster_instance" "serverless_writer" {
  identifier         = "${var.project_name}-serverless-writer"
  cluster_identifier = aws_rds_cluster.serverless_v2.id

  # Must use db.serverless instance class for Serverless v2
  instance_class = "db.serverless"
  engine         = aws_rds_cluster.serverless_v2.engine
  engine_version = aws_rds_cluster.serverless_v2.engine_version

  db_subnet_group_name = var.subnet_group_name

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = var.monitoring_role_arn

  tags = {
    Name = "${var.project_name}-serverless-writer"
    Role = "writer"
  }
}

# Reader instance for read scaling
resource "aws_rds_cluster_instance" "serverless_reader" {
  identifier         = "${var.project_name}-serverless-reader"
  cluster_identifier = aws_rds_cluster.serverless_v2.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.serverless_v2.engine
  engine_version     = aws_rds_cluster.serverless_v2.engine_version

  db_subnet_group_name = var.subnet_group_name

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = var.monitoring_role_arn

  tags = {
    Name = "${var.project_name}-serverless-reader"
    Role = "reader"
  }
}
```

## Step 3: Monitor ACU Utilization

```hcl
# Alert when the writer instance is approaching maximum ACU capacity
resource "aws_cloudwatch_metric_alarm" "aurora_capacity_high" {
  alarm_name          = "${var.project_name}-aurora-capacity-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "ServerlessDatabaseCapacity"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = var.max_capacity * 0.8  # Alert at 80% of max

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.serverless_writer.identifier
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alert when writer ACU utilization stays high
resource "aws_cloudwatch_metric_alarm" "aurora_acu_utilization_high" {
  alarm_name          = "${var.project_name}-aurora-acu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ACUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 90  # Alert when ACU utilization > 90%

  dimensions = {
    DBInstanceIdentifier = aws_rds_cluster_instance.serverless_writer.identifier
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Monitor writer capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBInstanceIdentifier,Value=my-project-serverless-writer \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Conclusion

Aurora Serverless v2 eliminates capacity planning by scaling in fine-grained 0.5-ACU increments based on actual workload. Set `min_capacity` to a value that allows fast scaling (0.5 ACU is fine for dev, but a higher minimum can reduce slow scale-up for bursty production workloads). Monitor `ServerlessDatabaseCapacity` and `ACUUtilization` to tune the min/max range and ensure cost efficiency.
