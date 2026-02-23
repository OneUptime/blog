# How to Use Variables of Type List in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Lists, HCL, Infrastructure as Code

Description: Learn how to declare and use list-type variables in Terraform, including list operations, indexing, iteration with count and for_each, and practical AWS examples.

---

Lists are one of Terraform's most commonly used collection types. A list is an ordered sequence of values, all of the same type. You will find yourself reaching for list variables whenever you need to work with multiple availability zones, CIDR blocks, subnet IDs, security group rules, or any other collection of similar items.

This post covers how to declare list variables, operate on them, and use them effectively in real infrastructure configurations.

## Declaring List Variables

A list variable is declared with `type = list(element_type)`:

```hcl
# variables.tf

# List of strings
variable "availability_zones" {
  description = "List of AZs to deploy resources in"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# List of numbers
variable "allowed_ports" {
  description = "Ports to open in the security group"
  type        = list(number)
  default     = [80, 443, 8080]
}

# List of booleans (less common)
variable "feature_flags" {
  description = "Feature toggles in order"
  type        = list(bool)
  default     = [true, false, true]
}
```

The `list()` type requires all elements to be the same type. You cannot mix strings and numbers in a `list(string)`.

## Providing List Values

### In terraform.tfvars

```hcl
# terraform.tfvars

availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c",
]

allowed_ports = [80, 443, 8080, 8443]
```

### On the Command Line

```bash
terraform apply -var='availability_zones=["us-west-2a", "us-west-2b"]'
```

### Via Environment Variables

```bash
export TF_VAR_availability_zones='["us-east-1a", "us-east-1b"]'
```

### In JSON

```json
{
  "availability_zones": ["us-east-1a", "us-east-1b", "us-east-1c"],
  "allowed_ports": [80, 443, 8080]
}
```

## Accessing List Elements

### By Index

Lists are zero-indexed. Use bracket notation to access individual elements:

```hcl
locals {
  # First availability zone
  primary_az = var.availability_zones[0]

  # Second availability zone
  secondary_az = var.availability_zones[1]

  # Last element using length
  last_az = var.availability_zones[length(var.availability_zones) - 1]
}
```

### Getting the Length

```hcl
locals {
  az_count = length(var.availability_zones)
}
```

## Using Lists with count

The `count` meta-argument pairs naturally with lists:

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Create one subnet per availability zone
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

This creates one subnet for each AZ in the list. The `count.index` maps directly to the list index.

## Using Lists with for_each

While `count` works fine, `for_each` is often better because it uses meaningful keys instead of numeric indexes:

```hcl
variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Convert list to set for for_each
resource "aws_subnet" "public" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, index(var.availability_zones, each.value))
  availability_zone = each.value

  tags = {
    Name = "public-${each.value}"
  }
}
```

With `for_each`, adding or removing an AZ from the middle of the list does not cause all subsequent resources to be destroyed and recreated (which happens with `count`).

## List Operations

Terraform provides several functions for working with lists.

### Concatenation

```hcl
variable "base_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "extra_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24"]
}

locals {
  # Combine two lists
  all_cidrs = concat(var.base_cidrs, var.extra_cidrs)
  # Result: ["10.0.1.0/24", "10.0.2.0/24", "10.0.10.0/24"]
}
```

### Filtering with for Expressions

```hcl
variable "ports" {
  type    = list(number)
  default = [22, 80, 443, 3306, 5432, 8080]
}

locals {
  # Keep only ports above 1024
  high_ports = [for p in var.ports : p if p > 1024]
  # Result: [3306, 5432, 8080]

  # Keep only standard web ports
  web_ports = [for p in var.ports : p if contains([80, 443, 8080], p)]
  # Result: [80, 443, 8080]
}
```

### Transforming Lists

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "production"]
}

locals {
  # Transform each element
  bucket_names = [for env in var.environments : "myapp-${env}-assets"]
  # Result: ["myapp-dev-assets", "myapp-staging-assets", "myapp-production-assets"]

  # Uppercase
  upper_envs = [for env in var.environments : upper(env)]
  # Result: ["DEV", "STAGING", "PRODUCTION"]
}
```

### Sorting and Deduplication

```hcl
locals {
  # Sort a list
  sorted_zones = sort(var.availability_zones)

  # Remove duplicates (converts to set and back)
  unique_cidrs = tolist(toset(var.cidr_blocks))

  # Reverse a list
  reversed = reverse(var.availability_zones)
}
```

### Checking Membership

```hcl
locals {
  # Check if an element exists in a list
  has_us_east_1a = contains(var.availability_zones, "us-east-1a")

  # Find the index of an element
  index_of_1a = index(var.availability_zones, "us-east-1a")
}
```

### Flattening Nested Lists

```hcl
variable "subnet_groups" {
  type = list(list(string))
  default = [
    ["10.0.1.0/24", "10.0.2.0/24"],
    ["10.0.10.0/24", "10.0.11.0/24"],
  ]
}

locals {
  # Flatten nested lists into a single list
  all_subnets = flatten(var.subnet_groups)
  # Result: ["10.0.1.0/24", "10.0.2.0/24", "10.0.10.0/24", "10.0.11.0/24"]
}
```

## Practical Examples

### Security Group with Multiple Ports

```hcl
variable "ingress_ports" {
  description = "Ports to allow inbound traffic on"
  type        = list(number)
  default     = [80, 443]
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web traffic"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Creating Multiple S3 Buckets

```hcl
variable "bucket_names" {
  description = "Names of S3 buckets to create"
  type        = list(string)
  default     = ["logs", "assets", "backups"]
}

resource "aws_s3_bucket" "buckets" {
  for_each = toset(var.bucket_names)

  bucket = "mycompany-${each.value}-${var.environment}"

  tags = {
    Name        = each.value
    Environment = var.environment
  }
}
```

### Subnet Creation Across AZs

```hcl
variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "availability_zones" {
  description = "AZs for subnet placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${count.index + 1}"
    Tier = "public"
  }
}
```

## Validation for List Variables

```hcl
variable "availability_zones" {
  type = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}

variable "allowed_ports" {
  type = list(number)

  validation {
    condition     = alltrue([for p in var.allowed_ports : p > 0 && p <= 65535])
    error_message = "All ports must be between 1 and 65535."
  }
}
```

## Wrapping Up

List variables are foundational to Terraform. They let you parameterize collections of similar items and iterate over them with `count` or `for_each`. Combined with Terraform's built-in functions for filtering, transforming, and combining lists, they enable you to write DRY configurations that adapt to different environments and requirements. When choosing between `count` and `for_each` for list iteration, prefer `for_each` with `toset()` when the list elements are unique identifiers - it produces more stable resource addresses.

For other collection types, see our guides on [map variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-map-in-terraform/view) and [set variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-set-in-terraform/view) in Terraform.
