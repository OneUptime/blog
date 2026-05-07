# How to Use Arithmetic Operators in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HCL, Arithmetic, Operator, Expression, Infrastructure as Code, DevOps

Description: A guide to using arithmetic operators in OpenTofu HCL expressions for mathematical calculations in infrastructure configurations.

## Introduction

OpenTofu supports standard arithmetic operators for mathematical calculations in expressions. These are useful for calculating resource counts, sizes, port numbers, CIDR ranges, and other numeric values based on variables or configuration.

## Basic Arithmetic Operators

```hcl
# Addition: +

# Subtraction: -
# Multiplication: *
# Division: /
# Modulo: %
# Negation: - (unary)

variable "instance_count" {
  type    = number
  default = 3
}

locals {
  # Basic arithmetic
  double_count = var.instance_count * 2        # 6
  half_count   = var.instance_count / 2        # 1.5
  plus_one     = var.instance_count + 1        # 4
  minus_one    = var.instance_count - 1        # 2
  remainder    = var.instance_count % 2        # 1
  negative     = -var.instance_count           # -3
}
```

## Calculating Resource Counts

```hcl
variable "az_count" {
  type    = number
  default = 3
  description = "Number of availability zones to use"
}

resource "aws_subnet" "public" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  # Offset private subnets by az_count to avoid CIDR conflicts
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.az_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
```

## Scaling Calculations

```hcl
variable "base_capacity" {
  type    = number
  default = 2
}

variable "scale_factor" {
  type    = number
  default = 3
}

resource "aws_autoscaling_group" "app" {
  name             = "app-asg"
  min_size         = var.base_capacity
  desired_capacity = var.base_capacity
  max_size         = var.base_capacity * var.scale_factor  # 6

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Storage Size Calculations

```hcl
variable "data_size_gb" {
  type    = number
  default = 100
}

locals {
  # Calculate storage with overhead
  total_storage   = var.data_size_gb * 1.2   # 20% overhead
  snapshot_size   = var.data_size_gb / 2     # Compressed snapshot estimate
  iops            = var.data_size_gb * 3     # 3 IOPS per GB
}

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = ceil(local.total_storage)
  iops              = local.iops
  type              = "io2"
}
```

## Port Number Calculations

```hcl
variable "base_port" {
  type    = number
  default = 8000
}

variable "service_count" {
  type    = number
  default = 4
}

resource "aws_vpc_security_group_ingress_rule" "services" {
  count = var.service_count

  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "10.0.0.0/8"
  from_port         = var.base_port + count.index
  ip_protocol       = "tcp"
  to_port           = var.base_port + count.index

  description = "Service ${count.index} on port ${var.base_port + count.index}"
}
```

## Working with Percentages

```hcl
variable "total_nodes" {
  type    = number
  default = 10
}

locals {
  # Allocate 80% on-demand and 20% spot capacity
  on_demand_count = floor(var.total_nodes * 0.8)   # 8 on-demand
  spot_count      = ceil(var.total_nodes * 0.2)    # 2 spot
}
```

## Whole Numbers vs Fractional Results

```hcl
locals {
  # In OpenTofu, division can produce fractional numbers
  result_fraction = 10 / 3   # 3.3333...

  # Use floor() to round down to a whole number
  result_floor = floor(10 / 3)   # 3

  # Use ceil() to round up to a whole number
  result_ceil = ceil(10 / 3)   # 4
}
```

## CIDR Subnet Calculations

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_count" {
  type    = number
  default = 6
}

# Calculate subnets with arithmetic for offset
resource "aws_subnet" "all" {
  count = var.subnet_count

  vpc_id     = aws_vpc.main.id
  # Each subnet is a /24, calculate index with arithmetic
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index * 10)
}
```

## Conclusion

Arithmetic operators in OpenTofu enable dynamic calculation of resource properties directly in your configuration. Common use cases include calculating resource counts from base values, computing storage sizes with overhead, determining port ranges, scaling autoscaling group limits, and offsetting CIDR blocks. Use the `floor()` and `ceil()` functions to convert fractional results to whole numbers when required by resource arguments or meta-arguments that expect them.
