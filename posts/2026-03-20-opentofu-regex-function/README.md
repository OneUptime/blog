# How to Use the regex Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the regex function in OpenTofu to extract substrings and validate string formats using regular expressions.

## Introduction

The `regex` function in OpenTofu applies a regular expression to a string and returns the matched portion(s). It supports capture groups and returns the full match (or captures) as a string or tuple. It raises an error if there is no match.

## Syntax

```hcl
regex(pattern, string)
```

- **pattern** - a RE2 syntax regular expression
- **string** - the string to match against
- Returns the match (string) or captures (list/map)

## Basic Examples

```hcl
output "full_match" {
  value = regex("[0-9]+", "abc123def456")  # Returns "123"
}

output "capture_group" {
  value = regex("([a-z]+)-([0-9]+)", "app-42")
  # Returns ["app", "42"] (two capture groups)
}

output "named_capture" {
  value = regex("(?P<name>[a-z]+)-(?P<num>[0-9]+)", "api-5")
  # Returns {name = "api", num = "5"}
}
```

## Practical Use Cases

### Extracting Version from Docker Image

```hcl
variable "docker_image" {
  type    = string
  default = "myregistry.com/app:v1.2.3"
}

locals {
  image_parts = regex("^(.+):(.+)$", var.docker_image)
  image_repo  = local.image_parts[0]
  image_tag   = local.image_parts[1]
}

output "image_tag" {
  value = local.image_tag  # "v1.2.3"
}
```

### Parsing AWS ARN Components

```hcl
variable "role_arn" {
  type    = string
  default = "arn:aws:iam::123456789012:role/my-app-role"
}

locals {
  arn_parts   = regex("^arn:aws:([^:]+):([^:]*):([0-9]+):(.+)$", var.role_arn)
  service     = local.arn_parts[0]  # "iam"
  region      = local.arn_parts[1]  # "" (empty for IAM)
  account_id  = local.arn_parts[2]  # "123456789012"
  resource    = local.arn_parts[3]  # "role/my-app-role"
}
```

### Validating IP Addresses

```hcl
variable "ip_address" {
  type = string

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}$", var.ip_address))
    error_message = "ip_address must be a valid IPv4 address."
  }
}
```

### Extracting Semantic Version Parts

```hcl
variable "semver" {
  type    = string
  default = "2.15.3"
}

locals {
  ver_parts = regex("^([0-9]+)\\.([0-9]+)\\.([0-9]+)$", var.semver)
  major     = tonumber(local.ver_parts[0])
  minor     = tonumber(local.ver_parts[1])
  patch     = tonumber(local.ver_parts[2])
}

output "major_version" {
  value = local.major  # 2
}
```

## Step-by-Step Usage

```bash
tofu console

> regex("[0-9]+", "abc123")
"123"
> regex("([a-z]+)=([0-9]+)", "count=42")
["count", "42"]
> regex("(?P<key>[a-z]+)=(?P<val>[0-9]+)", "size=100")
{key = "size", val = "100"}
```

## RE2 Syntax

OpenTofu uses RE2 (not PCRE). Key differences:
- No lookahead/lookbehind
- No backreferences
- Named groups: `(?P<name>...)`

## regex vs regexall

| Function | Returns |
|----------|---------|
| `regex(p, s)` | First match only (error if no match) |
| `regexall(p, s)` | All matches as list (empty list if no match) |

## Conclusion

The `regex` function is a powerful string extraction tool in OpenTofu. Use it for parsing structured strings like ARNs, Docker image tags, version numbers, and IP addresses. Combine with `can()` for safe matching where no match is acceptable.
