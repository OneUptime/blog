# How to Use Nullable Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Nullable, HCL, Infrastructure as Code, DevOps

Description: A guide to using the nullable attribute in OpenTofu variables to control whether null values are accepted.

## Introduction

The `nullable` attribute in OpenTofu variable declarations controls whether a variable can be explicitly set to `null`. Understanding this attribute helps you write more predictable and reliable configurations.

## The nullable Attribute

```hcl
# nullable = true (default behavior)

# The variable can be set to null, which overrides the default
variable "custom_ami" {
  type     = string
  default  = "ami-0c55b159cbfafe1f0"
  nullable = true  # This is the default when not specified

  # If set to null, the value IS null (overrides default)
}

# nullable = false
# Setting to null falls back to the default value (null is rejected)
variable "required_tag" {
  type     = string
  default  = "opentofu-managed"
  nullable = false  # null is not accepted; default is used instead

  # If someone tries to set this to null, OpenTofu uses the default value instead
}
```

## Understanding Default Behavior

```hcl
# Without nullable specified (default: nullable = true)
variable "optional_config" {
  type    = string
  default = "default-value"
  # nullable = true (implicit)
}

# If you explicitly pass null via a tfvars file:
#   # terraform.tfvars
#   optional_config = null
# Result: var.optional_config = null
# (null overrides the default when nullable = true)
#
# Note: with a string-typed variable, the -var CLI flag treats values as
# literal strings, so `-var="optional_config=null"` would set the value to
# the string "null" rather than actual null. Use a .tfvars file (or omit the
# variable) to pass HCL null from the CLI.
```

## nullable = false Behavior

```hcl
variable "tag_value" {
  type     = string
  default  = "auto-generated"
  nullable = false  # null is rejected

  # If a caller passes null and a default is set (as here),
  # OpenTofu silently substitutes the default "auto-generated".
  # If there is NO default and null is passed, OpenTofu errors with:
  #   Invalid value for variable: required variable may not be set to null.
}
```

## Practical Use: Optional Override with Fallback

```hcl
# Pattern: Allow overriding with null to "unset" a value
variable "kms_key_arn" {
  type     = string
  default  = null   # Optional by default
  nullable = true   # Can be explicitly set to null

  validation {
    condition     = var.kms_key_arn == null || can(regex("^arn:aws:kms:", var.kms_key_arn))
    error_message = "kms_key_arn must be null or a valid KMS key ARN."
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  count  = var.kms_key_arn != null ? 1 : 0
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
  }
}
```

## Using nullable with Module Variables

```hcl
# root module calling child module
module "database" {
  source = "./modules/rds"

  # Pass null to use the module's default
  snapshot_identifier = null  # Module decides what to use
  parameter_group     = null  # Use module default
  option_group        = "my-custom-group"
}
```

```hcl
# modules/rds/variables.tf
variable "snapshot_identifier" {
  type     = string
  default  = null    # No snapshot by default
  nullable = true    # Accept null explicitly
}

variable "parameter_group" {
  type     = string
  default  = "default.postgres15"
  nullable = false   # Must always have a value; null rejected
}
```

## Null Checks in Configurations

```hcl
variable "extra_security_group_id" {
  type     = string
  default  = null
  nullable = true
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Conditionally add extra security group
  vpc_security_group_ids = compact([
    aws_security_group.web.id,
    var.extra_security_group_id  # null values removed by compact()
  ])
}

locals {
  # Use coalesce to provide fallback for null
  security_group_id = coalesce(var.extra_security_group_id, aws_security_group.default.id)
}
```

## Conclusion

The `nullable` attribute provides fine-grained control over how null values are handled in variable declarations. Setting `nullable = false` ensures a variable always has a meaningful value (the default is used instead of null), while `nullable = true` (the default) allows null to explicitly override the default. Understanding this distinction helps prevent subtle bugs when modules or configurations interact with optional values.
