# How to Set Up RDS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Terraform, Infrastructure as Code, Database

Description: Complete Terraform configuration for provisioning Amazon RDS instances with best practices for security, monitoring, backups, and high availability.

---

Clicking through the AWS Console to create an RDS instance works for a one-off experiment, but it's not how you should manage production infrastructure. Settings get lost, configurations drift, and nobody remembers why a particular parameter was set six months ago.

Terraform gives you version-controlled, repeatable infrastructure. Your RDS configuration lives in code, goes through pull request reviews, and can be applied consistently across environments. Let's build a production-ready RDS setup from scratch.

## Project Structure

Here's how I'd organize the Terraform files:

```
terraform/
  rds/
    main.tf           # RDS instance and related resources
    variables.tf      # Input variables
    outputs.tf        # Outputs (endpoint, port, etc.)
    security.tf       # Security groups
    monitoring.tf     # CloudWatch alarms and monitoring
```

## The Core RDS Configuration

Let's start with the main RDS instance configuration. This example creates a PostgreSQL instance with all the production essentials:

```hcl
# main.tf

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Subnet group - tells RDS which subnets to use
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-db-subnet-group"
    Environment = var.environment
  }
}

# Parameter group - custom database configuration
resource "aws_db_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-pg16"
  family      = "postgres16"
  description = "Custom parameter group for ${var.project_name}"

  # Require SSL connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Log slow queries (queries taking longer than 1 second)
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  # Enable pg_stat_statements for query analysis
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  tags = {
    Name        = "${var.project_name}-parameter-group"
    Environment = var.environment
  }
}

# The RDS instance itself
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = var.instance_class
  parameter_group_name = aws_db_parameter_group.main.name

  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage  # Enables auto scaling
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn  # Use a customer-managed KMS key

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  port                   = 5432

  # Credentials
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # High availability
  multi_az = var.environment == "production" ? true : false

  # Backup configuration
  backup_retention_period = var.environment == "production" ? 14 : 3
  backup_window           = "03:00-04:00"
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot" : null

  # Maintenance
  maintenance_window         = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade = true

  # Monitoring
  monitoring_interval             = 10
  monitoring_role_arn             = aws_iam_role.rds_enhanced_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Deletion protection (prevent accidental deletion)
  deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "${var.project_name}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    # Prevent Terraform from trying to change the password
    # (manage passwords through AWS Secrets Manager instead)
    ignore_changes = [password]
  }
}
```

## Variables

```hcl
# variables.tf

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID where the RDS instance will be created"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum storage for auto scaling in GB"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "admin"
}

variable "master_password" {
  description = "Master password for the database"
  type        = string
  sensitive   = true
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to the database"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect to the database"
  type        = list(string)
  default     = []
}
```

## Security Groups

```hcl
# security.tf

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds"
  description = "Security group for RDS instance"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds"
    Environment = var.environment
  }
}

# Allow access from application security groups
resource "aws_security_group_rule" "rds_ingress_sg" {
  count = length(var.allowed_security_group_ids)

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_group_ids[count.index]
  security_group_id        = aws_security_group.rds.id
  description              = "Allow PostgreSQL access from application"
}

# Allow access from specific CIDR blocks (e.g., VPN)
resource "aws_security_group_rule" "rds_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  security_group_id = aws_security_group.rds.id
  description       = "Allow PostgreSQL access from CIDR blocks"
}
```

## IAM Role for Enhanced Monitoring

```hcl
# monitoring.tf

resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch alarm for high CPU
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "rds-${var.project_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU above 80% for ${var.project_name}"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns
}

# CloudWatch alarm for low storage
resource "aws_cloudwatch_metric_alarm" "storage_low" {
  alarm_name          = "rds-${var.project_name}-${var.environment}-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB in bytes
  alarm_description   = "RDS free storage below 10GB for ${var.project_name}"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = var.alarm_sns_topic_arns
}
```

## Outputs

```hcl
# outputs.tf

output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "security_group_id" {
  description = "Security group ID for the RDS instance"
  value       = aws_security_group.rds.id
}

output "instance_identifier" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.identifier
}
```

## Applying the Configuration

```bash
# Initialize Terraform
terraform init

# Preview what will be created
terraform plan -var-file="production.tfvars"

# Apply the configuration
terraform apply -var-file="production.tfvars"
```

Your `production.tfvars` file might look like:

```hcl
project_name       = "myapp"
environment        = "production"
instance_class     = "db.r6g.xlarge"
allocated_storage  = 200
database_name      = "myapp_production"
```

For a deeper look at monitoring the RDS instance you just created, check out our guides on [Performance Insights](https://oneuptime.com/blog/post/monitor-rds-with-performance-insights/view) and [Enhanced Monitoring](https://oneuptime.com/blog/post/enable-rds-enhanced-monitoring/view). And if you prefer CloudFormation over Terraform, we've got a guide for [setting up RDS with CloudFormation](https://oneuptime.com/blog/post/set-up-rds-with-cloudformation/view) too.
