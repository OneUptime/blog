# How to Use the sensitive Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Terraform Functions, Security

Description: Learn how to use the sensitive function in Terraform to mark values as sensitive and prevent them from appearing in plan output, logs, and CLI display.

---

When working with infrastructure, you inevitably handle secrets - database passwords, API keys, private certificates, and authentication tokens. Terraform's `sensitive` function lets you mark any value as sensitive, which prevents it from being displayed in plan output, console output, and logs.

## What is the sensitive Function?

The `sensitive` function takes any value and returns the same value marked as sensitive. Once a value is marked sensitive, Terraform will replace it with `(sensitive value)` in all plan and apply output.

```hcl
# Mark a value as sensitive
> sensitive("my-secret-password")
(sensitive value)
```

The syntax:

```hcl
sensitive(value)
```

## Why Use sensitive?

There are several scenarios where you need to mark values as sensitive at the expression level rather than at the variable level:

1. **Computed secrets** - Values derived from calculations, not directly from variables
2. **Values from non-sensitive sources** - Data that becomes sensitive when combined
3. **Intermediate values** - Temporary locals that contain secret data
4. **Dynamic secrets** - Values built from templates or string operations

## The Difference Between sensitive() and sensitive Variables

Terraform has two ways to mark values as sensitive:

```hcl
# Method 1: Variable-level sensitivity
variable "db_password" {
  type      = string
  sensitive = true
}

# Method 2: Expression-level sensitivity using the function
locals {
  connection_string = sensitive("postgresql://admin:${var.db_password}@db.example.com:5432/mydb")
}
```

Variable-level sensitivity automatically marks the variable and anything derived from it. The `sensitive` function lets you mark specific computed values that are not already flagged.

## Practical Example: Connection Strings

A connection string built from parts might not be automatically marked as sensitive:

```hcl
variable "db_host" {
  type    = string
  default = "db.example.com"
}

variable "db_user" {
  type    = string
  default = "admin"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type    = string
  default = "myapp"
}

locals {
  # This is already sensitive because it includes var.db_password
  # But being explicit does not hurt
  connection_string = sensitive(
    "postgresql://${var.db_user}:${var.db_password}@${var.db_host}:5432/${var.db_name}"
  )
}

resource "aws_ssm_parameter" "db_connection" {
  name  = "/app/db-connection-string"
  type  = "SecureString"
  value = local.connection_string
}
```

## Marking Computed Secrets

Sometimes you generate secrets within Terraform:

```hcl
resource "random_password" "db" {
  length  = 32
  special = true
}

locals {
  # random_password is already sensitive, but derived values might not be
  db_config = sensitive({
    host     = aws_db_instance.main.endpoint
    port     = 5432
    username = "admin"
    password = random_password.db.result
    database = "myapp"
  })
}

output "db_config" {
  value     = local.db_config
  sensitive = true
}
```

## Protecting API Keys from Logs

```hcl
variable "api_key_prefix" {
  type    = string
  default = "sk-prod"
}

variable "api_key_secret" {
  type      = string
  sensitive = true
}

locals {
  # The full API key is sensitive
  full_api_key = sensitive("${var.api_key_prefix}-${var.api_key_secret}")
}

resource "aws_secretsmanager_secret_version" "api_key" {
  secret_id     = aws_secretsmanager_secret.api_key.id
  secret_string = local.full_api_key
}
```

## Marking Data Source Results as Sensitive

Some data sources return sensitive information that is not automatically marked:

```hcl
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "prod/db-credentials"
}

locals {
  # The data source result might not be marked sensitive
  db_creds = sensitive(jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string))
}

# Now any reference to local.db_creds is hidden in output
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = local.db_creds.username
  password       = local.db_creds.password
  # These will show as (sensitive value) in the plan
}
```

## Sensitive Maps and Objects

You can mark entire maps or objects as sensitive:

```hcl
locals {
  # Mark all credentials as sensitive at once
  all_credentials = sensitive({
    database = {
      username = "db_admin"
      password = random_password.db.result
    }
    redis = {
      auth_token = random_password.redis.result
    }
    api = {
      secret_key = random_password.api.result
    }
  })
}
```

## Template Rendering with Sensitive Values

When rendering templates that include secrets:

```hcl
locals {
  # The rendered template contains secrets, so mark it sensitive
  app_config = sensitive(templatefile("${path.module}/config.tpl", {
    db_password    = var.db_password
    api_secret     = var.api_secret
    encryption_key = random_password.encryption.result
  }))
}

resource "aws_ssm_parameter" "app_config" {
  name  = "/app/config"
  type  = "SecureString"
  value = local.app_config
}
```

## How Sensitive Propagation Works

Once a value is marked sensitive, any expression that uses it also becomes sensitive:

```hcl
variable "secret" {
  type      = string
  sensitive = true
  default   = "my-secret"
}

locals {
  # All of these become sensitive automatically
  upper_secret  = upper(var.secret)
  secret_length = length(var.secret)
  has_secret    = var.secret != ""

  # This map is sensitive because it contains a sensitive value
  config = {
    key   = "not-secret"
    value = var.secret
  }
}
```

## When to Use sensitive vs Variable Sensitivity

Use the `sensitive` variable attribute when:
- The entire variable is a secret
- You always want it hidden

Use the `sensitive()` function when:
- You are computing a sensitive value from non-sensitive inputs
- You want to mark a specific local or expression as sensitive
- You are working with data source outputs that should be protected
- You are building a sensitive value from a template

## Sensitive Values in Outputs

Outputs that contain sensitive values must be explicitly marked:

```hcl
# This will error without sensitive = true
output "connection_string" {
  value     = local.connection_string
  sensitive = true
}

# You can also wrap the output value
output "api_endpoint" {
  value     = sensitive("https://api.example.com?key=${var.api_key}")
  sensitive = true
}
```

## What the sensitive Function Does Not Do

It is important to understand the limits:

1. **It does not encrypt the value** - The value is still stored in plain text in the state file
2. **It does not prevent state file exposure** - Always encrypt your state file at rest
3. **It only affects CLI output** - Plan, apply, and console output hide the value
4. **It does not work retroactively** - Marking an output sensitive does not redact it from past state

```hcl
# The value is still in the state file in plain text!
# Always use encrypted state backends
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    encrypt = true  # Encrypt state at rest
  }
}
```

## Removing Sensitivity with nonsensitive

If you need to explicitly remove the sensitive marking (with caution), use `nonsensitive`:

```hcl
locals {
  secret_data = sensitive("not-actually-secret")

  # Remove sensitivity when you know it is safe
  public_data = nonsensitive(local.secret_data)
}
```

See the [nonsensitive function guide](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-nonsensitive-function-in-terraform/view) for more details on when and how to do this.

## Summary

The `sensitive` function is your tool for protecting computed values from appearing in Terraform's output. Use it to mark connection strings, API keys, rendered templates, and any derived values that contain secret material. Remember that it only controls display - your state file still contains the actual values, so always use encrypted backends. For the inverse operation, see the [nonsensitive function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-nonsensitive-function-in-terraform/view), and for safe value access patterns, check out the [try function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-try-function-in-terraform-for-safe-access/view).
