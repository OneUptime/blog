# How to Create RDS Read Replicas with OpenTofu - Rds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Read Replica, Scalability, Infrastructure as Code, Database

Description: Learn how to create RDS read replicas for horizontal read scaling and cross-region disaster recovery using OpenTofu.

## Introduction

RDS Read Replicas use asynchronous replication to maintain copies of the primary database for read-heavy workloads. Applications can route read queries to replicas, reducing load on the primary and enabling horizontal scaling. Read replicas can also be promoted to standalone databases for DR purposes.

## Prerequisites

- OpenTofu v1.6+
- An existing RDS instance with automated backups enabled

## Step 1: Create a Primary RDS Instance

```hcl
resource "aws_db_instance" "primary" {
  identifier     = "${var.project_name}-primary"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.2xlarge"

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  multi_az                = true
  storage_encrypted       = true
  backup_retention_period = 7  # Required for read replicas

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  tags = { Name = "${var.project_name}-primary" }
}
```

## Step 2: Create Same-Region Read Replicas

```hcl
# Read replica in the same region for read scaling

resource "aws_db_instance" "read_replica_1" {
  identifier     = "${var.project_name}-replica-1"
  instance_class = "db.r6g.xlarge"  # Can use smaller instance for reads

  # Set replicate_source_db to create a replica instead of a new instance
  replicate_source_db = aws_db_instance.primary.identifier

  # Replicas inherit most settings from the source
  # Override specific settings as needed
  auto_minor_version_upgrade = true

  # Use a different parameter group for read-optimized settings
  parameter_group_name = aws_db_parameter_group.replica.name

  tags = {
    Name = "${var.project_name}-replica-1"
    Role = "ReadReplica"
  }
}

resource "aws_db_instance" "read_replica_2" {
  identifier          = "${var.project_name}-replica-2"
  instance_class      = "db.r6g.xlarge"
  replicate_source_db = aws_db_instance.primary.identifier

  tags = {
    Name = "${var.project_name}-replica-2"
    Role = "ReadReplica"
  }
}
```

## Step 3: Create Cross-Region Read Replica for DR

```hcl
# Cross-region replica in DR region
resource "aws_db_instance" "dr_replica" {
  provider = aws.dr_region  # Provider for the DR region

  identifier     = "${var.project_name}-dr-replica"
  instance_class = "db.r6g.large"

  # Use the ARN of the primary for cross-region replication
  replicate_source_db = aws_db_instance.primary.arn

  # For encrypted cross-region replicas, specify a KMS key in the destination region
  kms_key_id = var.dr_kms_key_arn

  db_subnet_group_name   = var.dr_subnet_group_name
  vpc_security_group_ids = [var.dr_security_group_id]

  tags = {
    Name   = "${var.project_name}-dr-replica"
    Region = "DR"
  }
}
```

## Step 4: Monitor Replication Lag

```hcl
# Alert when replication lag is sustained above 5 minutes
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "${var.project_name}-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 300  # 5 minutes in seconds

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.read_replica_1.identifier
  }

  alarm_actions = [var.ops_sns_topic_arn]
}
```

## Step 5: Outputs

```hcl
output "replica_endpoints" {
  value = [
    aws_db_instance.read_replica_1.endpoint,
    aws_db_instance.read_replica_2.endpoint
  ]
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

RDS read replicas scale read throughput by distributing queries across multiple database instances. Monitor `ReplicaLag` in CloudWatch; for PostgreSQL, idle databases can report up to five minutes of lag because WAL segments switch every five minutes by default. Sustained high lag during write activity indicates the replica cannot keep up with write volume on the primary. For promotion to a standalone database during DR, use `aws rds promote-read-replica --db-instance-identifier <replica-id>`. Remember that after promotion, the replica is no longer a replica and will not receive replication from the primary.
