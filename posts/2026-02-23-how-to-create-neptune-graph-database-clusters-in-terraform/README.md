# How to Create Neptune Graph Database Clusters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Neptune, Graph Database, Database, Infrastructure as Code

Description: Learn how to create and configure Amazon Neptune graph database clusters using Terraform for building knowledge graphs, fraud detection, and social networks.

---

Amazon Neptune is a fully managed graph database service that supports both the Property Graph model with Apache TinkerPop Gremlin and the RDF model with SPARQL. It is designed for use cases like social networking, recommendation engines, fraud detection, and knowledge graphs where relationships between data points are as important as the data itself. In this guide, we will walk through how to create Neptune clusters using Terraform.

## Understanding Neptune Architecture

Neptune follows a similar architecture to Amazon Aurora. A Neptune cluster consists of a primary DB instance that handles read and write operations, up to 15 read replica instances, and a cluster storage volume that automatically replicates data six ways across three availability zones. The storage automatically grows as your data increases, up to 128 TB.

Neptune supports two query languages: Gremlin for property graph traversals and SPARQL for RDF graph queries. You choose your query language based on your data model, but both can be used on the same cluster.

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

# VPC for Neptune
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "neptune-vpc"
  }
}

# Subnets across multiple AZs
resource "aws_subnet" "neptune_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "neptune-subnet-a" }
}

resource "aws_subnet" "neptune_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  tags = { Name = "neptune-subnet-b" }
}

# Subnet group for Neptune
resource "aws_neptune_subnet_group" "neptune_subnets" {
  name       = "neptune-subnet-group"
  subnet_ids = [
    aws_subnet.neptune_a.id,
    aws_subnet.neptune_b.id,
  ]

  tags = {
    Environment = "production"
  }
}

# Security group for Neptune
resource "aws_security_group" "neptune_sg" {
  name_prefix = "neptune-"
  vpc_id      = aws_vpc.main.id

  # Neptune uses port 8182
  ingress {
    from_port   = 8182
    to_port     = 8182
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Neptune access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "neptune-security-group"
  }
}
```

## Creating a Basic Neptune Cluster

```hcl
# Neptune cluster
resource "aws_neptune_cluster" "main" {
  cluster_identifier = "app-neptune-cluster"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # Network configuration
  neptune_subnet_group_name = aws_neptune_subnet_group.neptune_subnets.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]

  # Backup configuration
  backup_retention_period      = 7
  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "sun:05:00-sun:06:00"

  # Security
  storage_encrypted = true
  kms_key_arn       = aws_kms_key.neptune_key.arn

  # IAM authentication
  iam_database_authentication_enabled = true

  # Protection
  deletion_protection   = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "app-neptune-final"

  # Logging
  enable_cloudwatch_logs_exports = ["audit"]

  # Apply custom parameter group
  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.custom.name

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# KMS key for Neptune encryption
resource "aws_kms_key" "neptune_key" {
  description             = "KMS key for Neptune encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = "production"
  }
}
```

## Adding Neptune Instances

```hcl
# Primary instance
resource "aws_neptune_cluster_instance" "primary" {
  identifier         = "app-neptune-instance-1"
  cluster_identifier = aws_neptune_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "neptune"

  neptune_parameter_group_name = aws_neptune_parameter_group.instance_params.name
  auto_minor_version_upgrade   = true

  tags = {
    Environment = "production"
    Role        = "primary"
  }
}

# Read replica instances
resource "aws_neptune_cluster_instance" "replicas" {
  count = 2

  identifier         = "app-neptune-instance-${count.index + 2}"
  cluster_identifier = aws_neptune_cluster.main.id
  instance_class     = "db.r6g.large"
  engine             = "neptune"

  neptune_parameter_group_name = aws_neptune_parameter_group.instance_params.name
  auto_minor_version_upgrade   = true

  tags = {
    Environment = "production"
    Role        = "replica"
  }
}
```

## Configuring Parameter Groups

Neptune offers both cluster-level and instance-level parameter groups:

```hcl
# Cluster parameter group
resource "aws_neptune_cluster_parameter_group" "custom" {
  family      = "neptune1.3"
  name        = "custom-neptune-cluster-params"
  description = "Custom Neptune cluster parameters"

  # Enable audit logging
  parameter {
    name  = "neptune_enable_audit_log"
    value = "1"
  }

  # Configure query timeout (in milliseconds)
  parameter {
    name  = "neptune_query_timeout"
    value = "120000"  # 2 minutes
  }

  tags = {
    Environment = "production"
  }
}

