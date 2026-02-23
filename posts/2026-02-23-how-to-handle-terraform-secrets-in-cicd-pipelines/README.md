# How to Handle Terraform Secrets in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Secrets Management, Security, Vault, AWS Secrets Manager, DevOps

Description: Learn how to securely manage secrets in Terraform CI/CD pipelines using environment variables, secret managers, SOPS, and Vault integration without exposing sensitive data.

---

Terraform configurations frequently need access to sensitive values like database passwords, API keys, and certificates. Hardcoding these into your code or state files is a security risk. In CI/CD pipelines, the challenge is bigger because secrets need to be available at runtime without being committed to version control or exposed in logs. This guide covers the practical approaches to handling secrets safely.

## The Problem with Terraform and Secrets

Terraform has a fundamental issue with secrets: any value passed to a resource ends up in the state file in plaintext. Even if you mark a variable as `sensitive`, it still appears in the state. This means your secret management strategy needs to cover three areas:

1. How secrets get into the pipeline (injection)
2. How secrets are passed to Terraform (variables)
3. How secrets are protected in state (encryption)

## Using CI/CD Platform Secret Variables

Every CI/CD platform has a built-in secrets mechanism. This is the simplest starting point.

### GitHub Actions Secrets

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply

on:
  push:
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init -no-color

      - name: Terraform Apply
        run: terraform apply -no-color -auto-approve
        env:
          # Terraform automatically picks up TF_VAR_ prefixed variables
          TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
          TF_VAR_api_key: ${{ secrets.API_KEY }}
          TF_VAR_ssl_certificate: ${{ secrets.SSL_CERT }}
```

In your Terraform config, declare the corresponding variables:

```hcl
# variables.tf
variable "db_password" {
  type      = string
  sensitive = true  # Prevents showing in plan output
}

variable "api_key" {
  type      = string
  sensitive = true
}

variable "ssl_certificate" {
  type      = string
  sensitive = true
}
```

### GitLab CI Variables

```yaml
# .gitlab-ci.yml
# Configure these in Settings > CI/CD > Variables with "Masked" and "Protected" flags

variables:
  TF_VAR_db_password: $DB_PASSWORD    # Set in GitLab CI/CD settings
  TF_VAR_api_key: $API_KEY

apply:
  stage: apply
  script:
    - terraform init -no-color
    - terraform apply -no-color -auto-approve
```

## Integrating with HashiCorp Vault

For teams managing many secrets, a dedicated secrets manager is better than CI/CD platform variables. Vault is the most common choice for Terraform workflows.

### Vault Provider in Terraform

```hcl
# vault.tf - Read secrets directly from Vault
provider "vault" {
  address = "https://vault.mycompany.com"
  # Authentication handled via VAULT_TOKEN or VAULT_ROLE_ID/VAULT_SECRET_ID
}

# Read database credentials from Vault
data "vault_generic_secret" "database" {
  path = "secret/production/database"
}

# Use the secret in a resource
resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  username = data.vault_generic_secret.database.data["username"]
  password = data.vault_generic_secret.database.data["password"]
}
```

### Vault Authentication in CI/CD

```yaml
# GitHub Actions with Vault
- name: Import Secrets from Vault
  uses: hashicorp/vault-action@v3
  with:
    url: https://vault.mycompany.com
    method: jwt
    role: terraform-cicd
    jwtGithubAudience: https://github.com/myorg
    secrets: |
      secret/data/production/database username | DB_USERNAME ;
      secret/data/production/database password | DB_PASSWORD ;
      secret/data/production/api api_key | API_KEY

- name: Terraform Apply
  run: terraform apply -no-color -auto-approve
  env:
    TF_VAR_db_username: ${{ env.DB_USERNAME }}
    TF_VAR_db_password: ${{ env.DB_PASSWORD }}
    TF_VAR_api_key: ${{ env.API_KEY }}
