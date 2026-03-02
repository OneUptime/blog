# How to Mark Outputs as Sensitive in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Output, Security, Sensitive Data, Infrastructure as Code

Description: Learn how to use the sensitive flag on Terraform outputs to prevent secrets from being displayed in terminal output, logs, and when consumed by other modules.

---

When Terraform creates resources that involve secrets - database passwords, API keys, connection strings with embedded credentials - those values often need to be exposed as outputs. Maybe another module needs the database password, or a CI/CD pipeline needs to retrieve a generated token. The `sensitive = true` flag on outputs prevents these values from appearing in the terminal, in logs, and in most places where someone could accidentally see them.

This post explains how sensitive outputs work, where they protect you, and where they do not.

## Basic Sensitive Output

Adding `sensitive = true` to an output block tells Terraform to redact the value in CLI output:

```hcl
# outputs.tf

output "database_password" {
  description = "Generated database master password"
  value       = random_password.db.result
  sensitive   = true
}

output "api_key" {
  description = "Generated API key for the service"
  value       = random_string.api_key.result
  sensitive   = true
}
```

After `terraform apply`, these outputs display as:

```
Outputs:

api_key = <sensitive>
database_password = <sensitive>
```

Without the `sensitive` flag, the actual values would appear in plain text.

## When Terraform Requires sensitive = true

Terraform enforces sensitivity. If an output references a sensitive variable or a sensitive resource attribute, you must mark the output as sensitive. Otherwise, Terraform throws an error.

```hcl
# This variable is sensitive
variable "db_password" {
  type      = string
  sensitive = true
}

# This output MUST be marked sensitive because it
# references a sensitive variable
output "connection_string" {
  description = "Database connection string"
  value       = "postgresql://admin:${var.db_password}@${aws_db_instance.main.endpoint}/mydb"
  sensitive   = true
}

# This would fail:
# output "connection_string" {
#   value = "postgresql://admin:${var.db_password}@..."
#   # Error: Output refers to sensitive values
# }
```

Sensitivity propagates through expressions. If any part of the value is sensitive, the whole output must be marked sensitive.

## Sensitive Outputs in Modules

Sensitive outputs from child modules can be accessed by the parent configuration, but the sensitivity carries over:

```hcl
# modules/database/outputs.tf

output "password" {
  description = "Database master password"
  value       = random_password.main.result
  sensitive   = true
}

output "endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.main.endpoint
}

output "connection_url" {
  description = "Full database connection URL"
  value       = "postgresql://admin:${random_password.main.result}@${aws_db_instance.main.endpoint}/app"
  sensitive   = true
}
```

```hcl
# main.tf (root module)

module "database" {
  source = "./modules/database"
  # ...
}

# You can reference sensitive module outputs
resource "aws_ssm_parameter" "db_password" {
  name  = "/app/db-password"
  type  = "SecureString"
  value = module.database.password  # This works
}

# But if you want to output it from the root module,
# you must also mark it as sensitive
output "db_password" {
  value     = module.database.password
  sensitive = true
}
```

## Querying Sensitive Outputs

### terraform output Command

By default, `terraform output` hides sensitive values:

```bash
terraform output
# database_password = <sensitive>
# vpc_id = "vpc-abc123"
```

To reveal a specific sensitive output:

```bash
# Show the raw value
terraform output -raw database_password
# Prints: my-secret-password-123

# Show as JSON (also reveals the value)
terraform output -json database_password
# Prints: "my-secret-password-123"
```

This is by design - revealing the value requires an explicit action. The `-raw` and `-json` flags are considered intentional requests for the actual data.

### Using in Scripts

```bash
#!/bin/bash
# Retrieve sensitive output for use in a script

# Get the database password
DB_PASSWORD=$(terraform output -raw database_password)

# Use it in another command
psql "host=$(terraform output -raw db_endpoint) \
      dbname=myapp \
      user=admin \
      password=${DB_PASSWORD}"
```

## What Sensitive Outputs Protect

The `sensitive` flag protects against:

1. **Accidental display in terminal output.** During `terraform apply` and `terraform output`, the value is hidden.

