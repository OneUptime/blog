# How to Use the Provider Functions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Providers, HCL, Infrastructure as Code, Terraform 1.8

Description: Learn how to use provider-defined functions in Terraform 1.8 and later to access provider-specific logic directly in your HCL expressions and configurations.

---

Terraform 1.8 introduced a significant new capability: provider-defined functions. Before this feature, providers could only define resources, data sources, and provisioners. Now providers can also expose custom functions that you call directly in your Terraform expressions, just like built-in functions. This opens up a whole new set of possibilities for infrastructure configuration.

## What Are Provider Functions?

Provider functions are custom functions defined by Terraform providers that extend the set of available functions beyond Terraform's built-in ones. They follow the same calling conventions as built-in functions but are namespaced under their provider.

```hcl
# Built-in function - no namespace
output "built_in" {
  value = upper("hello")
}

# Provider function - namespaced under the provider
output "provider_func" {
  value = provider::aws::arn_parse("arn:aws:iam::123456789012:role/MyRole")
}
```

## Syntax

Provider functions use a namespaced syntax:

```hcl
provider::<provider_name>::<function_name>(arguments...)
```

The double colon (`::`) separates the `provider` keyword, the provider name, and the function name.

## Setting Up Provider Functions

To use provider functions, you need Terraform 1.8 or later and a provider that defines functions:

```hcl
terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"  # Version that includes provider functions
    }
  }
}

provider "aws" {
  region = "us-west-2"
}
```

## AWS Provider Functions

The AWS provider was one of the first to add provider functions. Here are some of the most useful ones:

### arn_parse - Parse AWS ARN Strings

```hcl
locals {
  role_arn = "arn:aws:iam::123456789012:role/MyDeployRole"

  # Parse the ARN into its components
  parsed = provider::aws::arn_parse(local.role_arn)
}

output "arn_components" {
  value = {
    partition  = local.parsed.partition    # "aws"
    service    = local.parsed.service      # "iam"
    region     = local.parsed.region       # ""
    account_id = local.parsed.account_id   # "123456789012"
    resource   = local.parsed.resource     # "role/MyDeployRole"
  }
}
```

This is much cleaner than using regex or string splitting to extract ARN components.

### arn_build - Construct ARN Strings

```hcl
locals {
  # Build an ARN from components
  bucket_arn = provider::aws::arn_build({
    partition  = "aws"
    service    = "s3"
    region     = ""
    account_id = ""
    resource   = "my-bucket/*"
  })
  # Result: "arn:aws:s3:::my-bucket/*"
}
```

### Practical Example: Cross-Account IAM

```hcl
variable "trusted_role_arns" {
  description = "List of role ARNs from trusted accounts"
  type        = list(string)
  default = [
    "arn:aws:iam::111111111111:role/DeployRole",
    "arn:aws:iam::222222222222:role/AdminRole",
    "arn:aws:iam::333333333333:role/ReadOnlyRole",
  ]
}

locals {
  # Extract unique account IDs from the trusted role ARNs
  trusted_accounts = distinct([
    for arn in var.trusted_role_arns :
    provider::aws::arn_parse(arn).account_id
  ])
}

output "trusted_account_ids" {
  value = local.trusted_accounts
  # ["111111111111", "222222222222", "333333333333"]
}

# Use the parsed information to build IAM policies
data "aws_iam_policy_document" "trust_policy" {
  dynamic "statement" {
    for_each = var.trusted_role_arns
    content {
      effect  = "Allow"
      actions = ["sts:AssumeRole"]
      principals {
        type        = "AWS"
        identifiers = [statement.value]
      }
      # Add conditions based on parsed ARN
      condition {
        test     = "StringEquals"
        variable = "aws:PrincipalAccount"
        values   = [provider::aws::arn_parse(statement.value).account_id]
      }
    }
  }
}
```

## Other Providers with Functions

### HashiCorp Cloud Platform (HCP) Provider

