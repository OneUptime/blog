# How to Create Aurora Global Database with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Aurora, Global Database, Disaster Recovery, Multi-Region, Infrastructure as Code

Description: Learn how to create Aurora Global Database with Terraform for cross-region replication with sub-second data lag, fast failover, and global read scaling.

---

Aurora Global Database spans multiple AWS regions, providing cross-region disaster recovery with sub-second data replication lag, fast regional failover (typically under 1 minute), and local read performance for globally distributed applications. Unlike traditional cross-region replicas, Aurora Global Database uses dedicated replication infrastructure for consistent low-latency replication. This guide covers creating and managing Aurora Global Database with Terraform.

## How Aurora Global Database Works

An Aurora Global Database consists of one primary cluster in one region and up to five secondary clusters in different regions. The primary cluster handles all write operations, while secondary clusters serve read traffic. Data replication happens at the storage level, not through binlog or WAL replication, which provides sub-second replication lag (typically under 1 second).

During a regional failure, you can promote a secondary cluster to become the new primary, with a recovery time of typically less than 1 minute.

## Prerequisites

You need Terraform 1.0 or later, AWS credentials with permissions across multiple regions, and familiarity with Aurora cluster concepts.

## Provider Configuration

```hcl
# Primary region
provider "aws" {
  region = "us-east-1"
  alias  = "primary"
}

# Secondary region
provider "aws" {
  region = "eu-west-1"
  alias  = "secondary"
}
```

## Primary Region Infrastructure

```hcl
# VPC in primary region
resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "aurora-global-primary-vpc"
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
  name       = "aurora-global-primary"
  subnet_ids = aws_subnet.primary_private[*].id

  tags = {
    Name = "aurora-global-primary-subnets"
  }
}

resource "aws_security_group" "primary_aurora" {
  provider    = aws.primary
  name_prefix = "aurora-primary-"
  vpc_id      = aws_vpc.primary.id
  description = "Primary Aurora security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.primary.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "aurora-primary-sg"
  }
}
```

## Global Database and Primary Cluster

```hcl
# Aurora Global Database resource
resource "aws_rds_global_cluster" "main" {
  provider = aws.primary

  global_cluster_identifier = "aurora-global-postgres"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "appdb"
  storage_encrypted         = true
}

# Primary Aurora cluster
resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier        = "aurora-global-primary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  master_username = "admin"
  master_password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_aurora.id]

  storage_encrypted = true

  backup_retention_period   = 14
  preferred_backup_window   = "03:00-04:00"

  # Enable deletion protection in production
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name   = "aurora-global-primary"
    Region = "us-east-1"
    Role   = "primary"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}

# Primary cluster writer instance
resource "aws_rds_cluster_instance" "primary_writer" {
  provider = aws.primary

  cluster_identifier = aws_rds_cluster.primary.id
  identifier         = "global-primary-writer"
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version

  performance_insights_enabled = true

  tags = {
    Name = "global-primary-writer"
    Role = "writer"
  }
}

# Primary cluster reader instance
resource "aws_rds_cluster_instance" "primary_reader" {
  provider = aws.primary

  cluster_identifier = aws_rds_cluster.primary.id
  identifier         = "global-primary-reader"
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version

  performance_insights_enabled = true

  tags = {
    Name = "global-primary-reader"
    Role = "reader"
  }
}
```

## Secondary Region Infrastructure

```hcl
# VPC in secondary region
resource "aws_vpc" "secondary" {
  provider             = aws.secondary
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "aurora-global-secondary-vpc"
  }
}

data "aws_availability_zones" "secondary" {
  provider = aws.secondary
  state    = "available"
}

resource "aws_subnet" "secondary_private" {
  provider          = aws.secondary
  count             = 3
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = cidrsubnet(aws_vpc.secondary.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.secondary.names[count.index]

  tags = {
    Name = "secondary-private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "aurora-global-secondary"
  subnet_ids = aws_subnet.secondary_private[*].id

  tags = {
    Name = "aurora-global-secondary-subnets"
  }
}

resource "aws_security_group" "secondary_aurora" {
  provider    = aws.secondary
  name_prefix = "aurora-secondary-"
  vpc_id      = aws_vpc.secondary.id
  description = "Secondary Aurora security group"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.secondary.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "aurora-secondary-sg"
  }
}
```

## Secondary Cluster

