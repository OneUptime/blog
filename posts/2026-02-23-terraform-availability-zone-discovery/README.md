# How to Use Data Sources for Availability Zone Discovery in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Availability Zones, Data Source, High Availability

Description: Learn how to use the aws_availability_zones data source in Terraform to dynamically discover available AZs and build highly available infrastructure across zones.

---

Hardcoding availability zone names like `us-east-1a` and `us-east-1b` works until you deploy to a different region. Or until AWS adds a new zone. Or until a zone goes down and you need to redistribute workloads. The `aws_availability_zones` data source discovers available zones at plan time, letting you build infrastructure that automatically adapts to the region you deploy in.

## The Problem with Hardcoded AZs

```hcl
# Fragile - breaks in any region other than us-east-1
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = ["us-east-1a", "us-east-1b", "us-east-1c"][count.index]
}
```

This fails in `eu-west-1` because the zone names are different. It also fails if one of those zones is not available for your account.

## Basic Availability Zone Discovery

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

output "available_zones" {
  value = data.aws_availability_zones.available.names
}
```

This returns a list of all available AZ names in the current region, like `["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1e", "us-east-1f"]`.

## Creating Subnets Across All Available AZs

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = length(data.aws_availability_zones.available.names)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private"
  }
}
```

This creates one subnet per available AZ, regardless of region. Deploy to `us-east-1` and you get 6 subnets. Deploy to `ap-southeast-1` and you get 3. The infrastructure adapts automatically.

## Limiting the Number of AZs

Most applications do not need subnets in every AZ. Three is usually sufficient for high availability.

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Use at most 3 AZs
  az_count = min(3, length(data.aws_availability_zones.available.names))
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

resource "aws_subnet" "public" {
  count                   = local.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + local.az_count)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "private-${local.azs[count.index]}"
    Tier = "private"
  }
}
```

## Filtering AZs

### Exclude Local Zones and Wavelength Zones

AWS has introduced Local Zones and Wavelength Zones, which show up in AZ listings but are not standard AZs. Filter them out:

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}
```

The `opt-in-not-required` status means standard AZs. Local Zones and Wavelength Zones require opt-in.

### Exclude Specific Zones

Sometimes you want to exclude a zone known to have capacity issues:

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  exclude_names = ["us-east-1e"]

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}
```

### Exclude by Zone ID

Zone names (like `us-east-1a`) are not consistent across accounts. The physical zone mapped to `us-east-1a` in your account might be different from another account. Zone IDs (like `use1-az1`) are consistent. Use `exclude_zone_ids` when you need to exclude a specific physical zone:

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  exclude_zone_ids = ["use1-az3"]  # Exclude a specific physical zone
}
```

## Complete Multi-AZ VPC Pattern

Here is a production-ready pattern for a multi-AZ VPC:

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  az_count = min(var.az_count, length(data.aws_availability_zones.available.names))
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

# Public subnets - one per AZ
resource "aws_subnet" "public" {
  count                   = local.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${local.azs[count.index]}"
    Tier = "public"
  }
}

# Private subnets - one per AZ
resource "aws_subnet" "private" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + local.az_count)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project}-private-${local.azs[count.index]}"
    Tier = "private"
  }
}

# Database subnets - one per AZ
resource "aws_subnet" "database" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + (local.az_count * 2))
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project}-database-${local.azs[count.index]}"
    Tier = "database"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-igw"
  }
}

# NAT Gateways - one per AZ for high availability
resource "aws_eip" "nat" {
  count  = local.az_count
  domain = "vpc"

  tags = {
    Name = "${var.project}-nat-${local.azs[count.index]}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = local.az_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project}-nat-${local.azs[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = local.az_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project}-private-rt-${local.azs[count.index]}"
  }
}

resource "aws_route_table_association" "private" {
  count          = local.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## AZ Discovery with for_each

Using `for_each` instead of `count` makes the configuration more stable when AZs change:

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, min(3, length(data.aws_availability_zones.available.names)))
  az_map = { for idx, az in local.azs : az => idx }
}

resource "aws_subnet" "private" {
  for_each          = local.az_map
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value + 10)
  availability_zone = each.key

  tags = {
    Name = "private-${each.key}"
  }
}
```

With `for_each`, subnets are keyed by AZ name. If an AZ is added or removed, Terraform only affects the changed subnet rather than shifting indexes.

## Using AZ Data for RDS and EKS

### RDS DB Subnet Group

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "${var.project}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier          = "${var.project}-db"
  engine              = "postgres"
  instance_class      = "db.r6g.large"
  allocated_storage   = 100
  multi_az            = true  # AWS picks the AZs from the subnet group
  db_subnet_group_name = aws_db_subnet_group.main.name
}
```

### EKS with Multi-AZ Node Groups

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id  # Nodes spread across AZs

  scaling_config {
    desired_size = 6
    min_size     = 3
    max_size     = 12
  }
}
```

## Zone ID Lookups

Sometimes you need the zone ID (like `use1-az1`) instead of the zone name:

```hcl
data "aws_availability_zones" "available" {
  state = "available"
}

output "zone_details" {
  value = {
    names    = data.aws_availability_zones.available.names
    zone_ids = data.aws_availability_zones.available.zone_ids
  }
}
```

## Summary

Dynamic AZ discovery makes your Terraform configurations portable across regions and resilient to zone changes. Use `state = "available"` to filter out unavailable zones, exclude Local Zones with the `opt-in-status` filter, and limit the number of AZs with `min()` and `slice()`. Combine AZ discovery with `for_each` for stable resource management, and use the pattern to build multi-AZ VPCs, distribute workloads, and ensure high availability.

For related patterns, see our posts on [reading existing VPC information](https://oneuptime.com/blog/post/2026-02-23-terraform-data-sources-read-vpc-information/view) and [dynamic AMI lookup](https://oneuptime.com/blog/post/2026-02-23-terraform-dynamic-ami-lookup/view).
