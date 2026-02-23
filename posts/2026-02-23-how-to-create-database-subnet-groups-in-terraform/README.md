# How to Create Database Subnet Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, Networking, VPC, Subnet, Infrastructure as Code

Description: Learn how to create and configure database subnet groups in Terraform for RDS, Aurora, ElastiCache, DocumentDB, Neptune, and other AWS services.

---

Database subnet groups define which subnets your database instances can be placed in within your VPC. They are a fundamental networking requirement for every AWS managed database service. A subnet group must span at least two availability zones to enable high availability features like Multi-AZ deployments and read replicas. In this guide, we will cover how to create subnet groups for all major AWS database services using Terraform.

## Understanding Database Subnet Groups

A database subnet group is a collection of subnets (typically private) that you designate for your database instances. When you create a database instance, AWS uses the subnet group to determine which subnets and availability zones the instance can be launched in. For Multi-AZ deployments, the primary and standby instances are placed in different availability zones within the subnet group.

Each AWS database service has its own subnet group resource type. RDS and Aurora share the same subnet group type, while ElastiCache, DocumentDB, Neptune, and other services have their own dedicated subnet group resources.

## Setting Up the VPC Foundation

Before creating subnet groups, you need a VPC with subnets:

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

# Create the VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "main-vpc"
    Environment = "production"
  }
}

# Create private subnets for databases across three AZs
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name    = "private-subnet-a"
    Type    = "private"
    Purpose = "database"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name    = "private-subnet-b"
    Type    = "private"
    Purpose = "database"
  }
}

resource "aws_subnet" "private_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "us-east-1c"

  tags = {
    Name    = "private-subnet-c"
    Type    = "private"
    Purpose = "database"
  }
}

