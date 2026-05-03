# How to Debug For Each and Count Index Issues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, for_each, Count, Debugging, Infrastructure as Code

Description: Learn how to diagnose and fix common errors with for_each and count in OpenTofu, including value must be known before apply errors, index out of bounds, and unexpected resource churn.

## Introduction

`count` and `for_each` are the two ways to create multiple instances of a resource. They have specific constraints that trip up many practitioners: values must be known at plan time, changing between the two requires destroying and re-creating resources, and certain value types are only valid for one or the other.

## Common Errors

```hcl
Error: Invalid for_each argument
  The "for_each" value depends on resource attributes that cannot be determined
  until apply, so OpenTofu cannot predict how many instances will be created.

Error: Invalid count argument
  The "count" value depends on resource attributes that cannot be determined
  until apply.

Error: Invalid index
  on main.tf line 20: The given key does not identify an element in this
  collection value.
```

## Fix 1: for_each Value Unknown at Plan Time

```hcl
# WRONG - security_group.id is not known until apply

resource "aws_instance" "web" {
  for_each = toset([aws_security_group.app.id])  # Unknown at plan time
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}

# CORRECT - use a static set or a data source known at plan time
locals {
  environments = toset(["dev", "staging", "prod"])
}

resource "aws_instance" "web" {
  for_each      = local.environments
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  tags = {
    Environment = each.key
  }
}
```

## Fix 2: count Based on Unknown Value

```hcl
# WRONG - count depends on a resource attribute not yet known
resource "aws_subnet" "private" {
  count             = aws_vpc.main.enable_dns_support ? 3 : 1  # Unknown at plan
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

# CORRECT - use a known variable or literal
variable "subnet_count" {
  type    = number
  default = 3
}

resource "aws_subnet" "private" {
  count             = var.subnet_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
```

## Fix 3: Index Out of Bounds with count

```hcl
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b"]
}

resource "aws_subnet" "private" {
  count = 3  # ERROR - only 2 AZs in the list above

  # CORRECT - use length() to align count with the list
  # count = length(var.availability_zones)

  availability_zone = var.availability_zones[count.index]
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  vpc_id            = aws_vpc.main.id
}

# CORRECT pattern: align count with list length
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  availability_zone = var.availability_zones[count.index]
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  vpc_id            = aws_vpc.main.id
}
```

## Fix 4: Switching from count to for_each (Avoid Resource Churn)

Switching between `count` and `for_each` causes all existing resources to be destroyed and re-created. Plan the migration:

```bash
# Step 1: Move the state entries to use the new key format
# From: aws_instance.web[0]
# To:   aws_instance.web["prod"]
tofu state mv 'aws_instance.web[0]' 'aws_instance.web["prod"]'
tofu state mv 'aws_instance.web[1]' 'aws_instance.web["staging"]'

# Step 2: Update the configuration to use for_each
# Step 3: Run plan - should show no changes if moved correctly
tofu plan
```

## Fix 5: each.key vs each.value

```hcl
variable "instance_configs" {
  type = map(object({
    instance_type = string
    environment   = string
  }))
  default = {
    web = { instance_type = "t3.medium", environment = "prod" }
    api = { instance_type = "t3.small",  environment = "prod" }
  }
}

resource "aws_instance" "services" {
  for_each      = var.instance_configs
  ami           = data.aws_ami.amazon_linux.id
  # each.key = "web" or "api"
  # each.value = { instance_type = "t3.medium", environment = "prod" }
  instance_type = each.value.instance_type
  tags = {
    Name        = each.key
    Environment = each.value.environment
  }
}
```

## Conclusion

for_each and count errors are resolved by ensuring the collection value is known at plan time (use variables or literals, not resource-computed values), aligning count with list length, and using `tofu state mv` when switching between the two to avoid resource destruction. Use `each.key` and `each.value` correctly when accessing for_each iteration variables.
