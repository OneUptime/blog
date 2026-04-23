# How to Reference Local Values in OpenTofu Resources - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local, Resource, HCL, Infrastructure as Code, DevOps

Description: Learn how to define local values and reference them in resource blocks, output values, and other expressions throughout your OpenTofu configuration.

---

Local values are referenced using the `local.<name>` syntax - with `local` (singular) as the prefix, not `locals`. Once defined in a `locals` block, they're available throughout the entire module in resources, data sources, outputs, and other local expressions.

---

## Defining and Referencing Locals

```hcl
# Define locals in a locals block

locals {
  environment = var.environment
  name_prefix = "${var.project}-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

# Reference with local.<name> in resources
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Reference local values
  tags = merge(local.tags, {
    Name = "${local.name_prefix}-web"
  })
}
```

---

## Locals in Multiple Resource Types

```hcl
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "opentofu"
  }
  name_prefix = "${var.project}-${var.environment}"
}

# Same local used in different resource types
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_subnet" "public" {
  count      = length(var.public_subnet_cidrs)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnet_cidrs[count.index]
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-${count.index + 1}"
    Type = "public"
  })
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"
  tags       = local.common_tags
}
```

---

## Locals in Data Source Filters

```hcl
locals {
  ami_name_filter = "amzn2-ami-hvm-*-x86_64-gp2"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = [local.ami_name_filter]   # local used in data source filter
  }
}
```

---

## Locals in for_each

```hcl
locals {
  name_prefix = var.project
  environments = {
    dev  = { instance_type = "t3.micro" }
    prod = { instance_type = "m5.large" }
  }
}

resource "aws_instance" "servers" {
  for_each = local.environments   # local used as for_each source

  ami           = data.aws_ami.amazon_linux.id
  instance_type = each.value.instance_type

  tags = {
    Environment = each.key
    Name        = "${local.name_prefix}-${each.key}"
  }
}
```

---

## Referencing Locals in Outputs

```hcl
locals {
  full_domain = var.domain_name
  common_tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "opentofu"
  }
}

output "api_url" {
  description = "Application API URL"
  value       = "https://${local.full_domain}/api"  # local in output
}

output "tags" {
  description = "Common tags applied to all resources"
  value       = local.common_tags
}
```

---

## Locals Referencing Other Locals

```hcl
locals {
  # Locals can reference other locals (but not themselves - no cycles)
  base_name    = "${var.project}-${var.environment}"
  full_name    = "${local.base_name}-${var.component}"
  s3_key_prefix = "${local.full_name}/data"

  # Chain multiple transformations
  sanitized_name = lower(replace(local.full_name, "_", "-"))
}
```

---

## Summary

Reference local values with `local.<name>` (singular prefix) throughout your module - in resources, data sources, outputs, and other locals. Locals can reference other locals as long as there are no circular references. Use the `tofu console` to quickly check what a local expression evaluates to during development: `> local.name_prefix`.
