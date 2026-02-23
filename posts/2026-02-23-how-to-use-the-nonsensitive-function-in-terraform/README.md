# How to Use the nonsensitive Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Security

Description: Learn how to use the nonsensitive function in Terraform to remove sensitivity markings from values when you know it is safe to display them in output.

---

Terraform's sensitivity system is great for keeping secrets out of your plan output. But sometimes the system is too aggressive - a value gets marked as sensitive through propagation even though the derived result is not actually secret. The `nonsensitive` function lets you explicitly remove the sensitive marking when you know it is safe.

## What is the nonsensitive Function?

The `nonsensitive` function takes a sensitive value and returns it with the sensitive marking removed. This allows the value to appear in plan output, console display, and logs.

```hcl
> nonsensitive(sensitive("hello"))
"hello"
```

The syntax:

```hcl
nonsensitive(value)
```

## Why Would You Need This?

Terraform's sensitivity propagation means that any expression involving a sensitive value also becomes sensitive. This is usually what you want, but there are cases where the derived value is no longer secret:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
  default   = "super-secret-password"
}

locals {
  # This is sensitive because it derives from a sensitive variable
  password_length = length(var.db_password)
  # But the length of the password is not a secret!

  # Remove the sensitivity from the non-secret derived value
  password_length_public = nonsensitive(length(var.db_password))
}

output "password_length" {
  # Without nonsensitive, this would require sensitive = true
  value = local.password_length_public
}
```

## Common Use Case: Checking Sensitive Value Properties

You often need to validate or report on properties of sensitive values without exposing the values themselves:

```hcl
variable "api_key" {
  type      = string
  sensitive = true
}

locals {
  # These are all derived from a sensitive value, so they are sensitive too
  # But the results are not actually secret

  # Is the API key set?
  has_api_key = nonsensitive(var.api_key != "")

  # Does it start with the expected prefix?
  valid_prefix = nonsensitive(startswith(var.api_key, "sk-"))

  # How long is it?
  key_length = nonsensitive(length(var.api_key))
}

output "api_key_info" {
  value = {
    is_set       = local.has_api_key
    valid_prefix = local.valid_prefix
    length       = local.key_length
  }
}
```

## Extracting Non-Sensitive Parts from Sensitive Data

Sometimes a sensitive data structure contains both sensitive and non-sensitive fields:

```hcl
data "aws_secretsmanager_secret_version" "config" {
  secret_id = "app/config"
}

locals {
  # The entire decoded structure is sensitive
  config = sensitive(jsondecode(data.aws_secretsmanager_secret_version.config.secret_string))

  # But some fields are not secret
  app_region = nonsensitive(local.config.region)
  app_name   = nonsensitive(local.config.app_name)
  app_env    = nonsensitive(local.config.environment)

  # Keep the actual secrets sensitive
  # local.config.password stays sensitive
  # local.config.api_key stays sensitive
}

output "app_info" {
  value = {
    region      = local.app_region
    name        = local.app_name
    environment = local.app_env
  }
}
```

## Working with Resource Attributes

Some resource attributes become sensitive even when the derived data is not:

```hcl
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = var.db_password  # sensitive
}

locals {
  # The endpoint is not secret, but Terraform might mark it sensitive
  # because the resource has sensitive attributes
  db_host = nonsensitive(aws_db_instance.main.endpoint)
  db_port = nonsensitive(aws_db_instance.main.port)
}

output "database_endpoint" {
  value = "${local.db_host}:${local.db_port}"
}
```

## Conditional Logic with Sensitive Values

When using sensitive values in conditions, the result might be unnecessarily sensitive:

```hcl
variable "license_key" {
  type      = string
  sensitive = true
  default   = ""
}

locals {
  # The license type is determined by the key format, but is not itself secret
  license_type = nonsensitive(
    length(var.license_key) > 0 ? (
      startswith(var.license_key, "ENT-") ? "enterprise" :
      startswith(var.license_key, "PRO-") ? "professional" :
      "basic"
    ) : "none"
  )
}

output "license_type" {
  value = local.license_type
  # No need for sensitive = true because we removed the marking
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = local.license_type == "enterprise" ? "m5.xlarge" : "t3.medium"

  tags = {
    LicenseType = local.license_type
  }
}
```

## Debugging with nonsensitive

During development, you might need to temporarily see a sensitive value:

```hcl
# ONLY FOR DEBUGGING - remove before committing!
output "debug_secret" {
  value = nonsensitive(var.db_password)
  # WARNING: This exposes the secret in terraform output
}
```

Obviously, never leave this in production code. But it can be helpful when troubleshooting why a value is not what you expect.

## nonsensitive with Computed Checksums

You might want to track when a secret changes without exposing it:

```hcl
variable "tls_private_key" {
  type      = string
  sensitive = true
}

locals {
  # The SHA256 hash of the key is useful for change detection
  # but does not expose the key itself
  key_fingerprint = nonsensitive(sha256(var.tls_private_key))
}

output "key_fingerprint" {
  value       = local.key_fingerprint
  description = "SHA256 fingerprint of the TLS private key"
}
```

Whether the hash is safe to expose depends on your threat model, but for most purposes, a SHA256 hash of a key does not reveal the key.

## When NOT to Use nonsensitive

Be careful with `nonsensitive`. Do not use it to:

1. **Expose actual secrets** - Never remove sensitivity from passwords, API keys, or tokens
2. **Work around Terraform errors** - If Terraform says an output needs `sensitive = true`, think about why before using `nonsensitive`
3. **Log sensitive values** - Even in "private" logs, secrets should stay protected

```hcl
# BAD - do not do this
output "database_password" {
  value = nonsensitive(var.db_password)  # Exposing the actual password!
}

# GOOD - expose non-secret derived info
output "password_is_set" {
  value = nonsensitive(var.db_password != "")
}
```

## Practical Pattern: Module Outputs

Modules often compute values from sensitive inputs where the result is not sensitive:

```hcl
# Inside a module
variable "encryption_key" {
  type      = string
  sensitive = true
}

resource "aws_kms_key" "main" {
  description = "Main encryption key"
}

# The KMS key ARN is not sensitive, even though the module handles secrets
output "kms_key_arn" {
  value = aws_kms_key.main.arn
  # No sensitivity issues here - ARNs are not secrets
}

# The key ID is derived from the resource, not from the sensitive input
output "key_id" {
  value = aws_kms_key.main.key_id
}
```

## Error Handling

If you call `nonsensitive` on a value that is not sensitive, Terraform will raise an error:

```hcl
# This will error because "hello" is not sensitive
# nonsensitive("hello")  # Error!

# Only use nonsensitive on values that are actually marked sensitive
```

To handle this safely:

```hcl
locals {
  # If you are not sure whether a value is sensitive
  safe_value = try(nonsensitive(some_value), some_value)
}
```

## Summary

The `nonsensitive` function is the escape hatch for Terraform's sensitivity system. Use it when sensitivity propagation marks a derived value as sensitive even though the result itself is not secret - things like string lengths, boolean checks, hash values, and enum-like derived categories. Always think carefully before removing sensitivity markings, and never use it to expose actual credentials or secrets. For the opposite operation, see the [sensitive function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sensitive-function-in-terraform/view).
