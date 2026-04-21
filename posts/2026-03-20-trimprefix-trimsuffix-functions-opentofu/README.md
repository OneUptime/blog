# How to Use the trimprefix and trimsuffix Functions in OpenTofu - Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Trimprefix, Trimsuffix, String Function, HCL, Infrastructure as Code

Description: Learn how to use the trimprefix and trimsuffix functions in OpenTofu to remove specific prefixes and suffixes from strings.

---

`trimprefix()` removes a prefix from the beginning of a string, and `trimsuffix()` removes a suffix from the end. Unlike `trim()`, these functions match exact strings rather than character sets, and they only remove the prefix/suffix once.

---

## Syntax

```hcl
trimprefix(string, prefix)
trimsuffix(string, suffix)
```

If the string does not start with `prefix` (or end with `suffix`), the string is returned unchanged.

---

## Basic Examples

```hcl
locals {
  # trimprefix: removes exact prefix
  example1 = trimprefix("https://example.com", "https://")  # "example.com"
  example2 = trimprefix("aws_s3_bucket", "aws_")            # "s3_bucket"
  example3 = trimprefix("no-prefix", "xyz_")               # "no-prefix" (unchanged)

  # trimsuffix: removes exact suffix
  example4 = trimsuffix("file.txt", ".txt")                 # "file"
  example5 = trimsuffix("myapp-production", "-production")  # "myapp"
  example6 = trimsuffix("no-suffix", ".csv")               # "no-suffix" (unchanged)
}
```

---

## Normalizing Resource Names

```hcl
variable "full_bucket_name" {
  type    = string
  default = "company-myapp-production"
}

locals {
  # Strip the company prefix to get the short name
  app_name = trimprefix(var.full_bucket_name, "company-")
  # "myapp-production"

  # Strip the environment suffix
  base_name = trimsuffix(local.app_name, "-production")
  # "myapp"
}
```

---

## Extracting Resource IDs

```hcl
locals {
  # AWS ARNs often need the resource ID extracted
  role_arn    = "arn:aws:iam::123456789012:role/my-role"
  resource_id = trimprefix(local.role_arn, "arn:aws:iam::123456789012:role/")
  # "my-role"
}
```

---

## Cleaning URL Protocols

```hcl
variable "endpoint_url" {
  type    = string
  default = "https://api.example.com"
}

locals {
  # Extract the hostname from the URL
  hostname = trimprefix(trimprefix(var.endpoint_url, "https://"), "http://")
  # "api.example.com"
}
```

---

## File Extension Handling

```hcl
variable "config_file" {
  type    = string
  default = "app-config.json"
}

locals {
  # Get the base filename without extension
  base_name = trimsuffix(var.config_file, ".json")
  # "app-config"
}

resource "aws_ssm_parameter" "config" {
  name  = "/app/${local.base_name}"
  type  = "String"
  value = file("${path.module}/configs/${var.config_file}")
}
```

---

## Difference from trim and replace

| Function | Use When |
|---|---|
| `trimprefix(s, prefix)` | Remove a specific string from the start (once) |
| `trimsuffix(s, suffix)` | Remove a specific string from the end (once) |
| `trim(s, chars)` | Remove any of a set of characters from both ends |
| `replace(s, from, to)` | Replace all occurrences anywhere in the string |

---

## Summary

`trimprefix()` and `trimsuffix()` remove exact string matches from the start or end of a string respectively. They are ideal for stripping known prefixes like `aws_`, `https://`, or company name prefixes from resource names. If the prefix/suffix is not present, the original string is returned unchanged. Use `trim()` when you need to remove character sets, and `replace()` when you need to change occurrences anywhere in the string.
