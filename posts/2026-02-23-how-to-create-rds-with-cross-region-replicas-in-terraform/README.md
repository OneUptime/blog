# How to Create RDS with Cross-Region Replicas in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Cross-Region Replication, Disaster Recovery, Database, Infrastructure as Code

Description: Learn how to create RDS instances with cross-region read replicas in Terraform for disaster recovery, read scaling, and data locality across AWS regions.

---

Cross-region read replicas in RDS replicate your database to a different AWS region, providing disaster recovery capabilities, read scaling for geographically distributed applications, and data locality for users in different regions. This guide covers setting up cross-region replication for RDS using Terraform with proper encryption, networking, and failover configurations.

## Why Cross-Region Replicas?

Cross-region replicas serve multiple purposes. For disaster recovery, they provide a warm standby in another region that can be promoted to a standalone database if the primary region fails. For performance, they allow read traffic from applications in the replica's region to be served locally instead of crossing regions. For compliance, they help meet data residency requirements by having data available in specific geographic locations.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with VPCs in multiple regions, and understanding of RDS replication concepts. Note that cross-region replication incurs data transfer charges between regions.

## Provider Configuration

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

# Replica region
provider "aws" {
  region = "eu-west-1"
  alias  = "replica"
}
```

## Primary Database Setup

```hcl
# VPC in the primary region
resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "primary-vpc"
  }
}

data "aws_availability_zones" "primary" {
  provider = aws.primary
  state    = "available"
}

