# How to Create Subnets with IPv4 CIDR Ranges Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Subnets, IPv4, CIDR, Infrastructure as Code, VPC

Description: Create public and private AWS subnets with IPv4 CIDR ranges across multiple availability zones using Terraform, with dynamic CIDR calculation and for_each patterns.

## Introduction

AWS subnets partition a VPC's IPv4 CIDR into smaller blocks. Terraform's `aws_subnet` resource creates subnets declaratively, and `cidrsubnet()` calculates child CIDRs automatically. A subnet is public only when its route table has a route to an Internet Gateway; `map_public_ip_on_launch` only controls whether launched instances get public IPv4 addresses.

## Static Subnet Creation

```hcl
# subnets.tf

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "zone-type"
    values = ["availability-zone"]
  }
}

# Public-tier subnets (one per AZ)
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.64.0.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-a"
    Tier = "public"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.64.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = { Name = "public-b", Tier = "public" }
}

# Private-tier subnets
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.64.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  tags = { Name = "private-a", Tier = "private" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.64.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  tags = { Name = "private-b", Tier = "private" }
}
```

## Dynamic Subnets with cidrsubnet()

```hcl
locals {
  azs             = data.aws_availability_zones.available.names
  vpc_cidr        = "10.64.0.0/16"
  public_subnets  = [for i, _ in local.azs : cidrsubnet(local.vpc_cidr, 8, i)]
  private_subnets = [for i, _ in local.azs : cidrsubnet(local.vpc_cidr, 8, i + 10)]
}

resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "private-${local.azs[count.index]}"
    Tier = "private"
  }
}
```

## cidrsubnet() Reference

```hcl
# cidrsubnet(prefix, newbits, netnum)
# prefix   = "10.64.0.0/16"
# newbits  = 8 means add 8 bits = /24 subnets
# netnum   = sequential index

# cidrsubnet("10.64.0.0/16", 8, 0)  returns "10.64.0.0/24"
# cidrsubnet("10.64.0.0/16", 8, 1)  returns "10.64.1.0/24"
# cidrsubnet("10.64.0.0/16", 8, 10) returns "10.64.10.0/24"
```

## Outputs

```hcl
output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_cidrs" {
  value = aws_subnet.public[*].cidr_block
}
```

## Deploy

```bash
terraform plan
terraform apply
terraform output public_subnet_cidrs
```

## Conclusion

Use `cidrsubnet()` to calculate subnet CIDRs programmatically from the VPC CIDR, avoiding manual subnet calculation and repeated subnet CIDR literals. The `count` pattern creates one subnet per availability zone automatically. Tag subnets with `Tier = "public"/"private"` for internal organization, and add `kubernetes.io/role/elb = "1"` or `kubernetes.io/role/internal-elb = "1"` when you need AWS load balancer or EKS subnet auto-discovery.
