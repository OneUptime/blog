# How to Create Multi-AZ Database Deployments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, RDS, High Availability, Multi-AZ, Infrastructure as Code

Description: Learn how to create highly available multi-AZ database deployments using Terraform for automatic failover and improved resilience across AWS availability zones.

---

Running a database in a single availability zone is a risk that production workloads should never take. If that zone goes down, your entire application goes offline. Multi-AZ deployments solve this by maintaining a synchronous standby replica in a different availability zone, providing automatic failover when something goes wrong. In this guide, you will learn how to set up multi-AZ database deployments with Terraform on AWS RDS.

## Why Multi-AZ Matters

AWS availability zones are physically separate data centers within a region. When you deploy a database in multi-AZ mode, AWS automatically provisions and maintains a standby replica in a different zone. If the primary instance fails due to hardware issues, network problems, or even a full zone outage, RDS automatically fails over to the standby. This happens without manual intervention and typically completes within 60 to 120 seconds.

The standby replica uses synchronous replication, meaning every write to the primary is confirmed on the standby before being acknowledged. This ensures zero data loss during failover events.

## Prerequisites

Before you begin, make sure you have the following in place:

- Terraform 1.0 or later installed
- AWS CLI configured with appropriate credentials
- A VPC with subnets in at least two availability zones
- Basic understanding of Terraform syntax and AWS RDS

## Setting Up the Provider and VPC

Start by configuring the AWS provider and referencing your VPC infrastructure.

```hcl
# Configure the AWS provider
provider "aws" {
  region = "us-east-1"
}

# Reference existing VPC
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["main-vpc"]
  }
}

# Get available AZs in the region
data "aws_availability_zones" "available" {
  state = "available"
}
```

## Creating the Subnet Group

A DB subnet group tells RDS which subnets to use for the database instances. For multi-AZ, you need subnets in at least two different availability zones.

```hcl
# Create private subnets for the database in multiple AZs
resource "aws_subnet" "database" {
  count             = 2
  vpc_id            = data.aws_vpc.main.id
  cidr_block        = cidrsubnet(data.aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "database-subnet-${count.index + 1}"
    Tier = "database"
  }
}

# Create the DB subnet group spanning multiple AZs
resource "aws_db_subnet_group" "multi_az" {
  name       = "multi-az-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "Multi-AZ DB Subnet Group"
  }
}
```

## Configuring the Security Group

The security group controls network access to your database. Only allow traffic from your application tier.

```hcl
# Security group for the RDS instance
resource "aws_security_group" "database" {
  name_prefix = "database-sg-"
  vpc_id      = data.aws_vpc.main.id
  description = "Security group for Multi-AZ RDS instance"

  # Allow inbound PostgreSQL traffic from application subnets
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # Adjust to your app subnet CIDR
    description = "PostgreSQL access from application tier"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "database-security-group"
  }
}
```

## Creating the Multi-AZ RDS Instance

Now create the RDS instance with multi-AZ enabled. The key parameter is `multi_az = true`.

```hcl
# Create the Multi-AZ RDS instance
resource "aws_db_instance" "multi_az_postgres" {
  identifier = "production-postgres"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  max_allocated_storage = 500  # Enable storage autoscaling up to 500 GB
  storage_type         = "gp3"
  storage_encrypted    = true

  # Database configuration
  db_name  = "production"
  username = "dbadmin"
  password = var.db_password  # Use a variable, never hardcode
  port     = 5432

  # Multi-AZ configuration - this is the key setting
  multi_az = true

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.multi_az.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Deletion protection
  deletion_protection      = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "production-postgres-final-snapshot"

  # Parameter group for custom settings
  parameter_group_name = aws_db_parameter_group.postgres.name

  tags = {
    Name        = "production-postgres"
    Environment = "production"
    MultiAZ     = "true"
  }
}
```

## Setting Up the Parameter Group

A custom parameter group lets you tune database settings for your workload.

```hcl
# Custom parameter group for PostgreSQL
resource "aws_db_parameter_group" "postgres" {
  family = "postgres15"
  name   = "production-postgres-params"

  # Tune shared buffers for better performance
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  # Enable logging for slow queries
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name = "production-postgres-params"
  }
}
```

## Creating the Enhanced Monitoring IAM Role

Enhanced monitoring requires an IAM role for RDS to publish metrics to CloudWatch.

```hcl
# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-enhanced-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the enhanced monitoring policy
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Adding CloudWatch Alarms for Failover Events

Monitor your multi-AZ deployment with CloudWatch alarms to get notified of failover events.

```hcl
# SNS topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "database-alerts"
}

# RDS event subscription for failover notifications
resource "aws_db_event_subscription" "failover" {
  name      = "rds-failover-events"
  sns_topic = aws_sns_topic.db_alerts.arn

  source_type = "db-instance"
  source_ids  = [aws_db_instance.multi_az_postgres.identifier]

  event_categories = [
    "failover",
    "failure",
    "notification",
  ]
}

# CloudWatch alarm for high CPU
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.db_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.multi_az_postgres.identifier
  }
}
```

## Variables and Outputs

Define your variables and outputs for reusability.

```hcl
# Variables
variable "db_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

# Outputs
output "db_endpoint" {
  description = "The connection endpoint for the database"
  value       = aws_db_instance.multi_az_postgres.endpoint
}

output "db_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.multi_az_postgres.arn
}

output "db_availability_zone" {
  description = "The availability zone of the primary instance"
  value       = aws_db_instance.multi_az_postgres.availability_zone
}
```

## Testing Failover

After deploying, you can test failover by triggering a reboot with failover from the AWS CLI:

```bash
aws rds reboot-db-instance \
  --db-instance-identifier production-postgres \
  --force-failover
```

Monitor the RDS events in the AWS console or through your SNS subscription to confirm the failover completes successfully. The endpoint DNS record stays the same, so your application reconnects automatically.

## Best Practices

When running multi-AZ database deployments, keep these best practices in mind. Always use encrypted storage with `storage_encrypted = true`. Enable enhanced monitoring and Performance Insights to understand database behavior during failover events. Set appropriate backup retention periods and test your restore process regularly. Use deletion protection in production to prevent accidental destruction.

Your application should also be prepared for brief connection interruptions during failover. Use connection pooling and implement retry logic with exponential backoff in your application code.

## Monitoring with OneUptime

To ensure your multi-AZ database is performing well and failovers are handled gracefully, consider setting up monitoring with [OneUptime](https://oneuptime.com). You can track database connectivity, query performance, and get alerted when failover events occur, all from a single dashboard.

## Conclusion

Multi-AZ database deployments are essential for any production workload that requires high availability. With Terraform, you can define the entire setup as code, making it reproducible and version-controlled. The `multi_az = true` flag on your RDS instance is the core setting, but a production-ready deployment also needs proper subnet groups, security groups, monitoring, and alerting. By following this guide, you now have a solid foundation for running highly available databases on AWS with Terraform.

For more Terraform and infrastructure guides, check out our other posts on [database auto scaling](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-database-auto-scaling-with-terraform/view) and [database cost optimization](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-cost-optimization-with-terraform/view).
