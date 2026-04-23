# How to Deploy RDS Multi-AZ Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Multi-AZ, High Availability, Infrastructure as Code, Failover

Description: Learn how to deploy RDS instances with Multi-AZ enabled using OpenTofu for automatic failover with minimal downtime during maintenance and availability zone failures.

## Introduction

RDS Multi-AZ deploys a primary database instance and a synchronous standby replica in a different AZ. AWS automatically fails over to the standby during a primary failure, typically within 60-120 seconds. This is the recommended configuration for any production database requiring high availability.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions

## Step 1: Create a Multi-AZ RDS Instance

```hcl
resource "aws_db_instance" "multi_az" {
  identifier     = "${var.project_name}-db-multi-az"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.xlarge"  # Memory-optimized for production

  # Multi-AZ provides synchronous replication to a standby
  # and automatic failover - recommended for all production databases
  multi_az = true

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_type          = "gp3"
  allocated_storage     = 200
  max_allocated_storage = 2000
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot"

  # Enhanced monitoring every 60 seconds
  monitoring_interval = 60
  monitoring_role_arn = var.rds_monitoring_role_arn

  performance_insights_enabled = true

  tags = {
    Name        = "${var.project_name}-multi-az-db"
    HA          = "MultiAZ"
    Environment = var.environment
  }
}
```

## Step 2: Configure RDS Event Notifications and CloudWatch Alarms

```hcl
# RDS failover notifications are delivered through RDS events
resource "aws_db_event_subscription" "failover" {
  name      = "${var.project_name}-rds-failover"
  sns_topic = var.ops_sns_topic_arn

  source_type = "db-instance"
  source_ids  = [aws_db_instance.multi_az.identifier]

  event_categories = [
    "availability",
    "failover",
    "failure",
    "maintenance",
    "notification",
  ]
}

# Alarm for freeable memory dropping too low (indicates memory pressure)
resource "aws_cloudwatch_metric_alarm" "low_memory" {
  alarm_name          = "${var.project_name}-rds-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 268435456  # 256 MB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.multi_az.identifier
  }

  alarm_actions = [var.ops_sns_topic_arn]
}
```

## Step 3: Test Failover

```bash
# Initiate a manual failover (for testing)
aws rds reboot-db-instance \
  --db-instance-identifier my-project-db-multi-az \
  --force-failover

# Check the current primary and secondary Availability Zones
# (reported AZs can take several minutes to update after failover)
aws rds describe-db-instances \
  --db-instance-identifier my-project-db-multi-az \
  --query 'DBInstances[0].{PrimaryAZ: AvailabilityZone, SecondaryAZ: SecondaryAvailabilityZone, Status: DBInstanceStatus}'
```

## Step 4: Outputs

```hcl
output "db_endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.multi_az.endpoint
}

output "db_host" {
  description = "Database hostname"
  value       = aws_db_instance.multi_az.address
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

RDS Multi-AZ provides automatic database failover with typically 60-120 seconds of downtime, during which the DNS record for the DB endpoint changes to point to the standby. Unlike read replicas, the Multi-AZ standby is not accessible for reads; it exists solely for failover. For both high availability AND read scaling, combine Multi-AZ with read replicas. Always test failover in a maintenance window to validate your application's reconnection logic.
