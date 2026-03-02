# How to Use OpenTofu Provider-Defined Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Provider, Functions, Infrastructure as Code

Description: Learn how to use provider-defined functions in OpenTofu to extend HCL with custom functions from providers for data transformation, validation, and computation beyond built-in capabilities.

---

OpenTofu introduced provider-defined functions, a feature that lets Terraform providers expose custom functions you can call in your HCL code. Instead of being limited to the built-in function set (like `join`, `split`, `length`, etc.), you can now use functions provided by AWS, Google Cloud, Kubernetes, or any other provider. This opens up new possibilities for data transformation, validation, and computation.

## What Are Provider-Defined Functions?

In standard OpenTofu (and Terraform), you have a fixed set of built-in functions: string manipulation, math, collection operations, encoding, and so on. If you need functionality beyond this set, you are stuck using workarounds like external data sources, null resources with provisioners, or pre-processing outside OpenTofu.

Provider-defined functions solve this by letting providers register custom functions. For example, the AWS provider could expose a function to validate an ARN format, or a networking provider could expose a function to calculate subnet ranges.

The syntax uses a namespace prefix to distinguish provider functions from built-in functions:

```hcl
# Built-in function (no prefix)
output "upper_name" {
  value = upper("hello")
}

# Provider-defined function (provider:: prefix)
output "validated_arn" {
  value = provider::aws::arn_parse("arn:aws:s3:::my-bucket")
}
```

## Enabling Provider Functions

Provider functions are available automatically when you use a provider that implements them. You do not need any special configuration:

```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"  # Version that includes provider functions
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

After running `tofu init`, the provider's functions become available in your configuration.

## Using AWS Provider Functions

The AWS provider includes several useful functions:

```hcl
# Parse an ARN into its components
locals {
  bucket_arn = "arn:aws:s3:::my-application-data"
  parsed_arn = provider::aws::arn_parse(local.bucket_arn)
}

output "arn_region" {
  value = local.parsed_arn.region
}

output "arn_account" {
  value = local.parsed_arn.account_id
}

output "arn_resource" {
  value = local.parsed_arn.resource
}
```

```hcl
# Build an ARN from components
locals {
  constructed_arn = provider::aws::arn_build({
    partition = "aws"
    service   = "s3"
    region    = ""
    account   = ""
    resource  = "my-bucket/prefix/*"
  })
}

output "constructed_arn" {
  value = local.constructed_arn
  # Output: arn:aws:s3:::my-bucket/prefix/*
}
```

## Using Functions in Expressions

Provider functions work anywhere a regular function works:

```hcl
# In resource attributes
resource "aws_iam_policy" "bucket_access" {
  name = "bucket-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = [
          provider::aws::arn_build({
            partition = "aws"
            service   = "s3"
            region    = ""
            account   = ""
            resource  = "${var.bucket_name}/*"
          })
        ]
      }
    ]
  })
}
```

```hcl
# In conditional expressions
locals {
  is_valid_arn = can(provider::aws::arn_parse(var.input_arn))
}

resource "aws_s3_bucket_policy" "policy" {
  count  = local.is_valid_arn ? 1 : 0
  bucket = aws_s3_bucket.main.id
  policy = var.custom_policy
}
```

```hcl
# In for expressions
locals {
  arns = [
    "arn:aws:s3:::bucket-1",
    "arn:aws:s3:::bucket-2",
    "arn:aws:iam::123456789012:role/my-role",
  ]

  s3_arns = [
    for arn in local.arns :
    arn if provider::aws::arn_parse(arn).service == "s3"
  ]
}
```

## Creating Custom Validation with Provider Functions

Use provider functions for input validation:

```hcl
variable "target_arn" {
  type        = string
  description = "ARN of the target resource"

  validation {
    condition     = can(provider::aws::arn_parse(var.target_arn))
    error_message = "The target_arn must be a valid AWS ARN."
  }
}

