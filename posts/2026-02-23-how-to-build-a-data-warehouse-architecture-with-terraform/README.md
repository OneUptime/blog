# How to Build a Data Warehouse Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Warehouse, Redshift, AWS, Infrastructure Patterns, Data Engineering

Description: Learn how to provision a complete data warehouse architecture on AWS using Terraform, including Redshift clusters, networking, ETL pipelines, and query monitoring.

---

A data warehouse brings structure and speed to your analytics workload. Unlike a data lake where you dump raw files and figure out schemas later, a data warehouse enforces schemas upfront and optimizes storage for fast analytical queries. If your business intelligence team is running complex joins across millions of rows, you need a proper warehouse.

In this guide, we will build a production-ready data warehouse on AWS using Amazon Redshift, managed entirely with Terraform. We will cover the cluster setup, networking, data loading, monitoring, and security.

## Architecture Components

Our data warehouse architecture includes:

- A Redshift cluster in a private subnet
- VPC with proper security groups
- S3 staging area for data loading
- Glue for ETL and cataloging
- CloudWatch alarms for cluster health
- IAM roles for data access

## VPC and Networking

Redshift clusters should live in private subnets. We will set up a VPC with a Redshift subnet group:

```hcl
# Dedicated subnet group for Redshift
resource "aws_redshift_subnet_group" "main" {
  name       = "${var.project_name}-redshift-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-redshift-subnets"
  }
}

# Security group allowing only internal access
resource "aws_security_group" "redshift" {
  name_prefix = "${var.project_name}-redshift-"
  vpc_id      = var.vpc_id

  # Allow access from application subnets
  ingress {
    from_port       = 5439
    to_port         = 5439
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "Redshift access from application tier"
  }

  # Allow access from BI tools in the VPN
  ingress {
    from_port   = 5439
    to_port     = 5439
    protocol    = "tcp"
    cidr_blocks = [var.vpn_cidr]
    description = "Redshift access from VPN"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Redshift Cluster

Here is the core cluster configuration. We use RA3 nodes which separate compute from storage:

```hcl
# KMS key for encrypting the cluster
resource "aws_kms_key" "redshift" {
  description             = "KMS key for Redshift cluster encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Parameter group for tuning
resource "aws_redshift_parameter_group" "main" {
  name   = "${var.project_name}-params"
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
}

# The Redshift cluster itself
resource "aws_redshift_cluster" "main" {
  cluster_identifier = "${var.project_name}-warehouse"
  database_name      = var.database_name
  master_username    = var.master_username
  master_password    = var.master_password # Use secrets manager in practice
  node_type          = "ra3.xlplus"
  number_of_nodes    = var.number_of_nodes

  cluster_subnet_group_name  = aws_redshift_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.redshift.id]
  cluster_parameter_group_name = aws_redshift_parameter_group.main.name

  # Encryption at rest
  encrypted  = true
  kms_key_id = aws_kms_key.redshift.arn

  # Automated snapshots
  automated_snapshot_retention_period = 7
  preferred_maintenance_window       = "sun:03:00-sun:04:00"

  # Allow Redshift to access S3 for COPY commands
  iam_roles = [aws_iam_role.redshift.arn]

  # Enhanced VPC routing forces traffic through the VPC
  enhanced_vpc_routing = true

  # Logging
  logging {
    enable        = true
    bucket_name   = aws_s3_bucket.redshift_logs.id
    s3_key_prefix = "redshift-logs/"
  }

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot"

  tags = {
    Environment = var.environment
  }
}
```

## IAM Role for Data Loading

Redshift needs an IAM role to read data from S3 and interact with Glue:

```hcl
resource "aws_iam_role" "redshift" {
  name = "${var.project_name}-redshift-role"

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

# Allow Redshift to read from staging bucket
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
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.staging.arn,
          "${aws_s3_bucket.staging.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetDatabase"
        ]
        Resource = ["*"]
      }
    ]
  })
}
```

## Staging Area

Data flows into the warehouse through a staging S3 bucket. ETL jobs land files here, and Redshift COPY commands load them:

```hcl
resource "aws_s3_bucket" "staging" {
  bucket = "${var.project_name}-warehouse-staging-${var.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "staging" {
  bucket = aws_s3_bucket.staging.id

  rule {
    id     = "clean-up-staging"
    status = "Enabled"

    # Delete staging files after 7 days
    expiration {
      days = 7
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "staging" {
  bucket = aws_s3_bucket.staging.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.redshift.arn
    }
  }
}
```

## Scheduled Data Loading with Glue

Use Glue jobs to extract data from source systems and load it into the staging area:

```hcl
resource "aws_glue_job" "load_warehouse" {
  name     = "${var.project_name}-load-warehouse"
  role_arn = aws_iam_role.glue.arn

  command {
    script_location = "s3://${aws_s3_bucket.scripts.id}/etl/load_warehouse.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"        = "python"
    "--job-bookmark-option" = "job-bookmark-enable"
    "--redshift_connection" = aws_glue_connection.redshift.name
    "--staging_bucket"      = aws_s3_bucket.staging.id
    "--database_name"       = var.database_name
  }

  connections = [aws_glue_connection.redshift.name]

  glue_version      = "4.0"
  number_of_workers = 5
  worker_type       = "G.1X"
  timeout           = 60
}

# JDBC connection for Glue to reach Redshift
resource "aws_glue_connection" "redshift" {
  name = "${var.project_name}-redshift-connection"

  connection_properties = {
    JDBC_CONNECTION_URL = "jdbc:redshift://${aws_redshift_cluster.main.endpoint}/${var.database_name}"
    USERNAME            = var.master_username
    PASSWORD            = var.master_password
  }

  physical_connection_requirements {
    availability_zone      = var.availability_zone
    security_group_id_list = [aws_security_group.redshift.id]
    subnet_id              = var.private_subnet_ids[0]
  }
}
```

## Monitoring and Alarms

Keep an eye on cluster health with CloudWatch alarms:

```hcl
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-redshift-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redshift CPU utilization is above 80%"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_usage" {
  alarm_name          = "${var.project_name}-redshift-disk-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "PercentageDiskSpaceUsed"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redshift disk usage above 75%"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}
```

## Redshift Spectrum for Data Lake Integration

If you also have a [data lake](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-data-lake-architecture-with-terraform/view), Redshift Spectrum lets you query data in S3 directly from Redshift without loading it first:

```hcl
# External schema pointing to the Glue data catalog
resource "aws_redshift_cluster_iam_roles" "spectrum" {
  cluster_identifier = aws_redshift_cluster.main.cluster_identifier
  iam_role_arns      = [aws_iam_role.redshift.arn]
}
```

Then from Redshift SQL, you can create an external schema that references your Glue catalog and query raw S3 data alongside your warehouse tables.

## Wrapping Up

A Terraform-managed data warehouse gives you consistent, repeatable infrastructure that your data engineering team can iterate on safely. The configuration we covered handles encryption, networking, monitoring, and data loading. As your analytical needs grow, you can scale the cluster, add concurrency scaling, or layer on Redshift Spectrum to query your data lake directly. The key is to start with good foundations and let Terraform handle the heavy lifting.
