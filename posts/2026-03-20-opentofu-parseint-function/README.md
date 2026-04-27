# How to Use the parseint Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the parseint function in OpenTofu to convert string representations of integers in various bases to numbers.

## Introduction

The `parseint` function in OpenTofu parses a string as an integer in a specified base (radix), returning a number. It is useful for converting hexadecimal color codes, binary flags, octal permissions, and other non-decimal numeric strings into usable numbers.

## Syntax

```hcl
parseint(string, base)
```

- **string** - the string representation of an integer
- **base** - the radix/base to interpret the string in (2–62)
- Returns an integer

## Basic Examples

```hcl
output "decimal_parse" {
  value = parseint("42", 10)    # Returns 42
}

output "hex_parse" {
  value = parseint("FF", 16)    # Returns 255
}

output "binary_parse" {
  value = parseint("1010", 2)   # Returns 10
}

output "octal_parse" {
  value = parseint("777", 8)    # Returns 511
}
```

## Practical Use Cases

### Converting Hex Color Codes

```hcl
variable "brand_color_hex" {
  type    = string
  default = "FF5733"
}

locals {
  red   = parseint(substr(var.brand_color_hex, 0, 2), 16)  # 255
  green = parseint(substr(var.brand_color_hex, 2, 2), 16)  # 87
  blue  = parseint(substr(var.brand_color_hex, 4, 2), 16)  # 51
}

output "rgb_values" {
  value = "rgb(${local.red}, ${local.green}, ${local.blue})"
}
```

### Parsing Hexadecimal Port Numbers

```hcl
variable "port_hex" {
  type    = string
  default = "1F90"  # 8080 in hex
}

locals {
  port_number = parseint(var.port_hex, 16)
}

resource "aws_security_group_rule" "app" {
  type        = "ingress"
  from_port   = local.port_number
  to_port     = local.port_number
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]

  security_group_id = aws_security_group.app.id
}
```

### Processing Binary Feature Flags

```hcl
variable "feature_flags_binary" {
  type    = string
  default = "1101"  # Features 0, 2, 3 enabled
}

locals {
  flags_decimal = parseint(var.feature_flags_binary, 2)
  # 1101 binary = 13 decimal
  # Bit 0 (1): feature A enabled
  # Bit 1 (0): feature B disabled
  # Bit 2 (1): feature C enabled
  # Bit 3 (1): feature D enabled
}

output "flags_decimal" {
  value = local.flags_decimal  # Returns 13
}
```

### Reading Octal Unix Permissions

```hcl
variable "file_permission_octal" {
  type    = string
  default = "755"
}

locals {
  permission_decimal = parseint(var.file_permission_octal, 8)
}

output "permission_decimal" {
  value = local.permission_decimal  # Returns 493
}
```

## Step-by-Step Usage

1. Identify strings with non-decimal numeric content.
2. Call `parseint(string, base)` with the correct base.
3. Use the resulting number in resource arguments or calculations.
4. Test in `tofu console`:

```bash
tofu console

> parseint("100", 2)
4
> parseint("1F", 16)
31
> parseint("10", 8)
8
```

## Error Handling with try

```hcl
variable "maybe_hex" {
  type    = string
  default = "ZZZZ"  # Invalid hex
}

locals {
  # Safely attempt to parse, defaulting to 0 on failure
  parsed_value = try(parseint(var.maybe_hex, 16), 0)
}
```

## Supported Bases

| Base | Name | Characters |
|------|------|------------|
| 2 | Binary | 0-1 |
| 8 | Octal | 0-7 |
| 10 | Decimal | 0-9 |
| 16 | Hexadecimal | 0-9, A-F |
| 36 | Base-36 | 0-9, A-Z |

## Conclusion

The `parseint` function fills a gap in OpenTofu's type system by allowing conversion of non-decimal string representations to integers. Whether you are working with hex color codes, binary flags, or octal permissions, `parseint` provides a clean and flexible way to convert these strings into usable numeric values.