```hcl
# Secondary Aurora cluster in eu-west-1
resource "aws_rds_cluster" "secondary" {
  provider = aws.secondary

  cluster_identifier        = "aurora-global-secondary"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version

  # Secondary clusters do not have their own master credentials
  # They inherit from the primary

  db_subnet_group_name   = aws_db_subnet_group.secondary.name
  vpc_security_group_ids = [aws_security_group.secondary_aurora.id]

  storage_encrypted = true

  backup_retention_period = 7  # Independent backup in secondary region

  deletion_protection = false
  skip_final_snapshot = true

  # Important: the secondary cluster depends on the primary
  depends_on = [aws_rds_cluster.primary]

  tags = {
    Name   = "aurora-global-secondary"
    Region = "eu-west-1"
    Role   = "secondary"
  }

  lifecycle {
    ignore_changes = [
      replication_source_identifier  # Managed by the global cluster
    ]
  }
}

# Secondary cluster reader instance
resource "aws_rds_cluster_instance" "secondary_reader_1" {
  provider = aws.secondary

  cluster_identifier = aws_rds_cluster.secondary.id
  identifier         = "global-secondary-reader-1"
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version

  performance_insights_enabled = true

  depends_on = [aws_rds_cluster_instance.primary_writer]

  tags = {
    Name = "global-secondary-reader-1"
    Role = "reader"
  }
}

# Additional reader in secondary region for higher read capacity
resource "aws_rds_cluster_instance" "secondary_reader_2" {
  provider = aws.secondary

  cluster_identifier = aws_rds_cluster.secondary.id
  identifier         = "global-secondary-reader-2"
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version

  performance_insights_enabled = true

  depends_on = [aws_rds_cluster_instance.primary_writer]

  tags = {
    Name = "global-secondary-reader-2"
    Role = "reader"
  }
}
```

## Monitoring Global Database Replication

```hcl
# Monitor replication lag between primary and secondary
resource "aws_cloudwatch_metric_alarm" "global_replication_lag" {
  provider            = aws.secondary
  alarm_name          = "aurora-global-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "AuroraGlobalDBReplicationLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1000  # 1 second in milliseconds
  alarm_description   = "Aurora Global Database replication lag exceeds 1 second"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.secondary.cluster_identifier
  }
}

# Monitor data transfer out of primary region
resource "aws_cloudwatch_metric_alarm" "replication_data" {
  provider            = aws.secondary
  alarm_name          = "aurora-global-data-transfer"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "AuroraGlobalDBReplicatedWriteIO"
  namespace           = "AWS/RDS"
  period              = 3600
  statistic           = "Sum"
  threshold           = 1000000  # Alert on high replication volume
  alarm_description   = "Unusually high replication data volume"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.secondary.cluster_identifier
  }
}
```

## Outputs

```hcl
output "global_cluster_id" {
  description = "Aurora Global Database identifier"
  value       = aws_rds_global_cluster.main.global_cluster_identifier
}

output "primary_cluster_endpoint" {
  description = "Primary cluster endpoint (read-write)"
  value       = aws_rds_cluster.primary.endpoint
}

output "primary_reader_endpoint" {
  description = "Primary cluster reader endpoint"
  value       = aws_rds_cluster.primary.reader_endpoint
}

output "secondary_cluster_endpoint" {
  description = "Secondary cluster endpoint (read-only, becomes read-write after promotion)"
  value       = aws_rds_cluster.secondary.endpoint
}

output "secondary_reader_endpoint" {
  description = "Secondary cluster reader endpoint"
  value       = aws_rds_cluster.secondary.reader_endpoint
}
```

## Failover Considerations

To perform a planned failover, you would detach the secondary cluster from the global database and promote it. This is an operational procedure done through the AWS console or CLI, not through Terraform. After failover, you would need to update your Terraform configuration to reflect the new primary.

For unplanned failover, the secondary cluster is promoted automatically if the primary region becomes unavailable. Your application should be configured to detect the failover and redirect writes to the new primary endpoint.

## Conclusion

Aurora Global Database provides enterprise-grade cross-region replication with sub-second lag and fast failover. With Terraform managing the infrastructure across regions, you can deploy and maintain a globally distributed database architecture consistently. Combined with monitoring of replication lag and proper failover procedures, Aurora Global Database delivers the reliability and performance needed for global applications.

For related database topics, see our guide on [How to Handle Database Migration with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-migration-with-terraform/view).
