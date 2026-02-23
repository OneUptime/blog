# How to Use the parseint Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, parseint Function, Math, HCL, Infrastructure as Code, Type Conversion, Numeric Functions

Description: Learn how to use the parseint function in Terraform to convert string representations of numbers in various bases to integer values for infrastructure configuration.

---

The `parseint` function in Terraform converts a string representation of a number in a given base into a decimal integer. This might sound niche, but it comes up more often than you would think - especially when working with hex color codes, octal file permissions, binary masks, and imported configuration values that arrive as strings.

## What Is the parseint Function?

The `parseint` function takes two arguments: a string containing the number and the base (radix) of that number. It returns the number as a Terraform integer in base 10.

```hcl
# parseint(string, base)
# Converts a string number in the given base to a decimal integer
parseint("FF", 16)   # Returns: 255
parseint("100", 2)   # Returns: 4
parseint("77", 8)    # Returns: 63
parseint("42", 10)   # Returns: 42
```

## Exploring in terraform console

```hcl
# Launch with: terraform console

# Decimal (base 10) - most straightforward
> parseint("42", 10)
42

> parseint("0", 10)
0

> parseint("999", 10)
999

# Hexadecimal (base 16)
> parseint("FF", 16)
255

> parseint("ff", 16)
255

> parseint("A", 16)
10

> parseint("1A2B", 16)
6699

# Binary (base 2)
> parseint("1010", 2)
10

> parseint("11111111", 2)
255

> parseint("0", 2)
0

# Octal (base 8)
> parseint("777", 8)
511

> parseint("644", 8)
420

> parseint("755", 8)
493
```

## Converting File Permissions

One of the most practical uses of `parseint` is working with Unix file permissions, which are traditionally expressed in octal:

```hcl
variable "file_permission" {
  type    = string
  default = "755"
  description = "File permission in octal notation"
}

locals {
  # Convert octal permission string to decimal for use in configurations
  permission_decimal = parseint(var.file_permission, 8)

  # Break down the permission bits
  owner_bits = floor(parseint(var.file_permission, 8) / 64)
  group_bits = floor((parseint(var.file_permission, 8) % 64) / 8)
  other_bits = parseint(var.file_permission, 8) % 8
}

output "permission_info" {
  value = {
    octal   = var.file_permission
    decimal = local.permission_decimal
    owner   = local.owner_bits  # 7 = rwx
    group   = local.group_bits  # 5 = r-x
    other   = local.other_bits  # 5 = r-x
  }
}
```

## Working with Hex Color Codes

If you are generating configurations that involve color values (dashboards, UI configs):

```hcl
variable "brand_color" {
  type    = string
  default = "3498DB"  # A nice blue
}

locals {
  # Extract RGB components from hex color
  red   = parseint(substr(var.brand_color, 0, 2), 16)
  green = parseint(substr(var.brand_color, 2, 2), 16)
  blue  = parseint(substr(var.brand_color, 4, 2), 16)
}

output "color_breakdown" {
  value = {
    hex   = "#${var.brand_color}"
    red   = local.red    # 52
    green = local.green  # 152
    blue  = local.blue   # 219
    rgb   = "rgb(${local.red}, ${local.green}, ${local.blue})"
  }
}
```

## Parsing Subnet Masks

Network configurations sometimes express values in hex or binary:

```hcl
variable "subnet_mask_hex" {
  type    = string
  default = "FFFFFF00"  # 255.255.255.0
}

locals {
  # Convert each octet from hex to decimal
  octet1 = parseint(substr(var.subnet_mask_hex, 0, 2), 16)
  octet2 = parseint(substr(var.subnet_mask_hex, 2, 2), 16)
  octet3 = parseint(substr(var.subnet_mask_hex, 4, 2), 16)
  octet4 = parseint(substr(var.subnet_mask_hex, 6, 2), 16)

  subnet_mask = "${local.octet1}.${local.octet2}.${local.octet3}.${local.octet4}"
}

output "subnet_mask" {
  value = local.subnet_mask
  # Output: "255.255.255.0"
}
```

## Converting Binary Feature Flags

Some systems use binary flags for feature toggles:

