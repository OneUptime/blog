# How to Handle Terraform Secrets Across Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Secrets Management, Security, Team Collaboration, DevOps

Description: Implement secure Terraform secrets management across multiple teams to prevent credential leaks while enabling teams to access the secrets they need.

---

Secrets in Terraform are everywhere. Database passwords, API keys, TLS certificates, service account credentials, and encryption keys are all managed through or referenced by Terraform configurations. When multiple teams share infrastructure, secrets management becomes a critical coordination challenge. One team generates a database password that another team's application needs to use. A shared API key must be rotated without breaking services owned by different groups.

Getting secrets wrong in Terraform is dangerous. Secrets accidentally committed to version control, stored in plain text in state files, or passed through insecure channels create vulnerabilities that attackers actively exploit. This guide covers how to manage Terraform secrets safely across teams.

## Where Secrets Hide in Terraform

Before solving the problem, understand where secrets appear:

### In State Files

Terraform state stores the actual values of all resources, including sensitive ones:

```hcl
# This resource creates a secret, but the value is stored in state
resource "aws_db_instance" "main" {
  password = var.database_password
  # The password is visible in the state file!
}
```

### In Variable Files

Teams sometimes store secrets in `.tfvars` files:

```hcl
# NEVER DO THIS - secrets in version control
# production.tfvars
database_password = "super_secret_password_123"
api_key           = "sk_live_abc123def456"
```

### In Plan Output

Terraform plan can display sensitive values in its output:

```
# terraform plan output might show:
~ resource "aws_db_instance" "main" {
    ~ password = "old_password" -> "new_password"
  }
```

### In Provider Configuration

Some providers require credentials directly:

```hcl
# Avoid putting secrets directly in provider config
provider "datadog" {
  api_key = "abc123"  # DO NOT DO THIS
  app_key = "def456"  # DO NOT DO THIS
}
```

## Strategy 1: Cloud Secrets Manager Integration

The recommended approach is to store secrets in a dedicated secrets manager and reference them in Terraform:

```hcl
# Store the secret in AWS Secrets Manager (done once, outside Terraform)
# aws secretsmanager create-secret --name prod/db/password --secret-string "..."

# Reference the secret in Terraform
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "14.1"
  instance_class = "db.r5.large"

  # Use the secret value
  password = data.aws_secretsmanager_secret_version.db_password.secret_string

  # The value is still in state, but at least it is not in code
}
```

### Cross-Team Secret Sharing with IAM

Control which teams can access which secrets:

```hcl
# Secret with resource policy controlling access
resource "aws_secretsmanager_secret" "database_credentials" {
  name = "production/database/credentials"

  # Resource policy restricts access
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Database team can manage the secret
        Sid    = "DatabaseTeamManage"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/database-team"
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        # Application team can only read the secret
        Sid    = "AppTeamRead"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/application-team"
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Strategy 2: HashiCorp Vault Integration

For organizations using Vault, integrate it with Terraform:

```hcl
# Configure the Vault provider
provider "vault" {
  address = "https://vault.internal.company.com"
  # Authentication via environment variable VAULT_TOKEN
}

# Read secrets from Vault
data "vault_generic_secret" "database" {
  path = "secret/production/database"
}

# Use Vault secrets in resources
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.r5.large"
  username       = data.vault_generic_secret.database.data["username"]
  password       = data.vault_generic_secret.database.data["password"]
}

# Generate dynamic credentials through Vault
data "vault_aws_access_credentials" "creds" {
  backend = "aws"
  role    = "terraform-role"
  type    = "sts"
}

provider "aws" {
  access_key = data.vault_aws_access_credentials.creds.access_key
  secret_key = data.vault_aws_access_credentials.creds.secret_key
  token      = data.vault_aws_access_credentials.creds.security_token
}
```

## Strategy 3: Generate Secrets in Terraform

For secrets that do not need to be known in advance, generate them within Terraform:

```hcl
# Generate a random password
resource "random_password" "database" {
  length  = 32
  special = true

  # Prevent Terraform from regenerating on every apply
  lifecycle {
    ignore_changes = all
  }
}

# Store it in Secrets Manager
resource "aws_secretsmanager_secret" "database_password" {
  name = "production/database/password"
}

resource "aws_secretsmanager_secret_version" "database_password" {
  secret_id     = aws_secretsmanager_secret.database_password.id
  secret_string = random_password.database.result
}

# Use it in the database
resource "aws_db_instance" "main" {
  password = random_password.database.result
}

# Application retrieves it from Secrets Manager at runtime
# (not through Terraform)
```

## Protecting Secrets in State

Even with proper secrets management, Terraform state contains sensitive values. Protect the state:

```hcl
# Encrypt state at rest
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    # Use a customer-managed KMS key
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# Restrict state bucket access
resource "aws_s3_bucket_policy" "state" {
  bucket = "company-terraform-state"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Deny unencrypted uploads
        Sid    = "DenyUnencryptedUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "arn:aws:s3:::company-terraform-state/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption": "aws:kms"
          }
        }
      },
      {
        # Deny non-HTTPS access
        Sid    = "DenyNonHTTPS"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          "arn:aws:s3:::company-terraform-state",
          "arn:aws:s3:::company-terraform-state/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  })
}
```

## Marking Sensitive Values

Use the `sensitive` flag to prevent values from appearing in logs and plan output:

```hcl
# Mark variables as sensitive
variable "database_password" {
  type        = string
  description = "RDS master password."
  sensitive   = true
}

# Mark outputs as sensitive
output "database_connection_string" {
  value       = "postgresql://${var.db_user}:${random_password.db.result}@${aws_db_instance.main.endpoint}/production"
  sensitive   = true
  description = "Database connection string. Access via terraform output -raw database_connection_string."
}

# Mark local values as sensitive
locals {
  api_credentials = {
    key    = data.aws_secretsmanager_secret_version.api_key.secret_string
    secret = data.aws_secretsmanager_secret_version.api_secret.secret_string
  }
}
```

## Secret Rotation

Implement secret rotation that works across teams:

```hcl
# Automated rotation for Secrets Manager
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Lambda function that performs the rotation
resource "aws_lambda_function" "rotate_secret" {
  function_name = "rotate-database-secret"
  handler       = "rotate.handler"
  runtime       = "python3.11"
  filename      = "rotate_secret.zip"

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.us-east-1.amazonaws.com"
    }
  }
}
```

## Preventing Secret Leaks

Add automated checks to prevent secrets from entering version control:

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scanning

on:
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: .
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
```

Add a pre-commit hook as well:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

For more on controlling access in Terraform workflows, see our guide on [setting up Terraform access controls for teams](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-access-controls-for-teams/view).

## Secret Management Audit

Regularly audit your secrets management practices:

```bash
#!/bin/bash
# scripts/audit-secrets.sh

echo "=== Terraform Secrets Audit ==="

# Check for plain-text secrets in tfvars files
echo "Scanning for potential secrets in .tfvars files..."
grep -rn -i "password\|secret\|api_key\|token" *.tfvars **/*.tfvars 2>/dev/null

# Check state files for unencrypted secrets
echo "Verifying state encryption..."
aws s3api head-object \
  --bucket company-terraform-state \
  --key production/terraform.tfstate \
  --query 'ServerSideEncryption'

echo "Audit complete."
```

Secrets management is one of the hardest problems in infrastructure. There is no single perfect solution, but the combination of a secrets manager, encrypted state, sensitive markings, and automated scanning creates a defense-in-depth approach that significantly reduces risk. Start with the basics, add automation, and continuously improve.
