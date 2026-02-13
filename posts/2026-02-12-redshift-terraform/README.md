# How to Set Up Redshift with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Terraform, Infrastructure as Code

Description: A complete guide to provisioning Amazon Redshift with Terraform, including cluster configuration, networking, IAM roles, monitoring, and production-ready best practices.

---

Clicking through the AWS console to set up Redshift works for a quick test, but for anything you plan to keep running, you want infrastructure as code. Terraform is the standard tool for this, and Redshift has solid Terraform provider support.

This guide walks through a production-ready Redshift setup in Terraform, from VPC networking to cluster creation to monitoring. Everything will be version-controlled and reproducible.

## Project Structure

Here's how I organize Redshift Terraform files.

```
redshift-infra/
  main.tf          # Provider and backend configuration
  variables.tf     # Input variables
  network.tf       # VPC, subnets, security groups
  iam.tf           # IAM roles and policies
  redshift.tf      # Redshift cluster and parameter groups
  monitoring.tf    # CloudWatch alarms
  outputs.tf       # Output values
  terraform.tfvars # Variable values (don't commit secrets)
```

## Provider and Backend Configuration

Start with the provider setup and a remote backend for state management.

```hcl
# main.tf - provider and backend configuration
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "redshift/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Variables

Define all configurable parameters.

```hcl
# variables.tf - input variables for the Redshift configuration
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "cluster_identifier" {
  description = "Identifier for the Redshift cluster"
  type        = string
  default     = "analytics-warehouse"
}

variable "node_type" {
  description = "Redshift node type"
  type        = string
  default     = "ra3.xlplus"
}

variable "number_of_nodes" {
  description = "Number of nodes in the cluster"
  type        = number
  default     = 2
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "warehouse"
}

variable "master_username" {
  description = "Master username for the cluster"
  type        = string
  default     = "admin"
}

variable "master_password" {
  description = "Master password for the cluster"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to Redshift"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}
```

## Networking

Set up the VPC, subnets, and security groups.

```hcl
# network.tf - VPC and networking for Redshift

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "redshift" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.cluster_identifier}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "redshift" {
  count             = 2
  vpc_id            = aws_vpc.redshift.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "${var.cluster_identifier}-subnet-${count.index}"
    Environment = var.environment
  }
}

resource "aws_redshift_subnet_group" "main" {
  name       = "${var.cluster_identifier}-subnet-group"
  subnet_ids = aws_subnet.redshift[*].id

  tags = {
    Name        = "${var.cluster_identifier}-subnet-group"
    Environment = var.environment
  }
}

resource "aws_security_group" "redshift" {
  name_prefix = "${var.cluster_identifier}-sg"
  vpc_id      = aws_vpc.redshift.id

  # Allow inbound Redshift connections from approved CIDRs
  ingress {
    from_port   = 5439
    to_port     = 5439
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "Redshift access"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_identifier}-sg"
    Environment = var.environment
  }
}
```

## IAM Roles

Create the IAM role Redshift needs to access S3 and other services.

```hcl
# iam.tf - IAM roles for Redshift

resource "aws_iam_role" "redshift" {
  name = "${var.cluster_identifier}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "redshift.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
  }
}

# Policy for reading data from S3
resource "aws_iam_role_policy" "redshift_s3" {
  name = "${var.cluster_identifier}-s3-policy"
  role = aws_iam_role.redshift.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-data-bucket",
          "arn:aws:s3:::my-data-bucket/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetDatabase",
          "glue:GetDatabases",
          "glue:GetPartition",
          "glue:GetPartitions",
          "glue:BatchGetPartition"
        ]
        Resource = ["*"]
      }
    ]
  })
}
```

## Redshift Cluster

Now the main resource - the cluster itself.

```hcl
# redshift.tf - Redshift cluster and parameter group

resource "aws_redshift_parameter_group" "main" {
  name   = "${var.cluster_identifier}-params"
  family = "redshift-1.0"

  # Enable short query acceleration
  parameter {
    name  = "enable_short_query_acceleration"
    value = "true"
  }

  # Set the maximum time for short query acceleration
  parameter {
    name  = "max_short_query_queue_time"
    value = "5000"
  }

  # Enable result caching for repeated queries
  parameter {
    name  = "enable_result_cache_for_session"
    value = "true"
  }

  # Require SSL connections
  parameter {
    name  = "require_ssl"
    value = "true"
  }
}