# Instance parameter group
resource "aws_neptune_parameter_group" "instance_params" {
  family      = "neptune1.3"
  name        = "custom-neptune-instance-params"
  description = "Custom Neptune instance parameters"

  # Configure slow query logging threshold
  parameter {
    name  = "neptune_query_timeout"
    value = "120000"
  }

  tags = {
    Environment = "production"
  }
}
```

## Using Neptune Serverless

Neptune Serverless automatically scales capacity based on your workload, similar to Aurora Serverless:

```hcl
# Neptune Serverless cluster
resource "aws_neptune_cluster" "serverless" {
  cluster_identifier = "neptune-serverless"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  neptune_subnet_group_name = aws_neptune_subnet_group.neptune_subnets.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]

  # Enable serverless scaling
  serverless_v2_scaling_configuration {
    min_capacity = 2.5  # Minimum Neptune Capacity Units (NCUs)
    max_capacity = 128  # Maximum NCUs
  }

  storage_encrypted   = true
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "neptune-serverless-final"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Serverless instance
resource "aws_neptune_cluster_instance" "serverless_instance" {
  identifier         = "neptune-serverless-instance-1"
  cluster_identifier = aws_neptune_cluster.serverless.id
  instance_class     = "db.serverless"  # Use the serverless instance class
  engine             = "neptune"

  tags = {
    Environment = "production"
  }
}
```

## Setting Up Neptune Notebooks

Neptune provides Jupyter notebook integration for interactive graph exploration:

```hcl
# IAM role for Neptune notebook
resource "aws_iam_role" "neptune_notebook_role" {
  name = "neptune-notebook-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "neptune_notebook_policy" {
  role       = aws_iam_role.neptune_notebook_role.name
  policy_arn = "arn:aws:iam::aws:policy/NeptuneNotebookPolicy"
}
```

## Loading Data into Neptune

You can configure Neptune to load data from S3 using an IAM role:

```hcl
# IAM role for Neptune to access S3
resource "aws_iam_role" "neptune_s3_role" {
  name = "neptune-s3-access-role"

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

resource "aws_iam_role_policy" "neptune_s3_policy" {
  name = "neptune-s3-policy"
  role = aws_iam_role.neptune_s3_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:Get*",
          "s3:List*"
        ]
        Resource = [
          "arn:aws:s3:::my-neptune-data-bucket",
          "arn:aws:s3:::my-neptune-data-bucket/*"
        ]
      }
    ]
  })
}

# Associate the IAM role with Neptune cluster
resource "aws_neptune_cluster" "with_s3_access" {
  cluster_identifier        = "neptune-with-s3"
  engine                    = "neptune"
  engine_version            = "1.3.1.0"
  neptune_subnet_group_name = aws_neptune_subnet_group.neptune_subnets.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]
  storage_encrypted         = true
  skip_final_snapshot       = true

  # Associate IAM roles for S3 data loading
  iam_roles = [aws_iam_role.neptune_s3_role.arn]

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Outputs

```hcl
# Connection endpoints
output "neptune_cluster_endpoint" {
  description = "Neptune cluster endpoint for write operations"
  value       = aws_neptune_cluster.main.endpoint
}

output "neptune_reader_endpoint" {
  description = "Neptune reader endpoint for read operations"
  value       = aws_neptune_cluster.main.reader_endpoint
}

output "neptune_port" {
  description = "Neptune port"
  value       = aws_neptune_cluster.main.port
}

# Gremlin endpoints
output "gremlin_endpoint" {
  description = "Gremlin WebSocket endpoint"
  value       = "wss://${aws_neptune_cluster.main.endpoint}:${aws_neptune_cluster.main.port}/gremlin"
}

# SPARQL endpoint
output "sparql_endpoint" {
  description = "SPARQL HTTP endpoint"
  value       = "https://${aws_neptune_cluster.main.endpoint}:${aws_neptune_cluster.main.port}/sparql"
}
```

## Monitoring Neptune

```hcl
# Monitor Gremlin query errors
resource "aws_cloudwatch_metric_alarm" "neptune_errors" {
  alarm_name          = "neptune-gremlin-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "GremlinErrors"
  namespace           = "AWS/Neptune"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    DBClusterIdentifier = aws_neptune_cluster.main.cluster_identifier
  }

  alarm_actions = [aws_sns_topic.neptune_alerts.arn]
}

resource "aws_sns_topic" "neptune_alerts" {
  name = "neptune-alerts"
}
```

For comprehensive graph database monitoring, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track query performance, connection counts, and storage usage across your Neptune clusters.

## Best Practices

Deploy at least two instances (one primary and one replica) for production. Use Neptune Serverless for variable or unpredictable workloads. Enable IAM database authentication for fine-grained access control. Use audit logs to track database activity. Design your graph data model carefully before loading large datasets. Test query performance with representative data volumes. Enable encryption at rest and configure VPC endpoints for private connectivity.

## Conclusion

Amazon Neptune provides a purpose-built graph database that excels at relationship-heavy workloads. With Terraform, you can define your Neptune infrastructure as code, from the cluster and instances to parameter groups and security configurations. Whether you are building a recommendation engine, a knowledge graph, or a fraud detection system, Neptune with Terraform gives you a reliable foundation for graph database workloads.
