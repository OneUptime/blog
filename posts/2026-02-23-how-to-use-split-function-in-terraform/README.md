# How to Use the split Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the split function in Terraform to break strings into lists using a delimiter, with practical examples for parsing paths, ARNs, and configuration values.

---

Parsing strings by splitting them on a delimiter is fundamental to working with structured data in Terraform. The `split` function breaks a string into a list of substrings based on a separator you specify. It is the inverse of `join` and one of the most frequently used string functions in real-world Terraform configurations.

## What Does split Do?

The `split` function divides a string into a list based on a separator.

```hcl
# Basic syntax
split(separator, string)
```

Note the argument order: separator first, then the string. This is opposite of how some programming languages order these arguments, so it is worth memorizing.

## Basic Examples

```hcl
# Split on comma
> split(",", "one,two,three")
["one", "two", "three"]

# Split on hyphen
> split("-", "2026-02-23")
["2026", "02", "23"]

# Split on slash
> split("/", "path/to/resource")
["path", "to", "resource"]

# Split on space
> split(" ", "hello world foo")
["hello", "world", "foo"]

# No match - returns original string as single-element list
> split(",", "no commas here")
["no commas here"]

# Empty string
> split(",", "")
[""]

# Leading/trailing separators create empty strings
> split("/", "/leading/trailing/")
["", "leading", "trailing", ""]
```

## Parsing File Paths

Extract components from file paths.

```hcl
locals {
  file_path = "/opt/app/config/database.yaml"

  # Split the path into components
  path_parts = split("/", local.file_path)
  # Result: ["", "opt", "app", "config", "database.yaml"]

  # Get just the filename (last element)
  filename = element(split("/", local.file_path), length(split("/", local.file_path)) - 1)
  # Result: "database.yaml"

  # Get the directory path
  dir_parts = slice(split("/", local.file_path), 0, length(split("/", local.file_path)) - 1)
  directory = join("/", local.dir_parts)
  # Result: "/opt/app/config"
}
```

## Parsing AWS ARNs

ARNs follow a colon-separated format that `split` handles perfectly.

```hcl
locals {
  arn = "arn:aws:lambda:us-east-1:123456789012:function:my-processor"

  # Split the ARN
  arn_parts = split(":", local.arn)
  # Result: ["arn", "aws", "lambda", "us-east-1", "123456789012", "function", "my-processor"]

  # Extract individual components
  partition   = local.arn_parts[1]  # "aws"
  service     = local.arn_parts[2]  # "lambda"
  region      = local.arn_parts[3]  # "us-east-1"
  account_id  = local.arn_parts[4]  # "123456789012"
  resource    = local.arn_parts[6]  # "my-processor"
}
```

## Processing Comma-Separated Input

When accepting comma-separated values in variables, `split` converts them to lists.

```hcl
variable "allowed_ips" {
  description = "Comma-separated list of allowed IP addresses"
  type        = string
  default     = "10.0.1.1,10.0.2.1,10.0.3.1"
}

locals {
  ip_list = split(",", var.allowed_ips)
  # Result: ["10.0.1.1", "10.0.2.1", "10.0.3.1"]

  # Convert to CIDR notation
  cidr_list = [
    for ip in local.ip_list :
    "${trimspace(ip)}/32"
  ]
}

resource "aws_security_group_rule" "allow" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = local.cidr_list
  security_group_id = aws_security_group.app.id
}
```

## Extracting Domain Components

Break domain names into their component parts.

```hcl
variable "fqdn" {
  default = "api.prod.us-east-1.example.com"
}

locals {
  domain_parts = split(".", var.fqdn)
  # Result: ["api", "prod", "us-east-1", "example", "com"]

  # Get the subdomain (first part)
  subdomain = local.domain_parts[0]
  # Result: "api"

  # Get the top-level domain (last two parts)
  tld = join(".", slice(local.domain_parts, length(local.domain_parts) - 2, length(local.domain_parts)))
  # Result: "example.com"
}
```

## Parsing Environment Variables

Split environment variable style strings.

