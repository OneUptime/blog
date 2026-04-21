# How to Use the strrev Function in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Strrev, String Function, HCL, Infrastructure as Code, DevOps

Description: Learn how to use the strrev function in OpenTofu to reverse a string, and explore practical uses in infrastructure configurations.

---

The `strrev()` function reverses the characters in a string. It handles Unicode correctly, reversing by grapheme cluster rather than by byte.

---

## Syntax

```hcl
strrev(string)
```

---

## Basic Examples

```hcl
locals {
  example1 = strrev("hello")         # "olleh"
  example2 = strrev("OpenTofu")      # "ufuTnepO"
  example3 = strrev("racecar")       # "racecar" (palindrome)
  example4 = strrev("12345")         # "54321"
  example5 = strrev("")              # ""
}
```

---

## Practical Use: Checking for Palindromes

```hcl
variable "identifier" {
  type = string
}

locals {
  # Check if the identifier is a palindrome
  is_palindrome = var.identifier == strrev(var.identifier)
}

output "palindrome_check" {
  value = local.is_palindrome
}
```

---

## Use in Unique Identifier Generation

Sometimes you want to create a secondary unique identifier from an existing one:

```hcl
resource "random_id" "base" {
  byte_length = 8
}

locals {
  # Use reversed ID as part of a secondary resource name
  secondary_id = strrev(random_id.base.hex)
}
```

---

## Domain Name Reversal for DNS-Related Organization

Domain names are sometimes processed in reversed label order for grouping or zone organization:

```hcl
variable "domain" {
  type    = string
  default = "api.example.com"
}

locals {
  # Reverse the domain components for organization
  parts          = split(".", var.domain)
  reversed_parts = reverse(local.parts)
  reverse_zone   = join(".", local.reversed_parts)
  # "com.example.api"
}
```

Note: For domain part reversal, `reverse()` (the list function) is more appropriate than `strrev()`.

---

## When strrev Is Not What You Need

```hcl
# If you want to reverse a LIST, use reverse() not strrev()

locals {
  my_list     = ["a", "b", "c"]
  reversed    = reverse(local.my_list)   # ["c", "b", "a"]

  # strrev operates on strings, not lists
  my_string   = "abc"
  reversed_str = strrev(local.my_string)  # "cba"
}
```

---

## Summary

`strrev()` reverses the characters in a string, handling Unicode correctly. In infrastructure code, it has limited practical use - the most common scenarios involve symmetry checks and generating derived identifiers. For reversing ordered lists, use the `reverse()` function instead.
