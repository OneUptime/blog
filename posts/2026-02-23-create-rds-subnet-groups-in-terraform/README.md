# How to Create RDS Subnet Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Subnet Groups, VPC, Networking

Description: A complete guide to creating and managing RDS DB subnet groups in Terraform, covering multi-AZ placement, VPC design patterns, and best practices for database networking.

---

Every RDS instance needs a DB subnet group. It tells RDS which subnets - and therefore which availability zones - the database can use. Without a properly configured subnet group, your RDS instance cannot be created, and if your subnet group only covers one AZ, you cannot enable Multi-AZ for high availability.

Despite being a relatively simple resource, subnet groups are the foundation of your database networking. Getting them right from the start saves headaches later. This guide covers creating them in Terraform, designing for high availability, and handling common scenarios like shared subnet groups and VPC peering.

## What Is a DB Subnet Group

A DB subnet group is a collection of subnets that RDS uses to place database instances. When you create an RDS instance, AWS picks subnets from this group based on the availability zone requirements:

- For a **single-AZ instance**, RDS uses one subnet from the group
- For a **Multi-AZ instance**, RDS uses subnets in two different AZs (one for primary, one for standby)
- For an **Aurora cluster**, RDS can place instances across all AZs covered by the subnet group

The subnets in the group must be in the same VPC, and they should be in different availability zones for high availability.

## Creating a Basic Subnet Group

The simplest case - you have a VPC with private subnets and want to create a subnet group for your database:

```hcl
# DB subnet group using existing private subnets
resource "aws_db_subnet_group" "main" {
  name        = "myapp-db-subnets"
  description = "DB subnet group for myapp databases"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "myapp-db-subnets"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs across multiple AZs"
  type        = list(string)
}
```

## Creating Subnets and Subnet Group Together

If you are building the VPC from scratch, you will create the subnets and subnet group in the same configuration:

```hcl
# Data source to get available AZs in the region
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC for the database
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "myapp-vpc"
  }
}

# Private subnets for databases - one per AZ
resource "aws_subnet" "database" {
  count = 3  # Three AZs for maximum availability

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.200.0/21", 3, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # Database subnets should never have public IPs
  map_public_ip_on_launch = false

  tags = {
    Name = "db-subnet-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "database"
  }
}

# Route table for database subnets (no internet access)
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  # No routes to internet gateway or NAT gateway
  # Database subnets should be isolated

  tags = {
    Name = "db-route-table"
  }
}

# Associate each database subnet with the route table
resource "aws_route_table_association" "database" {
  count = length(aws_subnet.database)

  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

# DB subnet group
resource "aws_db_subnet_group" "main" {
  name        = "myapp-db-subnets"
  description = "Database subnets spanning 3 AZs"
  subnet_ids  = aws_subnet.database[*].id

  tags = {
    Name = "myapp-db-subnets"
  }
}
```

## Using the VPC Module

If you use the popular terraform-aws-modules/vpc module, subnet groups can be created automatically:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "myapp-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  # This creates the DB subnet group automatically
  create_database_subnet_group       = true
  database_subnet_group_name         = "myapp-db-subnets"
  create_database_subnet_route_table = true

  tags = {
    Environment = "production"
  }
}

# Reference the auto-created subnet group
resource "aws_db_instance" "main" {
  # ...
  db_subnet_group_name = module.vpc.database_subnet_group_name
  # ...
}
```

## Shared Subnet Groups for Multiple Databases

If you have multiple databases in the same VPC, you can share a subnet group:

```hcl
# One subnet group shared by multiple databases
resource "aws_db_subnet_group" "shared" {
  name        = "shared-db-subnets"
  description = "Shared subnet group for all databases in this VPC"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name    = "shared-db-subnets"
    Purpose = "shared"
  }
}

# PostgreSQL instance using the shared group
resource "aws_db_instance" "postgres" {
  identifier           = "myapp-postgres"
  engine               = "postgres"
  instance_class       = "db.r6g.large"
  db_subnet_group_name = aws_db_subnet_group.shared.name
  # ...
}

# MySQL instance using the same shared group
resource "aws_db_instance" "mysql" {
  identifier           = "myapp-mysql"
  engine               = "mysql"
  instance_class       = "db.t3.medium"
  db_subnet_group_name = aws_db_subnet_group.shared.name
  # ...
}

# Aurora cluster using the same shared group
resource "aws_rds_cluster" "aurora" {
  cluster_identifier   = "myapp-aurora"
  engine               = "aurora-postgresql"
  db_subnet_group_name = aws_db_subnet_group.shared.name
  # ...
}
```

## Per-Environment Subnet Groups

For environments that share a VPC but need isolation, create separate subnet groups:

```hcl
locals {
  environments = {
    production = {
      subnet_ids = var.prod_subnet_ids
    }
    staging = {
      subnet_ids = var.staging_subnet_ids
    }
    development = {
      subnet_ids = var.dev_subnet_ids
    }
  }
}

resource "aws_db_subnet_group" "per_env" {
  for_each = local.environments

  name        = "${each.key}-db-subnets"
  description = "DB subnet group for ${each.key}"
  subnet_ids  = each.value.subnet_ids

  tags = {
    Name        = "${each.key}-db-subnets"
    Environment = each.key
  }
}
```

## Network ACLs for Database Subnets

Subnet groups define where the database can live, but you should also use Network ACLs for defense in depth:

```hcl
# Network ACL for database subnets
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.database[*].id

  # Allow inbound PostgreSQL from application subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/21"  # Application subnet CIDR
    from_port  = 5432
    to_port    = 5432
  }

  # Allow inbound MySQL from application subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.0.0/21"
    from_port  = 3306
    to_port    = 3306
  }

  # Allow return traffic (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 200
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow outbound to application subnets
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny everything else
  ingress {
    protocol   = "-1"
    rule_no    = 999
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 999
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "database-nacl"
  }
}
```

## Common Mistakes

There are a few things that trip people up with subnet groups:

**Not enough AZs.** If your subnet group only has subnets in one AZ, you cannot enable Multi-AZ. Always use at least two AZs, preferably three.

**Using public subnets.** Database subnets should be private. If you put RDS in a public subnet, you are relying solely on security groups and `publicly_accessible = false` for protection. Use private subnets with no route to an internet gateway.

**Naming conflicts.** Subnet group names are unique per account per region. If you are running multiple environments in the same account, include the environment name.

**Changing subnet IDs.** If you change the subnets in a subnet group that is in use, RDS may reject the change. You cannot remove a subnet that an instance is currently running in.

## Outputs

```hcl
output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "db_subnet_group_arn" {
  description = "ARN of the DB subnet group"
  value       = aws_db_subnet_group.main.arn
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "database_subnet_cidrs" {
  description = "CIDR blocks of the database subnets"
  value       = aws_subnet.database[*].cidr_block
}
```

## Summary

RDS subnet groups are a simple but foundational resource. They determine where your database instances can be placed, and getting them right is a prerequisite for high availability. The pattern is straightforward: create dedicated database subnets in at least two (preferably three) availability zones, keep them private, restrict network access with security groups and NACLs, and reference the subnet group in every RDS instance you create. With the VPC module, most of this is handled for you, but understanding the pieces helps when you need to debug networking issues.
