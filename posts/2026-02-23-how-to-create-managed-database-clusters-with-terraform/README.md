# How to Create Managed Database Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Aurora, DocumentDB, ElastiCache, Managed Service, Infrastructure as Code

Description: Learn how to create and manage database clusters on AWS using Terraform including Aurora PostgreSQL, DocumentDB, and ElastiCache Redis clusters.

---

Managed database clusters take the operational burden of running databases off your team. AWS handles patching, backups, failover, and replication while you focus on your application. Terraform lets you define these clusters as code, making them reproducible and version-controlled. In this guide, you will learn how to create Aurora PostgreSQL, DocumentDB, and ElastiCache Redis clusters using Terraform.

## Why Managed Database Clusters

Running database clusters manually involves significant operational overhead. You need to handle replication, failover, patching, backups, and monitoring. Managed services automate all of this. With Terraform, you get the additional benefit of infrastructure as code, meaning your entire database setup is documented, reviewable, and reproducible.

## Prerequisites

Make sure you have the following ready:

- Terraform 1.0 or later
- AWS credentials with appropriate permissions
- A VPC with private subnets across multiple availability zones
- Basic understanding of Terraform HCL syntax

## Creating an Aurora PostgreSQL Cluster

Aurora is the most popular managed relational database cluster on AWS. It provides up to five times the throughput of standard PostgreSQL with built-in replication and automatic failover.

### Network Foundation

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

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Create database subnets across multiple AZs
resource "aws_subnet" "database" {
  count             = 3
  vpc_id            = data.aws_vpc.main.id
  cidr_block        = cidrsubnet(data.aws_vpc.main.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "database-subnet-${count.index + 1}"
    Tier = "database"
  }
}

# DB subnet group for Aurora
resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "Aurora Subnet Group"
  }
}

# Security group for Aurora cluster
resource "aws_security_group" "aurora" {
  name_prefix = "aurora-sg-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "PostgreSQL access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "aurora-security-group"
  }
}
```

### Aurora Cluster and Instances

```hcl
# Aurora PostgreSQL cluster
resource "aws_rds_cluster" "aurora_postgres" {
  cluster_identifier = "production-aurora-postgres"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "production"
  master_username    = "dbadmin"
  master_password    = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Storage configuration
  storage_encrypted = true
  kms_key_id        = aws_kms_key.aurora.arn

  # Backup configuration
  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "Mon:04:00-Mon:05:00"

  # Enable CloudWatch log exports
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "production-aurora-final"

  # Custom cluster parameter group
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora.name

  tags = {
    Name        = "production-aurora-postgres"
    Environment = "production"
  }
}

# Cluster parameter group
resource "aws_rds_cluster_parameter_group" "aurora" {
  family = "aurora-postgresql15"
  name   = "production-aurora-params"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

# Writer instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "aurora-postgres-writer"
  cluster_identifier = aws_rds_cluster.aurora_postgres.id
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_cluster.aurora_postgres.engine
  engine_version     = aws_rds_cluster.aurora_postgres.engine_version

  # Enable Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.aurora.arn
  performance_insights_retention_period = 7

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "aurora-postgres-writer"
    Role = "writer"
  }
}

# Reader instances for read scaling
resource "aws_rds_cluster_instance" "readers" {
  count              = 2
  identifier         = "aurora-postgres-reader-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora_postgres.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora_postgres.engine
  engine_version     = aws_rds_cluster.aurora_postgres.engine_version

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.aurora.arn

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "aurora-postgres-reader-${count.index + 1}"
    Role = "reader"
  }
}

# KMS key for encryption
resource "aws_kms_key" "aurora" {
  description             = "KMS key for Aurora cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "aurora-encryption-key"
  }
}
```

## Creating a DocumentDB Cluster

DocumentDB is a managed MongoDB-compatible document database. The Terraform configuration follows a similar pattern to Aurora.

```hcl
# Security group for DocumentDB
resource "aws_security_group" "docdb" {
  name_prefix = "docdb-sg-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "MongoDB access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# DocumentDB subnet group
resource "aws_docdb_subnet_group" "main" {
  name       = "docdb-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "DocumentDB Subnet Group"
  }
}

