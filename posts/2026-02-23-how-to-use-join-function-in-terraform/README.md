# How to Use the join Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the join function in Terraform to combine list elements into a single string with a separator, with practical examples for real infrastructure.

---

Converting a list of values into a single delimited string is one of the most frequent operations in Terraform configurations. The `join` function does exactly this - it takes a separator and a list, and produces a single string with all the elements separated by the delimiter you specify.

## What Does join Do?

The `join` function concatenates elements of a list into a single string, inserting a separator between each element.

```hcl
# Basic syntax
join(separator, list)
```

It is the inverse of the `split` function. Where `split` breaks a string into a list, `join` combines a list into a string.

## Basic Examples

Here are some straightforward cases to get started.

```hcl
# Join with comma separator
> join(", ", ["one", "two", "three"])
"one, two, three"

# Join with hyphen
> join("-", ["2026", "02", "23"])
"2026-02-23"

# Join with empty separator (concatenation)
> join("", ["hello", " ", "world"])
"hello world"

# Join with newline
> join("\n", ["line1", "line2", "line3"])
"line1\nline2\nline3"

# Single-element list
> join(", ", ["alone"])
"alone"

# Empty list
> join(", ", [])
""
```

## Building Comma-Separated Lists

One of the most common patterns is generating comma-separated values for configuration.

```hcl
variable "allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["https://app.example.com", "https://admin.example.com", "https://api.example.com"]
}

resource "aws_apigatewayv2_api" "main" {
  name          = "my-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

# Sometimes you need the list as a single comma-separated string
output "allowed_origins_string" {
  value = join(",", var.allowed_origins)
  # "https://app.example.com,https://admin.example.com,https://api.example.com"
}
```

## Constructing Resource Names

Build resource names from component parts.

```hcl
variable "name_parts" {
  type = object({
    project     = string
    environment = string
    component   = string
    region      = string
  })
  default = {
    project     = "myapp"
    environment = "prod"
    component   = "api"
    region      = "us-east-1"
  }
}

locals {
  # Join name parts with hyphens
  resource_name = join("-", [
    var.name_parts.project,
    var.name_parts.environment,
    var.name_parts.component,
    var.name_parts.region
  ])
  # Result: "myapp-prod-api-us-east-1"
}
```

## Generating Policy Documents

When building IAM or other policy documents, you often need to produce lists of actions or resources as strings.

```hcl
locals {
  s3_actions = [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
    "s3:ListBucket"
  ]

  # For logging or debugging
  actions_display = join(", ", local.s3_actions)
  # "s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket"
}
```

## Building File Paths

Join path components to construct file paths.

```hcl
variable "base_path" {
  default = "/etc/myapp"
}

variable "config_file" {
  default = "config.yaml"
}

locals {
  config_path = join("/", [var.base_path, "conf.d", var.config_file])
  # Result: "/etc/myapp/conf.d/config.yaml"
}
```

## Creating Environment Variable Strings

Generate environment variable declarations from maps.

```hcl
variable "env_vars" {
  type = map(string)
  default = {
    NODE_ENV   = "production"
    LOG_LEVEL  = "info"
    PORT       = "3000"
    DB_HOST    = "db.internal"
  }
}

locals {
  # Create KEY=VALUE pairs and join with newlines
  env_file_content = join("\n", [
    for key, value in var.env_vars :
    "${key}=${value}"
  ])

  # Create space-separated -e flags for Docker
  docker_env_flags = join(" ", [
    for key, value in var.env_vars :
    "-e ${key}=${value}"
  ])
}
```

## Combining join with split (Round-Trip)

The `join` and `split` functions are inverses. You can use them together for string transformations.

```hcl
locals {
  # Original path
  s3_key = "data/2026/02/23/report.csv"

  # Split into parts, modify, and rejoin
  path_parts     = split("/", local.s3_key)
  modified_parts = concat(["archive"], local.path_parts)
  archive_key    = join("/", local.modified_parts)
  # Result: "archive/data/2026/02/23/report.csv"
}
```

For more on splitting strings, see [how to use the split function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-split-function-in-terraform/view).

## Generating Subnet Tags

Create descriptive tags from subnet attributes.

```hcl
variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = join("-", ["private", var.availability_zones[count.index]])
    # "private-us-east-1a", "private-us-east-1b", etc.
  }
}
```

## Building Command Strings

Generate shell commands from lists of arguments.

```hcl
variable "packages" {
  description = "System packages to install"
  type        = list(string)
  default     = ["nginx", "curl", "vim", "htop", "jq"]
}

locals {
  # Build an apt-get install command
  install_command = join(" ", concat(
    ["apt-get", "install", "-y"],
    var.packages
  ))
  # Result: "apt-get install -y nginx curl vim htop jq"
}

resource "aws_instance" "server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  user_data = <<-SCRIPT
    #!/bin/bash
    apt-get update
    ${local.install_command}
  SCRIPT
}
```

## Creating CSV Output

Generate CSV content from structured data.

```hcl
locals {
  records = [
    { name = "server-01", ip = "10.0.1.10", role = "web" },
    { name = "server-02", ip = "10.0.1.11", role = "api" },
    { name = "server-03", ip = "10.0.1.12", role = "db" }
  ]

  # Build CSV header and rows
  csv_header = join(",", ["name", "ip", "role"])
  csv_rows = [
    for record in local.records :
    join(",", [record.name, record.ip, record.role])
  ]
  csv_content = join("\n", concat([local.csv_header], local.csv_rows))
}

output "csv" {
  value = local.csv_content
  # name,ip,role
  # server-01,10.0.1.10,web
  # server-02,10.0.1.11,api
  # server-03,10.0.1.12,db
}
```

## Conditional Joining

Skip empty or null values when joining.

```hcl
variable "subdomain" {
  default = "api"
}

variable "domain" {
  default = "example.com"
}

locals {
  # Build FQDN, handling optional subdomain
  fqdn_parts = compact([var.subdomain, var.domain])
  fqdn       = join(".", local.fqdn_parts)
  # Result: "api.example.com"

  # If subdomain were empty, compact removes it
  # and you get just "example.com"
}
```

The `compact` function removes empty strings from a list, which pairs nicely with `join` to avoid double separators.

## Using join in Outputs

Format list outputs for display.

```hcl
output "instance_ips" {
  description = "Comma-separated list of instance private IPs"
  value       = join(", ", aws_instance.server[*].private_ip)
}

output "security_group_ids" {
  description = "Security group IDs as pipe-separated string"
  value       = join(" | ", aws_security_group.app[*].id)
}
```

## Summary

The `join` function is a workhorse for combining list elements into strings in Terraform. Whether you are building resource names, generating configuration files, constructing commands, or formatting outputs, you will reach for it constantly. It pairs naturally with `split` for round-trip string manipulation and with `compact` for skipping empty values.
