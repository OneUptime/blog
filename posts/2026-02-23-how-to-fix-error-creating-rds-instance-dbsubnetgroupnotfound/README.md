# How to Fix Error Creating RDS Instance DBSubnetGroupNotFound

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, VPC, Troubleshooting

Description: Resolve the DBSubnetGroupNotFoundFault error when creating RDS instances with Terraform by properly configuring subnet groups and VPC networking.

---

When Terraform throws a `DBSubnetGroupNotFoundFault` while trying to create an RDS instance, it means the DB subnet group you referenced does not exist or is not accessible. RDS requires a subnet group to know which VPC subnets the database instance can be placed in, and if Terraform cannot find that group, the entire operation fails.

## What the Error Looks Like

```
Error: error creating RDS DB Instance (my-database):
DBSubnetGroupNotFoundFault: DB Subnet Group 'my-db-subnet-group'
not found.
    status code: 404, request id: abc123-def456
```

## Understanding DB Subnet Groups

Before jumping into fixes, it helps to understand what a DB subnet group is. An RDS DB subnet group is a collection of subnets (usually in different Availability Zones) that you designate for your RDS database instances. When you create an RDS instance in a VPC, you must specify a DB subnet group so that RDS knows which subnets it can use.

Key requirements for DB subnet groups:

- They must contain subnets in at least two different Availability Zones
- The subnets must be in the same VPC
- They must exist before the RDS instance is created

## Common Causes and Fixes

### 1. The Subnet Group Does Not Exist Yet

The most common cause is that the subnet group simply has not been created. You might have referenced it by name but forgotten to define it in your Terraform configuration:

```hcl
# This references a subnet group that does not exist
resource "aws_db_instance" "my_db" {
  identifier           = "my-database"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_subnet_group_name = "my-db-subnet-group"  # Does this exist?
  # ...
}
```

**Fix:** Create the DB subnet group in your Terraform configuration:

```hcl
# Create the subnet group first
resource "aws_db_subnet_group" "my_db_subnet_group" {
  name       = "my-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "My DB Subnet Group"
  }
}

# Then reference it in the RDS instance
resource "aws_db_instance" "my_db" {
  identifier           = "my-database"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_subnet_group_name = aws_db_subnet_group.my_db_subnet_group.name
  username             = "admin"
  password             = var.db_password
}
```

### 2. Typo in the Subnet Group Name

A simple typo in the subnet group name will cause the error. Compare the name in your RDS instance configuration with the actual subnet group name:

```bash
# List all DB subnet groups
aws rds describe-db-subnet-groups \
  --query "DBSubnetGroups[*].DBSubnetGroupName" \
  --output table
```

### 3. Wrong Region

DB subnet groups, like most AWS resources, are regional. If your RDS instance is configured for a different region than where the subnet group exists, you will get this error:

```hcl
# Provider in us-east-1
provider "aws" {
  region = "us-east-1"
}

# But the subnet group was created in us-west-2
resource "aws_db_instance" "my_db" {
  db_subnet_group_name = "my-db-subnet-group"  # Exists in us-west-2
  # ...
}
```

Make sure the provider region matches the region where your networking resources were created.

### 4. Resource Ordering Issue

Terraform might try to create the RDS instance before the subnet group is ready. This can happen if there is no explicit or implicit dependency:

```hcl
# These might be created in parallel without proper dependency
resource "aws_db_subnet_group" "db_subnets" {
  name       = "my-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "my_db" {
  db_subnet_group_name = "my-db-subnet-group"  # String reference, no dependency
  # ...
}
```

**Fix:** Use a reference instead of a hardcoded string to create an implicit dependency:

```hcl
resource "aws_db_instance" "my_db" {
  # This creates an implicit dependency on the subnet group
  db_subnet_group_name = aws_db_subnet_group.db_subnets.name
  # ...
}
```

### 5. Subnet Group Was Deleted Outside Terraform

If someone manually deleted the DB subnet group through the console or CLI, Terraform's state still thinks it exists. On the next apply, Terraform will not try to recreate it (since it thinks it already exists) but RDS will fail because the group is gone.

**Fix:** Remove the orphaned resource from state and let Terraform recreate it:

```bash
# Remove from state
terraform state rm aws_db_subnet_group.db_subnets

# Apply to recreate
terraform apply
```

Or refresh the state first:

```bash
terraform refresh
terraform apply
```

## Complete Working Example

Here is a full example that creates a VPC, subnets, a DB subnet group, and an RDS instance:

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

# Private subnets in two AZs
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "private-subnet-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "private-subnet-b"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "database" {
  name       = "my-database-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "My Database Subnet Group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Instance
resource "aws_db_instance" "database" {
  identifier           = "my-database"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_encrypted    = true
  username             = "admin"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = true

  tags = {
    Name = "my-database"
  }
}
```

## Subnet Group Requirements

Keep these requirements in mind when creating DB subnet groups:

1. **Minimum two AZs.** The subnet group must include subnets in at least two different Availability Zones. This is a hard requirement from AWS for high availability.

2. **Same VPC.** All subnets in a DB subnet group must be in the same VPC.

3. **Private subnets.** While not strictly required, best practice is to use private subnets (no internet gateway route) for database instances.

4. **Sufficient IP addresses.** Each subnet needs enough available IP addresses for the RDS instances you plan to create.

```hcl
# This will fail - subnets in only one AZ
resource "aws_db_subnet_group" "bad_example" {
  name       = "bad-subnet-group"
  subnet_ids = [aws_subnet.private_a.id]  # Only one subnet/AZ
}

# This works - subnets in two AZs
resource "aws_db_subnet_group" "good_example" {
  name       = "good-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}
```

## Using Data Sources for Existing Subnets

If your subnets already exist and you just need to reference them, use data sources:

```hcl
# Look up existing private subnets
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "private"
  }
}

resource "aws_db_subnet_group" "database" {
  name       = "my-database-subnet-group"
  subnet_ids = data.aws_subnets.private.ids
}
```

## Monitoring Your Database

Once your RDS instance is up and running, set up monitoring with [OneUptime](https://oneuptime.com) to track database health, connection counts, and performance metrics. Early detection of database issues prevents outages.

## Conclusion

The `DBSubnetGroupNotFoundFault` error means the DB subnet group referenced by your RDS instance does not exist. The fix is to either create the subnet group in your Terraform configuration, fix a typo in the name, or resolve a dependency ordering issue. Always use resource references instead of hardcoded strings to ensure proper dependency ordering, and make sure your subnet group spans at least two Availability Zones.