```hcl
terraform {
  required_providers {
    hcp = {
      source  = "hashicorp/hcp"
      version = ">= 0.80.0"
    }
  }
}

# Example: Using HCP provider functions
locals {
  # Provider-specific utility functions
  result = provider::hcp::some_function("input")
}
```

### Community and Third-Party Providers

As the provider function feature matures, more providers are adding custom functions. Check the documentation for your specific providers to see what functions they offer.

## Building Dynamic Infrastructure with Provider Functions

### Dynamic Policy Generation

```hcl
variable "resource_arns" {
  description = "ARNs of resources to include in the policy"
  type        = list(string)
}

locals {
  # Group resources by AWS service using provider functions
  resources_by_service = {
    for arn in var.resource_arns :
    provider::aws::arn_parse(arn).service => arn...
  }
}

# Create separate policy statements per service
data "aws_iam_policy_document" "per_service" {
  dynamic "statement" {
    for_each = local.resources_by_service
    content {
      effect    = "Allow"
      actions   = ["${statement.key}:*"]
      resources = statement.value
    }
  }
}
```

### Resource Tagging Based on ARN Components

```hcl
variable "target_arn" {
  type = string
}

locals {
  parsed_arn = provider::aws::arn_parse(var.target_arn)

  # Derive tags from the ARN structure
  derived_tags = {
    Service    = local.parsed_arn.service
    AccountID  = local.parsed_arn.account_id
    Region     = local.parsed_arn.region
    ResourceID = local.parsed_arn.resource
  }
}
```

## Using Provider Functions with Aliases

If you have multiple provider configurations with aliases, you reference the provider alias:

```hcl
provider "aws" {
  region = "us-west-2"
  alias  = "west"
}

provider "aws" {
  region = "us-east-1"
  alias  = "east"
}

# Provider functions use the default provider unless you specify otherwise
locals {
  parsed = provider::aws::arn_parse(var.some_arn)
}
```

## Error Handling

Provider functions can fail just like built-in functions. Use `try()` and `can()` for defensive coding:

```hcl
variable "maybe_arn" {
  description = "A string that may or may not be a valid ARN"
  type        = string
}

locals {
  # Safely attempt to parse the ARN
  parsed = try(provider::aws::arn_parse(var.maybe_arn), null)

  # Check if parsing succeeded
  is_valid_arn = local.parsed != null

  # Extract the account ID if the ARN is valid
  account_id = local.is_valid_arn ? local.parsed.account_id : "unknown"
}
```

## Best Practices

1. **Check provider version requirements.** Provider functions require specific minimum versions of both Terraform and the provider.

2. **Use provider functions over string manipulation.** If a provider offers a function for parsing or building a value, prefer it over regex or string splitting.

3. **Handle errors gracefully.** Wrap provider function calls in `try()` when the input might be invalid.

4. **Check provider documentation.** The available functions vary by provider and version. Always check the provider's documentation for the most current list.

5. **Pin provider versions** that include the functions you depend on to avoid breaking changes.

## Comparing Provider Functions to Data Sources

Before provider functions, similar operations required data sources:

```hcl
# Old way: using a data source (requires an API call)
data "aws_arn" "example" {
  arn = "arn:aws:iam::123456789012:role/MyRole"
}

# New way: using a provider function (local computation, no API call)
locals {
  parsed = provider::aws::arn_parse("arn:aws:iam::123456789012:role/MyRole")
}
```

Provider functions are faster because they execute locally without making API calls.

## Summary

Provider-defined functions in Terraform 1.8 and later represent a major evolution of the Terraform language. They let providers expose domain-specific logic as functions that you can call directly in expressions, making configurations cleaner and more maintainable. The AWS provider's ARN parsing and building functions are the most prominent examples today, but expect more providers to add functions over time. Start using them to replace string manipulation hacks and unnecessary data source calls in your configurations. For a specific provider function example, check out our post on the [encode_tfvars provider function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-encode-tfvars-provider-function/view).
