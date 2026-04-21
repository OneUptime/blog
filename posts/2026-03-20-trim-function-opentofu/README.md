# How to Use the trim Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Trim, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the trim function in OpenTofu to remove specified characters from the beginning and end of a string.

---

The `trim()` function removes specified characters from both the beginning and end of a string. Unlike `trimspace()` which only removes whitespace, `trim()` accepts a custom set of characters to remove.

---

## Syntax

```hcl
trim(string, str_character_set)
```

- `string` - the input string
- `str_character_set` - a string containing the characters to remove (not a prefix/suffix, but a set of individual characters)

---

## Basic Examples

```hcl
locals {
  # Remove leading/trailing slashes
  example1 = trim("/path/to/resource/", "/")   # "path/to/resource"

  # Remove leading/trailing dashes
  example2 = trim("--my-value--", "-")         # "my-value"

  # Remove leading/trailing dots
  example3 = trim("...hello...", ".")           # "hello"

  # Multiple chars in the set: removes any of those chars
  example4 = trim("**!alert!**", "*!")          # "alert"
}
```

---

## Cleaning URL Paths

```hcl
variable "path_prefix" {
  type    = string
  default = "/api/"
}

locals {
  # Normalize path - remove leading and trailing slashes
  clean_path = trim(var.path_prefix, "/")
  # "/api/" → "api"
}

resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = local.clean_path
}
```

---

## Trimming Punctuation from Names

```hcl
variable "service_name" {
  type    = string
  default = "---my-service---"
}

locals {
  normalized_name = trim(var.service_name, "-")
  # "my-service"
}
```

---

## trim vs trimspace vs trimprefix/trimsuffix

| Function | What It Does |
|---|---|
| `trim(s, chars)` | Removes any of the given chars from both ends |
| `trimspace(s)` | Removes whitespace from both ends |
| `trimprefix(s, prefix)` | Removes exact prefix string once |
| `trimsuffix(s, suffix)` | Removes exact suffix string once |

---

## Practical: Cleaning Terraform State Key Paths

```hcl
variable "workspace" {
  type    = string
  default = "/environments/production/"
}

locals {
  # Remove slashes for use as a key component
  workspace_key = trim(var.workspace, "/")
  # "environments/production"
}
```

---

## Summary

`trim(string, chars)` removes any characters in the `chars` set from both the start and end of `string`. It removes any combination of the specified characters, not just a fixed prefix or suffix. Use it for normalizing paths (removing slashes), cleaning up identifiers (removing dashes), and sanitizing user-supplied strings with known surrounding characters to strip.
