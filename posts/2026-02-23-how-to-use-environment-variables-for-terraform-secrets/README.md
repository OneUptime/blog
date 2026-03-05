# How to Use Environment Variables for Terraform Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Environment Variables, Secret, DevOps

Description: Learn how to properly use environment variables to pass secrets to Terraform without exposing them in code, state, or logs.

---

Environment variables are one of the simplest ways to pass secrets to Terraform without hardcoding them in your configuration files. When used correctly, they keep sensitive values out of version control and reduce the risk of accidental exposure. When used incorrectly, they create a false sense of security while secrets leak through logs, state files, or process listings.

This guide covers the right way to use environment variables with Terraform, including the limitations you need to be aware of.

## How Terraform Reads Environment Variables

Terraform reads environment variables in two ways:

### TF_VAR_ Prefix

Any environment variable prefixed with `TF_VAR_` is automatically mapped to a Terraform input variable. The variable name after the prefix must match a declared variable.

```bash
# Set a database password via environment variable
export TF_VAR_db_password="my-secret-password"

# This maps to the Terraform variable "db_password"
```

```hcl
# variables.tf
variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true  # Prevents the value from showing in plan output
}

# main.tf
resource "aws_db_instance" "main" {
  identifier     = "my-database"
  engine         = "postgres"
  instance_class = "db.t3.medium"
  password       = var.db_password

  # other configuration...
}
```

### Provider-Specific Environment Variables

Cloud providers have their own environment variables that Terraform providers recognize:

```bash
# AWS
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

# Azure
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"

# GCP
export GOOGLE_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_PROJECT="my-project"
```

These are picked up automatically by the corresponding provider without any configuration in your `.tf` files.

## Setting Environment Variables Safely

### On Linux and macOS

```bash
# Set for the current session only (not persisted)
export TF_VAR_db_password="my-secret-password"

# Run Terraform with inline environment variable (not in shell history on some shells)
TF_VAR_db_password="my-secret-password" terraform apply

# Read from a file (more secure than shell history)
export TF_VAR_db_password=$(cat /path/to/secret-file)

# Read from a password manager
export TF_VAR_db_password=$(op read "op://Vault/Database/password")  # 1Password
export TF_VAR_db_password=$(vault kv get -field=password secret/database)  # HashiCorp Vault
```

### Avoiding Shell History

Secrets typed directly in the shell often end up in history files. Prevent this:

```bash
# Prefix with a space to avoid bash history (if HISTCONTROL=ignorespace)
 export TF_VAR_db_password="my-secret-password"

# Or disable history temporarily
set +o history
export TF_VAR_db_password="my-secret-password"
set -o history

# Better: use a .env file that is gitignored
# .env (never commit this file)
TF_VAR_db_password=my-secret-password
TF_VAR_api_key=abc123

# Source it
source .env
```

Make sure `.env` files are in your `.gitignore`:

```text
# .gitignore
.env
*.env
.env.*
```

## Using Environment Variables in CI/CD

### GitHub Actions

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
      TF_VAR_api_key: ${{ secrets.API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

### GitLab CI

```yaml
variables:
  TF_VAR_db_password: $DB_PASSWORD  # Set in GitLab CI/CD Settings
  TF_VAR_api_key: $API_KEY

terraform-apply:
  stage: deploy
  image: hashicorp/terraform:latest
  script:
    - terraform init
    - terraform apply -auto-approve
```

### Jenkins

```groovy
pipeline {
    agent any
    environment {
        TF_VAR_db_password = credentials('db-password')
        TF_VAR_api_key     = credentials('api-key')
    }
    stages {
        stage('Apply') {
            steps {
                sh 'terraform init && terraform apply -auto-approve'
            }
        }
    }
}
```

## The sensitive Flag

Always mark secret variables as `sensitive` in your variable declaration:

```hcl
variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
}

variable "api_key" {
  type        = string
  description = "Third-party API key"
  sensitive   = true
}
```

This prevents the value from appearing in `terraform plan` and `terraform apply` output:

```text
# With sensitive = true
~ password = (sensitive value)

# Without sensitive = true
~ password = "my-actual-password" -> "new-password"
```

## Limitations of Environment Variables

Environment variables are convenient but they have real limitations:

### State File Exposure

Even if you pass a secret via an environment variable, Terraform stores the final resource configuration in the state file. The state file will contain your database password in plain text.

```json
{
  "type": "aws_db_instance",
  "values": {
    "password": "my-secret-password"
  }
}
```

Mitigate this by encrypting your state file:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
    dynamodb_table = "terraform-locks"
  }
}
```

### Process Listing

Environment variables are visible to anyone who can list processes on the same machine:

```bash
# Anyone on the system can see environment variables
cat /proc/<pid>/environ
```

This is less of a concern in containerized CI/CD environments but matters on shared machines.

### Log Exposure

CI/CD systems sometimes log environment variables, especially during debugging. Make sure your pipeline masks sensitive variables:

```yaml
# GitHub Actions automatically masks secrets
# But for extra safety, add masking for computed values
- name: Mask computed secret
  run: echo "::add-mask::$COMPUTED_SECRET"
```

## A Better Alternative: External Data Sources

For production systems, consider fetching secrets at apply time from a secrets manager:

```hcl
# Fetch the password from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  identifier     = "my-database"
  engine         = "postgres"
  instance_class = "db.t3.medium"
  password       = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

This approach means the secret never touches an environment variable, a `.tfvars` file, or your shell history. It does still end up in the state file, but that is an unavoidable limitation of Terraform.

## Wrapping Up

Environment variables are a reasonable starting point for managing Terraform secrets, especially for local development and simple CI/CD pipelines. Mark your variables as sensitive, never commit `.env` files, encrypt your state, and be aware of the limitations. For production workloads, graduate to a secrets manager with dynamic credential generation when the time is right.

For monitoring the infrastructure you build with Terraform, [OneUptime](https://oneuptime.com) gives you uptime monitoring, alerting, and incident management in one place.
