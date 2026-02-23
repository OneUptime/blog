# How to Reference Security Groups Across VPCs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Security Groups, VPC Peering, Networking

Description: Learn how to reference and use security groups across VPC boundaries in Terraform using VPC peering, Transit Gateway, and cross-account configurations.

---

In a single-VPC setup, referencing one security group from another is trivial. You just pass the security group ID. But once your architecture spans multiple VPCs - maybe a separate VPC for your database tier, or VPCs in different AWS accounts - things get more involved. You need VPC peering or a Transit Gateway, and your security group rules need to reference CIDR blocks instead of security group IDs in most cases.

This guide walks through the patterns for referencing security groups across VPCs in Terraform.

## The Limitation

Here is the core issue: AWS security group rules can only reference other security groups within the same VPC, or in a peered VPC within the same region. You cannot directly reference a security group in a non-peered VPC or across regions.

This means your approach depends on the connectivity method:

- **VPC Peering (same region)** - You can reference security group IDs directly
- **VPC Peering (cross-region)** - You must use CIDR blocks
- **Transit Gateway** - You must use CIDR blocks
- **PrivateLink** - Different pattern altogether

## Setting Up VPC Peering

Before you can reference security groups across VPCs, you need a peering connection.

```hcl
# First VPC - contains the application
resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "app-vpc"
  }
}

# Second VPC - contains the database
resource "aws_vpc" "database" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "database-vpc"
  }
}

# Create a VPC peering connection
resource "aws_vpc_peering_connection" "app_to_db" {
  vpc_id      = aws_vpc.app.id
  peer_vpc_id = aws_vpc.database.id
  auto_accept = true  # Only works if both VPCs are in the same account

  accepter {
    allow_remote_vpc_dns_resolution = true
  }

  requester {
    allow_remote_vpc_dns_resolution = true
  }

  tags = {
    Name = "app-to-database-peering"
  }
}

# Route table entry in the app VPC pointing to the database VPC
resource "aws_route" "app_to_db" {
  route_table_id            = aws_route_table.app.id
  destination_cidr_block    = aws_vpc.database.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_db.id
}

# Route table entry in the database VPC pointing to the app VPC
resource "aws_route" "db_to_app" {
  route_table_id            = aws_route_table.database.id
  destination_cidr_block    = aws_vpc.app.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_db.id
}
```

## Cross-VPC Security Group Reference (Same Region Peering)

With same-region VPC peering, you can reference security groups directly by their ID. This is the cleanest approach.

```hcl
# Security group in the app VPC
resource "aws_security_group" "app_server" {
  name_prefix = "app-server-"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.app.id

  # Outbound to the database security group in the peered VPC
  egress {
    description     = "MySQL to database VPC"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  tags = {
    Name = "app-server-sg"
  }
}

# Security group in the database VPC
resource "aws_security_group" "database" {
  name_prefix = "database-"
  description = "Security group for database instances"
  vpc_id      = aws_vpc.database.id

  # Inbound from the app server security group in the peered VPC
  ingress {
    description     = "MySQL from app servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app_server.id]
  }

  tags = {
    Name = "database-sg"
  }
}
```

This works because AWS allows cross-VPC security group references when the VPCs are peered in the same region. Terraform handles the dependency ordering automatically.

## Cross-VPC with CIDR Blocks

When you can't use direct security group references (cross-region peering, Transit Gateway, or non-peered VPCs connected through other means), you fall back to CIDR blocks.

```hcl
# Application VPC subnets where app servers run
locals {
  app_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
  db_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
}

# Security group in the database VPC using CIDR references
resource "aws_security_group" "database_cidr" {
  name_prefix = "database-cidr-"
  description = "Database security group using CIDR references"
  vpc_id      = aws_vpc.database.id

  # Allow MySQL from each app subnet
  dynamic "ingress" {
    for_each = local.app_subnet_cidrs
    content {
      description = "MySQL from app subnet ${ingress.value}"
      from_port   = 3306
      to_port     = 3306
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "database-cidr-sg"
  }
}
```

## Cross-Account Security Group References

