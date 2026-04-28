# How to Use the log Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the log function in OpenTofu to compute logarithms for scaling tier calculations and mathematical infrastructure logic.

## Introduction

The `log` function in OpenTofu computes the logarithm of a number to a specified base. While less commonly used than other math functions, it is valuable for logarithmic scaling calculations, determining tier levels from quantities, and inverse operations of `pow`.

## Syntax

```hcl
log(number, base)
```

- **number** - the value to compute the logarithm of (must be > 0)
- **base** - the logarithm base (must be > 0 and not 1)
- Returns a float

## Basic Examples

```hcl
output "log2_of_8" {
  value = log(8, 2)    # Returns 3 (2^3 = 8)
}

output "log10_of_1000" {
  value = log(1000, 10)  # Returns 2.9999999999999996 (float imprecision; mathematically 3)
}

output "natural_log" {
  value = log(2.718281828, 2.718281828)  # Returns ~1 (ln(e) = 1)
}
```

## Practical Use Cases

### Determining Storage Tier from Size

```hcl
variable "storage_gb" {
  type    = number
  default = 256
}

locals {
  # Determine which power-of-2 tier this belongs to
  # log2(256) = 8, so this is tier 8
  storage_tier = floor(log(var.storage_gb, 2))
}

output "storage_tier" {
  value = local.storage_tier  # Returns 8
}
```

### Logarithmic Scaling for Instance Types

```hcl
variable "user_count" {
  type    = number
  default = 10000
}

locals {
  # Determine scaling tier based on log10 of user count
  # 1-9 users = tier 0, 10-99 = tier 1, 100-999 = tier 2, etc.
  scaling_tier = floor(log(max(var.user_count, 1), 10))

  instance_type_map = {
    0 = "t3.micro"
    1 = "t3.small"
    2 = "t3.medium"
    3 = "t3.large"
    4 = "t3.xlarge"
  }

  # Cap at tier 4
  capped_tier   = min(local.scaling_tier, 4)
  instance_type = local.instance_type_map[local.capped_tier]
}

output "recommended_instance" {
  value = local.instance_type  # Returns "t3.xlarge" for 10000 users
}
```

### Inverse of pow

```hcl
locals {
  # Verify: log base 2 of pow(2, 10) should return 10
  original_exponent = 10
  powered           = pow(2, local.original_exponent)  # 1024
  recovered         = log(local.powered, 2)             # 10
}

output "recovered_exponent" {
  value = local.recovered  # Returns 10
}
```

## Step-by-Step Usage

1. Identify where you need logarithmic scaling or tier determination.
2. Call `log(number, base)` with the appropriate arguments.
3. Often combine with `floor()` to get an integer tier.
4. Test in `tofu console`:

```bash
tofu console

> log(100, 10)
2
> log(1024, 2)
10
> floor(log(500, 10))
2
```

## Natural and Common Logarithms

OpenTofu does not have separate `ln` or `log10` functions, but you can compute them using `log`:

```hcl
locals {
  # Natural log (base e)
  e       = 2.718281828459045
  ln_100  = log(100, local.e)  # Returns ~4.605

  # Common log (base 10)
  log10_100 = log(100, 10)  # Returns 2
}
```

## Common Pitfalls

- `log(0, base)` returns `-Infinity` rather than an error. Always ensure the input is positive to avoid propagating non-finite values into downstream calculations.
- `log(1, base)` returns `0` for any base - this is mathematically correct.
- Floating-point precision may produce results like `9.999999` instead of `10`. Use `round` (via `floor(x + 0.5)`) if you need an exact integer.

## Conclusion

The `log` function in OpenTofu enables logarithmic calculations that are useful for tier-based resource selection and inverse exponential math. While it is a specialized function, it pairs naturally with `pow`, `floor`, and `ceil` for sophisticated infrastructure sizing logic.
