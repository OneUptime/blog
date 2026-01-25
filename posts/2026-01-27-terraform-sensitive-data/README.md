# How to Handle Sensitive Data in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Security, Secrets Management, Infrastructure as Code, DevOps

Description: Learn best practices for handling sensitive data in Terraform, including secrets management with Vault, AWS Secrets Manager, and SOPS, plus techniques to prevent exposure in logs and state.

---

Terraform configurations often need secrets: database passwords, API keys, certificates. Handling these securely requires careful attention to where secrets are stored, how they're passed, and what gets logged.

## The Problem with Secrets in Terraform

Secrets can leak through:
- **State files**: Stored in plaintext by default
- **Plan output**: Visible in logs and CI/CD
- **Version control**: Accidentally committed tfvars files
- **Command history**: Passed via -var flags

## Sensitive Variables

Mark variables as sensitive to hide values in output:

```hcl
# variables.tf

variable "database_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true  # Hides value in plan/apply output
}

variable "api_key" {
  description = "External service API key"
  type        = string
  sensitive   = true
}
```

When applied:

```
# terraform plan output:
# aws_db_instance.main will be created
#   + password = (sensitive value)
```

### Sensitive Outputs

```hcl
output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://${var.db_user}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}
```

## Generating Secrets with Terraform

Use the random provider for generated secrets:

```hcl
# Generate a random password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Use the generated password
resource "aws_db_instance" "main" {
  identifier     = "myapp-db"
  engine         = "postgres"
  engine_version = "14.0"
  instance_class = "db.t3.medium"

  username = "admin"
  password = random_password.database.result  # Generated value
}

# Store in Secrets Manager for application use
resource "aws_secretsmanager_secret" "database" {
  name = "myapp/database"
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.database.result
    host     = aws_db_instance.main.endpoint
    database = "myapp"
  })
}
```

## Secrets Managers Integration

### AWS Secrets Manager

Read existing secrets:

```hcl
# Read secret from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "myapp/api-key"
}

locals {
  api_key = jsondecode(data.aws_secretsmanager_secret_version.api_key.secret_string)["key"]
}

# Use in resources
resource "aws_lambda_function" "api" {
  # ...
  environment {
    variables = {
      API_KEY = local.api_key
    }
  }
}
```

### HashiCorp Vault

```hcl
# Configure Vault provider
provider "vault" {
  address = "https://vault.example.com:8200"
  # Auth configured via VAULT_TOKEN env var
}

# Read secret from Vault
data "vault_generic_secret" "database" {
  path = "secret/myapp/database"
}

resource "aws_db_instance" "main" {
  # ...
  password = data.vault_generic_secret.database.data["password"]
}
```

### Azure Key Vault

```hcl
data "azurerm_key_vault" "main" {
  name                = "myapp-keyvault"
  resource_group_name = "myapp-rg"
}

data "azurerm_key_vault_secret" "database_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

resource "azurerm_mssql_server" "main" {
  # ...
  administrator_login_password = data.azurerm_key_vault_secret.database_password.value
}
```

### Google Secret Manager

```hcl
data "google_secret_manager_secret_version" "api_key" {
  secret = "projects/my-project/secrets/api-key"
}

resource "google_cloud_run_service" "api" {
  # ...
  template {
    spec {
      containers {
        env {
          name  = "API_KEY"
          value = data.google_secret_manager_secret_version.api_key.secret_data
        }
      }
    }
  }
}
```

## Encrypted tfvars with SOPS

SOPS encrypts files while keeping keys visible:

### Setup SOPS

```bash
# Install SOPS
brew install sops

# Create SOPS config
cat > .sops.yaml << EOF
creation_rules:
  - path_regex: \.enc\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:key/abc123
  - path_regex: secrets\.tfvars$
    kms: arn:aws:kms:us-east-1:123456789012:key/abc123
EOF
```

### Encrypt Secrets

