# How to Use the trimspace Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Trimspace, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the trimspace function in OpenTofu to remove leading and trailing whitespace from strings, including spaces, tabs, and newlines.

---

The `trimspace()` function removes all leading and trailing whitespace from a string. Whitespace includes spaces, tabs, newlines, and carriage returns. This is particularly useful when reading file contents that may have trailing newlines.

---

## Syntax

```hcl
trimspace(string)
```

Returns the string with all leading and trailing whitespace removed.

---

## Basic Examples

```hcl
locals {
  example1 = trimspace("  hello world  ")    # "hello world"
  example2 = trimspace("\n  config\n")       # "config"
  example3 = trimspace("no-whitespace")      # "no-whitespace"
  example4 = trimspace("\t  tabbed  \t")     # "tabbed"
}
```

---

## Reading Files with Trailing Newlines

Many file formats (especially shell scripts and public keys) end with a trailing newline. Use `trimspace()` to clean them up:

```hcl
# A public key file ends with a newline - trimspace() removes it

data "local_file" "public_key" {
  filename = "${path.module}/keys/deploy.pub"
}

resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = trimspace(data.local_file.public_key.content)
  # Without trimspace(), the trailing newline could cause issues
}
```

---

## HTTP Response Cleanup

HTTP endpoints often return values with trailing newlines:

```hcl
data "http" "public_ip" {
  url = "https://ipv4.icanhazip.com"
}

resource "aws_vpc_security_group_ingress_rule" "my_ip" {
  security_group_id = aws_security_group.app.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  # trimspace() is equivalent to chomp() for simple trailing newlines
  cidr_ipv4         = "${trimspace(data.http.public_ip.response_body)}/32"
}
```

Note: `chomp()` removes trailing newline characters, while `trimspace()` removes all leading and trailing whitespace.

---

## Cleaning SSM Parameter Values

```hcl
data "aws_ssm_parameter" "db_host" {
  name = "/production/database/host"
}

locals {
  # Clean the parameter value in case it has extra whitespace
  db_host = trimspace(data.aws_ssm_parameter.db_host.value)
}
```

---

## Use in User Input Validation

```hcl
variable "bucket_name" {
  type = string

  validation {
    condition     = trimspace(var.bucket_name) == var.bucket_name
    error_message = "bucket_name must not have leading or trailing whitespace."
  }
}
```

---

## trimspace vs chomp

```hcl
locals {
  with_newline = "hello\n"

  # chomp: removes trailing newline characters (\n or \r\n)
  chomped = chomp("hello\n")    # "hello"

  # trimspace: removes ALL leading and trailing whitespace
  trimmed = trimspace("  hello\n  ")   # "hello"
}
```

Use `chomp()` when you only need to remove trailing newline characters (common for command output). Use `trimspace()` for full whitespace cleanup.

---

## Summary

`trimspace()` removes all leading and trailing whitespace - spaces, tabs, and newlines - from a string. It's most commonly used when reading file contents or HTTP responses that include trailing newlines, and for normalizing user-provided string variables. Use `chomp()` if you only need to remove trailing newline characters.
