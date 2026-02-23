# How to Create Terraform Modules for Storage Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Storage, S3, RDS, EBS, Infrastructure as Code

Description: Build reusable Terraform modules for common storage patterns including S3 buckets, RDS databases, EFS file systems, and DynamoDB tables with security best practices.

---

Storage resources are among the most critical pieces of any cloud infrastructure. A misconfigured S3 bucket can lead to a data breach, and a poorly tuned database can bring down your application. Terraform modules for storage patterns help you encode security defaults and best practices so that every deployment gets it right automatically.

## S3 Bucket Module

S3 is the most common storage service on AWS, and a well-designed module should enforce security by default.

```hcl
# modules/s3-bucket/variables.tf
variable "name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "versioning_enabled" {
  description = "Whether to enable versioning"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id                     = string
    enabled                = bool
    prefix                 = string
    transition_days        = number
    transition_class       = string
    expiration_days        = optional(number)
    noncurrent_expiration  = optional(number, 90)
  }))
  default = []
}

variable "enable_replication" {
  description = "Whether to enable cross-region replication"
  type        = bool
  default     = false
}

variable "replication_bucket_arn" {
  description = "ARN of the destination bucket for replication"
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "Allow destruction of non-empty bucket (dangerous)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/s3-bucket/main.tf

# The bucket
resource "aws_s3_bucket" "this" {
  bucket        = var.name
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name = var.name
  })
}

# Block all public access by default
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Versioning
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# Lifecycle rules for cost management
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = length(var.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      filter {
        prefix = rule.value.prefix
      }

      transition {
        days          = rule.value.transition_days
        storage_class = rule.value.transition_class
      }

      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }

      noncurrent_version_expiration {
        noncurrent_days = rule.value.noncurrent_expiration
      }
    }
  }
}

# Enforce SSL-only access
resource "aws_s3_bucket_policy" "ssl_only" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceSSLOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.this.arn,
          "${aws_s3_bucket.this.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

## RDS Database Module

Databases need careful configuration for security, backups, and performance.

```hcl
# modules/rds/variables.tf
variable "name" {
  description = "Identifier for the RDS instance"
  type        = string
}

variable "engine" {
  description = "Database engine (postgres, mysql, mariadb)"
  type        = string
  default     = "postgres"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Initial storage allocation in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "vpc_id" {
  description = "VPC ID for the database"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to connect"
  type        = list(string)
  default     = []
}

variable "multi_az" {
  description = "Whether to enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/rds/main.tf

# Subnet group for the database
resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-subnet-group"
  })
}

# Security group for the database
resource "aws_security_group" "this" {
  name_prefix = "${var.name}-db-"
  vpc_id      = var.vpc_id
  description = "Security group for ${var.name} database"

  # Allow connections from specified security groups
  dynamic "ingress" {
    for_each = var.allowed_security_group_ids
    content {
      from_port       = local.port
      to_port         = local.port
      protocol        = "tcp"
      security_groups = [ingress.value]
      description     = "Allow database access"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.name}-db-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  # Port based on engine type
  port = var.engine == "postgres" ? 5432 : 3306
}

# Generate a random password for the master user
resource "random_password" "master" {
  length  = 32
  special = false
}

# Store the password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.name}-db-master-password"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.master.result
    engine   = var.engine
    host     = aws_db_instance.this.endpoint
    port     = local.port
    dbname   = var.name
  })
}

# The RDS instance
resource "aws_db_instance" "this" {
  identifier = var.name

  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = replace(var.name, "-", "_")
  username = "dbadmin"
  password = random_password.master.result

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final-snapshot"

  # Performance Insights
  performance_insights_enabled = true

  tags = merge(var.tags, {
    Name = var.name
  })
}
```

```hcl
# modules/rds/outputs.tf
output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.this.endpoint
}

output "address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.this.address
}

output "port" {
  description = "Database port"
  value       = local.port
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_db_instance.this.db_name
}

output "secret_arn" {
  description = "ARN of the Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.this.id
}
```

## DynamoDB Table Module

For NoSQL workloads, a DynamoDB module with autoscaling and backup configuration:

```hcl
# modules/dynamodb/main.tf

resource "aws_dynamodb_table" "this" {
  name         = var.name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key
  range_key    = var.range_key

  # Read/write capacity for provisioned mode
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Primary key attributes
  dynamic "attribute" {
    for_each = var.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # Global secondary indexes
  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = lookup(global_secondary_index.value, "range_key", null)
      projection_type = global_secondary_index.value.projection_type
      read_capacity   = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "read_capacity", 5) : null
      write_capacity  = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "write_capacity", 5) : null
    }
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Encryption at rest
  server_side_encryption {
    enabled = true
  }

  # TTL configuration
  dynamic "ttl" {
    for_each = var.ttl_attribute != null ? [1] : []
    content {
      attribute_name = var.ttl_attribute
      enabled        = true
    }
  }

  tags = merge(var.tags, {
    Name = var.name
  })
}
```

## Using Storage Modules Together

```hcl
# Production deployment with storage modules
module "app_bucket" {
  source = "./modules/s3-bucket"

  name                = "myapp-production-assets"
  versioning_enabled  = true

  lifecycle_rules = [
    {
      id               = "archive-old-objects"
      enabled          = true
      prefix           = ""
      transition_days  = 90
      transition_class = "GLACIER"
      expiration_days  = 365
    }
  ]
}

module "database" {
  source = "./modules/rds"

  name                       = "myapp-production"
  engine                     = "postgres"
  engine_version             = "15.4"
  instance_class             = "db.r6g.xlarge"
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.security_groups.app_sg_id]
  multi_az                   = true
  backup_retention_period    = 30
  deletion_protection        = true
}
```

## Conclusion

Storage modules should prioritize security by default - encryption, access controls, backup policies. Build these into the module itself so that consumers get secure storage without needing to remember every configuration option. The modules in this post cover the most common patterns, but adapt them to your organization's compliance requirements and naming conventions.

For more module patterns, see our posts on [how to create Terraform modules for compute patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-compute-patterns/view) and [how to create Terraform modules for monitoring and alerting](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-monitoring-and-alerting/view).
