# How to Mark Outputs as Sensitive in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Sensitive, Security, HCL, Infrastructure as Code

Description: Learn how to mark OpenTofu output values as sensitive to prevent secrets and credentials from appearing in terminal output and CI/CD logs.

---

Output values marked as `sensitive = true` are redacted in default CLI output and CI/CD logs. In the `Outputs:` section and `tofu output`, OpenTofu shows `<sensitive>`, while other plan/apply UI may show `(sensitive value)` instead of the actual value. This prevents connection strings, passwords, and private keys from appearing in output where they could be captured or logged.

---

## Marking an Output as Sensitive

```hcl
# outputs.tf - sensitive output examples

output "database_connection_string" {
  description = "Full database connection string with credentials"
  value       = "postgresql://${var.db_user}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true  # ← redacts from terminal and log output
}

output "private_key_pem" {
  description = "Private key for EC2 instance access"
  value       = tls_private_key.ec2.private_key_pem
  sensitive   = true
}

output "api_credentials" {
  description = "API key and secret for the service"
  value = {
    key    = aws_iam_access_key.service.id
    secret = aws_iam_access_key.service.secret
  }
  sensitive = true
}
```

---

## What the Terminal Shows

```bash
tofu apply

# Non-sensitive output:

# Outputs:
# instance_public_ip = "54.23.45.67"
# s3_bucket_name = "my-data-bucket"

# Sensitive output:
# database_connection_string = <sensitive>
# private_key_pem = <sensitive>
```

---

## Accessing Sensitive Output Values

```bash
# By default, the sensitive output stays redacted
tofu output database_connection_string
# database_connection_string = <sensitive>

# Access the raw value
tofu output -raw database_connection_string
# postgresql://admin:mypassword@db.host:5432/app

# Get as JSON (value is revealed)
tofu output -json database_connection_string
# "postgresql://admin:mypassword@db.host:5432/app"

# Use in a script safely
DB_URL=$(tofu output -raw database_connection_string)
```

---

## Required: Mark Output Sensitive When Using Sensitive Values

OpenTofu will error if you try to output a sensitive value without marking the output as sensitive:

```hcl
# This WILL ERROR if var.database_password is sensitive
output "db_url" {
  value = "postgresql://admin:${var.database_password}@${aws_db_instance.main.endpoint}/app"
  # Error: Output refers to a sensitive value - must add: sensitive = true
}

# CORRECT:
output "db_url" {
  value     = "postgresql://admin:${var.database_password}@${aws_db_instance.main.endpoint}/app"
  sensitive = true
}
```

---

## Sensitive Outputs in Module Chains

When a module outputs a sensitive value, the parent module's reference to it is also treated as sensitive:

```hcl
# modules/database/outputs.tf
output "connection_string" {
  value     = "postgresql://..."
  sensitive = true
}

# main.tf - parent module
# module.database.connection_string is now automatically treated as sensitive
output "app_db_url" {
  value     = module.database.connection_string
  sensitive = true  # required since the source is sensitive
}
```

---

## Summary

Mark outputs as `sensitive = true` whenever they contain credentials, private keys, or other values that shouldn't appear in logs. OpenTofu enforces this - it will error if a sensitive variable is used in an output that isn't marked sensitive. Access sensitive output values explicitly with `tofu output -raw <name>` or `tofu output -json <name>` when needed in scripts.
