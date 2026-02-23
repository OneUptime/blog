# How to Use the range Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Terraform Functions, Numeric Functions

Description: Learn how to use the range function in Terraform to generate sequences of numbers, with practical examples for resource creation, CIDR calculation, and iteration.

---

Generating sequences of numbers is a common need in Terraform - for creating numbered resources, calculating CIDR blocks, or iterating a specific number of times. The `range` function generates a list of numbers based on start, end, and optional step parameters. It behaves similarly to range functions found in Python and other languages.

This post covers the `range` function's three calling conventions, its behavior, and practical patterns for Terraform configurations.

## What is the range Function?

The `range` function generates a list of numbers. It supports three calling styles depending on how many arguments you provide.

```hcl
# One argument: generates 0 to (n-1)
range(n)

# Two arguments: generates from start to (end-1)
range(start, end)

# Three arguments: generates from start to (end-1) with a step
range(start, end, step)
```

The end value is exclusive - it is not included in the result.

## Basic Usage in Terraform Console

```hcl
# Single argument: 0 to n-1
> range(5)
[0, 1, 2, 3, 4]

# Two arguments: start to end-1
> range(2, 6)
[2, 3, 4, 5]

# Three arguments: start to end-1 with step
> range(0, 10, 2)
[0, 2, 4, 6, 8]

# Descending ranges with negative step
> range(10, 0, -2)
[10, 8, 6, 4, 2]

# Start equals end produces empty list
> range(5, 5)
[]

# Single step
> range(0, 1)
[0]

# range(0) produces empty list
> range(0)
[]
```

## Creating Numbered Resources

The most straightforward use of `range` is generating indices for resource creation.

```hcl
variable "instance_count" {
  type    = number
  default = 5
}

locals {
  instance_indices = range(var.instance_count)
  # [0, 1, 2, 3, 4]

  instance_names = [
    for i in range(var.instance_count) :
    "web-server-${i + 1}"
  ]
  # ["web-server-1", "web-server-2", ..., "web-server-5"]
}

resource "aws_instance" "web" {
  count = var.instance_count

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name  = local.instance_names[count.index]
    Index = count.index
  }
}
```

## Generating CIDR Blocks

The `range` function pairs naturally with `cidrsubnet` for generating multiple subnet CIDR blocks.

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_count" {
  type    = number
  default = 6
}

locals {
  # Generate CIDR blocks for each subnet
  subnet_cidrs = [
    for i in range(var.subnet_count) :
    cidrsubnet(var.vpc_cidr, 8, i)
  ]
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24",
  #  "10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]
}

resource "aws_subnet" "app" {
  count = var.subnet_count

  vpc_id     = aws_vpc.main.id
  cidr_block = local.subnet_cidrs[count.index]

  tags = {
    Name = "app-subnet-${count.index + 1}"
  }
}
```

## Port Range Generation

Use `range` with a step to generate port numbers.

```hcl
locals {
  # Generate a range of ports for a service mesh
  base_port    = 8080
  service_count = 5

  service_ports = [
    for i in range(local.service_count) :
    local.base_port + i
  ]
  # [8080, 8081, 8082, 8083, 8084]

  # Even-numbered ports only
  even_ports = range(8080, 8090, 2)
  # [8080, 8082, 8084, 8086, 8088]
}

resource "aws_security_group_rule" "service_mesh" {
  count = length(local.service_ports)

  type              = "ingress"
  from_port         = local.service_ports[count.index]
  to_port           = local.service_ports[count.index]
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
  security_group_id = aws_security_group.mesh.id
}
```

## Building Time-Based Configurations

The `range` function is useful for creating time-based or schedule-based configurations.

```hcl
locals {
  # Generate backup windows for each day of the week (0-6)
  backup_windows = {
    for day in range(7) :
    day => {
      start_hour = 2 + day  # Stagger backups across days
      day_name   = element(
        ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        day
      )
    }
  }

  # Generate hourly health check intervals
  health_check_minutes = range(0, 60, 15)
  # [0, 15, 30, 45]
}
```

## Pagination and Batching

Use `range` for creating pagination structures.

```hcl
variable "total_items" {
  type    = number
  default = 100
}

