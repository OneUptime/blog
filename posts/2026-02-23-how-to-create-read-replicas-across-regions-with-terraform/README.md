# How to Create Read Replicas Across Regions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Read Replicas, Cross-Region, RDS, Aurora, Infrastructure as Code

Description: Learn how to create and manage cross-region read replicas using Terraform for RDS and Aurora to improve read performance and enable disaster recovery.

---

Cross-region read replicas let you serve read traffic from a database copy that is physically closer to your users in another AWS region. They also serve as a disaster recovery mechanism since you can promote a cross-region replica to a standalone database if your primary region becomes unavailable. In this guide, we will cover how to create and manage cross-region read replicas for RDS and Aurora using Terraform.

## Understanding Cross-Region Read Replicas

A cross-region read replica is a copy of your database that runs in a different AWS region than the primary. The primary database asynchronously replicates data to the replica. Because replication is asynchronous, there is a small delay (replication lag) between when data is written to the primary and when it appears on the replica.

Cross-region replicas serve two main purposes: reducing read latency for users in other regions by serving reads from a nearby replica, and providing a disaster recovery target that can be promoted to a standalone database if the primary region fails.

## Setting Up Multi-Region Providers

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

# Primary region
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

# Replica region
provider "aws" {
  alias  = "replica"
  region = "eu-west-1"
}
```

## Creating a Cross-Region RDS Read Replica

```hcl
# Primary RDS instance in us-east-1
resource "aws_db_instance" "primary" {
  provider = aws.primary

  identifier     = "primary-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"

  db_name  = "appdb"
  username = "dbadmin"
  password = var.db_password

  # Enable backups (required for replicas)
  backup_retention_period = 7
  backup_window           = "02:00-02:30"

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_sg.id]
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.primary_db_key.arn
  multi_az               = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "primary-db-final"

  tags = {
    Environment = "production"
    Role        = "primary"
    Region      = "us-east-1"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

# KMS key in the primary region
resource "aws_kms_key" "primary_db_key" {
  provider = aws.primary

  description             = "KMS key for primary database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# KMS key in the replica region (required for encrypted cross-region replicas)
resource "aws_kms_key" "replica_db_key" {
  provider = aws.replica

  description             = "KMS key for replica database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Cross-region read replica in eu-west-1
resource "aws_db_instance" "cross_region_replica" {
  provider = aws.replica

  identifier     = "replica-db-eu"
  instance_class = "db.r6g.large"

  # Reference the primary instance
  replicate_source_db = aws_db_instance.primary.arn

  # Storage configuration
  storage_type          = "gp3"
  max_allocated_storage = 500

  # Encryption with a key in the replica region
  storage_encrypted = true
  kms_key_id        = aws_kms_key.replica_db_key.arn

  # Network in the replica region
  db_subnet_group_name   = aws_db_subnet_group.replica.name
  vpc_security_group_ids = [aws_security_group.replica_sg.id]

  # Replica does not need Multi-AZ initially, but you can enable it
  multi_az = false

  # Backup settings for the replica (enables further replicas or promotion)
  backup_retention_period = 7

  # Maintenance
  auto_minor_version_upgrade = true

  skip_final_snapshot = true

  tags = {
    Environment = "production"
    Role        = "cross-region-replica"
    Region      = "eu-west-1"
    SourceDB    = "primary-db"
  }
}
```

## Creating Aurora Global Database with Cross-Region Replicas

Aurora Global Database provides a more integrated cross-region solution:

```hcl
# Aurora Global Database
resource "aws_rds_global_cluster" "global" {
  provider = aws.primary

  global_cluster_identifier = "app-global-aurora"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "appdb"
  storage_encrypted         = true
}

# Primary Aurora cluster in us-east-1
resource "aws_rds_cluster" "primary_aurora" {
  provider = aws.primary

  cluster_identifier        = "aurora-primary"
  global_cluster_identifier = aws_rds_global_cluster.global.id
  engine                    = aws_rds_global_cluster.global.engine
  engine_version            = aws_rds_global_cluster.global.engine_version
  database_name             = "appdb"
  master_username           = "dbadmin"
  master_password           = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary_aurora.name
  vpc_security_group_ids = [aws_security_group.primary_aurora_sg.id]
  storage_encrypted      = true

  backup_retention_period = 14
  skip_final_snapshot     = true

  tags = {
    Environment = "production"
    Role        = "primary"
    Region      = "us-east-1"
  }
}

# Primary Aurora instances
resource "aws_rds_cluster_instance" "primary_instances" {
  provider = aws.primary
  count    = 2

  identifier         = "aurora-primary-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.primary_aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.primary_aurora.engine
  engine_version     = aws_rds_cluster.primary_aurora.engine_version

  tags = {
    Environment = "production"
    Region      = "us-east-1"
  }
}

# Secondary Aurora cluster in eu-west-1
resource "aws_rds_cluster" "secondary_aurora" {
  provider = aws.replica

  cluster_identifier        = "aurora-secondary"
  global_cluster_identifier = aws_rds_global_cluster.global.id
  engine                    = aws_rds_global_cluster.global.engine
  engine_version            = aws_rds_global_cluster.global.engine_version

  db_subnet_group_name   = aws_db_subnet_group.replica_aurora.name
  vpc_security_group_ids = [aws_security_group.replica_aurora_sg.id]
  storage_encrypted      = true

  skip_final_snapshot = true

  # The secondary cluster does not need master credentials
  # It inherits them from the global cluster

  depends_on = [aws_rds_cluster.primary_aurora]

  tags = {
    Environment = "production"
    Role        = "secondary"
    Region      = "eu-west-1"
  }
}

# Secondary Aurora instances
resource "aws_rds_cluster_instance" "secondary_instances" {
  provider = aws.replica
  count    = 2

  identifier         = "aurora-secondary-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.secondary_aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary_aurora.engine
  engine_version     = aws_rds_cluster.secondary_aurora.engine_version

  tags = {
    Environment = "production"
    Region      = "eu-west-1"
  }
}
```

## Networking for Cross-Region Replicas

Each region needs its own VPC, subnets, and security groups:

```hcl
# Primary region networking
resource "aws_db_subnet_group" "primary" {
  provider = aws.primary
  name     = "primary-db-subnets"
  subnet_ids = var.primary_subnet_ids

  tags = {
    Region = "us-east-1"
  }
}

resource "aws_security_group" "primary_sg" {
  provider    = aws.primary
  name_prefix = "primary-db-"
  vpc_id      = var.primary_vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.primary_vpc_cidr]
    description = "PostgreSQL from primary VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Replica region networking
resource "aws_db_subnet_group" "replica" {
  provider = aws.replica
  name     = "replica-db-subnets"
  subnet_ids = var.replica_subnet_ids

  tags = {
    Region = "eu-west-1"
  }
}

resource "aws_security_group" "replica_sg" {
  provider    = aws.replica
  name_prefix = "replica-db-"
  vpc_id      = var.replica_vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.replica_vpc_cidr]
    description = "PostgreSQL from replica VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Monitoring Cross-Region Replication Lag

```hcl
# Monitor replication lag on the cross-region replica
resource "aws_cloudwatch_metric_alarm" "cross_region_lag" {
  provider = aws.replica

  alarm_name          = "cross-region-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 60  # 60 seconds
  alarm_description   = "Cross-region replication lag exceeds 60 seconds"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.cross_region_replica.identifier
  }

  alarm_actions = [aws_sns_topic.replica_alerts.arn]
}

resource "aws_sns_topic" "replica_alerts" {
  provider = aws.replica
  name     = "cross-region-replica-alerts"
}

# Monitor Aurora Global Database replication lag
resource "aws_cloudwatch_metric_alarm" "aurora_global_lag" {
  provider = aws.replica

  alarm_name          = "aurora-global-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraGlobalDBReplicationLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 5000  # 5 seconds in milliseconds
  alarm_description   = "Aurora Global Database replication lag is too high"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.secondary_aurora.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.replica_alerts.arn]
}
```

## Outputs

```hcl
# Primary endpoints
output "primary_endpoint" {
  description = "Primary database endpoint"
  value       = aws_db_instance.primary.endpoint
}

# Replica endpoints
output "cross_region_replica_endpoint" {
  description = "Cross-region replica endpoint"
  value       = aws_db_instance.cross_region_replica.endpoint
}

# Aurora endpoints
output "aurora_primary_endpoint" {
  description = "Aurora primary cluster endpoint"
  value       = aws_rds_cluster.primary_aurora.endpoint
}

output "aurora_secondary_reader_endpoint" {
  description = "Aurora secondary cluster reader endpoint"
  value       = aws_rds_cluster.secondary_aurora.reader_endpoint
}
```

For comprehensive monitoring of your cross-region replication topology, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track replication lag, endpoint health, and failover readiness across regions.

## Best Practices

Always monitor replication lag on cross-region replicas to ensure data freshness. Use Aurora Global Database when possible, as it provides faster replication (typically under 1 second) compared to standard RDS cross-region replicas. Ensure your encryption keys are properly configured in both regions. Use separate KMS keys per region for encrypted replicas. Test promotion of cross-region replicas as part of your disaster recovery drills. Size replica instances appropriately based on expected read traffic. Consider the cost of cross-region data transfer when planning your replica strategy.

## Conclusion

Cross-region read replicas provide both performance benefits and disaster recovery capabilities for your database infrastructure. Terraform makes it straightforward to define multi-region database topologies as code, with proper encryption, networking, and monitoring in each region. Whether you use standard RDS replicas or Aurora Global Database, managing these resources through Terraform ensures consistency and repeatability across your infrastructure.
