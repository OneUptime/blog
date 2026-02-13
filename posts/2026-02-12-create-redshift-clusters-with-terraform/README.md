# How to Create Redshift Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Redshift, Data Warehouse, Analytics

Description: Learn how to provision and configure Amazon Redshift clusters with Terraform, including subnet groups, parameter groups, IAM roles, encryption, and snapshots.

---

Amazon Redshift is AWS's petabyte-scale data warehouse. When you need to run complex analytical queries across massive datasets, Redshift delivers the performance that regular databases just can't match. But setting up a production-ready cluster involves more than just picking a node type - you need encryption, networking, parameter tuning, snapshot schedules, and IAM roles all working together.

Terraform lets you codify all of this. Let's build a production-grade Redshift cluster from the ground up.

## VPC Networking for Redshift

Redshift clusters should live in private subnets. You'll need a subnet group that spans multiple availability zones:

```hcl
# Subnet group for the Redshift cluster
resource "aws_redshift_subnet_group" "main" {
  name       = "redshift-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for Redshift
resource "aws_security_group" "redshift" {
  name_prefix = "redshift-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redshift port from application subnets"
    from_port       = 5439
    to_port         = 5439
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
    Name = "redshift-sg"
  }
}
```

Redshift uses port 5439 by default. Only allow access from your application tier's security group - don't open it to wide CIDR ranges.

## IAM Role for Redshift

Redshift needs an IAM role to access S3 (for COPY/UNLOAD commands), Glue (for the data catalog), and other services:

```hcl
# IAM role for Redshift to access AWS services
resource "aws_iam_role" "redshift" {
  name = "redshift-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "redshift.amazonaws.com"
        }
      }
    ]
  })
}

# Allow Redshift to read from S3 data buckets
resource "aws_iam_role_policy" "redshift_s3" {
  name = "redshift-s3-access"
  role = aws_iam_role.redshift.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
        ]
        Resource = [
          "arn:aws:s3:::${var.data_bucket_name}",
          "arn:aws:s3:::${var.data_bucket_name}/*",
        ]
      }
    ]
  })
}

# Allow Redshift to use Glue Data Catalog
resource "aws_iam_role_policy_attachment" "redshift_glue" {
  role       = aws_iam_role.redshift.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRedshiftAllCommandsFullAccess"
}
```

## Parameter Group

Parameter groups let you customize Redshift's behavior. A few settings are worth changing from the defaults:

```hcl
# Custom parameter group
resource "aws_redshift_parameter_group" "main" {
  name   = "custom-redshift-params"
  family = "redshift-1.0"

  parameter {
    name  = "require_ssl"
    value = "true"
  }

  parameter {
    name  = "enable_user_activity_logging"
    value = "true"
  }

  parameter {
    name  = "max_concurrency_scaling_clusters"
    value = "3"
  }

  parameter {
    name  = "wlm_json_configuration"
    value = jsonencode([
      {
        query_group           = ["etl"]
        memory_percent_to_use = 50
        query_concurrency     = 5
        max_execution_time    = 3600000
      },
      {
        query_group           = ["analytics"]
        memory_percent_to_use = 30
        query_concurrency     = 10
      },
      {
        query_group           = ["default"]
        memory_percent_to_use = 20
        query_concurrency     = 5
      }
    ])
  }
}
```

The WLM (Workload Management) configuration is particularly important. It lets you dedicate resources to different workload types. ETL jobs get more memory but lower concurrency, while ad-hoc analytics queries get higher concurrency with less memory per query.

## The Redshift Cluster

Here's the main cluster resource with all the production settings:

