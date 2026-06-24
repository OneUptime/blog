# How to Handle Secrets in OpenTofu Configurations Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Secrets Management, Security, Infrastructure as Code, Best Practice

Description: Learn the key strategies for keeping secrets out of OpenTofu configuration files, plan output, and state - including environment variables, secret managers, and sensitive variable marking.

## Introduction

Secrets in OpenTofu configurations are a common source of accidental credential exposure. Hardcoded passwords, API keys, and certificates can leak through version control, plan output, or unencrypted state files. This guide covers the principal strategies to handle secrets safely. Remember that `sensitive = true` only redacts routine CLI output; it does not stop OpenTofu from storing a value in state.

## Never Hardcode Secrets

```hcl
# BAD - never do this

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  username = "admin"
  password = "SuperSecretPassword123!"  # Hardcoded credential!
}

# GOOD - accept the password as a sensitive variable
variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  username = "admin"
  password = var.db_password
}
```

## Strategy 1: Environment Variables

Pass secrets as environment variables so they are not hardcoded in configuration files:

```bash
# Set before running tofu plan/apply
export TF_VAR_db_password="SuperSecretPassword123!"

tofu plan
tofu apply
```

In CI/CD pipelines, use the platform's secret store:

```yaml
# GitHub Actions
- name: Tofu Apply
  env:
    TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
  run: tofu apply -auto-approve
```

## Strategy 2: Read Secrets from AWS Secrets Manager

Pull secrets at plan/apply time using a data source so they are not hardcoded in code. If you pass them to a normal resource argument, they can still be stored in state:

```hcl
# Fetch the secret at runtime
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "prod/myapp/db"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  username = local.db_creds.username
  password = local.db_creds.password
}
```

## Strategy 3: HashiCorp Vault Provider

Vault keeps the secret out of HCL, but the Vault provider documents that data source values are still written to state and can appear in plan files:

```hcl
provider "vault" {
  address = "https://vault.example.com"
  # Token from VAULT_TOKEN environment variable
}

data "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "prod/database"
}

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "postgres"
  instance_class    = "db.t3.micro"
  username = data.vault_kv_secret_v2.db.data["username"]
  password = data.vault_kv_secret_v2.db.data["password"]
}
```

## Marking Variables as Sensitive

Mark secrets as sensitive to suppress them from plan/apply output. This redacts routine CLI output only; it does not remove values from state:

```hcl
variable "api_key" {
  type        = string
  description = "Third-party API key"
  sensitive   = true  # Redacted in plan output as (sensitive value)
}

output "api_endpoint" {
  value = "https://api.example.com"
  # Don't output secrets - if you must, mark them sensitive
}
```

## Using .tfvars Files Safely

```hcl
# secrets.tfvars - NEVER commit this file
db_password = "SuperSecretPassword123!"
api_key     = "sk-abc123def456"
```

```bash
# .gitignore
*.tfvars
!example.tfvars    # Commit a template with dummy values only
```

Pass at runtime:

```bash
tofu apply -var-file="secrets.tfvars"
```

## Checking for Accidental Secret Commits

Use tools like `git-secrets` or `truffleHog` to scan for secrets before they reach the repository:

```bash
# Install git-secrets hooks in this repo
git secrets --install
git secrets --register-aws

# Scan the entire repo history
git secrets --scan-history
```

## Conclusion

The safest approach is to keep secrets out of OpenTofu configuration files, source them from a secrets manager or environment variables, and treat OpenTofu state as sensitive data. Mark secret variables and outputs as `sensitive = true` to redact routine CLI output, and use OpenTofu ephemerality or provider write-only arguments where supported if you need a secret to stay out of state and plan data.
