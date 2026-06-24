# How to Mark Variables as Sensitive in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, Sensitive Variables, HCL, Secret, Infrastructure as Code

Description: Learn how to mark OpenTofu variables as sensitive to prevent their values from appearing in plan output, apply output, and state file diffs.

---

The `sensitive = true` attribute on an input variable tells OpenTofu to treat its value as sensitive in normal CLI output. This helps keep passwords, API keys, and tokens out of `plan` and `apply` output and many CI/CD logs, but it does not remove them from state or saved plan data. Commands such as `tofu output -raw`, `tofu output -json`, `tofu show -json`, or `-show-sensitive` can still reveal the value. This guide covers marking variables sensitive and understanding where the values are still stored.

---

## Marking a Variable as Sensitive

```hcl
# variables.tf - sensitive variables

variable "database_password" {
  type        = string
  description = "PostgreSQL database password"
  sensitive   = true   # ← redacts value in normal CLI output
}

variable "api_key" {
  type        = string
  description = "External API key"
  sensitive   = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}
```

---

## Effect on Plan Output

Without `sensitive = true`:
```hcl
  + resource "aws_db_instance" "main" {
      + password = "my-secret-password-123"  # visible!
    }
```

With `sensitive = true`:
```hcl
  + resource "aws_db_instance" "main" {
      + password = (sensitive value)  # redacted
    }
```

---

## Sensitive Variables Propagate Automatically

When a sensitive variable is used in a resource, the attribute that uses it also becomes sensitive:

```hcl
resource "aws_db_instance" "main" {
  identifier = "myapp-db"
  engine     = "postgres"
  username   = "admin"
  password   = var.database_password  # inherits sensitive marking

  # The 'password' attribute is now treated as sensitive throughout
}
```

---

## Sensitive Values Are Still Stored in State and Saved Plans

Important: `sensitive = true` only affects how OpenTofu displays values in normal CLI output. The actual value is still stored in the state file, and saved plan files can also contain it in cleartext.

```bash
# Sensitive values are still stored in state and saved plans

# Human-readable CLI output stays redacted unless you opt in
tofu state show aws_db_instance.main

# But local state is plain-text JSON
# cat terraform.tfstate
# → contains the actual password

# Saved plan files also contain cleartext sensitive values
tofu plan -out=tfplan
# Treat tfplan as sensitive data
```

Always use a remote backend with encryption at rest, such as S3 with `encrypt = true`, when your state contains sensitive values, and treat saved plan files as sensitive artifacts too.

---

## Sensitive Outputs

When a sensitive variable is used in an output, mark the output sensitive too:

```hcl
output "db_connection_string" {
  value     = "postgresql://admin:${var.database_password}@${aws_db_instance.main.endpoint}/app"
  sensitive = true  # required when value contains sensitive data
}
```

```bash
# Outputs are shown as <sensitive> by default
tofu output db_connection_string
# db_connection_string = <sensitive>

# Access the value explicitly
tofu output -raw db_connection_string
# postgresql://admin:mypassword@db.host:5432/app
```

---

## Passing Sensitive Variables Securely

```bash
# Option 1: TF_VAR_ environment variable (recommended)
TF_VAR_database_password="my-secure-password" tofu apply

# Option 2: Read from a file (keep file out of version control)
tofu apply -var="database_password=$(cat ~/.secrets/db_password)"

# Option 3: Pass via tfvars file (not committed to git)
tofu apply -var-file="secrets.tfvars"
# secrets.tfvars: database_password = "my-secure-password"
```

---

## Summary

Mark variables as `sensitive = true` to redact values from normal terminal output and many CI/CD logs. The sensitive marking propagates automatically to expressions used in resources, but outputs that contain sensitive data must still be marked with `sensitive = true`. Remember: sensitive values still appear in plaintext in local state and saved plan files, and commands such as `tofu output -raw`, `tofu output -json`, `tofu show -json`, or `-show-sensitive` can reveal them. For passing sensitive values, prefer `TF_VAR_` environment variables or an uncommitted `.tfvars` file over `-var` flags when possible.
