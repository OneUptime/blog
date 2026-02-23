# How to Create DocumentDB Clusters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DocumentDB, MongoDB, Database, Infrastructure as Code

Description: Learn how to create and configure Amazon DocumentDB clusters using Terraform for scalable, MongoDB-compatible document database workloads.

---

Amazon DocumentDB is a fully managed document database service that is compatible with MongoDB workloads. It provides the scalability and durability you expect from AWS while supporting the MongoDB API, so you can use existing MongoDB drivers and tools. In this guide, we will walk through how to create and configure DocumentDB clusters using Terraform, covering everything from basic setup to production-ready configurations.

## Understanding DocumentDB Architecture

DocumentDB uses a cluster-based architecture. A cluster consists of a cluster endpoint, one or more instances, and a storage volume. The storage volume spans multiple availability zones and automatically replicates data six ways across three AZs. This architecture separates compute from storage, allowing you to scale each independently.

A cluster has one primary instance that handles read and write operations, and up to 15 read replica instances that handle read traffic. If the primary instance fails, DocumentDB automatically promotes a replica to become the new primary.

## Setting Up the Provider and Networking

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

provider "aws" {
  region = "us-east-1"
}

# VPC for the DocumentDB cluster
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "docdb-vpc"
  }
}

# Subnets in multiple AZs
resource "aws_subnet" "docdb_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "docdb-subnet-a" }
}

resource "aws_subnet" "docdb_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  tags = { Name = "docdb-subnet-b" }
}

resource "aws_subnet" "docdb_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1c"
  tags = { Name = "docdb-subnet-c" }
}

# Subnet group for DocumentDB
resource "aws_docdb_subnet_group" "docdb_subnets" {
  name       = "docdb-subnet-group"
  subnet_ids = [
    aws_subnet.docdb_a.id,
    aws_subnet.docdb_b.id,
    aws_subnet.docdb_c.id,
  ]

  tags = {
    Environment = "production"
  }
}

# Security group for DocumentDB
resource "aws_security_group" "docdb_sg" {
  name_prefix = "docdb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "DocumentDB access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "docdb-security-group"
  }
}
```

## Creating a Basic DocumentDB Cluster

```hcl
# DocumentDB cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier = "app-docdb-cluster"
  engine             = "docdb"
  engine_version     = "5.0.0"

  # Authentication
  master_username = "docdbadmin"
  master_password = var.docdb_master_password

  # Network configuration
  db_subnet_group_name   = aws_docdb_subnet_group.docdb_subnets.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]

  # Backup configuration
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"

  # Maintenance
  preferred_maintenance_window = "sun:05:00-sun:06:00"

  # Security
  storage_encrypted = true
  kms_key_id        = aws_kms_key.docdb_key.arn

  # Protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "app-docdb-final-snapshot"

  # Logging
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# KMS key for encryption
resource "aws_kms_key" "docdb_key" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
  }
}

# Master password variable
variable "docdb_master_password" {
  description = "Master password for DocumentDB"
  type        = string
  sensitive   = true
}
```

## Adding Cluster Instances

The cluster itself does not process queries. You need to add instances to the cluster:

```hcl
# Primary instance
resource "aws_docdb_cluster_instance" "primary" {
  identifier         = "app-docdb-instance-1"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "docdb"

  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
    Role        = "primary"
  }
}

# Replica instances
resource "aws_docdb_cluster_instance" "replicas" {
  count = 2  # Create 2 read replicas

  identifier         = "app-docdb-instance-${count.index + 2}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "docdb"

  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
    Role        = "replica"
  }
}
```

## Configuring a Custom Parameter Group

DocumentDB parameter groups let you customize the database engine behavior:

```hcl
# Custom cluster parameter group
resource "aws_docdb_cluster_parameter_group" "custom_params" {
  family      = "docdb5.0"
  name        = "custom-docdb-params"
  description = "Custom parameters for DocumentDB"

  # Enable audit logging
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  # Set profiler threshold (log slow queries)
  parameter {
    name  = "profiler"
    value = "enabled"
  }

  parameter {
    name  = "profiler_threshold_ms"
    value = "100"  # Log queries slower than 100ms
  }

  # Enable TTL monitoring
  parameter {
    name  = "ttl_monitor"
    value = "enabled"
  }

  # Configure TLS
  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Environment = "production"
  }
}

