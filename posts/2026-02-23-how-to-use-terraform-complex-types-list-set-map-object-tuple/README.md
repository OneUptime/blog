# How to Use Terraform Complex Types (list set map object tuple)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, Types, Variables, Collection

Description: Learn how to use Terraform's complex types including list, set, map, object, and tuple to model real infrastructure data and build flexible configurations.

---

Once you move past simple string and number variables, you quickly need to represent more complex data: a list of subnet CIDRs, a map of environment-specific settings, an object describing a server configuration. Terraform's complex types handle all of this.

There are five complex types in Terraform, split into two categories: collection types (list, set, map) and structural types (object, tuple). The distinction matters because it affects how you declare them, how Terraform validates them, and how you access their elements.

## Collection Types

Collection types group multiple values of the same type together.

### list

A list is an ordered sequence of values, all of the same type. Elements are accessed by index starting at 0.

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "ports" {
  type    = list(number)
  default = [80, 443, 8080, 8443]
}

# Accessing list elements
locals {
  first_az = var.availability_zones[0]  # "us-east-1a"
  last_az  = var.availability_zones[2]  # "us-east-1c"

  # List functions
  az_count   = length(var.availability_zones)  # 3
  has_port   = contains(var.ports, 443)        # true
  sorted     = sort(var.availability_zones)
  reversed   = reverse(var.ports)
  sliced     = slice(var.ports, 0, 2)          # [80, 443]
}
```

Using lists with resources:

```hcl
# Create a subnet in each availability zone
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "public-${var.availability_zones[count.index]}"
  }
}
```

### set

A set is an unordered collection of unique values, all of the same type. You cannot access elements by index because there is no order.

```hcl
variable "allowed_regions" {
  type    = set(string)
  default = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Sets automatically deduplicate
locals {
  # If you pass duplicates, they are removed
  tags = toset(["web", "api", "web", "api"])
  # Result: ["api", "web"] (deduplicated and sorted)
}
```

Sets are most commonly used with `for_each`:

```hcl
variable "bucket_names" {
  type    = set(string)
  default = ["logs", "data", "backups"]
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.bucket_names

  bucket = "${var.project}-${each.value}"

  tags = {
    Name = each.value
  }
}
```

### map

A map is a collection of key-value pairs where all keys are strings and all values have the same type.

```hcl
variable "instance_types" {
  type = map(string)
  default = {
    dev        = "t3.micro"
    staging    = "t3.small"
    production = "t3.large"
  }
}

variable "port_mapping" {
  type = map(number)
  default = {
    http  = 80
    https = 443
    api   = 8080
  }
}

# Accessing map elements
locals {
  prod_type = var.instance_types["production"]  # "t3.large"
  api_port  = var.port_mapping["api"]           # 8080

  # Safe access with lookup (provides default if key missing)
  test_type = lookup(var.instance_types, "test", "t3.nano")  # "t3.nano"

  # Map functions
  all_keys   = keys(var.instance_types)    # ["dev", "production", "staging"]
  all_values = values(var.instance_types)  # ["t3.micro", "t3.large", "t3.small"]
}
```

Maps work naturally with `for_each`:

```hcl
variable "buckets" {
  type = map(string)
  default = {
    logs    = "private"
    assets  = "public-read"
    backups = "private"
  }
}

resource "aws_s3_bucket" "all" {
  for_each = var.buckets

  bucket = "${var.project}-${each.key}"

  tags = {
    Name       = each.key
    Visibility = each.value
  }
}
```

## Structural Types

Structural types define a fixed structure where each element can have a different type.

### object

An object is like a map, but each attribute has its own type. This is how you define structured configuration.

```hcl
variable "database_config" {
  type = object({
    engine         = string
    engine_version = string
    instance_class = string
    allocated_storage = number
    multi_az       = bool
  })
  default = {
    engine            = "postgres"
    engine_version    = "15.4"
    instance_class    = "db.t3.micro"
    allocated_storage = 20
    multi_az          = false
  }
}

# Accessing object attributes
resource "aws_db_instance" "main" {
  engine            = var.database_config.engine
  engine_version    = var.database_config.engine_version
  instance_class    = var.database_config.instance_class
  allocated_storage = var.database_config.allocated_storage
  multi_az          = var.database_config.multi_az
}
```

Objects can have optional attributes with defaults (Terraform 1.3+):

```hcl
variable "server_config" {
  type = object({
    name          = string
    instance_type = string
    # Optional attributes with defaults
    monitoring    = optional(bool, false)
    volume_size   = optional(number, 20)
    tags          = optional(map(string), {})
  })
}

# Usage - only required attributes need to be specified
# server_config = {
#   name          = "web-01"
#   instance_type = "t3.micro"
#   # monitoring defaults to false
#   # volume_size defaults to 20
#   # tags defaults to {}
# }
```

### tuple

A tuple is like a list, but each position has its own type. Tuples are less commonly used than objects.

```hcl
variable "rule" {
  type    = tuple([string, number, string])
  default = ["allow", 443, "tcp"]
}

# Accessing tuple elements by index
locals {
  action   = var.rule[0]  # "allow"
  port     = var.rule[1]  # 443
  protocol = var.rule[2]  # "tcp"
}
```

In practice, objects are almost always preferred over tuples because named attributes are much more readable than positional indices.

## Nested Complex Types

The real power comes from nesting types:

```hcl
# List of objects
variable "servers" {
  type = list(object({
    name          = string
    instance_type = string
    subnet_id     = string
    tags          = map(string)
  }))
  default = [
    {
      name          = "web-01"
      instance_type = "t3.micro"
      subnet_id     = "subnet-abc123"
      tags          = { Role = "web" }
    },
    {
      name          = "api-01"
      instance_type = "t3.small"
      subnet_id     = "subnet-def456"
      tags          = { Role = "api" }
    },
  ]
}

# Map of objects
variable "environments" {
  type = map(object({
    instance_type = string
    min_count     = number
    max_count     = number
    enable_ssl    = bool
  }))
  default = {
    dev = {
      instance_type = "t3.micro"
      min_count     = 1
      max_count     = 2
      enable_ssl    = false
    }
    production = {
      instance_type = "t3.large"
      min_count     = 3
      max_count     = 10
      enable_ssl    = true
    }
  }
}
```

Using nested types with `for_each`:

```hcl
resource "aws_instance" "servers" {
  for_each = { for server in var.servers : server.name => server }

  ami           = data.aws_ami.ubuntu.id
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id

  tags = merge(each.value.tags, {
    Name      = each.value.name
    ManagedBy = "terraform"
  })
}
```

## Collection Type vs. Structural Type

Here is when to use which:

| Use Case | Type | Why |
|----------|------|-----|
| List of similar items | `list(string)`, `list(number)` | All items have the same type |
| Unique identifiers | `set(string)` | Need deduplication and `for_each` |
| Simple key-value lookup | `map(string)` | Keys map to values of one type |
| Structured configuration | `object({...})` | Each field has a different type |
| List of structured items | `list(object({...}))` | Multiple items with mixed-type fields |
| Environment configs | `map(object({...}))` | Named environments with structured settings |

## Type Conversion Between Complex Types

```hcl
locals {
  # List to set
  unique_items = toset(["a", "b", "a", "c"])  # set: ["a", "b", "c"]

  # Set to list
  ordered_items = tolist(toset(["c", "a", "b"]))  # list: ["a", "b", "c"]

  # Map from list of objects
  server_map = { for s in var.servers : s.name => s }

  # List from map values
  server_list = values(var.environments)
}
```

## Practical Example: Multi-Environment Setup

```hcl
variable "config" {
  type = map(object({
    vpc_cidr      = string
    instance_type = string
    replicas      = number
    features = object({
      monitoring = bool
      backups    = bool
      cdn        = bool
    })
    allowed_cidrs = list(string)
    tags          = map(string)
  }))

  default = {
    dev = {
      vpc_cidr      = "10.0.0.0/16"
      instance_type = "t3.micro"
      replicas      = 1
      features = {
        monitoring = false
        backups    = false
        cdn        = false
      }
      allowed_cidrs = ["10.0.0.0/8"]
      tags = {
        Environment = "dev"
        CostCenter  = "engineering"
      }
    }
    production = {
      vpc_cidr      = "10.1.0.0/16"
      instance_type = "t3.large"
      replicas      = 3
      features = {
        monitoring = true
        backups    = true
        cdn        = true
      }
      allowed_cidrs = ["10.0.0.0/8", "172.16.0.0/12"]
      tags = {
        Environment = "production"
        CostCenter  = "operations"
      }
    }
  }
}

locals {
  env = var.config[terraform.workspace]
}

resource "aws_vpc" "main" {
  cidr_block = local.env.vpc_cidr
  tags       = local.env.tags
}
```

## Summary

Terraform's five complex types break into two categories: collection types (`list`, `set`, `map`) for groups of same-typed values, and structural types (`object`, `tuple`) for mixed-type structures. In practice, `list(object({...}))` and `map(object({...}))` are the most common patterns for modeling real infrastructure configurations. Use `set` when you need uniqueness and `for_each`, use `object` when different fields have different types, and nest types freely to model whatever structure your infrastructure requires.
