# How to Use Data Sources to Read Existing VPC Information in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC, AWS, Data Source, Networking, Infrastructure as Code

Description: Learn how to use Terraform data sources to look up existing VPC, subnet, security group, and routing information for deploying resources into pre-existing network infrastructure.

---

In most organizations, the VPC and core networking infrastructure already exist when you start deploying applications. The networking team creates the VPCs, subnets, route tables, and NAT gateways. Your job is to deploy application resources into that existing network. You do not want to manage the network infrastructure - you just need to reference it.

Terraform data sources let you read all the details about existing VPC components without importing them into your state. This post covers every common VPC lookup pattern you will need.

## Looking Up a VPC

### By Tags

The most common approach:

```hcl
data "aws_vpc" "main" {
  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

output "vpc_details" {
  value = {
    id         = data.aws_vpc.main.id
    cidr_block = data.aws_vpc.main.cidr_block
    owner_id   = data.aws_vpc.main.owner_id
  }
}
```

### By ID

When you know the exact VPC ID:

```hcl
data "aws_vpc" "main" {
  id = var.vpc_id
}
```

### By CIDR Block

```hcl
data "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

### The Default VPC

```hcl
data "aws_vpc" "default" {
  default = true
}
```

### Using Filters

```hcl
data "aws_vpc" "main" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
```

## Looking Up Subnets

### All Subnets in a VPC

```hcl
data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}

output "all_subnet_ids" {
  value = data.aws_subnets.all.ids
}
```

### Subnets by Tier (Public/Private)

```hcl
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "public"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

data "aws_subnets" "database" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "database"
  }
}
```

### Getting Full Subnet Details

The `aws_subnets` data source returns only IDs. To get full details for each subnet, combine it with `aws_subnet`:

```hcl
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "private"
  }
}

data "aws_subnet" "private_details" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

output "private_subnets" {
  value = {
    for id, subnet in data.aws_subnet.private_details : id => {
      cidr_block        = subnet.cidr_block
      availability_zone = subnet.availability_zone
      available_ips     = subnet.available_ip_address_count
    }
  }
}
```

### Subnets by Availability Zone

```hcl
data "aws_subnets" "private_us_east_1a" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "availability-zone"
    values = ["us-east-1a"]
  }

  tags = {
    Tier = "private"
  }
}
```

## Looking Up Security Groups

### By Name

```hcl
data "aws_security_group" "web" {
  vpc_id = data.aws_vpc.main.id

  filter {
    name   = "group-name"
    values = ["web-server-sg"]
  }
}
```

### By Tags

```hcl
data "aws_security_group" "app" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Name = "application-sg"
  }
}
```

### Multiple Security Groups

```hcl
data "aws_security_groups" "app" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "group-name"
    values = ["app-*"]
  }
}

output "app_security_groups" {
  value = data.aws_security_groups.app.ids
}
```

## Looking Up Route Tables

```hcl
data "aws_route_tables" "private" {
  vpc_id = data.aws_vpc.main.id

  tags = {
    Tier = "private"
  }
}

data "aws_route_table" "main" {
  vpc_id = data.aws_vpc.main.id

  filter {
    name   = "association.main"
    values = ["true"]
  }
}
```

## Looking Up NAT Gateways

```hcl
data "aws_nat_gateways" "main" {
  vpc_id = data.aws_vpc.main.id

  filter {
    name   = "state"
    values = ["available"]
  }
}

data "aws_nat_gateway" "primary" {
  vpc_id = data.aws_vpc.main.id

  filter {
    name   = "state"
    values = ["available"]
  }

  tags = {
    Name = "primary-nat"
  }
}
```

## Looking Up Internet Gateways

```hcl
data "aws_internet_gateway" "main" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.main.id]
  }
}
```

## Looking Up VPC Endpoints

```hcl
data "aws_vpc_endpoint" "s3" {
  vpc_id       = data.aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
}

output "s3_endpoint_id" {
  value = data.aws_vpc_endpoint.s3.id
}
```

## Complete Application Deployment Pattern

Here is a full example of deploying an application into an existing VPC:

```hcl
# Look up the existing VPC
data "aws_vpc" "main" {
  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Find private subnets for the application
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    Tier = "private"
  }
}

# Find public subnets for the load balancer
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    Tier = "public"
  }
}

# Find the existing bastion security group
data "aws_security_group" "bastion" {
  vpc_id = data.aws_vpc.main.id
  tags   = { Name = "bastion-sg" }
}

# Create application-specific security group
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [data.aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-sg"
  }
}

# ALB security group
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-sg"
  }
}

# Application Load Balancer in public subnets
resource "aws_lb" "app" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids
}

# EC2 instances in private subnets
resource "aws_instance" "app" {
  count                  = length(data.aws_subnets.private.ids)
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.private.ids[count.index]
  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name = "app-${count.index + 1}"
  }
}

# RDS in database subnets
data "aws_subnets" "database" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    Tier = "database"
  }
}

resource "aws_db_subnet_group" "app" {
  name       = "app-db-subnet-group"
  subnet_ids = data.aws_subnets.database.ids
}

resource "aws_db_instance" "app" {
  identifier           = "app-database"
  engine               = "postgres"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  db_subnet_group_name = aws_db_subnet_group.app.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot  = false
}
```

## Validating VPC Data with Preconditions

Use preconditions to verify the VPC meets your requirements:

```hcl
data "aws_vpc" "main" {
  tags = {
    Name = "${var.environment}-vpc"
  }

  lifecycle {
    postcondition {
      condition     = self.enable_dns_support == true
      error_message = "VPC must have DNS support enabled."
    }

    postcondition {
      condition     = self.enable_dns_hostnames == true
      error_message = "VPC must have DNS hostnames enabled."
    }
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = { Tier = "private" }

  lifecycle {
    postcondition {
      condition     = length(self.ids) >= 2
      error_message = "At least 2 private subnets are required for high availability."
    }
  }
}
```

## Tips for Working with VPC Data Sources

1. **Use tags consistently.** Agree on a tagging standard with the networking team. Tags like `Tier`, `Environment`, and `Name` make lookups reliable.

2. **Validate assumptions.** Use preconditions and postconditions to verify the network meets your requirements before deploying.

3. **Cache with locals.** If you reference the same data source output multiple times, store it in a local for readability.

4. **Handle the default VPC carefully.** Do not accidentally deploy production workloads into the default VPC. Check `data.aws_vpc.main.default` if needed.

5. **Document data source dependencies.** Make it clear what network infrastructure must exist before your configuration can be applied.

## Summary

Reading existing VPC information with data sources is fundamental to deploying applications in shared network environments. Look up VPCs by tag or ID, find subnets by tier and availability zone, reference existing security groups, and query route tables and NAT gateways. Combine these lookups to deploy application resources into pre-existing networks without managing the network infrastructure yourself.

For more on data sources, see our posts on [querying infrastructure with data sources](https://oneuptime.com/blog/post/2026-02-23-terraform-query-infrastructure-data-sources/view) and [data source filters](https://oneuptime.com/blog/post/2026-02-23-terraform-data-sources-filters/view).