For multi-account setups (which AWS recommends for production), you need to use multiple providers and handle the peering acceptance separately.

```hcl
# Provider for the application account
provider "aws" {
  alias  = "app_account"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

# Provider for the database account
provider "aws" {
  alias  = "db_account"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}

# VPC in the app account
resource "aws_vpc" "app" {
  provider   = aws.app_account
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "app-vpc"
  }
}

# VPC in the database account
resource "aws_vpc" "db" {
  provider   = aws.db_account
  cidr_block = "10.1.0.0/16"

  tags = {
    Name = "db-vpc"
  }
}

# Peering request from app account
resource "aws_vpc_peering_connection" "cross_account" {
  provider      = aws.app_account
  vpc_id        = aws_vpc.app.id
  peer_vpc_id   = aws_vpc.db.id
  peer_owner_id = "222222222222"  # Database account ID

  tags = {
    Name = "cross-account-peering"
  }
}

# Accept the peering request in the database account
resource "aws_vpc_peering_connection_accepter" "cross_account" {
  provider                  = aws.db_account
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id
  auto_accept               = true

  tags = {
    Name = "cross-account-peering"
  }
}

# Security group in the database account referencing app account SG
resource "aws_security_group" "db_cross_account" {
  provider    = aws.db_account
  name_prefix = "db-cross-acct-"
  description = "Database SG with cross-account references"
  vpc_id      = aws_vpc.db.id

  # Reference the app security group from the other account
  ingress {
    description     = "MySQL from app servers in app account"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = ["${aws_security_group.app_cross_account.id}"]
  }

  tags = {
    Name = "db-cross-account-sg"
  }
}
```

## Using Data Sources for Existing Security Groups

When the security group already exists (created by another team or Terraform workspace), use data sources to look it up.

```hcl
# Look up an existing security group by its tags
data "aws_security_group" "existing_app_sg" {
  filter {
    name   = "tag:Name"
    values = ["app-server-sg"]
  }

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.app.id]
  }
}

# Look up the VPC by its tags
data "aws_vpc" "app" {
  filter {
    name   = "tag:Name"
    values = ["app-vpc"]
  }
}

# Reference the looked-up security group in your rules
resource "aws_security_group" "backend" {
  name_prefix = "backend-"
  description = "Backend service security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Traffic from existing app servers"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [data.aws_security_group.existing_app_sg.id]
  }

  tags = {
    Name = "backend-sg"
  }
}
```

## Using Terraform Remote State

Another common pattern is sharing security group IDs through Terraform remote state outputs.

```hcl
# In the networking workspace - outputs.tf
output "app_security_group_id" {
  value       = aws_security_group.app_server.id
  description = "Security group ID for app servers"
}

output "app_vpc_cidr" {
  value       = aws_vpc.app.cidr_block
  description = "CIDR block of the app VPC"
}
```

```hcl
# In the database workspace - reference the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the security group ID from the other workspace
resource "aws_security_group" "db" {
  name_prefix = "db-"
  vpc_id      = aws_vpc.database.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [data.terraform_remote_state.networking.outputs.app_security_group_id]
  }

  tags = {
    Name = "database-sg"
  }
}
```

## Best Practices

1. **Prefer security group references over CIDRs** when possible. Security group references are more dynamic and don't break when subnets change.

2. **Use remote state or SSM parameters** to share security group IDs between workspaces instead of hardcoding them.

3. **Document your peering topology** because cross-VPC security group rules can be confusing when troubleshooting.

4. **Test connectivity** after applying changes. Security group references across VPCs require the peering connection to be active and routes to be in place.

5. **Be aware of limits** - each security group can have up to 60 inbound and 60 outbound rules (adjustable via AWS support).

Cross-VPC security group management is one of those areas where planning your network architecture up front saves significant headaches later. Choose the right connectivity method for your use case, and let Terraform handle the complexity of keeping everything in sync.

For more on VPC security, check out our guide on [configuring Network ACLs with Terraform](https://oneuptime.com/blog/post/2026-02-23-configure-network-acls-with-terraform/view).
