# How to Create Neptune Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Neptune, Graph Database, Database

Description: A practical guide to deploying Amazon Neptune graph database clusters with Terraform, covering cluster configuration, instances, networking, and backup settings.

---

Amazon Neptune is AWS's fully managed graph database service. If you're building applications that deal with highly connected data - think social networks, fraud detection, recommendation engines, or knowledge graphs - Neptune gives you a purpose-built engine that supports both Gremlin and SPARQL query languages. Setting up a Neptune cluster with Terraform means you can spin up identical graph database environments across staging, testing, and production without manual work.

Let's go through the entire setup.

## Networking Prerequisites

Neptune clusters must live in a VPC. They need a DB subnet group spanning at least two availability zones, and the security group needs to allow traffic on Neptune's default port (8182):

```hcl
# DB subnet group for Neptune
resource "aws_neptune_subnet_group" "main" {
  name       = "neptune-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "neptune-subnet-group"
    Environment = var.environment
  }
}

# Security group for Neptune
resource "aws_security_group" "neptune" {
  name_prefix = "neptune-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Neptune from application layer"
    from_port       = 8182
    to_port         = 8182
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "neptune-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Parameter Group

Neptune has cluster-level and instance-level parameter groups. The cluster parameter group controls the engine behavior:

```hcl
# Cluster parameter group
resource "aws_neptune_cluster_parameter_group" "main" {
  family      = "neptune1.3"
  name        = "custom-neptune-cluster-params"
  description = "Custom Neptune cluster parameter group"

  # Enable audit logging
  parameter {
    name  = "neptune_enable_audit_log"
    value = "1"
  }

  # Set query timeout to 2 minutes
  parameter {
    name  = "neptune_query_timeout"
    value = "120000"
  }

  tags = {
    Environment = var.environment
  }
}

# Instance parameter group
resource "aws_neptune_parameter_group" "main" {
  family      = "neptune1.3"
  name        = "custom-neptune-instance-params"
  description = "Custom Neptune instance parameter group"

  parameter {
    name  = "neptune_query_timeout"
    value = "120000"
  }
}
```

## IAM Role for Neptune

Neptune needs an IAM role to load data from S3 and access other AWS services:

```hcl
# IAM role for Neptune
resource "aws_iam_role" "neptune" {
  name = "neptune-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

# S3 access for bulk loading data
resource "aws_iam_role_policy" "neptune_s3" {
  name = "neptune-s3-read"
  role = aws_iam_role.neptune.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::${var.data_bucket}",
          "arn:aws:s3:::${var.data_bucket}/*",
        ]
      }
    ]
  })
}
```

## The Neptune Cluster

Now for the main event - the cluster itself:

```hcl
# KMS key for encryption at rest
resource "aws_kms_key" "neptune" {
  description             = "KMS key for Neptune encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Neptune cluster
resource "aws_neptune_cluster" "main" {
  cluster_identifier = "graph-db-cluster"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # Networking
  neptune_subnet_group_name = aws_neptune_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.neptune.id]
  port                      = 8182

  # IAM and parameters
  iam_roles                         = [aws_iam_role.neptune.arn]
  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.main.name

  # Encryption
  storage_encrypted = true
  kms_key_arn       = aws_kms_key.neptune.arn

  # Authentication
  iam_database_authentication_enabled = true

  # Backup
  backup_retention_period      = 7
  preferred_backup_window      = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  # Deletion protection
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "graph-db-final-snapshot"

  # Enable CloudWatch log exports
  enable_cloudwatch_logs_exports = ["audit"]

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

Key settings to note:

- **iam_database_authentication_enabled** lets you use IAM credentials instead of passwords, which is the recommended approach
- **enable_cloudwatch_logs_exports** sends audit logs to CloudWatch for monitoring and compliance
- **deletion_protection** prevents accidental cluster deletion

## Cluster Instances

The cluster itself doesn't serve traffic - you need instances. One writer and at least one reader for high availability:

```hcl
# Writer instance
resource "aws_neptune_cluster_instance" "writer" {
  identifier         = "graph-db-writer"
  cluster_identifier = aws_neptune_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "neptune"

  neptune_parameter_group_name = aws_neptune_parameter_group.main.name

  # Enable performance insights
  auto_minor_version_upgrade = true

  tags = {
    Name = "neptune-writer"
    Role = "writer"
  }
}

# Reader instances
resource "aws_neptune_cluster_instance" "readers" {
  count              = var.reader_count
  identifier         = "graph-db-reader-${count.index}"
  cluster_identifier = aws_neptune_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "neptune"

  neptune_parameter_group_name = aws_neptune_parameter_group.main.name

  auto_minor_version_upgrade = true

  tags = {
    Name = "neptune-reader-${count.index}"
    Role = "reader"
  }
}
```

The `db.r6g.large` instance class is a good starting point for most workloads. Memory-optimized instances are important for graph databases since Neptune keeps frequently accessed graph structures in memory.

## Neptune Serverless

If your workload has variable usage patterns, Neptune Serverless scales capacity automatically:

```hcl
# Neptune Serverless cluster
resource "aws_neptune_cluster" "serverless" {
  cluster_identifier = "graph-db-serverless"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  neptune_subnet_group_name = aws_neptune_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.neptune.id]

  storage_encrypted = true
  kms_key_arn       = aws_kms_key.neptune.arn

  serverless_v2_scaling_configuration {
    min_capacity = 2.5  # minimum NCUs
    max_capacity = 128  # maximum NCUs
  }

  tags = {
    Environment = var.environment
  }
}

# Serverless instance
resource "aws_neptune_cluster_instance" "serverless" {
  identifier         = "graph-db-serverless-instance"
  cluster_identifier = aws_neptune_cluster.serverless.id
  instance_class     = "db.serverless"
  engine             = "neptune"
}
```

NCUs (Neptune Capacity Units) scale between your min and max based on workload demand.

## Event Subscription

Get notified about important cluster events:

```hcl
# SNS topic for Neptune events
resource "aws_sns_topic" "neptune_events" {
  name = "neptune-events"
}

# Event subscription
resource "aws_neptune_event_subscription" "main" {
  name          = "neptune-cluster-events"
  sns_topic_arn = aws_sns_topic.neptune_events.arn

  source_type = "db-cluster"
  source_ids  = [aws_neptune_cluster.main.id]

  event_categories = [
    "failover",
    "failure",
    "maintenance",
    "notification",
  ]
}
```

## Variables and Outputs

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}

variable "app_security_group_id" {
  type = string
}

variable "reader_count" {
  type    = number
  default = 1
}

variable "data_bucket" {
  type = string
}

output "cluster_endpoint" {
  description = "Writer endpoint"
  value       = aws_neptune_cluster.main.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint (load balanced)"
  value       = aws_neptune_cluster.main.reader_endpoint
}

output "cluster_port" {
  value = aws_neptune_cluster.main.port
}
```

## Loading Data

Once the cluster is running, you can bulk load data from S3 using the Neptune loader API. The IAM role we created earlier handles the S3 access. Create CSV or JSON files in the Neptune format, upload them to S3, and trigger the loader through the cluster endpoint.

For monitoring the health of your Neptune cluster and query performance, see our post on [monitoring database infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).

## Summary

You now have a fully configured Neptune cluster with encryption, IAM authentication, audit logging, and high availability across multiple instances. The graph database is ready for Gremlin or SPARQL queries. Start with provisioned instances if you have predictable workloads, or go serverless if your usage varies significantly throughout the day.
