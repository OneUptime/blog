# How to Handle Terraform Sensitive Output Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Secrets Management, DevOps, Infrastructure as Code

Description: Learn how to properly handle sensitive output values in Terraform including the sensitive flag, state file security, and alternatives for secret management.

---

Terraform configurations frequently deal with sensitive data: database passwords, API keys, certificates, and connection strings. When these values appear in outputs, they can leak into logs, terminal displays, and state files. Terraform provides mechanisms to handle sensitive values, but understanding their limitations is just as important as knowing how to use them.

This guide covers how to mark outputs as sensitive, what protections that actually provides, and what additional steps you need to secure sensitive data in your Terraform workflow.

## Marking Outputs as Sensitive

The `sensitive` flag on output values prevents Terraform from displaying the value in the terminal:

```hcl
# Database password output - marked as sensitive
output "database_password" {
  description = "The master password for the RDS instance"
  value       = aws_db_instance.main.password
  sensitive   = true
}

# API key output
output "api_key" {
  description = "The generated API key for the service"
  value       = aws_api_gateway_api_key.main.value
  sensitive   = true
}

# Connection string that contains embedded credentials
output "database_connection_string" {
  description = "Full connection string for the database"
  value       = "postgresql://${aws_db_instance.main.username}:${aws_db_instance.main.password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}
```

When you run `terraform output`, sensitive values display as `<sensitive>`:

```text
Outputs:

api_key                    = <sensitive>
database_connection_string = <sensitive>
database_password          = <sensitive>
```

To access the actual value when you need it:

```bash
# Get a specific sensitive output value
terraform output -raw database_password

# Get it as JSON (useful for scripting)
terraform output -json database_password
```

## Sensitive Variables

Mark input variables as sensitive to prevent them from appearing in plan output:

```hcl
variable "database_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "Database password must be at least 16 characters."
  }
}

variable "tls_private_key" {
  description = "TLS private key in PEM format"
  type        = string
  sensitive   = true
}
```

When a sensitive variable is used in a resource, Terraform suppresses the value in plan output:

```text
# aws_db_instance.main will be created
+ resource "aws_db_instance" "main" {
    + password = (sensitive value)
    ...
  }
```

## Automatic Sensitivity Propagation

Terraform automatically marks expressions as sensitive when they derive from sensitive values:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

# This local is automatically sensitive because it uses a sensitive variable
locals {
  connection_string = "host=${aws_db_instance.main.address} password=${var.db_password}"
}

# This output MUST be marked sensitive because it uses a sensitive value
# Terraform will error if you forget
output "connection_info" {
  value     = local.connection_string
  sensitive = true
}
```

If you try to output a sensitive value without the `sensitive = true` flag, Terraform gives you an error:

```text
Error: Output refers to sensitive values

Output "connection_info" includes a sensitive value. Add sensitive = true
to the output to suppress this error.
```

## What Sensitive Does NOT Protect

Understanding the limitations is critical:

### State File

Sensitive values are stored in plain text in the Terraform state file. The `sensitive` flag only controls display, not storage.

```bash
# Your state file still contains the actual values
# Anyone with state file access can read them
terraform state pull | jq '.resources[] | select(.type == "aws_db_instance") | .instances[].attributes.password'
```

Protect your state file:

```hcl
# Use encrypted S3 backend with restricted access
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/your-key-id"
    dynamodb_table = "terraform-locks"
  }
}
```

Restrict state file access with IAM:

```hcl
resource "aws_iam_policy" "terraform_state_access" {
  name = "terraform-state-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-terraform-state/production/*"
        Condition = {
          StringEquals = {
            "aws:PrincipalTag/Team" = "infrastructure"
          }
        }
      }
    ]
  })
}
```

### Plan Files

Terraform plan files also contain sensitive values in plain text:

```bash
# Plan files are NOT encrypted
terraform plan -out=plan.tfplan

# Anyone with the plan file can see sensitive values
terraform show -json plan.tfplan | jq '.'
```

If you save plan files, treat them as secrets. Delete them after use or store them in encrypted storage.

### CI/CD Logs

Even with the sensitive flag, there are ways values can leak into logs:

```hcl
# This will NOT leak the password (sensitive propagation works)
output "db_info" {
  value     = var.db_password
  sensitive = true
}

# But this CAN leak if the provisioner output is logged
resource "null_resource" "setup" {
  provisioner "local-exec" {
    # This command's output might be logged in CI/CD
    command = "echo ${var.db_password}"
  }
}
```

## Better Alternatives for Secret Management

Instead of passing secrets through Terraform variables and outputs, use a dedicated secrets manager:

### AWS Secrets Manager

```hcl
# Generate a random password
resource "random_password" "database" {
  length  = 32
  special = true
}

# Store it in Secrets Manager
resource "aws_secretsmanager_secret" "database_password" {
  name        = "${var.project}/database/master-password"
  description = "Master password for the production database"
  kms_key_id  = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_version" "database_password" {
  secret_id     = aws_secretsmanager_secret.database_password.id
  secret_string = random_password.database.result
}

# Use the password in the database resource
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  username = "admin"
  password = random_password.database.result

  # Applications retrieve the password from Secrets Manager
  # instead of from Terraform outputs
}

# Output only the secret ARN, not the secret itself
output "database_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the database password"
  value       = aws_secretsmanager_secret.database_password.arn
}
```

### HashiCorp Vault

```hcl
# Read secrets from Vault instead of passing them as variables
data "vault_generic_secret" "database" {
  path = "secret/production/database"
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-database"
  engine         = "postgres"
  instance_class = "db.r6g.large"

  username = data.vault_generic_secret.database.data["username"]
  password = data.vault_generic_secret.database.data["password"]
}
```

### SSM Parameter Store

```hcl
# Store secret in SSM Parameter Store
resource "aws_ssm_parameter" "database_password" {
  name        = "/${var.project}/database/password"
  description = "Database master password"
  type        = "SecureString"
  value       = random_password.database.result
  key_id      = aws_kms_key.secrets.arn
}

# Applications read from SSM at runtime
output "database_password_parameter" {
  description = "SSM parameter path for the database password"
  value       = aws_ssm_parameter.database_password.name
}
```

## Handling Sensitive Data in Modules

When writing modules that deal with sensitive data, be explicit about sensitivity:

```hcl
# modules/database/variables.tf
variable "master_password" {
  type      = string
  sensitive = true
}

# modules/database/outputs.tf
output "endpoint" {
  description = "Database endpoint"
  value       = aws_db_instance.this.endpoint
}

output "secret_arn" {
  description = "ARN of the secret containing credentials"
  value       = aws_secretsmanager_secret.credentials.arn
  # Not sensitive - it is just a reference, not the secret itself
}
```

## Summary

The `sensitive` flag in Terraform is a display-level protection that prevents values from showing in terminal output and plan displays. It does not encrypt values in state files or plan files. For genuine secret management, use AWS Secrets Manager, Vault, or SSM Parameter Store so that secrets are never exposed through Terraform outputs. Combine this with encrypted state backends and restricted state file access for a defense-in-depth approach to sensitive data handling.

For more on secrets in Terraform, see [how to handle secret rotation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-secret-rotation-with-terraform/view).