```hcl
variable "feature_flags_binary" {
  type    = string
  default = "10110001"
  description = "Binary string where each bit represents a feature: bit0=logging, bit1=metrics, bit2=alerts, etc."
}

locals {
  flags_value = parseint(var.feature_flags_binary, 2)

  # Check individual flags using bitwise operations (simulated)
  logging_enabled  = floor(local.flags_value % 2) == 1
  metrics_enabled  = floor((local.flags_value / 2) % 2) == 1
  alerts_enabled   = floor((local.flags_value / 4) % 2) == 1
  tracing_enabled  = floor((local.flags_value / 8) % 2) == 1
}

output "features" {
  value = {
    raw_value = local.flags_value
    logging   = local.logging_enabled
    metrics   = local.metrics_enabled
    alerts    = local.alerts_enabled
    tracing   = local.tracing_enabled
  }
}
```

## Parsing Configuration From External Sources

When importing configuration from systems that output numbers as strings:

```hcl
variable "port_string" {
  type    = string
  default = "8080"
  description = "Port number received as a string from external config"
}

variable "timeout_string" {
  type    = string
  default = "30"
}

locals {
  # Convert string values to proper integers
  port    = parseint(var.port_string, 10)
  timeout = parseint(var.timeout_string, 10)
}

resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = local.port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path    = "/health"
    port    = local.port
    timeout = local.timeout
  }
}
```

## Memory Address and Offset Calculations

When working with hardware or low-level configurations that use hex addresses:

```hcl
variable "base_address_hex" {
  type    = string
  default = "1000"
  description = "Base memory address in hexadecimal"
}

variable "offset_hex" {
  type    = string
  default = "FF"
}

locals {
  base_address = parseint(var.base_address_hex, 16)
  offset       = parseint(var.offset_hex, 16)
  target_address = local.base_address + local.offset
}

output "address_calculation" {
  value = {
    base   = "0x${var.base_address_hex} (${local.base_address})"
    offset = "0x${var.offset_hex} (${local.offset})"
    target = local.target_address
  }
}
```

## Validation with parseint

You can use `parseint` in validation rules to verify that string inputs are valid numbers in a given base:

```hcl
variable "hex_value" {
  type    = string
  default = "CAFE"

  validation {
    # can() returns false if parseint fails (invalid hex)
    condition     = can(parseint(var.hex_value, 16))
    error_message = "The value must be a valid hexadecimal string."
  }
}

variable "binary_mask" {
  type    = string
  default = "11001100"

  validation {
    condition     = can(parseint(var.binary_mask, 2))
    error_message = "The value must be a valid binary string (only 0s and 1s)."
  }
}
```

## parseint vs tonumber

Terraform also has `tonumber` which converts strings to numbers, but only for base-10:

```hcl
locals {
  # tonumber only handles decimal strings
  via_tonumber = tonumber("42")  # Works
  # tonumber("FF") would fail - it does not understand hex

  # parseint handles any base
  via_parseint_dec = parseint("42", 10)   # Same as tonumber
  via_parseint_hex = parseint("FF", 16)   # 255
  via_parseint_bin = parseint("1010", 2)  # 10
}
```

Use `tonumber` for simple string-to-number conversion. Use `parseint` when the input is in a non-decimal base or when you want to be explicit about the base.

## Converting Between Bases

While Terraform does not have a built-in function to format numbers in different bases, you can use `parseint` for the input side of base conversions:

```hcl
variable "input_base" {
  type    = number
  default = 16
}

variable "input_value" {
  type    = string
  default = "1F4"
}

locals {
  # Convert input to decimal
  decimal_value = parseint(var.input_value, var.input_base)
  # 0x1F4 = 500 in decimal
}

output "conversion" {
  value = "Input '${var.input_value}' in base ${var.input_base} = ${local.decimal_value} in decimal"
}
```

## Handling Edge Cases

```hcl
# parseint with leading zeros
> parseint("007", 10)
7

> parseint("0042", 10)
42

# Empty string causes an error
# parseint("", 10) would fail

# Non-numeric characters for the given base cause errors
# parseint("GG", 16) would fail (G is not a valid hex digit)
# parseint("29", 8) would fail (9 is not a valid octal digit)
```

## Summary

The `parseint` function converts string representations of numbers from any base (2 through 62) into Terraform integers. Its most practical applications include handling octal file permissions, parsing hexadecimal values (colors, addresses, subnet masks), converting binary feature flags, and processing string-typed numbers from external configuration sources. Use it alongside `can()` for input validation, and prefer it over `tonumber` when you need explicit control over the number base.

For more numeric functions in Terraform, see our posts on the [abs function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-abs-function-in-terraform/view) and the [pow function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-pow-function-in-terraform/view).