# Update the cluster to use the custom parameter group
resource "aws_docdb_cluster" "main_with_params" {
  cluster_identifier              = "app-docdb-custom"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = "docdbadmin"
  master_password                 = var.docdb_master_password
  db_subnet_group_name            = aws_docdb_subnet_group.docdb_subnets.name
  vpc_security_group_ids          = [aws_security_group.docdb_sg.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.custom_params.name
  storage_encrypted               = true
  deletion_protection             = true
  skip_final_snapshot             = false
  final_snapshot_identifier       = "app-docdb-custom-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Using a Terraform Module for Reusability

```hcl
# modules/documentdb/variables.tf
variable "cluster_name" {
  description = "Name of the DocumentDB cluster"
  type        = string
}

variable "instance_class" {
  description = "Instance class for DocumentDB instances"
  type        = string
  default     = "db.r6g.large"
}

variable "instance_count" {
  description = "Number of instances (1 primary + N-1 replicas)"
  type        = number
  default     = 3
}

variable "master_username" {
  description = "Master username"
  type        = string
  default     = "docdbadmin"
}

variable "master_password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "vpc_security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "subnet_group_name" {
  description = "Name of the DB subnet group"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}
```

```hcl
# modules/documentdb/main.tf
resource "aws_docdb_cluster" "cluster" {
  cluster_identifier      = var.cluster_name
  engine                  = "docdb"
  engine_version          = "5.0.0"
  master_username         = var.master_username
  master_password         = var.master_password
  db_subnet_group_name    = var.subnet_group_name
  vpc_security_group_ids  = var.vpc_security_group_ids
  storage_encrypted       = true
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
  backup_retention_period = var.environment == "production" ? 7 : 1

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_docdb_cluster_instance" "instances" {
  count              = var.instance_count
  identifier         = "${var.cluster_name}-instance-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.cluster.id
  instance_class     = var.instance_class
  engine             = "docdb"

  tags = {
    Environment = var.environment
  }
}
```

```hcl
# modules/documentdb/outputs.tf
output "cluster_endpoint" {
  description = "Cluster endpoint for write operations"
  value       = aws_docdb_cluster.cluster.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for read operations"
  value       = aws_docdb_cluster.cluster.reader_endpoint
}

output "cluster_port" {
  value = aws_docdb_cluster.cluster.port
}
```

## Outputs for Application Connection

```hcl
# Connection information
output "docdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "docdb_reader_endpoint" {
  description = "DocumentDB reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "docdb_port" {
  description = "DocumentDB port"
  value       = aws_docdb_cluster.main.port
}

# Connection string (without password)
output "connection_string" {
  description = "MongoDB-compatible connection string"
  value       = "mongodb://${aws_docdb_cluster.main.master_username}:<password>@${aws_docdb_cluster.main.endpoint}:${aws_docdb_cluster.main.port}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred"
}
```

## Monitoring

For monitoring your DocumentDB clusters, set up CloudWatch alarms for key metrics:

```hcl
# Monitor CPU utilization
resource "aws_cloudwatch_metric_alarm" "docdb_cpu" {
  alarm_name          = "docdb-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.docdb_alerts.arn]
}

resource "aws_sns_topic" "docdb_alerts" {
  name = "docdb-alerts"
}
```

For comprehensive monitoring across all your database clusters, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides unified dashboards that track DocumentDB performance alongside your other infrastructure.

## Best Practices

Always deploy at least three instances (one primary, two replicas) across different availability zones for production. Enable encryption at rest and in transit. Use audit logging to track database access. Set up proper backup retention and test your restore process. Use parameter groups to tune performance settings like the profiler threshold. Enable deletion protection on production clusters to prevent accidental deletion.

## Conclusion

DocumentDB gives you a fully managed, MongoDB-compatible document database on AWS. With Terraform, you can define your entire DocumentDB infrastructure as code, making it repeatable and version-controlled. Start with the basic cluster setup and add features like custom parameter groups, enhanced monitoring, and multiple replicas as your workload demands grow.
