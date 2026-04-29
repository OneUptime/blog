# How to Use List Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, List, Collection, Infrastructure as Code, DevOps

Description: A guide to declaring and using list type variables in OpenTofu to work with ordered collections of values.

## Introduction

List variables in OpenTofu hold ordered sequences of values of the same type. They are used for multiple CIDR blocks, availability zones, instance IDs, and any other ordered collection of values.

## Declaring List Variables

```hcl
# List of strings

variable "instance_ids" {
  type = list(string)
}

# List with default
variable "allowed_cidr_blocks" {
  type    = list(string)
  default = ["10.0.0.0/8"]
}

# List of numbers
variable "subnet_sizes" {
  type    = list(number)
  default = [24, 24, 24]
}

# List with description and validation
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones to deploy in"
  default     = ["us-east-1a", "us-east-1b"]

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}
```

## Using Lists in Resources

```hcl
variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Use count with list index
resource "aws_subnet" "public" {
  count             = length(var.subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}
```

## List Functions

```hcl
variable "instances" {
  type    = list(string)
  default = ["web-1", "web-2", "web-3"]
}

locals {
  # Length
  count = length(var.instances)  # 3

  # Access elements
  first = var.instances[0]  # "web-1"
  last  = var.instances[length(var.instances) - 1]  # "web-3"

  # Slice
  first_two = slice(var.instances, 0, 2)  # ["web-1", "web-2"]

  # Contains
  has_web1 = contains(var.instances, "web-1")  # true

  # Index
  web2_index = index(var.instances, "web-2")  # 1

  # Concat
  all_servers = concat(var.instances, ["db-1", "db-2"])

  # Sort
  sorted = sort(var.instances)

  # Distinct (remove duplicates)
  unique = distinct(concat(var.instances, var.instances))

  # Flatten nested lists
  flat = flatten([["a", "b"], ["c", "d"]])  # ["a", "b", "c", "d"]
}
```

## List to Set Conversion

```hcl
variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-1", "subnet-2", "subnet-3"]
}

resource "aws_lb" "main" {
  name               = "main-alb"
  internal           = false
  load_balancer_type = "application"

  # Convert list to set for subnets
  subnets = toset(var.subnet_ids)
}
```

## Using for_each with Lists

```hcl
variable "instance_names" {
  type    = list(string)
  default = ["web-1", "web-2", "web-3"]
}

# Convert to set for for_each (for_each requires a map or set of strings)
resource "aws_instance" "web" {
  for_each = toset(var.instance_names)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = each.value
  }
}
```

## Conclusion

List variables are essential for working with multiple related resources in OpenTofu. The `count` meta-argument with list indexing and `for_each` with `toset()` conversion are common patterns for creating multiple similar resources from a list. Use `count` when the instances are interchangeable, and prefer `for_each` when each list value should define a stable instance identity. Always validate minimum list lengths when your infrastructure requires redundancy, such as requiring at least 2 availability zones for high availability.
