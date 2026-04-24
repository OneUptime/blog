# How to Prevent Secrets from Appearing in Plan Output in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, Sensitive Variables, Secret, Infrastructure as Code, Best Practice

Description: Learn how to use OpenTofu's sensitive variable and output markings, along with provider-level suppression, to keep secrets out of plan and apply output.

## Introduction

By default, OpenTofu can print resource attribute values in plan output. Without explicit suppression or provider-defined sensitivity, database passwords, API keys, and other credentials can appear in terminal logs and CI/CD artifacts. OpenTofu provides several mechanisms to reduce that risk.

## Marking Variables as Sensitive

The simplest protection: mark the variable as `sensitive = true`:

```hcl
# variables.tf

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true   # Redacts value in normal plan/apply output
}

variable "api_key" {
  type      = string
  sensitive = true
}
```

When a sensitive variable is used in a resource, OpenTofu redacts its value:

```hcl
# Plan output - password is hidden
  ~ resource "aws_db_instance" "main" {
      ~ password = (sensitive value)
    }
```

## Marking Outputs as Sensitive

```hcl
# outputs.tf
output "db_connection_string" {
  # Mark the output sensitive so it is redacted when shown
  value     = "postgresql://user:${var.db_password}@${aws_db_instance.main.address}:5432/mydb"
  sensitive = true
}
```

Sensitive outputs are still accessible programmatically but are masked in terminal output:

```text
Outputs:

db_connection_string = <sensitive>
```

## Marking Computed Values as Sensitive

Many provider resources automatically mark sensitive attributes in their schemas. For computed values inside your own module, you can wrap the result with the `sensitive()` function:

```hcl
locals {
  # Explicitly mark a computed value as sensitive
  connection_url = sensitive("mysql://${var.db_user}:${var.db_password}@${aws_db_instance.main.address}/mydb")
}
```

## Preventing Sensitive Values in State (Write-Only Attributes)

OpenTofu 1.11+ supports write-only attributes that are written as `null` in state and plan data. Some resources pair them with a version argument so updates can be detected:

```hcl
resource "aws_secretsmanager_secret" "app" {
  name = "app-config"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.arn

  # Write-only: OpenTofu stores null for this attribute in state and plan
  secret_string_wo         = jsonencode({ api_key = var.api_key })
  secret_string_wo_version = 1
}
```

## Using Nonsensitive() When Downstream Logic Requires It

In some cases you may derive a non-sensitive value from a sensitive one. Use `nonsensitive()` only after confirming the derived value cannot leak secret data:

```hcl
variable "db_config_json" {
  type      = string
  sensitive = true
}

locals {
  db_config = jsondecode(var.db_config_json)
}

output "db_host_with_port" {
  # Host and port are safe to expose even though the source JSON was sensitive
  value = nonsensitive("${local.db_config.host}:${local.db_config.port}")
}
```

## Checking for Sensitive Value Leaks in CI

Add a simple post-plan check that fails if a quoted password assignment appears unredacted in the human-readable plan output:

```bash
#!/bin/bash
# ci-check.sh - fail if plan output contains unredacted secrets
PLAN_OUTPUT=$(tofu plan -no-color 2>&1)

# Check that passwords are redacted
if echo "$PLAN_OUTPUT" | grep -iE "password\s*=\s*\"[^(]"; then
  echo "ERROR: Unredacted password detected in plan output!"
  exit 1
fi
echo "Plan output looks clean."
```

## Conclusion

Mark all secret variables and outputs with `sensitive = true`, use the `sensitive()` function for computed values, and rely on write-only attributes for values that should never appear in OpenTofu state or plan data. These measures help keep secrets out of normal plan output, apply logs, and CI/CD artifacts, but you should still treat state, saved plans, and machine-readable output as sensitive.
