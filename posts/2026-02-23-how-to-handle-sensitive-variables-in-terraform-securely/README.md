# How to Handle Sensitive Variables in Terraform Securely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Secret, Variables, IaC, DevOps

Description: Learn how to handle sensitive variables in Terraform securely, covering the sensitive flag, environment variables, tfvars files, secret management integrations, and common pitfalls to avoid.

---

Terraform configurations often require sensitive values like passwords, API keys, and certificates. Handling these securely is a challenge because Terraform needs the values to create resources, but you want to minimize exposure at every step. This guide covers the techniques and patterns for managing sensitive variables without accidentally leaking them.

## The Problem with Sensitive Data in Terraform

Terraform stores the full state of every resource it manages, including the values used to create them. If you pass a database password as a variable, that password ends up in:

1. The state file (in plain text by default)
2. Plan output (visible in CI/CD logs)
3. Potentially in version control (if someone commits a `.tfvars` file)

Understanding these exposure points is the first step to securing sensitive data.

## Using the Sensitive Flag

Terraform has a built-in `sensitive` flag for variables and outputs that prevents values from appearing in plan and apply output:

```hcl
# Mark a variable as sensitive
variable "database_password" {
  type        = string
  description = "Password for the RDS database"
  sensitive   = true
}

variable "api_key" {
  type        = string
  description = "API key for the monitoring service"
  sensitive   = true
}

# Use the sensitive variable in a resource
resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = var.database_password

  # Other configuration...
}

# Outputs can also be marked sensitive
output "database_connection_string" {
  value     = "postgres://admin:${var.database_password}@${aws_db_instance.main.endpoint}/mydb"
  sensitive = true
}
```

When you run `terraform plan`, sensitive values appear as `(sensitive value)` instead of the actual data:

```
# aws_db_instance.main will be created
+ resource "aws_db_instance" "main" {
    + password = (sensitive value)
    ...
  }
```

**Important limitation**: The `sensitive` flag only affects the CLI output. The value is still stored in plain text in the state file. This is why encrypting your state backend is critical.

## Passing Sensitive Values via Environment Variables

Never hardcode secrets in your Terraform configuration or `.tfvars` files. Use environment variables instead:

```bash
# Set sensitive values as environment variables
# The TF_VAR_ prefix tells Terraform to use them as variable values
export TF_VAR_database_password="my-secret-password"
export TF_VAR_api_key="sk-1234567890abcdef"

# Now run Terraform - it will pick up the values automatically
terraform plan
terraform apply
```

This approach works well in CI/CD pipelines where you can inject secrets from a vault:

```yaml
# GitHub Actions example
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      TF_VAR_database_password: ${{ secrets.DB_PASSWORD }}
      TF_VAR_api_key: ${{ secrets.API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - run: terraform apply -auto-approve
```

## Using .tfvars Files Safely

If you must use `.tfvars` files for non-sensitive values, make sure sensitive files are excluded from version control:

```bash
# .gitignore
*.tfvars
!example.tfvars
*.auto.tfvars
```

Create a template file that shows what variables are needed without revealing actual values:

```hcl
# example.tfvars (committed to git - template only)
# Copy this to terraform.tfvars and fill in actual values
database_password = "REPLACE_ME"
api_key           = "REPLACE_ME"
environment       = "production"
region            = "us-east-1"
```

```hcl
# terraform.tfvars (NOT committed to git)
database_password = "actual-password-here"
api_key           = "actual-key-here"
environment       = "production"
region            = "us-east-1"
```

## Using Data Sources to Fetch Secrets

Instead of passing secrets as variables, fetch them directly from a secret manager:

```hcl
# Fetch from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

```hcl
# Fetch from Azure Key Vault
data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

resource "azurerm_postgresql_server" "main" {
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value
  # Other configuration...
}
```

```hcl
# Fetch from GCP Secret Manager
data "google_secret_manager_secret_version" "db_password" {
  secret = "database-password"
}

resource "google_sql_user" "main" {
  instance = google_sql_database_instance.main.name
  name     = "admin"
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
```

**Note**: Even when using data sources, the secret value still ends up in the state file. This is a fundamental limitation of how Terraform works.

## Preventing Accidental Exposure

### Pre-commit Hooks

Set up hooks to catch secrets before they are committed:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: local
    hooks:
      - id: no-tfvars
        name: Check for .tfvars files
        entry: bash -c 'if git diff --cached --name-only | grep -q "\.tfvars$" | grep -v "example"; then echo "ERROR: Do not commit .tfvars files"; exit 1; fi'
        language: system
        pass_filenames: false
```

### Terraform Plan Output Security

When running in CI/CD, be careful with plan output:

```bash
# BAD: This might log sensitive values
terraform plan

# BETTER: Redirect plan to a file and only show summary
terraform plan -out=plan.tfplan -no-color 2>&1 | grep -E "^(Plan|No changes)"

# Show the plan details only in a secure way
terraform show plan.tfplan -no-color > plan-details.txt
# Review plan-details.txt in a secure context, not in CI logs
```

## The Ephemeral Pattern

For some secrets, you can generate them outside of Terraform and only reference them:

```hcl
# Generate a random password that Terraform manages
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store the password in a secret manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "production/database/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.database.result
}

# Use the generated password for the database
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = random_password.database.result
}
```

The password is still in the state file, but it was never in a `.tfvars` file, environment variable, or CI/CD configuration.

## Using Terraform Cloud/Enterprise Variables

If you use Terraform Cloud or a similar platform, mark variables as sensitive in the workspace:

```hcl
# Using the Terraform Cloud provider to set variables
resource "tfe_variable" "db_password" {
  key          = "database_password"
  value        = var.database_password
  category     = "terraform"
  workspace_id = tfe_workspace.production.id
  sensitive    = true  # Value is encrypted and hidden in the UI
}
```

## Handling Sensitive Outputs

Be careful with outputs that derive from sensitive values:

```hcl
# This will fail because it exposes a sensitive value
output "database_endpoint" {
  value = "${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}"
}

# Mark derived outputs as sensitive too
output "database_connection_info" {
  value = {
    endpoint = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    username = aws_db_instance.main.username
  }
  sensitive = true
}
```

## State File Protection Recap

Since sensitive values always end up in the state file, protecting state is your last line of defense:

1. **Encrypt at rest**: Use KMS encryption on your state backend
2. **Encrypt in transit**: Use HTTPS/TLS for all backend communications
3. **Restrict access**: Limit who can read the state file through IAM policies
4. **Enable versioning**: Keep history for recovery
5. **Audit access**: Log who reads and writes the state file

See our detailed guide on [securing Terraform state files](https://oneuptime.com/blog/post/2026-02-23-how-to-secure-terraform-state-files/view) for more.

## Monitoring Your Infrastructure

After deploying infrastructure with sensitive configurations, monitor it to ensure everything is running correctly. [OneUptime](https://oneuptime.com) provides monitoring and incident management that helps you detect issues with your deployed services quickly.

## Conclusion

There is no perfect solution for sensitive data in Terraform. Every approach has trade-offs. The best strategy combines multiple techniques: mark variables as sensitive, pass values through environment variables, fetch secrets from dedicated secret managers, encrypt your state files, and set up guardrails to prevent accidental exposure. The goal is to minimize the number of places where secrets exist in plain text and control access to those places tightly.

For related topics, see our guides on [using HashiCorp Vault with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hashicorp-vault-with-terraform-for-secrets/view) and [handling database passwords in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-passwords-in-terraform/view).