```bash
# Create secrets file
cat > secrets.tfvars << EOF
database_password = "super-secret-password"
api_key = "sk-1234567890"
EOF

# Encrypt with SOPS
sops -e secrets.tfvars > secrets.enc.tfvars

# The encrypted file is safe to commit
git add secrets.enc.tfvars
```

### Use in CI/CD

```yaml
# .github/workflows/terraform.yml

- name: Decrypt secrets
  run: |
    sops -d secrets.enc.tfvars > secrets.tfvars

- name: Terraform Apply
  run: terraform apply -var-file=secrets.tfvars -auto-approve

- name: Cleanup
  if: always()
  run: rm -f secrets.tfvars
```

## Environment Variables

Pass secrets via environment variables:

```bash
# Set environment variables
export TF_VAR_database_password="super-secret"
export TF_VAR_api_key="sk-1234567890"

# Terraform reads TF_VAR_* automatically
terraform apply
```

In CI/CD:

```yaml
- name: Terraform Apply
  run: terraform apply -auto-approve
  env:
    TF_VAR_database_password: ${{ secrets.DATABASE_PASSWORD }}
    TF_VAR_api_key: ${{ secrets.API_KEY }}
```

## State Encryption

### S3 Backend with Encryption

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true  # Enables AES-256 encryption
    kms_key_id     = "alias/terraform-state"  # Use custom KMS key
    dynamodb_table = "terraform-locks"
  }
}
```

### Terraform Cloud

Terraform Cloud encrypts state at rest automatically.

### IMPORTANT: State Still Contains Secrets

Even with encryption at rest, anyone with state access can read secrets. Limit access with IAM:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::mycompany-terraform-state/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/Team": "platform"
        }
      }
    }
  ]
}
```

## Preventing Secret Exposure

### 1. Use .gitignore

```gitignore
# .gitignore

# Terraform state (if not using remote backend)
*.tfstate
*.tfstate.*

# Sensitive variable files
*.tfvars
!example.tfvars

# Override files
override.tf
override.tf.json

# Decrypted secrets
secrets.tfvars
*.decrypted.*
```

### 2. Pre-commit Hooks

```yaml
# .pre-commit-config.yaml

repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

### 3. Secrets Scanning in CI

```yaml
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
```

## External Data Pattern

Fetch secrets at runtime without storing in state:

```hcl
# external_secrets.tf

# Fetch secret via external script
data "external" "database_creds" {
  program = ["bash", "${path.module}/scripts/get-secret.sh"]

  query = {
    secret_name = "myapp/database"
    region      = "us-east-1"
  }
}

# Use without storing in state
resource "null_resource" "configure_app" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "configure-app.sh"
    environment = {
      DB_PASSWORD = data.external.database_creds.result["password"]
    }
  }
}
```

```bash
#!/bin/bash
# scripts/get-secret.sh

# Read query from stdin
eval "$(jq -r '@sh "SECRET_NAME=\(.secret_name) REGION=\(.region)"')"

# Fetch from Secrets Manager
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query SecretString \
  --output text)

# Output as JSON
echo "$SECRET"
```

## Best Practices Summary

| Practice | Benefit |
|----------|---------|
| Mark variables as `sensitive` | Hides in plan output |
| Use secrets managers | Centralized, audited access |
| Encrypt state | Protects at rest |
| Use SOPS for tfvars | Safe to commit |
| Environment variables | No files to leak |
| Pre-commit hooks | Catch secrets before commit |
| Generate secrets in Terraform | No manual handling |
| Limit state access | Reduce exposure surface |

## What NOT to Do

```hcl
# NEVER: Hardcode secrets
resource "aws_db_instance" "main" {
  password = "my-password"  # NO!
}

# NEVER: Use default values for secrets
variable "api_key" {
  default = "sk-1234567890"  # NO!
}

# NEVER: Output secrets without sensitive flag
output "password" {
  value = random_password.main.result  # NO! Add sensitive = true
}
```

---

Handling secrets in Terraform requires defense in depth: mark variables sensitive, use secrets managers, encrypt state, and implement scanning. No single measure is sufficient; combine them all for secure infrastructure management.