resource "aws_subnet" "primary_private" {
  provider          = aws.primary
  count             = 3
  vpc_id            = aws_vpc.primary.id
  cidr_block        = cidrsubnet(aws_vpc.primary.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.primary.names[count.index]

  tags = {
    Name = "primary-private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "primary" {
  provider   = aws.primary
  name       = "primary-db-subnets"
  subnet_ids = aws_subnet.primary_private[*].id

  tags = {
    Name = "primary-db-subnet-group"
  }
}

resource "aws_security_group" "primary_rds" {
  provider    = aws.primary
  name_prefix = "primary-rds-"
  vpc_id      = aws_vpc.primary.id
  description = "Primary RDS security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.primary.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "primary-rds-sg"
  }
}

# KMS key for encrypting the primary database
resource "aws_kms_key" "primary_rds" {
  provider    = aws.primary
  description = "KMS key for primary RDS encryption"
  enable_key_rotation = true

  tags = {
    Name = "primary-rds-key"
  }
}

# Primary RDS instance
resource "aws_db_instance" "primary" {
  provider       = aws.primary
  identifier     = "primary-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.primary_rds.arn

  db_name  = "appdb"
  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_rds.id]

  multi_az            = true
  publicly_accessible = false

  # Backup settings are required for replication
  backup_retention_period = 14
  backup_window           = "03:00-04:00"

  # Enable automated backups (required for cross-region replicas)
  # backup_retention_period must be > 0

  skip_final_snapshot       = false
  final_snapshot_identifier = "primary-postgres-final"

  tags = {
    Name        = "primary-postgres"
    Environment = "production"
    Role        = "primary"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Replica Region Infrastructure

```hcl
# VPC in the replica region
resource "aws_vpc" "replica" {
  provider             = aws.replica
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "replica-vpc"
  }
}

data "aws_availability_zones" "replica" {
  provider = aws.replica
  state    = "available"
}

resource "aws_subnet" "replica_private" {
  provider          = aws.replica
  count             = 3
  vpc_id            = aws_vpc.replica.id
  cidr_block        = cidrsubnet(aws_vpc.replica.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.replica.names[count.index]

  tags = {
    Name = "replica-private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "replica" {
  provider   = aws.replica
  name       = "replica-db-subnets"
  subnet_ids = aws_subnet.replica_private[*].id

  tags = {
    Name = "replica-db-subnet-group"
  }
}

resource "aws_security_group" "replica_rds" {
  provider    = aws.replica
  name_prefix = "replica-rds-"
  vpc_id      = aws_vpc.replica.id
  description = "Replica RDS security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.replica.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "replica-rds-sg"
  }
}

# KMS key in the replica region for re-encrypting replicated data
resource "aws_kms_key" "replica_rds" {
  provider    = aws.replica
  description = "KMS key for replica RDS encryption"
  enable_key_rotation = true

  tags = {
    Name = "replica-rds-key"
  }
}
```

## Cross-Region Read Replica

```hcl
# Cross-region read replica
resource "aws_db_instance" "replica" {
  provider       = aws.replica
  identifier     = "replica-postgres"
  instance_class = "db.r6g.xlarge"  # Can be different from primary

  # Reference the primary instance as the replication source
  replicate_source_db = aws_db_instance.primary.arn

  # Encryption in the replica region (required when primary is encrypted)
  storage_encrypted = true
  kms_key_id        = aws_kms_key.replica_rds.arn

  # Network configuration in the replica region
  db_subnet_group_name   = aws_db_subnet_group.replica.name
  vpc_security_group_ids = [aws_security_group.replica_rds.id]

  # Replica-specific settings
  multi_az            = true  # Multi-AZ in the replica region for extra redundancy
  publicly_accessible = false

  # Performance settings
  storage_type          = "gp3"
  max_allocated_storage = 500

  # Monitoring
  performance_insights_enabled = true
  monitoring_interval          = 30
  monitoring_role_arn          = aws_iam_role.replica_monitoring.arn

  # Backup settings for the replica (enables point-in-time recovery)
  backup_retention_period = 7

  # Do not set these on a replica:
  # - db_name (inherited from primary)
  # - username (inherited from primary)
  # - password (inherited from primary)
  # - engine (inherited from primary)
  # - engine_version (inherited from primary)

  skip_final_snapshot = true  # Replicas typically do not need final snapshots

  tags = {
    Name        = "replica-postgres"
    Environment = "production"
    Role        = "replica"
    Region      = "eu-west-1"
  }
}

# IAM role for Enhanced Monitoring in the replica region
resource "aws_iam_role" "replica_monitoring" {
  provider = aws.replica
  name     = "replica-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "replica_monitoring" {
  provider   = aws.replica
  role       = aws_iam_role.replica_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Multiple Replicas in Different Regions

```hcl
# Third region provider
provider "aws" {
  region = "ap-southeast-1"
  alias  = "apac"
}

# APAC region VPC and networking (abbreviated)
resource "aws_vpc" "apac" {
  provider             = aws.apac
  cidr_block           = "10.2.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "apac-vpc"
  }
}

data "aws_availability_zones" "apac" {
  provider = aws.apac
  state    = "available"
}

resource "aws_subnet" "apac_private" {
  provider          = aws.apac
  count             = 3
  vpc_id            = aws_vpc.apac.id
  cidr_block        = cidrsubnet(aws_vpc.apac.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.apac.names[count.index]

  tags = {
    Name = "apac-private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "apac" {
  provider   = aws.apac
  name       = "apac-db-subnets"
  subnet_ids = aws_subnet.apac_private[*].id
}

resource "aws_security_group" "apac_rds" {
  provider    = aws.apac
  name_prefix = "apac-rds-"
  vpc_id      = aws_vpc.apac.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.apac.cidr_block]
  }
}

resource "aws_kms_key" "apac_rds" {
  provider    = aws.apac
  description = "KMS key for APAC RDS encryption"
  enable_key_rotation = true
}

# APAC region read replica
resource "aws_db_instance" "apac_replica" {
  provider       = aws.apac
  identifier     = "apac-replica-postgres"
  instance_class = "db.r6g.large"

  replicate_source_db = aws_db_instance.primary.arn

  storage_encrypted      = true
  kms_key_id             = aws_kms_key.apac_rds.arn
  db_subnet_group_name   = aws_db_subnet_group.apac.name
  vpc_security_group_ids = [aws_security_group.apac_rds.id]

  multi_az            = false  # Single-AZ for cost savings in APAC
  publicly_accessible = false
  storage_type        = "gp3"

  skip_final_snapshot = true

  tags = {
    Name   = "apac-replica-postgres"
    Role   = "replica"
    Region = "ap-southeast-1"
  }
}
```

## Monitoring Replication Lag

```hcl
# Alarm for replication lag on the EU replica
resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  provider            = aws.replica
  alarm_name          = "rds-replica-lag-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 60  # Alert if lag exceeds 60 seconds
  alarm_description   = "Cross-region replica lag is high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replica.identifier
  }
}
```

## Outputs

```hcl
output "primary_endpoint" {
  description = "Primary database endpoint (read-write)"
  value       = aws_db_instance.primary.endpoint
}

output "replica_endpoint" {
  description = "EU replica endpoint (read-only)"
  value       = aws_db_instance.replica.endpoint
}

output "apac_replica_endpoint" {
  description = "APAC replica endpoint (read-only)"
  value       = aws_db_instance.apac_replica.endpoint
}
```

## Conclusion

Cross-region read replicas provide essential disaster recovery capabilities and read scaling for globally distributed applications. With Terraform managing multi-provider configurations, you can consistently deploy and maintain replicas across regions. Combined with proper monitoring of replication lag and automated failover strategies, cross-region replicas form a critical part of any production database architecture.

For more RDS topics, see our guide on [How to Handle RDS Password Rotation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-rds-password-rotation-with-terraform/view).