2. **Exposure in CI/CD logs.** Since the value is redacted in standard output, it will not appear in pipeline logs.

3. **Casual viewing by teammates.** Someone running `terraform output` will not see the value without explicitly requesting it.

## What Sensitive Outputs Do NOT Protect

Understanding the limitations is just as important:

### State Files

The actual value is stored in the Terraform state file. If someone has access to the state, they can read the secret:

```bash
# The state file contains the real value
terraform state pull | jq '.outputs.database_password.value'
# "my-secret-password-123"
```

Always encrypt your state backend:

```hcl
terraform {
  backend "s3" {
    bucket     = "my-tf-state"
    key        = "app/terraform.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "alias/terraform-state"
  }
}
```

### Plan Files

If you save a plan with `terraform plan -out=plan.tfplan`, the sensitive values are in that file.

### Debug Logs

Running with `TF_LOG=DEBUG` may expose sensitive values in the log output.

## Practical Patterns

### Generated Credentials

```hcl
resource "random_password" "database" {
  length  = 32
  special = true
}

resource "aws_db_instance" "main" {
  identifier = "myapp-db"
  engine     = "postgres"
  username   = "admin"
  password   = random_password.database.result
  # ...
}

# Store in secrets manager for application use
resource "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.database.result
    host     = aws_db_instance.main.endpoint
  })
}

# Output for other Terraform modules that might need it
output "db_password" {
  description = "Database master password"
  value       = random_password.database.result
  sensitive   = true
}

output "db_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db.arn
  # This is not sensitive - it is just the ARN, not the secret itself
}
```

### Connection Strings

```hcl
output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://:${random_password.redis.result}@${aws_elasticache_cluster.main.cache_nodes[0].address}:6379"
  sensitive   = true
}

output "database_url" {
  description = "PostgreSQL connection URL"
  value       = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}
```

### TLS Private Keys

```hcl
resource "tls_private_key" "deploy" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

output "deploy_private_key" {
  description = "Private key for deployment (PEM format)"
  value       = tls_private_key.deploy.private_key_pem
  sensitive   = true
}

output "deploy_public_key" {
  description = "Public key for deployment"
  value       = tls_private_key.deploy.public_key_openssh
  # Public key is not sensitive
}
```

### Mixed Output Objects

If you want to output a structured object where some fields are sensitive, you have to mark the entire output as sensitive:

```hcl
output "database_details" {
  description = "Complete database connection details"
  value = {
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    database = var.db_name
    username = var.db_username
    password = random_password.db.result
  }
  # Must be sensitive because password is included
  sensitive = true
}
```

If you want some fields visible and others hidden, split them into separate outputs:

```hcl
output "database_endpoint" {
  description = "Database host and port"
  value = {
    host = aws_db_instance.main.endpoint
    port = aws_db_instance.main.port
  }
  # Not sensitive - just connection info
}

output "database_credentials" {
  description = "Database credentials"
  value = {
    username = var.db_username
    password = random_password.db.result
  }
  sensitive = true
}
```

## Best Practices

1. **Mark outputs sensitive if there is any doubt.** The cost is minimal (just an extra flag), but the risk of exposing a secret is real.

2. **Prefer Secrets Manager over outputs for application secrets.** Instead of passing secrets through Terraform outputs, store them in AWS Secrets Manager, HashiCorp Vault, or similar tools and let applications read them directly.

3. **Split sensitive and non-sensitive data.** Do not combine a password with a hostname in one output if only the password is sensitive.

4. **Encrypt your state.** Sensitive outputs are in the state file. Encryption at rest is not optional.

5. **Restrict access to -raw and -json.** In team settings, control who can run `terraform output -raw` on production state.

## Wrapping Up

The `sensitive = true` flag on outputs is a straightforward way to prevent secrets from showing up in your terminal and logs. Terraform enforces it when outputs reference sensitive variables, so you cannot accidentally skip it. But remember that it is one layer of protection, not a complete solution. Always pair sensitive outputs with encrypted state, proper access controls, and secret management tools for a defense-in-depth approach.

For more on Terraform outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [querying outputs with the CLI](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-output-command-to-query-values/view).
