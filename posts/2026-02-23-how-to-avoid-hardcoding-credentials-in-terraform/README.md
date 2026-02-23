# How to Avoid Hardcoding Credentials in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Credentials, Secrets Management, Best Practices

Description: Practical techniques to keep credentials out of your Terraform code, including secrets managers, dynamic credentials, and data sources.

---

Hardcoded credentials in Terraform files are one of the most common security problems in infrastructure code. It happens more often than you would think. A developer is testing something locally, pastes an API key into a `.tf` file to get it working, and then commits it. Now that secret is in your Git history forever, even if someone deletes it in a later commit.

This guide covers practical approaches to keep credentials completely out of your Terraform code, from simple variable injection to dynamic secret generation with HashiCorp Vault.

## Why Hardcoded Credentials Are Dangerous

Before diving into solutions, it is worth understanding the specific risks:

- **Git history**: Secrets committed to Git persist in history even after deletion. Anyone with repo access can find them.
- **State file exposure**: Even if you use variables, the resolved values end up in the state file. But at least they are not in plain text in your repo.
- **Accidental sharing**: Code snippets get pasted in Slack, Stack Overflow questions, and documentation. Embedded secrets travel with them.
- **Automated scanning**: Attackers actively scan public repositories for AWS keys, database passwords, and API tokens. If a key hits GitHub, it can be exploited within minutes.

## Pattern 1: Input Variables with Sensitive Flag

The most basic improvement over hardcoding is to use input variables:

```hcl
# Bad - hardcoded credentials
resource "aws_db_instance" "main" {
  username = "admin"
  password = "SuperSecret123!"  # Never do this
}

# Good - use variables
variable "db_username" {
  type        = string
  description = "Database admin username"
  sensitive   = true
}

variable "db_password" {
  type        = string
  description = "Database admin password"
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters."
  }
}

resource "aws_db_instance" "main" {
  username = var.db_username
  password = var.db_password
}
```

Pass the values via environment variables or a secrets manager in your CI/CD pipeline:

```bash
export TF_VAR_db_username="admin"
export TF_VAR_db_password="$(vault kv get -field=password secret/database)"
terraform apply
```

## Pattern 2: AWS Secrets Manager Data Source

Fetch secrets at plan/apply time instead of passing them as variables:

```hcl
# Store the secret in AWS Secrets Manager (done once, outside Terraform)
# aws secretsmanager create-secret --name production/db/credentials \
#   --secret-string '{"username":"admin","password":"GeneratedPassword123!"}'

# Fetch it in Terraform
data "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = "production/db/credentials"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)
}

resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
  username       = local.db_creds["username"]
  password       = local.db_creds["password"]

  # other configuration...
}
```

## Pattern 3: HashiCorp Vault Dynamic Secrets

Vault can generate short-lived credentials on the fly. This is the gold standard for secret management:

```hcl
# Configure the Vault provider
provider "vault" {
  # Address is typically set via VAULT_ADDR environment variable
  # Token is set via VAULT_TOKEN or another auth method
}

# Generate dynamic AWS credentials
data "vault_aws_access_credentials" "creds" {
  backend = "aws"
  role    = "terraform-role"
  type    = "sts"
}

# Use the dynamic credentials in a provider
provider "aws" {
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.creds.access_key
  secret_key = data.vault_aws_access_credentials.creds.secret_key
  token      = data.vault_aws_access_credentials.creds.security_token
}

# Generate a dynamic database password
data "vault_generic_secret" "db_password" {
  path = "database/creds/my-role"
}

resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  username       = data.vault_generic_secret.db_password.data["username"]
  password       = data.vault_generic_secret.db_password.data["password"]
}
```

## Pattern 4: AWS SSM Parameter Store

For simpler setups, Parameter Store is a free alternative to Secrets Manager:

```hcl
# Fetch from SSM Parameter Store
data "aws_ssm_parameter" "db_password" {
  name            = "/production/database/password"
  with_decryption = true
}

data "aws_ssm_parameter" "api_key" {
  name            = "/production/api/key"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  password = data.aws_ssm_parameter.db_password.value
}

resource "aws_lambda_function" "api" {
  environment {
    variables = {
      API_KEY = data.aws_ssm_parameter.api_key.value
    }
  }
}
```

## Pattern 5: Generate Secrets with Terraform

For passwords that do not need to be known in advance, let Terraform generate them:

```hcl
# Generate a random password
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Use it for the database
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  username       = "admin"
  password       = random_password.db_password.result
}

# Store it in Secrets Manager so applications can retrieve it
resource "aws_secretsmanager_secret" "db_password" {
  name        = "production/database/password"
  description = "Auto-generated database password managed by Terraform"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.db_password.result
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
```

## Detecting Hardcoded Secrets

Use automated tools to catch secrets that slip through:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/zricethezav/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

Also scan with tfsec, which specifically looks for hardcoded credentials in Terraform:

```bash
# tfsec catches things like:
# - Hardcoded AWS access keys
# - Plaintext passwords in resource blocks
# - API keys in provider configurations
tfsec . --include-passed
```

## Handling Secrets in .tfvars Files

If you use `.tfvars` files for secrets, never commit them:

```bash
# .gitignore
*.tfvars
!example.tfvars  # Keep an example file with placeholder values
```

Create an example file for reference:

```hcl
# example.tfvars - copy to terraform.tfvars and fill in real values
db_password = "REPLACE_WITH_ACTUAL_PASSWORD"
api_key     = "REPLACE_WITH_ACTUAL_API_KEY"
```

## Rotating Secrets

Secrets that cannot be rotated are a ticking time bomb. Build rotation into your workflow:

```hcl
# Auto-rotate the database password every 30 days
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_password.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

For Terraform-managed passwords, you can use `terraform taint` to force regeneration:

```bash
# Force password regeneration on next apply
terraform taint random_password.db_password
terraform apply
```

## Wrapping Up

The path from hardcoded credentials to proper secret management is not as hard as it seems. Start by moving secrets to environment variables, then graduate to a secrets manager data source. For the most security-sensitive workloads, use Vault for dynamic credential generation. The key principle is that secrets should never exist in your `.tf` files, your `.tfvars` files, or your Git history.

For monitoring the infrastructure you build, [OneUptime](https://oneuptime.com) provides uptime monitoring, incident management, and status pages to keep your team informed and your services healthy.
