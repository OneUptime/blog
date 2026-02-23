# How to Create RDS with Multi-AZ Deployment in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Multi-AZ, High Availability, Database

Description: Step-by-step guide to configuring Amazon RDS Multi-AZ deployments in Terraform for high availability, automatic failover, and disaster recovery.

---

If your database goes down and takes your application with it, Multi-AZ is the first thing you should turn on. Amazon RDS Multi-AZ creates a synchronous standby replica in a different availability zone. When the primary instance fails, RDS automatically fails over to the standby - usually within 60-120 seconds. Your application just sees a brief interruption, not an outage.

This post covers how to set up Multi-AZ deployments in Terraform, including the newer Multi-AZ DB cluster option, failover testing, and the DNS and networking considerations you need to get right.

## How Multi-AZ Works

There are actually two flavors of Multi-AZ on RDS:

**Multi-AZ DB Instance** - the classic option. RDS maintains one standby in a different AZ. The standby receives synchronous replication from the primary but does not serve read traffic. You pay for two instances but only use one at a time.

**Multi-AZ DB Cluster** - the newer option (available for MySQL and PostgreSQL). RDS creates two readable standby instances across different AZs. These standby instances can serve read traffic, giving you both high availability and read scaling. This uses a different resource type in Terraform.

## Multi-AZ DB Instance (Classic)

This is the simpler and more commonly used approach. You enable it with a single parameter:

```hcl
# Subnet group spanning multiple AZs - required for Multi-AZ
resource "aws_db_subnet_group" "main" {
  name       = "multi-az-db-subnets"
  subnet_ids = var.private_subnet_ids
  # These subnets MUST be in different availability zones

  tags = {
    Name = "multi-az-db-subnets"
  }
}

# Security group for the RDS instance
resource "aws_security_group" "db" {
  name_prefix = "rds-multi-az-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "PostgreSQL from application servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Multi-AZ RDS instance
resource "aws_db_instance" "main" {
  identifier = "myapp-db"

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.large"

  # THIS IS THE KEY SETTING
  multi_az = true

  # Storage
  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  # Credentials
  db_name  = "myapp"
  username = "app_admin"
  password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  # Backup - important for Multi-AZ
  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:00-Sun:05:00"

  # With Multi-AZ, backups are taken from the standby
  # so they do not affect primary instance performance

  # Protection
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "myapp-db-final"

  # Monitoring
  performance_insights_enabled = true

  tags = {
    Name        = "myapp-db"
    Environment = "production"
  }
}
```

That single `multi_az = true` line is all it takes. RDS handles the standby creation, synchronous replication, and automatic failover.

## Multi-AZ DB Cluster (Readable Standbys)

The newer Multi-AZ DB cluster deployment gives you two readable standbys. This is a different Terraform resource entirely:

```hcl
# Multi-AZ DB Cluster with readable standbys
resource "aws_rds_cluster" "multi_az" {
  cluster_identifier = "myapp-multi-az-cluster"

  engine         = "mysql"
  engine_version = "8.0.35"

  # This is what makes it a Multi-AZ DB Cluster
  db_cluster_instance_class = "db.r6gd.large"
  storage_type              = "io1"
  allocated_storage         = 100
  iops                      = 3000

  database_name   = "myapp"
  master_username = "admin"
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Backup configuration
  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"

  # Encryption
  storage_encrypted = true

  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "myapp-cluster-final"

  tags = {
    Name = "myapp-multi-az-cluster"
  }
}
```

Note the differences: the Multi-AZ DB Cluster uses `aws_rds_cluster` with `db_cluster_instance_class` set. You do not create separate cluster instances - AWS manages all three instances (one writer, two readers) automatically.

## Understanding Failover Behavior

When a failover happens, the RDS endpoint DNS record is updated to point to the new primary. Your application does not need to change connection strings. However, there are things to be aware of:

```hcl
# Output the endpoint - this stays the same through failovers
output "db_endpoint" {
  description = "Database endpoint (DNS name stays constant through failovers)"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "Database hostname"
  value       = aws_db_instance.main.address
}
```

The DNS TTL for RDS endpoints is 5 seconds. Most applications will reconnect within a few seconds after failover completes. But your application needs to handle the brief disconnection gracefully - retry logic in your database driver is essential.

## CloudWatch Alarms for Failover Events

You want to know when failovers happen. Set up an EventBridge rule to catch them:

```hcl
# SNS topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "rds-failover-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.db_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# EventBridge rule to catch RDS failover events
resource "aws_cloudwatch_event_rule" "rds_failover" {
  name        = "rds-failover-events"
  description = "Capture RDS failover events"

  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Instance Event"]
    detail = {
      EventCategories = ["failover"]
      SourceArn       = [aws_db_instance.main.arn]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.rds_failover.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.db_alerts.arn
}

# Allow EventBridge to publish to SNS
resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.db_alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.db_alerts.arn
      }
    ]
  })
}
```

## Testing Failover

You cannot trigger a failover through Terraform directly, but you can do it via the AWS CLI. This is something you should test before you need it in production:

```bash
# Trigger a manual failover
aws rds reboot-db-instance \
  --db-instance-identifier myapp-db \
  --force-failover

# Watch the failover progress
aws rds describe-events \
  --source-identifier myapp-db \
  --source-type db-instance \
  --duration 60
```

During testing, measure how long your application is unable to connect. Typical failover times are 60-120 seconds for the classic Multi-AZ and 35 seconds or less for the Multi-AZ DB Cluster.

## Cost Considerations

Multi-AZ roughly doubles your RDS cost because you are paying for two instances (or three, with the DB Cluster option). But consider what downtime costs your business. For most production workloads, the cost is well justified.

A few ways to manage costs:

```hcl
# Use Multi-AZ only for production
resource "aws_db_instance" "main" {
  # ... other config ...

  # Only enable Multi-AZ in production
  multi_az = var.environment == "production" ? true : false

  # Use smaller instances for non-production
  instance_class = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"
}

variable "environment" {
  description = "Environment name"
  type        = string
}
```

## Things People Get Wrong

A few common mistakes with Multi-AZ deployments:

The standby instance in the classic Multi-AZ setup cannot serve read traffic. If you need read replicas, you need to create those separately using `aws_db_instance` with `replicate_source_db`. Multi-AZ and read replicas are different features that can be used together.

Subnet groups must span multiple AZs. If all your subnets are in one AZ, Multi-AZ will not work. Make sure your VPC has private subnets in at least two availability zones.

Failover can happen for maintenance too. When RDS applies maintenance patches, it patches the standby first, fails over, then patches the old primary. This is why your application must handle brief disconnections.

## Summary

Multi-AZ is the simplest high availability option for RDS. Setting `multi_az = true` in Terraform gives you automatic failover, synchronous replication, and backups that do not impact your primary instance. For higher read throughput, the Multi-AZ DB Cluster option adds readable standbys. Either way, test your failover process, make sure your application has retry logic, and set up alerts so you know when failovers occur.