```hcl
# KMS key for encryption
resource "aws_kms_key" "redshift" {
  description             = "KMS key for Redshift cluster encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# The Redshift cluster
resource "aws_redshift_cluster" "main" {
  cluster_identifier = "analytics-cluster"
  database_name      = "analytics"
  master_username    = "admin"
  master_password    = var.master_password  # store in Secrets Manager
  node_type          = "ra3.xlplus"
  number_of_nodes    = 3

  # Networking
  cluster_subnet_group_name = aws_redshift_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.redshift.id]
  publicly_accessible       = false
  port                      = 5439

  # Encryption
  encrypted  = true
  kms_key_id = aws_kms_key.redshift.arn

  # Parameter and IAM
  cluster_parameter_group_name = aws_redshift_parameter_group.main.name
  iam_roles                    = [aws_iam_role.redshift.arn]

  # Maintenance
  preferred_maintenance_window     = "sun:03:00-sun:04:00"
  automated_snapshot_retention_period = 7

  # Enhanced VPC routing forces COPY/UNLOAD through VPC
  enhanced_vpc_routing = true

  # Logging
  logging {
    enable               = true
    bucket_name          = aws_s3_bucket.redshift_logs.id
    s3_key_prefix        = "redshift-logs/"
  }

  # Prevent accidental deletion
  skip_final_snapshot       = false
  final_snapshot_identifier = "analytics-cluster-final-snapshot"

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

A few callouts on the settings:

- **ra3.xlplus** nodes separate compute from storage, so you can scale them independently. They're the recommended node type for most workloads.
- **enhanced_vpc_routing** forces all COPY and UNLOAD traffic through the VPC, giving you more control with VPC endpoints and routing.
- **skip_final_snapshot = false** ensures you get a snapshot before any `terraform destroy`.

## Snapshot Schedule

Beyond the automated daily snapshots, you might want a custom schedule:

```hcl
# Custom snapshot schedule
resource "aws_redshift_snapshot_schedule" "main" {
  identifier = "analytics-snapshot-schedule"

  definitions = [
    "rate(12 hours)",  # every 12 hours
  ]
}

resource "aws_redshift_snapshot_schedule_association" "main" {
  cluster_identifier  = aws_redshift_cluster.main.id
  schedule_identifier = aws_redshift_snapshot_schedule.main.identifier
}
```

## Redshift Serverless (Alternative)

If you don't want to manage cluster sizing, Redshift Serverless is worth considering:

```hcl
# Redshift Serverless namespace
resource "aws_redshiftserverless_namespace" "main" {
  namespace_name      = "analytics"
  db_name             = "analytics"
  admin_username      = "admin"
  admin_user_password = var.master_password
  iam_roles           = [aws_iam_role.redshift.arn]
  kms_key_id          = aws_kms_key.redshift.arn
}

# Redshift Serverless workgroup
resource "aws_redshiftserverless_workgroup" "main" {
  namespace_name = aws_redshiftserverless_namespace.main.namespace_name
  workgroup_name = "analytics-workgroup"
  base_capacity  = 32  # RPUs (Redshift Processing Units)

  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.redshift.id]

  publicly_accessible = false
}
```

Serverless automatically scales capacity based on your query workload. You pay per RPU-hour of compute used.

## Monitoring

Keep an eye on query performance and cluster health:

```hcl
# Alert on high CPU utilization
resource "aws_cloudwatch_metric_alarm" "redshift_cpu" {
  alarm_name          = "redshift-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}

# Alert on high disk usage
resource "aws_cloudwatch_metric_alarm" "redshift_disk" {
  alarm_name          = "redshift-disk-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "PercentageDiskSpaceUsed"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}
```

For broader monitoring strategies, take a look at our guide on [monitoring data infrastructure](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).

## Variables and Outputs

```hcl
variable "environment" {
  type    = string
  default = "production"
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}

variable "data_bucket_name" {
  type = string
}

output "cluster_endpoint" {
  value = aws_redshift_cluster.main.endpoint
}

output "cluster_id" {
  value = aws_redshift_cluster.main.cluster_identifier
}

output "redshift_role_arn" {
  value = aws_iam_role.redshift.arn
}
```

## Summary

With this configuration, you've got a production-grade Redshift cluster with encryption, private networking, workload management, enhanced VPC routing, and monitoring. The IAM role setup lets Redshift interact with S3 and Glue, which you'll need for loading data. Start with a smaller node count, run your workloads, and scale up when the metrics tell you to.
