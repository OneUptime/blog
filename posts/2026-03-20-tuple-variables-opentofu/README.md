# How to Use Tuple Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Tuple, Structural Types, Infrastructure as Code, DevOps

Description: A guide to using tuple type variables in OpenTofu for fixed-length sequences with mixed types.

## Introduction

Tuple variables define fixed-length sequences where each element can have a different type. Unlike lists (which require all elements to be the same type), tuples support heterogeneous element types but with a fixed number of elements. Tuples are useful for representing fixed-structure data like pairs or triples.

## Declaring Tuple Variables

```hcl
# Tuple with two elements: string and number

variable "server_spec" {
  type = tuple([string, number])
  # Example value: ["t3.micro", 20]
}

# Tuple with three elements
variable "db_config_tuple" {
  type = tuple([string, string, number])
  # Example: ["postgres", "15.4", 20]
  default = ["postgres", "15.4", 20]
}

# Tuple with mixed types
variable "alert_config" {
  type = tuple([string, number, bool])
  # Example: ["email@example.com", 5, true]
  default = ["ops@company.com", 5, true]
}
```

## Accessing Tuple Elements

```hcl
variable "instance_spec" {
  type    = tuple([string, number, bool])
  default = ["t3.micro", 20, true]
}

locals {
  # Access by index (0-based)
  instance_type = var.instance_spec[0]  # "t3.micro"
  disk_size     = var.instance_spec[1]  # 20
  monitoring    = var.instance_spec[2]  # true
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.instance_type   # "t3.micro"

  root_block_device {
    volume_size = local.disk_size       # 20
  }

  monitoring = local.monitoring          # true
}
```

## Tuple vs List vs Object

```hcl
# List: ordered, same type, variable length
variable "as_list" {
  type = list(string)
  default = ["a", "b", "c"]
}

# Tuple: ordered, mixed types, FIXED length
variable "as_tuple" {
  type = tuple([string, number, bool])
  default = ["hello", 42, true]
}

# Object: named attributes, mixed types
variable "as_object" {
  type = object({
    name    = string
    count   = number
    enabled = bool
  })
  default = {
    name    = "hello"
    count   = 42
    enabled = true
  }
}
```

## Practical Tuple Use Cases

```hcl
# IP address with CIDR notation components
variable "network" {
  type = tuple([string, number])
  # [ip, prefix_length]
  default = ["10.0.0.0", 16]
}

locals {
  ip_address    = var.network[0]  # "10.0.0.0"
  prefix_length = var.network[1]  # 16
  cidr_block    = "${local.ip_address}/${local.prefix_length}"  # "10.0.0.0/16"
}

# Key-value pair for configuration
variable "environment_pair" {
  type = tuple([string, string])
  # [environment_name, aws_region]
  default = ["production", "us-east-1"]
}

locals {
  env_name   = var.environment_pair[0]  # "production"
  aws_region = var.environment_pair[1]  # "us-east-1"
}
```

## Using Tuples in Outputs

```hcl
output "instance_info" {
  description = "Instance type and disk size tuple"
  value       = [aws_instance.web.instance_type, aws_instance.web.root_block_device[0].volume_size]
  # Returns: ["t3.micro", 20]
}
```

## Limitations of Tuples

```hcl
# Tuples have a fixed length - you cannot add/remove elements
# This is different from lists which can have any length

# Tuples are accessed by index only (no named attributes like objects)
# For named access, use objects instead

# Generally, prefer objects over tuples for complex structured data
# as objects provide named access which is more readable
```

## When to Use Tuples

```hcl
# Good use cases for tuples:
# 1. Simple pair/triple of different types
# 2. Return values from complex expressions
# 3. Intermediate computations

# Usually, objects are more readable for user-facing variables
# Use tuples for internal computations

locals {
  # Tuple from for expression
  zone_pairs = [
    for i, az in var.availability_zones :
    [az, var.subnet_cidrs[i]]
  ]
}
```

## Conclusion

Tuples are a specialized type in OpenTofu that combine ordered indexing with mixed type support. While useful in specific scenarios like fixed key-value pairs or position-based configurations, objects are generally preferable for user-facing variables as they provide named attribute access that is more readable and self-documenting. Use tuples when you need ordered access to a fixed set of differently-typed values.
