# How to Use the strrev Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the strrev function in OpenTofu to reverse a string, with practical examples for generating unique identifiers and testing palindromes.

## Introduction

The `strrev` function in OpenTofu reverses the characters in a string. While it may seem like a niche function, it is useful for generating unique reversed identifiers, implementing simple obfuscation, testing string palindromes, and creating unique names from existing identifiers.

## Syntax

```hcl
strrev(string)
```

- **string** - any string value
- Returns the string with all characters in reverse order
- Properly handles Unicode characters

## Basic Examples

```hcl
output "reverse_hello" {
  value = strrev("hello")         # Returns "olleh"
}

output "reverse_number_string" {
  value = strrev("12345")         # Returns "54321"
}

output "reverse_mixed" {
  value = strrev("abc-123")       # Returns "321-cba"
}

output "palindrome_check" {
  value = strrev("racecar") == "racecar"  # Returns true
}
```

## Practical Use Cases

### Creating Reversed Unique Identifiers

```hcl
variable "account_id" {
  type    = string
  default = "123456789012"
}

locals {
  # Reversed account ID for a secondary identifier scheme
  reversed_account = strrev(var.account_id)
}

resource "aws_s3_bucket" "backup" {
  # Use reversed account ID to create unique bucket names
  bucket = "backup-${local.reversed_account}"

  tags = {
    AccountId = var.account_id
  }
}
```

### Generating Unique Suffixes

```hcl
variable "environment" {
  type    = string
  default = "production"
}

locals {
  # Create an obfuscated suffix from the environment name
  env_suffix = substr(strrev(var.environment), 0, 4)
}

output "unique_suffix" {
  value = local.env_suffix  # Returns "noit" (first 4 chars of reversed "production")
}
```

### Palindrome Validation in Configuration

```hcl
variable "symmetric_key" {
  type        = string
  description = "A key that must be a palindrome"
  default     = "abcba"

  validation {
    condition     = var.symmetric_key == strrev(var.symmetric_key)
    error_message = "symmetric_key must be a palindrome."
  }
}
```

### Reversing Version Components

```hcl
variable "version_string" {
  type    = string
  default = "321"  # Stored reversed
}

locals {
  # Reverse it back to get the actual version
  actual_version = strrev(var.version_string)
}

output "actual_version" {
  value = local.actual_version  # Returns "123"
}
```

## Step-by-Step Usage

1. Call `strrev(string)` with any string.
2. Use the result as a suffix, for comparisons, or in further transformations.
3. Test in `tofu console`:

```bash
tofu console

> strrev("hello")
"olleh"
> strrev("abcba") == "abcba"
true
> strrev("OpenTofu")
"ufoTnepO"
```

## Combining with Other Functions

```hcl
locals {
  base_name = "myservice"
  # Reverse, take first 4 chars, uppercase for a unique code
  service_code = upper(substr(strrev(local.base_name), 0, 4))
  # Returns "ECIV" → useful for short unique identifiers
}
```

## Unicode Support

The `strrev` function correctly handles Unicode characters and multi-byte sequences:

```hcl
output "unicode_reverse" {
  value = strrev("café")  # Correctly reverses Unicode characters
}
```

## When strrev is Useful

- Generating alternate identifiers from existing ones
- Validating palindrome constraints in configuration
- Obfuscating (not encrypting) identifiers
- Creating unique naming schemes from existing patterns

## Conclusion

The `strrev` function is a specialized utility in OpenTofu for string reversal. While not frequently needed, it provides a clean solution for palindrome checking, reversed identifier generation, and creating alternate naming schemes from existing identifiers. Keep it in mind when you need to manipulate string character order in your infrastructure configurations.
