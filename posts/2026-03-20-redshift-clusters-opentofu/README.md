# How to Deploy Redshift Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Redshift, Data Warehouse, Analytics, Infrastructure as Code, Data Engineering

Description: Learn how to deploy Amazon Redshift clusters using OpenTofu with proper VPC networking, encryption, parameter groups, and snapshot configuration for production data warehouses.

---

Amazon Redshift is AWS's fully managed data warehouse optimized for complex analytics queries over large datasets. With OpenTofu, you can define your Redshift cluster configuration as code, ensuring consistent deployments and easy disaster recovery.

## Network Configuration

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Subnet group for Redshift in a VPC
resource "aws_redshift_subnet_group" "main" {
  name       = "${var.cluster_name}-subnet-group"
  subnet_ids = var.private_subnet_ids
  description = "Subnet group for ${var.cluster_name} Redshift cluster"

  tags = var.common_tags
}

# Security group for Redshift
resource "aws_security_group" "redshift" {
  name        = "${var.cluster_name}-redshift-sg"
  description = "Security group for Redshift cluster"
  vpc_id      = var.vpc_id

  # Allow connections from the application security group on port 5439
  ingress {
    from_port       = 5439
    to_port         = 5439
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.common_tags
}
```

## Parameter Group Configuration

```hcl
# parameter_group.tf
resource "aws_redshift_parameter_group" "main" {
  name        = "${var.cluster_name}-params"
  family      = "redshift-1.0"
  description = "Custom parameter group for ${var.cluster_name}"

  parameter {
    name  = "enable_user_activity_logging"
    value = "true"  # Enable for compliance and debugging
  }

  parameter {
    name  = "require_ssl"
    value = "true"  # Require SSL connections
  }

  parameter {
    name  = "wlm_json_configuration"
    # Configure workload management - separate queues for ETL and reporting
    value = jsonencode([
      {
        name                  = "ETL Queue"
        user_group            = ["etl_users"]
        query_group           = ["etl"]
        queue_type            = "manual"
        memory_percent_to_use = 40
        query_concurrency     = 5
        concurrency_scaling   = "auto"
        rules = [
          {
            rule_name = "etl_query_timeout"
            predicate = [
              {
                metric_name = "query_execution_time"
                operator    = ">"
                value       = 3600  # 1 hour max
              }
            ]
            action = "abort"
          }
        ]
      },
      {
        name                  = "Reporting Queue"
        user_group            = ["reporting_users"]
        query_group           = ["reporting"]
        queue_type            = "manual"
        memory_percent_to_use = 40
        query_concurrency     = 10
      },
      {
        name                  = "Default Queue"
        queue_type            = "manual"
        memory_percent_to_use = 20
        query_concurrency     = 5
      }
    ])
  }
}
```

## Creating the Cluster

```hcl
# cluster.tf
resource "aws_redshift_cluster" "main" {
  cluster_identifier = var.cluster_name
  database_name      = var.database_name
  master_username    = var.master_username
  master_password    = var.master_password

  node_type       = var.node_type        # e.g., ra3.xlplus, ra3.4xlarge
  cluster_type    = "multi-node"
  number_of_nodes = var.number_of_nodes  # Required for multi-node clusters

  # Networking
  cluster_subnet_group_name  = aws_redshift_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.redshift.id]
  publicly_accessible        = false  # Keep private

  # Encryption
  encrypted = true
  kms_key_id = aws_kms_key.redshift.arn

  # Parameter group
  cluster_parameter_group_name = aws_redshift_parameter_group.main.name

  # Automated snapshots - keep for 7 days
  automated_snapshot_retention_period = 7
  preferred_maintenance_window        = "sun:05:00-sun:06:00"

  # Enable enhanced VPC routing - COPY and UNLOAD traffic stays in the VPC
  enhanced_vpc_routing = true

  # Skip final snapshot for dev; change for production
  skip_final_snapshot = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.cluster_name}-final-snapshot" : null

  tags = var.common_tags
}

resource "aws_redshift_logging" "main" {
  cluster_identifier   = aws_redshift_cluster.main.cluster_identifier
  log_destination_type = "s3"
  bucket_name          = aws_s3_bucket.redshift_logs.bucket
  s3_key_prefix        = "redshift-logs/"
}

resource "aws_kms_key" "redshift" {
  description             = "KMS key for Redshift cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}
```

## Best Practices

- Use RA3 node types for new deployments - they let you scale compute independently from managed storage.
- Keep `require_ssl=true` in the parameter group to prevent unencrypted connections.
- Set up Workload Management (WLM) queues to separate ETL jobs from interactive reporting queries.
- Enable `enhanced_vpc_routing` to keep COPY and UNLOAD operations within your VPC.
- Set `automated_snapshot_retention_period` to at least 7 days and create manual snapshots before major schema changes.