# Local variable for all private subnet IDs
locals {
  private_subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id,
    aws_subnet.private_c.id,
  ]
}
```

## Creating an RDS/Aurora Subnet Group

RDS and Aurora both use the `aws_db_subnet_group` resource:

```hcl
# Subnet group for RDS and Aurora
resource "aws_db_subnet_group" "rds" {
  name        = "rds-subnet-group"
  description = "Subnet group for RDS and Aurora database instances"
  subnet_ids  = local.private_subnet_ids

  tags = {
    Name        = "rds-subnet-group"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Use it in an RDS instance
resource "aws_db_instance" "postgres" {
  identifier           = "app-postgres"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  username             = "dbadmin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.rds.name  # Reference the subnet group
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted    = true
  multi_az             = true
  skip_final_snapshot  = false
  final_snapshot_identifier = "app-postgres-final"

  tags = {
    Environment = "production"
  }
}

# Use the same subnet group for Aurora
resource "aws_rds_cluster" "aurora" {
  cluster_identifier   = "app-aurora"
  engine               = "aurora-postgresql"
  engine_version       = "15.4"
  database_name        = "appdb"
  master_username      = "dbadmin"
  master_password      = var.db_password
  db_subnet_group_name = aws_db_subnet_group.rds.name  # Same subnet group
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted    = true
  skip_final_snapshot  = true

  tags = {
    Environment = "production"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Creating an ElastiCache Subnet Group

ElastiCache uses its own subnet group resource:

```hcl
# Subnet group for ElastiCache
resource "aws_elasticache_subnet_group" "redis" {
  name        = "redis-subnet-group"
  description = "Subnet group for ElastiCache Redis"
  subnet_ids  = local.private_subnet_ids

  tags = {
    Name        = "redis-subnet-group"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Use it in a Redis replication group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Application Redis cluster"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.redis.name  # Reference
  security_group_ids         = [aws_security_group.redis_sg.id]
  engine                     = "redis"
  engine_version             = "7.0"
  at_rest_encryption_enabled = true

  tags = {
    Environment = "production"
  }
}
```

## Creating a DocumentDB Subnet Group

```hcl
# Subnet group for DocumentDB
resource "aws_docdb_subnet_group" "docdb" {
  name        = "docdb-subnet-group"
  description = "Subnet group for DocumentDB clusters"
  subnet_ids  = local.private_subnet_ids

  tags = {
    Name        = "docdb-subnet-group"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Use it in a DocumentDB cluster
resource "aws_docdb_cluster" "docdb" {
  cluster_identifier     = "app-docdb"
  engine                 = "docdb"
  master_username        = "docdbadmin"
  master_password        = var.db_password
  db_subnet_group_name   = aws_docdb_subnet_group.docdb.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true
  skip_final_snapshot    = true

  tags = {
    Environment = "production"
  }
}
```

## Creating a Neptune Subnet Group

```hcl
# Subnet group for Neptune
resource "aws_neptune_subnet_group" "neptune" {
  name        = "neptune-subnet-group"
  description = "Subnet group for Neptune graph database"
  subnet_ids  = local.private_subnet_ids

  tags = {
    Name        = "neptune-subnet-group"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Use it in a Neptune cluster
resource "aws_neptune_cluster" "neptune" {
  cluster_identifier        = "app-neptune"
  engine                    = "neptune"
  neptune_subnet_group_name = aws_neptune_subnet_group.neptune.name
  vpc_security_group_ids    = [aws_security_group.neptune_sg.id]
  storage_encrypted         = true
  skip_final_snapshot       = true

  tags = {
    Environment = "production"
  }
}
```

## Creating a DAX Subnet Group

If you use DynamoDB Accelerator (DAX):

```hcl
# Subnet group for DAX
resource "aws_dax_subnet_group" "dax" {
  name        = "dax-subnet-group"
  description = "Subnet group for DAX clusters"
  subnet_ids  = local.private_subnet_ids
}
```

## Using a Module for All Subnet Groups

Create a reusable module that provisions all database subnet groups at once:

```hcl
# modules/database-networking/variables.tf
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for database placement"
  type        = list(string)
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "create_rds" {
  description = "Whether to create RDS subnet group"
  type        = bool
  default     = true
}

variable "create_elasticache" {
  description = "Whether to create ElastiCache subnet group"
  type        = bool
  default     = true
}

variable "create_docdb" {
  description = "Whether to create DocumentDB subnet group"
  type        = bool
  default     = false
}

variable "create_neptune" {
  description = "Whether to create Neptune subnet group"
  type        = bool
  default     = false
}
```

```hcl
# modules/database-networking/main.tf
resource "aws_db_subnet_group" "rds" {
  count = var.create_rds ? 1 : 0

  name        = "${var.environment}-rds-subnet-group"
  description = "RDS subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.environment}-rds-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_elasticache_subnet_group" "cache" {
  count = var.create_elasticache ? 1 : 0

  name        = "${var.environment}-cache-subnet-group"
  description = "ElastiCache subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.environment}-cache-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_docdb_subnet_group" "docdb" {
  count = var.create_docdb ? 1 : 0

  name        = "${var.environment}-docdb-subnet-group"
  description = "DocumentDB subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.environment}-docdb-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_neptune_subnet_group" "neptune" {
  count = var.create_neptune ? 1 : 0

  name        = "${var.environment}-neptune-subnet-group"
  description = "Neptune subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.environment}-neptune-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

```hcl
# modules/database-networking/outputs.tf
output "rds_subnet_group_name" {
  value = var.create_rds ? aws_db_subnet_group.rds[0].name : null
}

output "elasticache_subnet_group_name" {
  value = var.create_elasticache ? aws_elasticache_subnet_group.cache[0].name : null
}

output "docdb_subnet_group_name" {
  value = var.create_docdb ? aws_docdb_subnet_group.docdb[0].name : null
}

output "neptune_subnet_group_name" {
  value = var.create_neptune ? aws_neptune_subnet_group.neptune[0].name : null
}
```

## Using the Module

```hcl
# Create all database subnet groups for production
module "db_networking" {
  source = "./modules/database-networking"

  vpc_id     = aws_vpc.main.id
  subnet_ids = local.private_subnet_ids
  environment = "production"

  create_rds         = true
  create_elasticache = true
  create_docdb       = true
  create_neptune     = false
}
```

## Security Group Configuration

Subnet groups work alongside security groups to control network access:

```hcl
# Security group for databases
resource "aws_security_group" "db_sg" {
  name_prefix = "database-"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "PostgreSQL from app servers"
  }

  # MySQL
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "MySQL from app servers"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "database-security-group"
    Environment = "production"
  }
}
```

## Best Practices

Always use at least three subnets across three availability zones for production workloads. Keep database subnets private with no direct internet access. Use separate subnet groups for different database services to maintain clear network boundaries. Tag subnet groups clearly with their purpose and environment. Use a consistent naming convention across all your subnet groups. Create subnet groups through a module to ensure consistency. Pair subnet groups with appropriate security groups for defense in depth.

For monitoring network connectivity to your databases, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track connection health and latency.

## Conclusion

Database subnet groups are a foundational piece of your database networking infrastructure. While they are simple to create, getting them right is important for high availability and security. By using Terraform modules and consistent patterns, you can ensure all your database services have proper network configurations across all your environments.