```hcl
variable "env_string" {
  default = "KEY1=value1,KEY2=value2,KEY3=value3"
}

locals {
  # First split on comma to get pairs
  pairs = split(",", var.env_string)
  # Result: ["KEY1=value1", "KEY2=value2", "KEY3=value3"]

  # Then split each pair on = to get key-value
  env_map = {
    for pair in local.pairs :
    split("=", pair)[0] => split("=", pair)[1]
  }
  # Result: { "KEY1" = "value1", "KEY2" = "value2", "KEY3" = "value3" }
}
```

## Working with S3 Keys

Parse S3 object keys to extract path components.

```hcl
variable "s3_key" {
  default = "data/2026/02/23/region-us-east/report.parquet"
}

locals {
  key_parts = split("/", var.s3_key)
  # Result: ["data", "2026", "02", "23", "region-us-east", "report.parquet"]

  # Extract the date components
  year  = local.key_parts[1]
  month = local.key_parts[2]
  day   = local.key_parts[3]

  # Extract the filename
  s3_filename = local.key_parts[length(local.key_parts) - 1]
  # Result: "report.parquet"

  # Get the file extension
  extension = split(".", local.s3_filename)[length(split(".", local.s3_filename)) - 1]
  # Result: "parquet"
}
```

## Round-Trip with join

The `split` and `join` functions are inverses. You can split a string, modify the parts, and rejoin.

```hcl
locals {
  original = "us-east-1a"

  # Split, modify, and rejoin
  parts    = split("-", local.original)  # ["us", "east", "1a"]
  modified = concat(["prod"], local.parts)
  result   = join("-", local.modified)    # "prod-us-east-1a"
}
```

For more on joining lists, see [how to use the join function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-join-function-in-terraform/view).

## Parsing Terraform Provider Versions

```hcl
locals {
  version_constraint = "~> 5.30.0"

  # Remove the operator
  version_str = trimspace(split(" ", local.version_constraint)[length(split(" ", local.version_constraint)) - 1])
  # Result: "5.30.0"

  # Split version into components
  version_components = split(".", local.version_str)
  major = tonumber(local.version_components[0])  # 5
  minor = tonumber(local.version_components[1])  # 30
  patch = tonumber(local.version_components[2])  # 0
}
```

## Handling Edge Cases

Be aware of how `split` behaves with edge cases.

```hcl
# Consecutive separators create empty strings
> split(",", "a,,b,,,c")
["a", "", "b", "", "", "c"]

# To remove empty strings, use compact()
> compact(split(",", "a,,b,,,c"))
["a", "b", "c"]

# Leading separator creates leading empty string
> split("/", "/path/to/file")
["", "path", "to", "file"]

# Single character string
> split(",", "a")
["a"]
```

The `compact` function is useful for removing empty strings that result from consecutive separators.

## Processing Multi-Line Strings

Split multi-line strings into individual lines.

```hcl
locals {
  hosts_content = <<-EOT
    10.0.1.10 web-01
    10.0.1.11 web-02
    10.0.1.12 web-03
  EOT

  # Split into lines and clean up
  host_lines = compact([
    for line in split("\n", trimspace(local.hosts_content)) :
    trimspace(line)
  ])
  # Result: ["10.0.1.10 web-01", "10.0.1.11 web-02", "10.0.1.12 web-03"]

  # Parse each line into IP and hostname
  host_map = {
    for line in local.host_lines :
    split(" ", line)[1] => split(" ", line)[0]
  }
  # { "web-01" = "10.0.1.10", "web-02" = "10.0.1.11", "web-03" = "10.0.1.12" }
}
```

## Extracting Parts of Resource IDs

Many cloud resources return compound IDs that need parsing.

```hcl
locals {
  # Some resources return IDs like "vpc-id/subnet-id"
  compound_id = "vpc-0abc123/subnet-0def456"

  vpc_id    = split("/", local.compound_id)[0]
  subnet_id = split("/", local.compound_id)[1]
}
```

## Summary

The `split` function is essential for parsing any structured string in Terraform. From ARNs and file paths to comma-separated input and multi-line configurations, it turns strings into lists that you can iterate over, filter, and transform. Remember the argument order (separator first), watch out for empty strings from consecutive separators (use `compact` to clean them up), and pair `split` with `join` for round-trip string transformations.