```

## AWS Secrets Manager Integration

If you are on AWS, Secrets Manager integrates naturally with Terraform:

```hcl
# secrets.tf - Read secrets from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "production/database-credentials"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.r6g.large"

  username = local.db_creds["username"]
  password = local.db_creds["password"]
}
```

The benefit of this approach is that the CI/CD pipeline only needs IAM permissions to read from Secrets Manager, not knowledge of the actual secret values.

## Using SOPS for Encrypted Variable Files

Mozilla SOPS lets you encrypt variable files and commit them to Git:

```bash
# Encrypt a tfvars file with SOPS using AWS KMS
sops --encrypt --kms arn:aws:kms:us-east-1:123456789012:key/abc123 \
  production.tfvars > production.tfvars.enc

# The encrypted file is safe to commit
git add production.tfvars.enc
```

In your pipeline, decrypt before applying:

```yaml
# GitHub Actions with SOPS
- name: Install SOPS
  run: |
    wget -q https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
    chmod +x sops-v3.8.1.linux.amd64
    sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops

- name: Decrypt variables
  run: |
    sops --decrypt production.tfvars.enc > production.tfvars

- name: Terraform Apply
  run: terraform apply -no-color -auto-approve -var-file=production.tfvars

- name: Cleanup
  if: always()
  run: rm -f production.tfvars  # Remove decrypted file
```

## Preventing Secret Leaks in Logs

Terraform tries to mask sensitive values in output, but there are gaps. Add extra protection:

```yaml
# GitHub Actions - Mask all TF_VAR_ values in logs
- name: Mask sensitive variables
  run: |
    # Register each secret as a masked value
    echo "::add-mask::$TF_VAR_db_password"
    echo "::add-mask::$TF_VAR_api_key"

- name: Terraform Plan
  run: |
    # Redirect stderr to prevent accidental secret leaks
    terraform plan -no-color -out=tfplan 2>&1 | \
      sed 's/password = .*/password = [REDACTED]/' | \
      sed 's/api_key = .*/api_key = [REDACTED]/'
```

## Encrypting State Files

Since secrets end up in the state file, encrypt it at rest:

```hcl
# backend.tf - S3 backend with encryption
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true  # Enable server-side encryption
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abc123"
    dynamodb_table = "terraform-locks"
  }
}
```

Also restrict access to the state bucket:

```hcl
# Bucket policy restricting state access
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "RestrictStateAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/terraform-cicd",
            "arn:aws:iam::123456789012:role/terraform-admin"
          ]
        }
        Action = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      }
    ]
  })
}
```

## Dynamic Secrets with Vault

The gold standard is using dynamic secrets that are generated on demand and automatically expire:

```hcl
# dynamic-secrets.tf - Vault generates temporary database credentials
data "vault_database_credentials" "app_db" {
  backend = "database"
  role    = "app-readonly"
}

resource "aws_lambda_function" "app" {
  function_name = "my-app"
  # ...

  environment {
    variables = {
      DB_HOST     = aws_db_instance.main.endpoint
      DB_USERNAME = data.vault_database_credentials.app_db.username
      DB_PASSWORD = data.vault_database_credentials.app_db.password
    }
  }
}
```

Dynamic secrets are created fresh each time Terraform runs and expire after a TTL. Even if the state file is compromised, the credentials are already invalid.

## Secret Rotation Strategy

For secrets that cannot be dynamic, implement rotation:

```yaml
# .github/workflows/rotate-secrets.yml
name: Rotate Secrets

on:
  schedule:
    - cron: "0 0 1 * *"  # Monthly

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate new database password
        id: newpass
        run: |
          NEW_PASS=$(openssl rand -base64 32)
          echo "::add-mask::$NEW_PASS"
          echo "password=$NEW_PASS" >> $GITHUB_OUTPUT

      - name: Update in Secrets Manager
        run: |
          aws secretsmanager update-secret \
            --secret-id production/database-credentials \
            --secret-string '{"username":"app","password":"${{ steps.newpass.outputs.password }}"}'

      - name: Terraform Apply with new credentials
        run: |
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

## Summary

The best approach to Terraform secrets in CI/CD depends on your team's size and compliance requirements. Small teams can start with CI/CD platform secrets and `TF_VAR_` environment variables. As you grow, move to a dedicated secrets manager like Vault or AWS Secrets Manager with dynamic secrets. Regardless of the approach, always encrypt your state files and restrict access to them.

For more on CI/CD security, see our guide on [using OIDC for cloud authentication in Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-cloud-authentication-in-terraform-cicd/view).
