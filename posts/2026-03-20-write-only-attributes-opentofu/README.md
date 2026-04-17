# How to Use Write-Only Attributes to Protect Credentials in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Write-Only Attributes, Security, Credential, Infrastructure as Code, State

Description: Learn how OpenTofu's write-only attribute feature prevents sensitive values from ever being stored in state files, providing the strongest protection for credentials.

## Introduction

Even when a variable is marked `sensitive = true`, its value is still stored in the OpenTofu state file in plaintext. Write-only attributes (introduced in OpenTofu 1.11) solve this: they are sent to the provider on creation/update but never stored in state, eliminating the risk of credential exposure through a compromised state file.

## Understanding Write-Only vs Sensitive

| Feature | `sensitive = true` | Write-Only |
|---|---|---|
| Hidden in plan output | Yes | Yes |
| Stored in state file | Yes (encrypted only if backend encrypts) | No |
| Available in `tofu state show` | Yes (masked) | No |
| Re-read on refresh | Yes | No (provider must accept it) |

## Using Write-Only Attributes

Write-only attributes are defined by the provider, typically as a separate argument with a `_wo` suffix that is paired with a `_wo_version` argument used to trigger updates:

```hcl
# Example: setting a database password as write-only
resource "aws_db_instance" "main" {
  identifier        = "prod-postgres"
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  allocated_storage = 20

  username = "admin"
  # In AWS provider v5.88+, password_wo is the write-only counterpart to password
  password_wo         = var.db_password   # var must be sensitive = true
  password_wo_version = 1                 # bump this to rotate the password

  skip_final_snapshot = false
}
```

## Ephemeral Resources (OpenTofu 1.11+)

Ephemeral resources fetch values that are used during the apply but never written to state. Their values can only be passed into write-only arguments:

```hcl
# An ephemeral resource provides values only during apply - not stored in state
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  username = "admin"
  # Ephemeral values can only be assigned to write-only arguments
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db_pass.secret_string
  password_wo_version = 1
}
```

## Checking Whether an Attribute is Write-Only

Provider documentation marks write-only attributes explicitly. You can also check at the CLI:

```bash
# Show the schema for a resource type and look for write_only: true
tofu providers schema -json | \
  jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas["aws_db_instance"].block.attributes | to_entries[] | select(.value.write_only == true) | .key'
```

## Combining Write-Only with Sensitive Variables

```hcl
variable "db_password" {
  type      = string
  sensitive = true   # Redacted in output AND sourced from a secret
}

resource "aws_db_instance" "main" {
  username = "admin"
  # password_wo is the write-only argument - it will not appear in state
  password_wo         = var.db_password
  password_wo_version = 1
}
```

## Handling Updates to Write-Only Values

Because write-only values are not stored in state, OpenTofu cannot detect changes to them automatically. The convention is to pair the write-only argument with a companion `*_wo_version` argument - increment it to signal the provider to apply the new value:

```hcl
resource "aws_db_instance" "main" {
  username            = "admin"
  password_wo         = var.db_password
  # Bump this value to trigger a password update on the next apply
  password_wo_version = 2
}
```

## Conclusion

Write-only attributes and ephemeral resources represent OpenTofu's most advanced secret protection: credentials that flow to the cloud provider during apply but leave no trace in the state file. As provider support for write-only attributes grows, teams should prefer them over sensitive variables alone for the highest-value credentials like database master passwords and API keys.
