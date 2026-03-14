# How to Use the replace Function for String Sanitization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Replace Function, String Sanitization, Input Validation, Infrastructure as Code

Description: Learn how to use Terraform's replace function for string sanitization including removing special characters, normalizing inputs, and enforcing naming conventions.

---

User inputs, external data sources, and computed values in Terraform often contain characters that are not valid for resource names, tags, or identifiers. The `replace` function is your primary tool for cleaning up these strings. It supports both literal string replacement and regex-based pattern matching, giving you the flexibility to handle anything from simple character swaps to complex sanitization rules.

## How replace Works

The `replace` function takes three arguments: the input string, the search pattern, and the replacement string:

```hcl
# Literal replacement
replace("hello world", " ", "-")
# Result: "hello-world"

# Regex replacement (wrap pattern in forward slashes)
replace("hello   world", "/\\s+/", "-")
# Result: "hello-world"
```

When the search pattern is wrapped in forward slashes (`/pattern/`), Terraform treats it as a regular expression. Otherwise, it performs a literal string match and replaces all occurrences.

## Removing Special Characters

The most common sanitization task is stripping characters that are not allowed in resource names:

```hcl
variable "project_name" {
  type    = string
  default = "My Cool Project! (v2.0)"
}

locals {
  # Remove everything except letters, numbers, and hyphens
  sanitized_name = replace(var.project_name, "/[^a-zA-Z0-9-]/", "")
  # Result: "MyCoolProjectv20"

  # If you want to preserve word boundaries as hyphens
  step1 = replace(var.project_name, "/[^a-zA-Z0-9\\s-]/", "")  # Remove special chars
  step2 = replace(local.step1, "/\\s+/", "-")                    # Spaces to hyphens
  step3 = lower(local.step2)                                      # Lowercase
  clean_name = local.step3
  # Result: "my-cool-project-v20"
}
```

## Sanitizing for Different Cloud Providers

Each cloud provider has different naming rules. Here are sanitization patterns for common cases:

### AWS S3 Bucket Names

S3 bucket names allow lowercase letters, numbers, hyphens, and periods. They must be 3-63 characters long:

```hcl
locals {
  raw_bucket = "My_Company.Data Bucket!"

  # Step 1: Replace underscores and spaces with hyphens
  bucket_step1 = replace(local.raw_bucket, "_", "-")
  bucket_step2 = replace(local.bucket_step1, " ", "-")

  # Step 2: Remove anything that is not lowercase alphanumeric, hyphen, or period
  bucket_step3 = replace(lower(local.bucket_step2), "/[^a-z0-9.-]/", "")

  # Step 3: Collapse multiple consecutive hyphens
  bucket_step4 = replace(local.bucket_step3, "/-+/", "-")

  # Step 4: Trim hyphens from start and end
  s3_bucket_name = replace(replace(local.bucket_step4, "/^-+/", ""), "/-+$/", "")
  # Result: "my-company.data-bucket"
}
```

### Azure Resource Group Names

Azure resource group names allow alphanumerics, hyphens, underscores, parentheses, and periods:

```hcl
locals {
  raw_rg_name = "My Resource Group @2024!"

  # Keep only allowed characters
  azure_rg_name = replace(local.raw_rg_name, "/[^a-zA-Z0-9_().-]/", "")
  # Result: "MyResourceGroup2024"
}
```

### GCP Resource Names

GCP typically requires lowercase letters, numbers, and hyphens, with the name starting with a letter:

```hcl
locals {
  raw_gcp_name = "123-My_Resource Name"

  # Normalize to lowercase with hyphens
  gcp_step1 = lower(replace(local.raw_gcp_name, "/[_\\s]/", "-"))
  gcp_step2 = replace(local.gcp_step1, "/[^a-z0-9-]/", "")
  gcp_step3 = replace(local.gcp_step2, "/-+/", "-")

  # Ensure it starts with a letter
  gcp_name = replace(local.gcp_step3, "/^[^a-z]+/", "")
  # Result: "my-resource-name"
}
```

## Building a Sanitization Function with Locals

For reusable sanitization, define it as a local value pattern:

```hcl
locals {
  # Generic slug generator - useful for many naming scenarios
  to_slug = {
    for key, value in {
      project     = var.project_name
      team        = var.team_name
      application = var.app_name
    } :
    key => replace(
      replace(
        replace(
          lower(value),
          "/[^a-z0-9\\s-]/", ""
        ),
        "/\\s+/", "-"
      ),
      "/-+/", "-"
    )
  }
}

# Use the sanitized values
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name    = "${local.to_slug.project}-vpc"
    Team    = local.to_slug.team
    AppName = local.to_slug.application
  }
}
```