# DocumentDB cluster parameter group
resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb5.0"
  name   = "production-docdb-params"

  # Enable auditing
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Enable change streams for real-time data processing
  parameter {
    name  = "change_stream_log_retention_duration"
    value = "10800"  # 3 hours in seconds
  }
}

# DocumentDB cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier = "production-docdb"
  engine             = "docdb"
  engine_version     = "5.0.0"
  master_username    = "docdbadmin"
  master_password    = var.docdb_password

  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  storage_encrypted = true
  kms_key_id        = aws_kms_key.aurora.arn

  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "Mon:04:00-Mon:05:00"

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  deletion_protection   = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "production-docdb-final"

  tags = {
    Name        = "production-docdb"
    Environment = "production"
  }
}

# DocumentDB instances
resource "aws_docdb_cluster_instance" "main" {
  count              = 3
  identifier         = "production-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.r6g.large"

  tags = {
    Name = "production-docdb-${count.index + 1}"
  }
}
```

## Creating an ElastiCache Redis Cluster

ElastiCache Redis provides a managed in-memory data store for caching, session management, and real-time analytics.

```hcl
# Security group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "redis-sg-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
    description = "Redis access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "main" {
  name       = "redis-subnet-group"
  subnet_ids = aws_subnet.database[*].id
}

# Redis parameter group
resource "aws_elasticache_parameter_group" "main" {
  name   = "production-redis-params"
  family = "redis7"

  # Set maxmemory policy
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Enable keyspace notifications for pub/sub
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
}

# ElastiCache Redis replication group (cluster mode)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "production-redis"
  description          = "Production Redis cluster"

  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r6g.large"
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Cluster mode configuration
  num_node_groups         = 3    # Number of shards
  replicas_per_node_group = 2    # 2 replicas per shard for HA

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Enable automatic failover for high availability
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.aurora.arn

  # Maintenance and backup
  maintenance_window       = "Mon:04:00-Mon:05:00"
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"

  # Enable auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = {
    Name        = "production-redis"
    Environment = "production"
  }
}
```

## Outputs for Application Configuration

Export cluster endpoints so your application can connect to the databases.

```hcl
# Aurora outputs
output "aurora_cluster_endpoint" {
  description = "Aurora cluster writer endpoint"
  value       = aws_rds_cluster.aurora_postgres.endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = aws_rds_cluster.aurora_postgres.reader_endpoint
}

# DocumentDB outputs
output "docdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

# Redis outputs
output "redis_endpoint" {
  description = "Redis cluster configuration endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}
```

## Best Practices

When creating managed database clusters, follow these practices. Always encrypt data at rest and in transit. Use separate subnet groups for each database type. Enable enhanced monitoring and Performance Insights for relational databases. Set appropriate backup retention periods. Use deletion protection in production environments. Choose Graviton-based instance types for better price-performance.

## Monitoring with OneUptime

Managing multiple database clusters requires comprehensive monitoring. With [OneUptime](https://oneuptime.com), you can monitor all your database clusters from a single dashboard, tracking availability, latency, and performance across Aurora, DocumentDB, and Redis clusters.

## Conclusion

Managed database clusters on AWS eliminate the operational burden of running databases while providing high availability and scalability. Terraform makes it straightforward to define these clusters as code, ensuring consistency across environments. Whether you need a relational database with Aurora, a document store with DocumentDB, or an in-memory cache with Redis, the patterns shown in this guide give you a solid foundation for production-ready deployments.

For related topics, see our guides on [multi-AZ database deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-create-multi-az-database-deployments-with-terraform/view) and [database cost optimization](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-cost-optimization-with-terraform/view).
