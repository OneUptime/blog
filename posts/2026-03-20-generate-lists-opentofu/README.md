# How to Generate Lists and Collections in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, List, Collection, HCL, Range, Function, Infrastructure as Code

Description: Learn how to generate lists and collections in OpenTofu using range(), for expressions, flatten(), and other functions - creating dynamic resource configurations from compact inputs.

## Introduction

OpenTofu provides several functions for generating and transforming lists: `range()` for sequential numbers, `for` expressions for transformation and filtering, `flatten()` for nested lists, `setproduct()` for Cartesian products, and `cidrsubnets()` for IP address ranges. These enable compact, DRY configurations.

## range() Function

```hcl
# Generate a sequence of numbers

locals {
  port_sequence = range(8000, 8010)
  # [8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009]

  # With step
  even_ports = range(8000, 8020, 2)
  # [8000, 8002, 8004, 8006, 8008, 8010, 8012, 8014, 8016, 8018]
}

# Use range() to create sequential resources
resource "aws_security_group_rule" "app_ports" {
  count = 3

  type              = "ingress"
  security_group_id = aws_security_group.app.id
  protocol          = "tcp"
  from_port         = 8080 + count.index
  to_port           = 8080 + count.index
  cidr_blocks       = ["10.0.0.0/8"]
  description       = "App port ${8080 + count.index}"
}
```

## cidrsubnets() for IP Range Generation

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Generate 6 /24 subnets from the VPC CIDR
  # Arguments: base CIDR, then new bits to add for each subnet
  all_subnet_cidrs = cidrsubnets(var.vpc_cidr, 8, 8, 8, 8, 8, 8)
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]

  public_cidrs  = slice(local.all_subnet_cidrs, 0, 3)  # First 3
  private_cidrs = slice(local.all_subnet_cidrs, 3, 6)  # Last 3
}
```

## setproduct() for Cartesian Products

```hcl
# Create every combination of environment × region
locals {
  environments = ["dev", "staging", "prod"]
  regions      = ["us-east-1", "eu-west-1"]

  # All combinations
  env_region_pairs = setproduct(local.environments, local.regions)
  # [["dev", "us-east-1"], ["dev", "eu-west-1"], ["staging", "us-east-1"], ...]

  # Convert to map for for_each
  deployments = {
    for pair in local.env_region_pairs :
    "${pair[0]}-${pair[1]}" => { environment = pair[0], region = pair[1] }
  }
  # {"dev-us-east-1" = {environment="dev", region="us-east-1"}, ...}
}

resource "aws_s3_bucket" "regional_config" {
  for_each = local.deployments
  bucket   = "myapp-config-${each.key}"

  tags = {
    Environment = each.value.environment
    Region      = each.value.region
  }
}
```

## flatten() for Nested Lists

```hcl
variable "team_members" {
  default = {
    platform = ["alice", "bob"]
    app      = ["carol", "dave", "eve"]
    data     = ["frank"]
  }
}

# Flatten nested list of lists into a single list
locals {
  all_members = flatten([for team, members in var.team_members : members])
  # ["carol", "dave", "eve", "frank", "alice", "bob"]
}

# Create IAM users for all team members
resource "aws_iam_user" "all" {
  for_each = toset(local.all_members)
  name     = each.key
}
```

## Building Lists from Resource Outputs

```hcl
# Collect subnet IDs from multiple subnet resources
resource "aws_subnet" "public" {
  for_each = local.public_subnet_config
  # ... subnet config
}

resource "aws_subnet" "private" {
  for_each = local.private_subnet_config
  # ... subnet config
}

locals {
  # Combine all subnet IDs
  all_subnet_ids = concat(
    values(aws_subnet.public)[*].id,
    values(aws_subnet.private)[*].id
  )
}

resource "aws_db_subnet_group" "main" {
  name       = "prod-db-subnets"
  subnet_ids = local.all_subnet_ids
}
```

## tolist(), toset(), tomap() Conversions

```hcl
# Convert between collection types
variable "environment_list" {
  type    = list(string)
  default = ["dev", "staging", "prod", "dev"]  # Has duplicate
}

locals {
  # toset removes duplicates and discards ordering
  unique_environments = toset(var.environment_list)
  # Set of unique values; order is not preserved

  # tolist converts the set to a list
  env_list = tolist(local.unique_environments)
  # Example output: ["dev", "prod", "staging"] (order is not guaranteed)

  # tomap for explicit map
  env_map = tomap({
    development = "dev"
    production  = "prod"
  })
}
```

## concat() for Combining Lists

```hcl
variable "base_security_groups" {
  default = ["sg-base-id"]
}

variable "app_security_groups" {
  default = ["sg-app-id", "sg-monitoring-id"]
}

locals {
  all_security_groups = concat(
    var.base_security_groups,
    var.app_security_groups,
    ["sg-always-included"]
  )
  # ["sg-base-id", "sg-app-id", "sg-monitoring-id", "sg-always-included"]
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.latest.id
  instance_type          = "t3.medium"
  vpc_security_group_ids = local.all_security_groups
}
```

## Conclusion

OpenTofu's collection functions enable generating and transforming lists without repetition. Use `range()` for number sequences, `cidrsubnets()` for IP address allocation, `setproduct()` for Cartesian products of environments and regions, `flatten()` for nested list collapsing, and `concat()` for merging lists. Combine these with for expressions and `toset()`/`tomap()` conversions to build the exact data structures needed for `for_each` and resource arguments.