## Normalizing Input Whitespace

User inputs sometimes have extra spaces, tabs, or other whitespace that needs cleaning:

```hcl
variable "description" {
  type    = string
  default = "This   has   extra    spaces   and\ttabs"
}

locals {
  # Replace any whitespace sequence with a single space
  normalized_description = replace(
    trimspace(var.description),
    "/\\s+/",
    " "
  )
  # Result: "This has extra spaces and tabs"
}
```

## Replacing Characters in Tags

AWS tags have specific character limits. Tag keys and values support most Unicode characters, but some characters cause issues with certain tools:

```hcl
variable "tags" {
  type = map(string)
  default = {
    "Cost Center"  = "Engineering/Platform"
    "Owner (Team)" = "cloud-ops@company.com"
  }
}

locals {
  # Sanitize tag keys for consistency
  sanitized_tags = {
    for key, value in var.tags :
    replace(replace(key, " ", "_"), "/[()]/", "") => value
  }
  # Result: { "Cost_Center" = "Engineering/Platform", "Owner_Team" = "cloud-ops@company.com" }
}
```

## Handling Path Separators

When working across operating systems or constructing paths:

```hcl
locals {
  # Normalize Windows paths to Unix style
  windows_path = "C:\\Users\\admin\\config\\app.conf"
  unix_path    = replace(local.windows_path, "\\", "/")
  # Result: "C:/Users/admin/config/app.conf"

  # Remove double slashes from URLs
  messy_url = "https://api.example.com//v2//users/"
  clean_url = replace(local.messy_url, "/([^:])\\/{2,}/", "$1/")
  # Result: "https://api.example.com/v2/users/"
}
```

## Masking Sensitive Values

While not a security measure (the actual values are still in state), you can mask values for display purposes in outputs:

```hcl
locals {
  api_key = "sk-abc123def456ghi789"

  # Show only the last 4 characters
  masked_key = format(
    "%s%s",
    replace(substr(local.api_key, 0, length(local.api_key) - 4), "/./", "*"),
    substr(local.api_key, length(local.api_key) - 4, 4)
  )
  # Result: "***************i789"
}
```

## Sanitizing DNS Labels

DNS labels have strict rules: 1-63 characters, lowercase alphanumeric and hyphens, cannot start or end with a hyphen:

```hcl
locals {
  raw_subdomain = "My App Service v2"

  # Convert to valid DNS label
  dns_step1 = lower(replace(local.raw_subdomain, "/\\s+/", "-"))
  dns_step2 = replace(local.dns_step1, "/[^a-z0-9-]/", "")
  dns_step3 = replace(local.dns_step2, "/-+/", "-")
  dns_step4 = replace(replace(local.dns_step3, "/^-/", ""), "/-$/", "")
  dns_label = substr(local.dns_step4, 0, min(63, length(local.dns_step4)))
  # Result: "my-app-service-v2"
}
```

## Chaining Replacements

Real-world sanitization usually needs multiple passes. Here is a comprehensive example:

```hcl
variable "user_input" {
  type    = string
  default = "  John's \"Super\" App (beta)  --  v2.0!  "
}

locals {
  # Chain of replacements for a clean resource name
  sanitized = replace(                                  # 6. Collapse multiple hyphens
    replace(                                            # 5. Remove trailing hyphens
      replace(                                          # 4. Remove leading hyphens
        replace(                                        # 3. Replace spaces with hyphens
          replace(                                      # 2. Remove disallowed characters
            lower(trimspace(var.user_input)),            # 1. Trim and lowercase
            "/[^a-z0-9\\s-]/", ""
          ),
          "/\\s+/", "-"
        ),
        "/^-+/", ""
      ),
      "/-+$/", ""
    ),
    "/-{2,}/", "-"
  )
  # Result: "johns-super-app-beta-v20"
}
```

## Practical Validation with replace

You can combine `replace` with a validation block to reject inputs that would change when sanitized:

```hcl
variable "resource_name" {
  type        = string
  description = "Name must be lowercase alphanumeric with hyphens only"

  validation {
    condition = (
      var.resource_name == replace(
        replace(lower(var.resource_name), "/[^a-z0-9-]/", ""),
        "/-+/", "-"
      )
    )
    error_message = "Resource name can only contain lowercase letters, numbers, and hyphens."
  }
}
```

## Summary

The `replace` function is essential for string sanitization in Terraform. With literal replacements you can handle simple character swaps, and with regex patterns you can enforce complex naming rules. The key patterns to remember are: removing invalid characters, collapsing repeated characters, normalizing whitespace, and trimming unwanted leading or trailing characters. By building sanitization chains in locals, you keep your resource definitions clean while ensuring every name meets its target platform's requirements.
