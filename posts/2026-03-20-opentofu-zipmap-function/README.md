# How to Use the zipmap Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the zipmap function in OpenTofu to combine two parallel lists into a single map for creating key-value configurations dynamically.

## Introduction

The `zipmap` function in OpenTofu creates a map from two parallel lists - one providing keys and the other providing values. It is the inverse of using `keys()` and `values()` to split a map.

## Syntax

```hcl
zipmap(keyslist, valueslist)
```

- **keyslist** - list of strings to use as map keys
- **valueslist** - list of values (any type) corresponding to each key
- Both lists must have the same length

## Basic Examples

```hcl
output "basic_zipmap" {
  value = zipmap(["a", "b", "c"], [1, 2, 3])
  # Returns {a = 1, b = 2, c = 3}
}

output "string_zipmap" {
  value = zipmap(
    ["dev", "staging", "prod"],
    ["t3.micro", "t3.medium", "m5.large"]
  )
}
```

## Practical Use Cases

### Building Environment-to-Instance-Type Map

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "instance_types" {
  type    = list(string)
  default = ["t3.micro", "t3.medium", "m5.large"]
}

locals {
  env_instance_map = zipmap(var.environments, var.instance_types)
}

output "prod_instance_type" {
  value = local.env_instance_map["prod"]  # "m5.large"
}
```

### Creating Service Port Maps

```hcl
variable "service_names" {
  type    = list(string)
  default = ["api", "worker", "metrics"]
}

variable "service_ports" {
  type    = list(number)
  default = [8080, 9090, 9100]
}

locals {
  service_port_map = zipmap(var.service_names, var.service_ports)
}

resource "aws_security_group_rule" "services" {
  for_each = local.service_port_map

  type        = "ingress"
  from_port   = each.value
  to_port     = each.value
  protocol    = "tcp"
  cidr_blocks = ["10.0.0.0/8"]

  security_group_id = aws_security_group.app.id
}
```

### Building Tag Maps from Lists

```hcl
variable "tag_keys" {
  type    = list(string)
  default = ["Environment", "Team", "Project"]
}

variable "tag_values" {
  type    = list(string)
  default = ["production", "platform", "myapp"]
}

locals {
  resource_tags = zipmap(var.tag_keys, var.tag_values)
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  tags          = local.resource_tags
}
```

### AZ to Subnet Mapping

```hcl
variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  subnet_cidrs = [for i, az in var.azs : "10.0.${i}.0/24"]
  az_cidr_map  = zipmap(var.azs, local.subnet_cidrs)
}

output "az_cidr_map" {
  value = local.az_cidr_map
}
```

## Step-by-Step Usage

```bash
tofu console

> zipmap(["x", "y"], [10, 20])
{
  "x" = 10
  "y" = 20
}
```

## Conclusion

The `zipmap` function creates maps from parallel lists in OpenTofu, making it easy to build key-value configurations dynamically. It is the complement of `keys()` and `values()` - use it when you have two separate lists that logically form a map.
