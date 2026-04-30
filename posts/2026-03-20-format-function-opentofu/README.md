# How to Use the format Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Format, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the format function in OpenTofu to build strings using printf-style format specifiers for precise string construction.

---

The `format()` function produces a string by applying printf-style format specifiers to a set of values. It provides more control than simple string interpolation when you need specific formatting - like padding, number formatting, or hexadecimal output.

---

## Syntax

```hcl
format(format_string, values...)
```

---

## Common Format Specifiers

| Specifier | Description | Example |
|---|---|---|
| `%s` | String value | `format("%s", "hello")` → `"hello"` |
| `%d` | Decimal integer | `format("%d", 42)` → `"42"` |
| `%f` | Floating point | `format("%.2f", 3.14159)` → `"3.14"` |
| `%x` | Lowercase hexadecimal | `format("%x", 255)` → `"ff"` |
| `%X` | Uppercase hexadecimal | `format("%X", 255)` → `"FF"` |
| `%o` | Octal | `format("%o", 8)` → `"10"` |
| `%b` | Binary | `format("%b", 5)` → `"101"` |
| `%q` | Quoted string | `format("%q", "hello")` → `"\"hello\""` |
| `%%` | Literal percent | `format("100%%")` → `"100%"` |

---

## Width and Padding

```hcl
locals {
  # Pad with spaces (right-align is default)
  example1 = format("%10s", "hello")    # "     hello"
  example2 = format("%-10s", "hello")   # "hello     " (left-align with -)
  example3 = format("%05d", 42)         # "00042" (zero-pad numbers)
  example4 = format("%8.2f", 3.14159)   # "    3.14"
}
```

---

## Building Formatted Names

```hcl
variable "sequence_number" {
  type    = number
  default = 7
}

locals {
  # Zero-padded sequence number for consistent sorting
  padded_num = format("%03d", var.sequence_number)   # "007"

  # Build names with padded numbers
  instance_name = format("web-%03d", var.sequence_number)  # "web-007"
}

resource "aws_instance" "web" {
  count = 5
  ami   = data.aws_ami.amazon_linux.id

  tags = {
    Name = format("web-%03d", count.index + 1)
    # "web-001", "web-002", etc.
  }
}
```

---

## IP Address Construction

```hcl
variable "network_base" {
  type    = number
  default = 10
}

locals {
  # Build CIDR blocks systematically
  cidrs = [
    for i in range(4) :
    format("%d.0.%d.0/24", var.network_base, i)
  ]
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}
```

---

## Building ARN-Like Patterns

```hcl
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Use format for precise string construction
  lambda_arn_pattern = format(
    "arn:aws:lambda:%s:%s:function:%s-*",
    local.region,
    local.account_id,
    var.app_name
  )
}
```

---

## format vs String Interpolation

```hcl
# These are equivalent for simple cases:

name1 = "app-${var.environment}"
name2 = format("app-%s", var.environment)

# format is more useful when you need:
# - Number formatting (padding, precision)
# - Hexadecimal output
# - Complex format strings with many values
# - JSON-quoted string output
```

---

## Summary

`format()` builds strings using printf-style format specifiers. Use `%s` for strings, `%d` for integers, `%f` for floats (with `.2f` for 2 decimal places), and `%05d` for zero-padded integers. It's most valuable when you need consistent numeric formatting - padded sequence numbers in resource names, formatted CIDR blocks, or precise floating-point display. For simple value embedding, string interpolation (`"${var}"`) is cleaner.