variable "page_size" {
  type    = number
  default = 25
}

locals {
  total_pages = ceil(var.total_items / var.page_size)

  page_offsets = [
    for page in range(local.total_pages) :
    {
      page   = page + 1
      offset = page * var.page_size
      limit  = min(var.page_size, var.total_items - (page * var.page_size))
    }
  ]
}

output "pagination" {
  value = local.page_offsets
  # [
  #   { page = 1, offset = 0,  limit = 25 },
  #   { page = 2, offset = 25, limit = 25 },
  #   { page = 3, offset = 50, limit = 25 },
  #   { page = 4, offset = 75, limit = 25 },
  # ]
}
```

## Matrix Generation

Combine `range` with nested `for` expressions to generate matrices or grids.

```hcl
locals {
  rows = 3
  cols = 4

  # Generate a grid of coordinates
  grid = flatten([
    for row in range(local.rows) : [
      for col in range(local.cols) : {
        row = row
        col = col
        id  = "${row}-${col}"
      }
    ]
  ])
}

output "grid_points" {
  value = [for point in local.grid : point.id]
  # ["0-0", "0-1", "0-2", "0-3", "1-0", "1-1", "1-2", "1-3", "2-0", "2-1", "2-2", "2-3"]
}
```

## Rolling Deployment Indices

Use `range` with a step to create rolling deployment groups.

```hcl
variable "total_instances" {
  type    = number
  default = 12
}

variable "batch_size" {
  type    = number
  default = 3
}

locals {
  # Generate batch start indices
  batch_starts = range(0, var.total_instances, var.batch_size)
  # [0, 3, 6, 9]

  # Create deployment batches
  batches = [
    for start in local.batch_starts : {
      batch_number = (start / var.batch_size) + 1
      instances    = range(start, min(start + var.batch_size, var.total_instances))
    }
  ]
}

output "deployment_plan" {
  value = local.batches
  # [
  #   { batch_number = 1, instances = [0, 1, 2] },
  #   { batch_number = 2, instances = [3, 4, 5] },
  #   { batch_number = 3, instances = [6, 7, 8] },
  #   { batch_number = 4, instances = [9, 10, 11] },
  # ]
}
```

## Combining range with Other Functions

The `range` function works well with other functions for complex computations.

```hcl
locals {
  # Generate IP addresses in a subnet
  base_ip = "10.0.1"
  ip_count = 10

  ip_addresses = [
    for i in range(10, 10 + local.ip_count) :
    "${local.base_ip}.${i}"
  ]
  # ["10.0.1.10", "10.0.1.11", ..., "10.0.1.19"]

  # Generate weighted distribution
  weights = [for i in range(5) : pow(2, i)]
  # [1, 2, 4, 8, 16]
}
```

## Edge Cases

A few things to keep in mind:

- **Empty ranges**: `range(0)` and `range(5, 5)` both produce empty lists.
- **Negative steps**: The step can be negative for descending sequences, but start must be greater than end.
- **Step of zero**: Using a step of 0 causes an error (infinite loop prevention).
- **Floating point**: `range` works with integers. For floating-point sequences, you will need manual computation.

```hcl
# Empty ranges
> range(0)
[]

> range(3, 3)
[]

# Descending
> range(5, 0, -1)
[5, 4, 3, 2, 1]

# Step of 0 causes an error
# range(0, 5, 0) -> Error
```

## Summary

The `range` function is the standard tool for generating number sequences in Terraform. It enables patterns for numbered resource creation, CIDR calculation, batch processing, and grid generation.

Key takeaways:

- `range(n)` generates `[0, 1, ..., n-1]`
- `range(start, end)` generates from start to end (exclusive)
- `range(start, end, step)` generates with a custom step size
- The end value is always exclusive
- Supports negative steps for descending sequences
- Pairs naturally with `for` expressions and `cidrsubnet`
- Empty range (start equals end) returns an empty list

Whenever you need a sequence of numbers in Terraform, `range` is your function.
