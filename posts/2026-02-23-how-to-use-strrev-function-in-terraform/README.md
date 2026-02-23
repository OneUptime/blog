# How to Use the strrev Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, String Functions, HCL, DevOps

Description: Learn how to use the strrev function in Terraform to reverse strings, with practical examples for extracting suffixes, generating identifiers, and creative string manipulation.

---

The `strrev` function reverses the characters in a string. While it might seem like a niche function at first glance, it becomes genuinely useful in situations where you need to extract content from the end of a string, implement creative string transformations, or work around limitations of other string functions.

## What Does strrev Do?

The `strrev` function takes a string and returns it with the character order reversed.

```hcl
# Basic syntax
strrev(string)
```

## Basic Examples

```hcl
# Reverse a simple string
> strrev("hello")
"olleh"

# Reverse a word
> strrev("terraform")
"mrofarret"

# Numbers get reversed too
> strrev("12345")
"54321"

# Empty string
> strrev("")
""

# Single character
> strrev("a")
"a"

# Palindrome stays the same
> strrev("racecar")
"racecar"
```

## Extracting the Last N Characters

One practical use of `strrev` is extracting characters from the end of a string when combined with `substr`.

```hcl
locals {
  resource_id = "i-0abc123def456789"

  # Get the last 6 characters
  # Reverse, take first 6, reverse back
  last_6 = strrev(substr(strrev(local.resource_id), 0, 6))
  # Result: "456789"

  # Create a short identifier from the end of a long ID
  short_id = strrev(substr(strrev(local.resource_id), 0, 8))
  # Result: "ef456789"
}
```

While you could use `substr` with calculated offsets, the `strrev` approach can be more readable in some cases.

## Palindrome Checks

You can verify if a string is a palindrome by comparing it with its reverse. This is useful for certain naming conventions or validation rules.

```hcl
variable "identifier" {
  description = "Resource identifier"
  type        = string
  default     = "abcba"
}

locals {
  is_palindrome = var.identifier == strrev(var.identifier)
  # true for "abcba", false for "hello"
}
```

## Generating Unique Suffixes

When you need unique but deterministic suffixes based on input strings.

```hcl
variable "project_name" {
  default = "payment-service"
}

locals {
  # Create a suffix from the reversed project name (first 4 chars)
  suffix = substr(strrev(var.project_name), 0, 4)
  # "eciv" (from "ecivrse-tnemyap" reversed)

  unique_name = "${var.project_name}-${local.suffix}"
  # "payment-service-eciv"
}
```

## Finding the Last Occurrence of a Character

Terraform does not have a built-in `lastIndexOf` function. You can simulate one using `strrev`.

```hcl
locals {
  path = "path/to/deep/nested/file.txt"

  # Find everything after the last slash
  reversed     = strrev(local.path)
  # "txt.elif/detsen/peed/ot/htap"

  # Find the first slash in the reversed string
  # (which is the last slash in the original)
  first_slash_pos = length(split("/", local.reversed)[0])

  # Extract the filename
  filename = strrev(substr(local.reversed, 0, local.first_slash_pos))
  # "file.txt"
}
```

This is a creative workaround for extracting the last component of a path. In practice, you might find `split` and array indexing simpler for this particular case, but the technique generalizes to other problems.

## Reversing Domain Name Order

Convert between domain name order and reverse DNS order (used in some naming conventions).

```hcl
locals {
  domain = "api.prod.example.com"

  # Split, reverse the list, and rejoin
  domain_parts   = split(".", local.domain)
  reversed_parts = [for i in range(length(local.domain_parts) - 1, -1, -1) : local.domain_parts[i]]
  reverse_dns    = join(".", local.reversed_parts)
  # Result: "com.example.prod.api"
}
```

Note that here we reverse the order of domain parts (a list operation), not the characters within each part. The `strrev` function works on individual strings, while this example uses a `for` expression to reverse a list.

## Combining strrev with Other Functions

Use `strrev` as part of a larger string processing pipeline.

```hcl
locals {
  input = "Hello-World-123"

  # Reverse, convert to lowercase, and replace hyphens
  transformed = replace(lower(strrev(local.input)), "-", "_")
  # "321_dlrow_olleh"
}
```

## Building Mirrored Identifiers

Sometimes you need identifiers that mirror or reflect a pattern.

```hcl
locals {
  base = "abc"

  # Create a mirrored string
  mirrored = "${local.base}-${strrev(local.base)}"
  # "abc-cba"

  # Create a palindrome-style name
  palindrome_name = "${local.base}${strrev(substr(local.base, 0, length(local.base) - 1))}"
  # "abcba"
}
```

## Extracting File Extensions Creatively

Another way to get file extensions using string reversal.

```hcl
locals {
  filename = "archive.2026.02.23.tar.gz"

  # Get the last extension
  reversed = strrev(local.filename)
  # "zg.rat.32.20.6202.evihcra"

  # Get characters up to the first dot in the reversed string
  ext_reversed = split(".", local.reversed)[0]
  last_ext     = strrev(local.ext_reversed)
  # Result: "gz"
}
```

## Practical Use: Truncating from the Right

When you need to ensure a string does not exceed a maximum length and you want to keep the end rather than the beginning.

```hcl
variable "resource_id" {
  default = "very-long-resource-identifier-abc123def456"
}

locals {
  max_length = 20

  # Keep the last max_length characters (they tend to be more unique)
  truncated = (
    length(var.resource_id) > local.max_length
    ? strrev(substr(strrev(var.resource_id), 0, local.max_length))
    : var.resource_id
  )
  # Result: "ntifier-abc123def456"
}
```

This is useful when resource IDs have meaningful suffixes (like hash values) that you want to preserve.

## Double Reversal Patterns

Reversing twice gets you back to the original. This is useful when you need to apply a function that only works on the beginning of a string to the end instead.

```hcl
locals {
  name = "my-app-service-prod"

  # "trimprefix" but from the end
  # Remove "-prod" from the end
  without_suffix = strrev(trimprefix(strrev(local.name), strrev("-prod")))
  # Step 1: strrev(name)          = "dorp-ecivres-ppa-ym"
  # Step 2: strrev("-prod")       = "dorp-"
  # Step 3: trimprefix            = "ecivres-ppa-ym"
  # Step 4: strrev                = "my-app-service"
}
```

Of course, `trimsuffix` exists for this exact purpose, so use it instead. But the pattern of double-reversal is useful to know for cases where the equivalent end-of-string function does not exist.

## Summary

The `strrev` function is admittedly a niche tool, but it fills specific gaps in Terraform's string manipulation capabilities. It is most valuable for extracting content from the end of strings, implementing truncation that preserves suffixes, and creative string transformations. In most everyday cases, you will find dedicated functions like `trimsuffix`, `endswith`, and `split` more appropriate, but `strrev` is good to have in your toolkit for the situations where those functions fall short.
