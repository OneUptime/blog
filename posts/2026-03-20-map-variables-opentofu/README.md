# How to Use Map Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Map, Collection, Infrastructure as Code, DevOps

Description: A guide to using map type variables in OpenTofu to manage key-value pairs and environment-specific configurations.

## Introduction

Map variables hold key-value pairs where all values have the same type. They are ideal for tags, environment-specific configurations, and any data that is naturally structured as a dictionary. Maps are one of the most versatile types in OpenTofu.

## Declaring Map Variables

```hcl
# Map of strings

variable "instance_types" {
  type = map(string)
}

# Map with default
variable "environment_config" {
  type = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

# Map of numbers
variable "replica_counts" {
  type = map(number)
  default = {
    dev     = 1
    staging = 2
    prod    = 3
  }
}

# Map with validation
variable "allowed_regions" {
  type        = map(string)
  description = "Map of environment to AWS region"
  default = {
    dev  = "us-east-1"
    prod = "us-west-2"
  }

  validation {
    condition     = length(var.allowed_regions) > 0
    error_message = "At least one region mapping is required."
  }
}
```

## Lookup Pattern

```hcl
variable "environment" {
  type    = string
  default = "dev"
}

variable "instance_type_map" {
  type = map(string)
  default = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.xlarge"
  }
}

resource "aws_instance" "web" {
  ami = "ami-0c55b159cbfafe1f0"

  # Direct index lookup works when the key is guaranteed to exist:
  # instance_type = var.instance_type_map[var.environment]

  # Use lookup() with a default fallback
  instance_type = lookup(var.instance_type_map, var.environment, "t3.micro")
}
```

## Map for Tags

```hcl
variable "common_tags" {
  type = map(string)
  default = {
    Project     = "myapp"
    ManagedBy   = "OpenTofu"
    Owner       = "platform-team"
  }
}

variable "extra_tags" {
  type    = map(string)
  default = {}
}

locals {
  # Merge maps for tags
  all_tags = merge(
    var.common_tags,
    var.extra_tags,
    {
      Environment = var.environment
    }
  )
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = local.all_tags
}
```

## Map Functions

```hcl
variable "config" {
  type = map(string)
  default = {
    name    = "myapp"
    region  = "us-east-1"
    version = "1.0"
  }
}

locals {
  # Get keys
  all_keys = keys(var.config)  # ["name", "region", "version"]

  # Get values
  all_values = values(var.config)  # ["myapp", "us-east-1", "1.0"]

  # Merge maps
  merged = merge(var.config, { environment = "dev" })

  # Check if key exists
  has_name = contains(keys(var.config), "name")  # true

  # Lookup with default
  db_host = lookup(var.config, "db_host", "localhost")

  # Convert to list of objects
  as_list = [for k, v in var.config : { key = k, value = v }]
}
```

## Using for_each with Maps

```hcl
variable "security_groups" {
  type = map(object({
    description = string
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = {
    http = {
      description = "HTTP access"
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
    https = {
      description = "HTTPS access"
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}

resource "aws_security_group" "main" {
  name   = "example-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group_rule" "ingress" {
  for_each = var.security_groups

  type              = "ingress"
  security_group_id = aws_security_group.main.id
  description       = each.value.description
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = each.value.protocol
  cidr_blocks       = each.value.cidr_blocks
}
```

## Conclusion

Map variables are one of the most powerful types in OpenTofu, enabling environment-specific configurations, tag management, and complex data structures. The `lookup()` function provides safe key access with defaults, while `for_each` with map variables creates cleanly-named resources with natural key-based addressing. Use maps whenever your data has natural key-value structure.
