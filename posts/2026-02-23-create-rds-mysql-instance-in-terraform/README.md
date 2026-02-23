# How to Create RDS MySQL Instance in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, MySQL, Database, Infrastructure as Code

Description: Learn how to provision a production-ready Amazon RDS MySQL instance using Terraform with proper security groups, encryption, and best practices for MySQL-specific configuration.

---

MySQL remains one of the most popular database engines in the world, and Amazon RDS makes running it in production far easier than managing your own servers. When you combine RDS MySQL with Terraform, you get a repeatable, version-controlled database setup that you can deploy across multiple environments without clicking through the AWS Console.

This guide walks through creating an RDS MySQL instance from scratch in Terraform, covering everything from the basic resource to MySQL-specific parameter tuning, security configuration, and production hardening.

## Prerequisites

Before you start, make sure you have:

- Terraform 1.0 or later installed
- An AWS account with appropriate IAM permissions
- A VPC with private subnets already created
- Basic familiarity with Terraform syntax

## Provider Configuration

Start by configuring the AWS provider:

```hcl
# Configure the AWS provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}
```

## Security Group for MySQL

MySQL uses port 3306 by default. You need a security group that allows inbound traffic on that port from your application:

```hcl
# Security group for the MySQL RDS instance
resource "aws_security_group" "mysql" {
  name_prefix = "mysql-rds-"
  vpc_id      = var.vpc_id
  description = "Security group for MySQL RDS instance"

  # Allow MySQL traffic from application subnets
  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = var.app_subnet_cidrs
    description = "MySQL access from application layer"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "mysql-rds-sg"
  }

  # Prevent destruction of security group while RDS is attached
  lifecycle {
    create_before_destroy = true
  }
}
```

## DB Subnet Group

RDS needs to know which subnets it can use. For high availability, spread across multiple availability zones:

```hcl
# Subnet group for the MySQL instance
resource "aws_db_subnet_group" "mysql" {
  name       = "mysql-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "MySQL DB Subnet Group"
  }
}
```

## The MySQL RDS Instance

Here is the core resource. This creates a MySQL 8.0 instance with sensible production defaults:

```hcl
# The main MySQL RDS instance
resource "aws_db_instance" "mysql" {
  identifier = "myapp-mysql"

  # Engine configuration
  engine         = "mysql"
  engine_version = "8.0.36"
  instance_class = var.instance_class

  # Storage configuration
  allocated_storage     = 50
  max_allocated_storage = 200  # Enable storage autoscaling up to 200GB
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database configuration
  db_name  = "myapp"
  username = var.db_username
  password = var.db_password
  port     = 3306

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.mysql.name
  vpc_security_group_ids = [aws_security_group.mysql.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Deletion protection - set to false only for dev environments
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "myapp-mysql-final-snapshot"

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = {
    Name        = "myapp-mysql"
    Environment = var.environment
  }
}
```

## Variables File

Define all the input variables your configuration needs:

```hcl
# variables.tf

variable "vpc_id" {
  description = "VPC ID where the RDS instance will be created"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "app_subnet_cidrs" {
  description = "CIDR blocks of application subnets that need database access"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}
```

## MySQL-Specific Parameter Group

The default parameter group works for getting started, but you will want to customize MySQL settings for production workloads. Here is a parameter group with common tuning:

```hcl
# Custom parameter group for MySQL 8.0
resource "aws_db_parameter_group" "mysql" {
  name   = "myapp-mysql80-params"
  family = "mysql8.0"

  # Character set - use utf8mb4 for full Unicode support
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  # InnoDB settings for better performance
  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
    # Uses 75% of instance memory for the buffer pool
  }

  parameter {
    name  = "innodb_log_file_size"
    value = "268435456"
    # 256MB log files for better write performance
  }

  # Slow query logging
  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
    # Log queries taking longer than 2 seconds
  }

  # Connection limits
  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name = "myapp-mysql80-params"
  }
}
```

Then reference it in your RDS instance:

```hcl
# Add this to the aws_db_instance resource
resource "aws_db_instance" "mysql" {
  # ... all previous configuration ...

  parameter_group_name = aws_db_parameter_group.mysql.name
}
```

## Using AWS Secrets Manager for Credentials

Hardcoding database passwords in your Terraform variables is not ideal. A better approach is to generate random passwords and store them in Secrets Manager:

```hcl
# Generate a random password
resource "random_password" "mysql" {
  length  = 24
  special = true
  # MySQL has restrictions on certain special characters in passwords
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
}

# Store credentials in Secrets Manager
resource "aws_secretsmanager_secret" "mysql" {
  name = "myapp/mysql/credentials"
}

resource "aws_secretsmanager_secret_version" "mysql" {
  secret_id = aws_secretsmanager_secret.mysql.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.mysql.result
    host     = aws_db_instance.mysql.address
    port     = aws_db_instance.mysql.port
    dbname   = "myapp"
  })
}
```

## Outputs

Export useful values so other Terraform configurations or applications can reference them:

```hcl
# outputs.tf

output "mysql_endpoint" {
  description = "The connection endpoint for the MySQL instance"
  value       = aws_db_instance.mysql.endpoint
}

output "mysql_address" {
  description = "The hostname of the MySQL instance"
  value       = aws_db_instance.mysql.address
}

output "mysql_port" {
  description = "The port the MySQL instance is listening on"
  value       = aws_db_instance.mysql.port
}

output "mysql_arn" {
  description = "The ARN of the MySQL instance"
  value       = aws_db_instance.mysql.arn
}

output "secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.mysql.arn
}
```

## Deploying the Instance

With everything in place, apply your configuration:

```bash
# Initialize Terraform
terraform init

# Preview the changes
terraform plan -var-file="production.tfvars"

# Apply the configuration
terraform apply -var-file="production.tfvars"
```

RDS instances take several minutes to create. MySQL instances typically take 5-10 minutes depending on the instance class and whether encryption is enabled.

## Common Pitfalls to Watch For

There are a few things that catch people off guard with RDS MySQL in Terraform.

First, changing the `engine_version` triggers a modification, not a replacement. RDS handles minor version upgrades in place, but major version upgrades require more planning. Set `auto_minor_version_upgrade = true` if you want AWS to handle patch updates automatically.

Second, the `password` attribute is stored in the Terraform state file. Make sure your state file is encrypted, whether you are using S3 backend with encryption or Terraform Cloud.

Third, if you set `deletion_protection = true` (which you should for production), you need to disable it before you can destroy the instance. This is intentional - it prevents accidental deletion.

Finally, storage autoscaling via `max_allocated_storage` only scales up. It will never shrink your storage back down. Plan your initial `allocated_storage` accordingly.

## Monitoring Your MySQL Instance

Once the instance is running, you will want to set up CloudWatch alarms for key metrics. For a detailed walkthrough of RDS monitoring, check out our guide on [configuring RDS monitoring in Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-rds-monitoring-in-terraform/view).

The most important metrics to watch for MySQL specifically are `CPUUtilization`, `FreeableMemory`, `ReadIOPS`, `WriteIOPS`, and `DatabaseConnections`. If your buffer pool hit ratio drops below 95%, you likely need a larger instance class.

## Wrapping Up

Creating an RDS MySQL instance in Terraform is straightforward once you understand the required pieces: a subnet group, a security group, a parameter group, and the instance itself. The key is getting the MySQL-specific parameters right for your workload and making sure credentials are managed securely. With everything defined in code, you can replicate this setup across dev, staging, and production environments with minimal effort.
