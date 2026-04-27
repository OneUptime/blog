# How to Use the split and join Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the split and join functions in OpenTofu to convert between strings and lists for flexible data manipulation.

## Introduction

The `split` and `join` functions in OpenTofu convert between strings and lists. `split` breaks a string into a list of substrings at a specified delimiter, while `join` combines a list of strings into a single string with a separator. These are among the most frequently used string/collection functions.

## Syntax

```hcl
split(separator, string)
join(separator, list)
```

- `split` returns a list of strings
- `join` returns a single string

## Basic Examples

```hcl
output "split_example" {
  value = split(",", "a,b,c,d")  # Returns ["a", "b", "c", "d"]
}

output "join_example" {
  value = join(",", ["a", "b", "c"])  # Returns "a,b,c"
}

output "split_then_join" {
  # Split on comma and rejoin with pipe
  value = join("|", split(",", "a,b,c"))  # Returns "a|b|c"
}
```

## Practical Use Cases

### Parsing CIDR Lists from Strings

```hcl
variable "allowed_cidrs_string" {
  type        = string
  description = "Comma-separated list of allowed CIDRs"
  default     = "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
}

locals {
  allowed_cidrs = split(",", var.allowed_cidrs_string)
}

resource "aws_security_group_rule" "ingress" {
  type        = "ingress"
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = local.allowed_cidrs  # ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]

  security_group_id = aws_security_group.app.id
}
```

### Building Comma-Separated Values for Policies

```hcl
variable "allowed_actions" {
  type    = list(string)
  default = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
}

locals {
  # Some APIs expect comma-separated action lists
  actions_string = join(",", var.allowed_actions)
}

output "actions_csv" {
  value = local.actions_string  # "s3:GetObject,s3:PutObject,s3:DeleteObject"
}
```

### Parsing Instance Types from Comma-Separated Variable

```hcl
variable "instance_types" {
  type    = string
  default = "t3.micro,t3.small,t3.medium"
}

locals {
  instance_type_list = split(",", var.instance_types)
  primary_type       = local.instance_type_list[0]
}

resource "aws_autoscaling_group" "app" {
  mixed_instances_policy {
    instances_distribution {
      on_demand_percentage_above_base_capacity = 20
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
      }

      dynamic "override" {
        for_each = local.instance_type_list
        content {
          instance_type = override.value
        }
      }
    }
  }

  min_size         = 1
  max_size         = 10
  desired_capacity = 2
  vpc_zone_identifier = var.subnet_ids
}
```

### Joining Tags into a Display String

```hcl
variable "resource_tags" {
  type = map(string)
  default = {
    environment = "production"
    team        = "platform"
    service     = "api"
  }
}

locals {
  # Create a sorted, joined tag string for display/search
  tag_string = join(", ", sort([for k, v in var.resource_tags : "${k}=${v}"]))
}

output "tag_summary" {
  value = local.tag_string  # "environment=production, service=api, team=platform"
}
```

### Processing DNS Names

```hcl
variable "fqdn" {
  type    = string
  default = "api.staging.example.com"
}

locals {
  parts       = split(".", var.fqdn)
  subdomain   = local.parts[0]          # "api"
  environment = local.parts[1]          # "staging"
  domain      = join(".", slice(local.parts, 2, length(local.parts)))  # "example.com"
}

output "subdomain" {
  value = local.subdomain  # "api"
}

output "base_domain" {
  value = local.domain  # "example.com"
}
```

## Step-by-Step Usage

1. For `split`: identify the delimiter in a string you want to break apart.
2. For `join`: identify the separator you want between list elements.
3. Test in `tofu console`:

```bash
tofu console

> split("/", "us/east/1")
["us", "east", "1"]
> join("-", ["2026", "03", "20"])
"2026-03-20"
```

## Round-Trip Consistency

```hcl
locals {
  original = "a,b,c"
  parts    = split(",", local.original)
  rejoined = join(",", local.parts)
  # local.rejoined == local.original (true)
}
```

## Conclusion

The `split` and `join` functions are essential companions in OpenTofu for converting between string and list representations of data. Whether you are parsing CIDR lists from comma-separated inputs, building policy strings, or deconstructing DNS names, these two functions are the foundation of string-list interoperability in your infrastructure configurations.