resource "aws_redshift_cluster" "main" {
  cluster_identifier = var.cluster_identifier
  database_name      = var.database_name
  master_username    = var.master_username
  master_password    = var.master_password
  node_type          = var.node_type
  number_of_nodes    = var.number_of_nodes

  # Networking
  cluster_subnet_group_name = aws_redshift_subnet_group.main.name
  vpc_security_group_ids    = [aws_security_group.redshift.id]
  publicly_accessible       = false

  # Security
  encrypted  = true
  kms_key_id = aws_kms_key.redshift.arn

  # Configuration
  cluster_parameter_group_name = aws_redshift_parameter_group.main.name
  iam_roles                    = [aws_iam_role.redshift.arn]
  default_iam_role_arn         = aws_iam_role.redshift.arn

  # Maintenance and backups
  preferred_maintenance_window     = "sun:03:00-sun:04:00"
  automated_snapshot_retention_period = 7

  # Logging
  logging {
    enable               = true
    bucket_name          = aws_s3_bucket.redshift_logs.id
    s3_key_prefix        = "redshift-logs/"
  }

  tags = {
    Name        = var.cluster_identifier
    Environment = var.environment
  }

  # Prevent accidental destruction
  lifecycle {
    prevent_destroy = true
  }
}

# KMS key for encryption at rest
resource "aws_kms_key" "redshift" {
  description             = "KMS key for Redshift encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
  }
}

# S3 bucket for audit logging
resource "aws_s3_bucket" "redshift_logs" {
  bucket = "${var.cluster_identifier}-audit-logs"

  tags = {
    Environment = var.environment
  }
}
```

## Monitoring

Set up CloudWatch alarms for critical metrics.

```hcl
# monitoring.tf - CloudWatch alarms for Redshift

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.cluster_identifier}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redshift cluster CPU utilization is above 80%"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_space" {
  alarm_name          = "${var.cluster_identifier}-disk-space"
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

resource "aws_cloudwatch_metric_alarm" "health_status" {
  alarm_name          = "${var.cluster_identifier}-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthStatus"
  namespace           = "AWS/Redshift"
  period              = 300
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Redshift cluster health check failed"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterIdentifier = aws_redshift_cluster.main.cluster_identifier
  }
}
```

## Outputs

Export useful values.

```hcl
# outputs.tf - useful values from the Redshift setup
output "cluster_endpoint" {
  description = "Redshift cluster endpoint"
  value       = aws_redshift_cluster.main.endpoint
}

output "cluster_dns_name" {
  description = "DNS name of the cluster"
  value       = aws_redshift_cluster.main.dns_name
}

output "cluster_port" {
  description = "Port number"
  value       = aws_redshift_cluster.main.port
}

output "database_name" {
  description = "Default database name"
  value       = aws_redshift_cluster.main.database_name
}

output "iam_role_arn" {
  description = "IAM role ARN for COPY/UNLOAD operations"
  value       = aws_iam_role.redshift.arn
}
```

## Deploying

With everything defined, deploy with the standard Terraform workflow.

```bash
# Initialize Terraform and download providers
terraform init

# Preview what will be created
terraform plan -var-file="production.tfvars"

# Apply the configuration
terraform apply -var-file="production.tfvars"
```

Your `production.tfvars` should look like this.

```hcl
# production.tfvars - production environment values
environment     = "production"
aws_region      = "us-east-1"
node_type       = "ra3.xlplus"
number_of_nodes = 4
master_password = "use-a-secrets-manager-reference-here"
vpc_cidr        = "10.0.0.0/16"
allowed_cidr_blocks = ["10.0.0.0/16", "172.16.0.0/12"]
```

For the password, consider using AWS Secrets Manager with a Terraform data source instead of putting it in a tfvars file.

## Wrapping Up

Terraform gives you a repeatable, version-controlled way to manage your Redshift infrastructure. The configuration here covers networking, security, encryption, logging, and monitoring - everything you need for a production deployment. Commit your Terraform code, run it through CI/CD, and you'll have consistent environments every time. For ongoing data management, check out our guides on [loading data from S3](https://oneuptime.com/blog/post/2026-02-12-load-data-redshift-s3/view) and [using Redshift Spectrum](https://oneuptime.com/blog/post/2026-02-12-redshift-spectrum-querying-s3/view).
