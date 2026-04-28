# How to Use join() in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, String

Description: Learn how to use the join() function in OpenTofu to combine list elements into a single string.

The `join()` function combines a list of strings into a single string, inserting a separator between each element. It's the complement of `split()`.

## Syntax

```hcl
join(separator, list)
```

## Basic Examples

```hcl
> join(", ", ["us-east-1", "us-west-2", "eu-west-1"])
"us-east-1, us-west-2, eu-west-1"

> join("-", ["my", "bucket", "name"])
"my-bucket-name"

> join("", ["a", "b", "c"])
"abc"

> join("\n", ["line1", "line2", "line3"])
"line1\nline2\nline3"
```

## Practical Use Cases

### Building Resource Names

```hcl
variable "name_parts" {
  type    = list(string)
  default = ["myapp", "prod", "web"]
}

locals {
  resource_name = join("-", var.name_parts)
  # "myapp-prod-web"
}

resource "aws_instance" "web" {
  tags = {
    Name = local.resource_name
  }
}
```

### Creating Comma-Separated Values

```hcl
variable "allowed_origins" {
  type    = list(string)
  default = ["https://example.com", "https://app.example.com"]
}

resource "aws_api_gateway_rest_api" "api" {
  name = "my-api"

  # Some resources need comma-separated strings instead of lists
  tags = {
    AllowedOrigins = join(",", var.allowed_origins)
  }
}
```

### Building IAM Policy Conditions

```hcl
variable "allowed_accounts" {
  type    = list(string)
  default = ["123456789012", "234567890123"]
}

locals {
  account_principals = [
    for account in var.allowed_accounts :
    "arn:aws:iam::${account}:root"
  ]
}

data "aws_iam_policy_document" "trust" {
  statement {
    principals {
      type        = "AWS"
      identifiers = local.account_principals
    }
    actions = ["sts:AssumeRole"]
  }
}
```

### Generating Multi-Line Scripts

```hcl
locals {
  bootstrap_commands = [
    "apt-get update",
    "apt-get install -y nginx",
    "systemctl enable nginx",
    "systemctl start nginx",
  ]
  
  user_data = join("\n", concat(
    ["#!/bin/bash", "set -euo pipefail", ""],
    local.bootstrap_commands
  ))
}

resource "aws_instance" "web" {
  user_data = local.user_data
}
```

### Building URL Query Strings

```hcl
variable "query_params" {
  type = map(string)
  default = {
    region      = "us-east-1"
    environment = "prod"
    version     = "2"
  }
}

locals {
  query_string = join("&", [
    for key, value in var.query_params :
    "${key}=${value}"
  ])
  # "environment=prod&region=us-east-1&version=2"
  
  full_url = "https://api.example.com/endpoint?${local.query_string}"
}
```

## Joining with Empty List

```hcl
> join(",", [])
""

# Safe to use - returns empty string for empty lists

locals {
  tags_string = join(",", var.optional_tags)
  # "" if var.optional_tags is empty
}
```

## Conclusion

`join()` is the complement to `split()` and is essential for constructing delimited strings from lists. Use it to build resource names from components, create comma-separated values for APIs that don't accept lists, and generate multi-line strings. Always consider that `join(sep, [])` returns an empty string when the list is empty.
