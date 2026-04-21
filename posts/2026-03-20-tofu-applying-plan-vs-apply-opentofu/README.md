# How to Use tofu.applying for Plan vs Apply Differentiation in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu.applying, Ephemeral, Plan, Apply, HCL, Infrastructure as Code

Description: Learn how to use the tofu.applying built-in value in OpenTofu to differentiate behavior between plan and apply phases within ephemeral expressions.

---

`tofu.applying` is a built-in boolean value available in ephemeral expressions in OpenTofu 1.11+. It evaluates to `true` during the apply phase and `false` during the plan and validate phases. When you run `tofu apply` without a saved plan, OpenTofu first creates a plan with `tofu.applying` set to `false`, then applies it with `tofu.applying` set to `true`. This lets you write logic that behaves differently at plan time versus apply time.

---

## What tofu.applying Returns

```hcl
# tofu.applying is:

# - false during: tofu plan and validate
# - true during:  the apply phase

# It can only be used in ephemeral contexts
ephemeral "aws_ssm_parameter" "config" {
  arn = tofu.applying ? (
    "arn:aws:ssm:us-east-1:123456789012:parameter/production/config"
  ) : (
    "arn:aws:ssm:us-east-1:123456789012:parameter/staging/config"
  )
  # Uses staging config during plan, production during apply
}
```

---

## Common Use Case: Avoiding Expensive Operations During Plan

```hcl
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  # Only fetch the actual secret during apply
  secret_id = "production/database/password"

  lifecycle {
    enabled = tofu.applying
  }
}
```

Note: With `enabled = tofu.applying`, the ephemeral resource is disabled outside the apply phase and evaluates to `null`, which is expected.

---

## Differentiating Log Verbosity

```hcl
# Use a more verbose/debug config during plan for validation
# Use the real config during apply

locals {
  log_level = tofu.applying ? "warn" : "debug"
}

resource "null_resource" "configure" {
  provisioner "local-exec" {
    command     = "./configure.sh"
    environment = {
      LOG_LEVEL = local.log_level   # ephemeral local
    }
  }
}
```

---

## Using Different Credential Sources

```hcl
# During plan: use read-only credentials for validation
# During apply: use full-access credentials for deployment

provider "aws" {
  alias = "deployment"

  assume_role {
    role_arn = tofu.applying ? (
      "arn:aws:iam::123456789012:role/DeployRole"
    ) : (
      "arn:aws:iam::123456789012:role/ReadOnlyRole"
    )
    session_name = "opentofu-operation"
  }
}
```

---

## Avoiding Side Effects During Plan

When using ephemeral resources that have side effects (like issuing Vault tokens or creating STS sessions), `tofu.applying` lets you skip those side effects during planning:

```hcl
# Only create a Vault lease during apply, not plan
ephemeral "vault_database_secret" "creds" {
  mount = "database"
  name  = "production-role"

  lifecycle {
    enabled = tofu.applying
  }
}

resource "null_resource" "run_migration" {
  provisioner "local-exec" {
    command = "migrate.sh"
    environment = {
      DB_USER = tofu.applying ? ephemeral.vault_database_secret.creds.username : ""
      DB_PASS = tofu.applying ? ephemeral.vault_database_secret.creds.password : ""
    }
  }
}
```

---

## tofu.applying in Postconditions

```hcl
ephemeral "aws_secretsmanager_secret_version" "config" {
  secret_id = "production/app-config"

  lifecycle {
    postcondition {
      # During plan, skip validation that requires the actual secret
      # During apply, enforce the check
      condition     = !tofu.applying || length(self.secret_string) > 0
      error_message = "App config secret must not be empty."
    }
  }
}
```

---

## Limitations

- `tofu.applying` is only available in ephemeral expression contexts
- It cannot be used in regular managed resource arguments or non-ephemeral outputs
- A local value that references it becomes ephemeral and can only be used in ephemeral-aware contexts
- It's designed specifically for ephemeral-aware contexts such as ephemeral resources, ephemeral variables and outputs, locals, providers, provisioners, connection blocks, and write-only attributes

---

## Summary

`tofu.applying` is a built-in boolean (OpenTofu 1.11+) that is `true` during the apply phase and `false` during plan and validate. Use it in ephemeral contexts to skip expensive API calls during planning, differentiate credential scopes between plan and apply, and avoid side effects from ephemeral resource evaluation at plan time. This improves plan performance and reduces unnecessary credential usage.
