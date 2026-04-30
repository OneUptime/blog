# How to Generate Lists and Nested Structures in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, HCL, List, Nested Structures, Range, Data Generation

Description: Learn how to generate lists, sequences, and nested data structures in OpenTofu using range(), for expressions, and local values to build dynamic configurations.

---

OpenTofu provides several built-in functions and expressions for generating lists and nested structures programmatically. Instead of hardcoding repeated values, you can generate them with `range()`, for expressions, and the `cidrsubnets()` function.

---

## Generating Number Sequences with range()

```hcl
locals {
  # Generate a list of numbers 0-9
  ten_numbers = range(10)
  # Result: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

  # Range with start and end
  ports = range(8080, 8090)
  # Result: [8080, 8081, ..., 8089]

  # Range with step
  even_ports = range(8080, 8100, 2)
  # Result: [8080, 8082, 8084, ..., 8098]
}
```

---

## Generate a List of Resource Names

```hcl
variable "web_server_count" {
  default = 5
}

locals {
  # Generate server names web-01 through web-05
  server_names = [
    for i in range(1, var.web_server_count + 1) :
    format("web-%02d", i)
  ]
  # Result: ["web-01", "web-02", "web-03", "web-04", "web-05"]

  # Generate names as a set for for_each
  server_names_set = toset(local.server_names)
}

resource "terraform_data" "web" {
  for_each = local.server_names_set

  input = {
    name = each.key
  }
}
```

---

## Generate Subnets with cidrsubnets()

```hcl
locals {
  vpc_cidr = "10.0.0.0/16"

  # Generate 4 /24 subnets from the VPC CIDR
  subnet_cidrs = cidrsubnets(local.vpc_cidr, 8, 8, 8, 8)
  # Result: ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_vpc" "main" {
  cidr_block = local.vpc_cidr
}

resource "aws_subnet" "public" {
  count = length(local.subnet_cidrs)

  vpc_id     = aws_vpc.main.id
  cidr_block = local.subnet_cidrs[count.index]

  tags = {
    Name = "public-${count.index + 1}"
  }
}
```

---

## Generate a Nested Structure from Variables

```hcl
variable "environments" {
  default = ["dev", "staging", "production"]
}

variable "services" {
  default = ["web", "api", "worker"]
}

locals {
  # Cartesian product: one entry per environment × service combination
  env_services = flatten([
    for env in var.environments : [
      for svc in var.services : {
        environment = env
        service     = svc
        key         = "${env}-${svc}"
      }
    ]
  ])

  # Convert to map for for_each
  env_services_map = {
    for item in local.env_services :
    item.key => item
  }
}

# Create one task definition per env × service

resource "aws_ecs_task_definition" "services" {
  for_each = local.env_services_map

  family = each.key

  container_definitions = jsonencode([{
    name  = each.value.service
    image = "my-app/${each.value.service}:${each.value.environment}"
  }])
}
```

---

## Generate Tags from Lists

```hcl
locals {
  tag_keys   = ["Environment", "Team", "CostCenter", "Project"]
  tag_values = ["production", "platform", "eng-001", "myapp"]

  tags = {
    for i in range(length(local.tag_keys)) :
    local.tag_keys[i] => local.tag_values[i]
  }
  # Result: { Environment = "production", Team = "platform", ... }
}
```

---

## Generate CIDR Ranges for Multiple VPCs

```hcl
variable "vpc_count" {
  default = 3
}

locals {
  # Generate VPC CIDRs: 10.0.0.0/16, 10.1.0.0/16, 10.2.0.0/16
  vpc_cidrs = [
    for i in range(var.vpc_count) :
    cidrsubnet("10.0.0.0/8", 8, i)
  ]
  # Result: ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]

  # For each VPC, generate 4 subnets
  all_subnets = flatten([
    for i, vpc_cidr in local.vpc_cidrs : [
      for j in range(4) : {
        vpc_index   = i
        subnet_index = j
        cidr        = cidrsubnet(vpc_cidr, 4, j)
      }
    ]
  ])
}
```

---

## Generate JSON Objects and Arrays

```hcl
variable "allowed_origins" {
  default = ["https://app.example.com", "https://admin.example.com"]
}

locals {
  # Build CORS configuration as JSON
  cors_config = jsonencode({
    origins = var.allowed_origins
    methods = ["GET", "POST", "PUT", "DELETE"]
    headers = ["Content-Type", "Authorization"]
  })
}
```

---

## Verify Generated Structures

```bash
# Use tofu console to inspect generated data
echo 'local.server_names' | tofu console
echo 'local.env_services_map' | tofu console
echo 'local.all_subnets' | tofu console
```

---

## Best Practices

1. **Use format() for zero-padded names** - `format("web-%02d", i)` gives consistent ordering
2. **Test with tofu console** before deploying generated structures
3. **Limit cartesian product size** - N environments × M services can grow quickly
4. **Comment the expected output** in your code for maintainability
5. **Use cidrsubnets() and cidrsubnet()** for VPC/subnet CIDR generation to avoid manual errors

---

## Conclusion

OpenTofu's `range()`, for expressions, `flatten()`, and CIDR functions enable powerful data generation without hardcoding. Use them to generate server names, subnet CIDRs, tag maps, and nested structures from simple variables.

---

*Manage your generated infrastructure with [OneUptime](https://oneuptime.com) - monitoring for everything you build.*