variable "target_arns" {
  type        = list(string)
  description = "List of target ARNs"

  validation {
    condition = alltrue([
      for arn in var.target_arns :
      can(provider::aws::arn_parse(arn))
    ])
    error_message = "All values in target_arns must be valid AWS ARNs."
  }
}
```

## Working with Multiple Providers

When multiple providers define functions, use the provider namespace to disambiguate:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
    google = {
      source  = "hashicorp/google"
      version = ">= 5.20.0"
    }
  }
}

locals {
  # AWS provider function
  aws_arn = provider::aws::arn_parse("arn:aws:s3:::my-bucket")

  # Google provider function (hypothetical example)
  gcp_project = provider::google::project_parse("projects/my-project")
}
```

## Provider Functions with Aliases

When using provider aliases, reference the alias in the function call:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

# Functions from the default provider
locals {
  east_arn = provider::aws::arn_build({
    partition = "aws"
    service   = "s3"
    region    = "us-east-1"
    account   = ""
    resource  = "east-bucket"
  })
}
```

## Discovering Available Functions

Check what functions a provider offers:

```bash
# Review the provider documentation
# Functions are listed in the provider's docs on the registry

# You can also check by trying to use a function
# If it does not exist, you get a clear error message:
# Error: Call to unknown function
# There is no function named "provider::aws::nonexistent".
```

## Combining Provider Functions with Built-in Functions

Provider functions compose with built-in functions:

```hcl
locals {
  # Parse ARNs and extract account IDs
  arns = [
    "arn:aws:iam::111111111111:role/role-a",
    "arn:aws:iam::222222222222:role/role-b",
    "arn:aws:iam::111111111111:role/role-c",
  ]

  # Get unique account IDs from a list of ARNs
  account_ids = distinct([
    for arn in local.arns :
    provider::aws::arn_parse(arn).account_id
  ])

  # Format account IDs as a comma-separated string
  account_list = join(", ", local.account_ids)
}

output "unique_accounts" {
  value = local.account_list
  # Output: "111111111111, 222222222222"
}
```

## Error Handling

Provider functions can fail. Use `can()` and `try()` to handle errors gracefully:

```hcl
locals {
  # Safe ARN parsing with fallback
  raw_arn = var.input_arn

  parsed = try(
    provider::aws::arn_parse(local.raw_arn),
    {
      partition  = "unknown"
      service    = "unknown"
      region     = "unknown"
      account_id = "unknown"
      resource   = local.raw_arn
    }
  )
}

output "service" {
  value = local.parsed.service
}
```

## Writing Modules That Use Provider Functions

When using provider functions in modules, declare the provider dependency:

```hcl
# modules/arn-validator/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"  # Minimum version with functions
    }
  }
}

variable "arns" {
  type = list(string)
}

locals {
  parsed_arns = {
    for arn in var.arns :
    arn => provider::aws::arn_parse(arn)
  }

  services = distinct([
    for arn, parsed in local.parsed_arns :
    parsed.service
  ])
}

output "services_used" {
  value = local.services
}

output "parsed_arns" {
  value = local.parsed_arns
}
```

## Provider Functions vs External Data Sources

Before provider functions, you might have used external data sources for custom logic:

```hcl
# Old approach: external data source
data "external" "parse_arn" {
  program = ["python3", "${path.module}/parse_arn.py"]
  query = {
    arn = var.input_arn
  }
}

# New approach: provider function
locals {
  parsed = provider::aws::arn_parse(var.input_arn)
}
```

Provider functions are better because:
- No external scripts to maintain
- No dependency on Python, Bash, or other runtimes
- Faster execution (no subprocess spawning)
- Type-safe (the function defines its return type)
- Works in plan phase without side effects

## Limitations

**Not all providers have functions.** Provider functions are a newer feature. Older providers or those that have not been updated will not have any functions available.

**Functions are read-only.** Provider functions cannot modify state or create resources. They are pure functions for data transformation.

**Must be deterministic.** Provider functions should return the same output for the same input. Functions that call external APIs or generate random values are not appropriate.

**Requires OpenTofu 1.7+.** Earlier versions do not support provider-defined functions.

Provider-defined functions are a powerful extension to the HCL language. They bring domain-specific logic directly into your infrastructure code without the overhead of external scripts or data sources. As more providers adopt this feature, the range of available functions will continue to grow.

For another OpenTofu-specific feature, see [How to Use OpenTofu for_each with Count Results](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-for-each-with-count-results/view).
