# How to Display Sensitive Output Variables in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure as Code, DevOps, Security, Secrets Management

Description: Learn how to display sensitive output variables in Terraform when needed for debugging or initial setup. This guide covers safe practices, the -json flag, terraform console, and alternatives for handling sensitive data.

Terraform marks certain outputs as sensitive to protect secrets like passwords, API keys, and certificates from being displayed in logs or console output. However, there are legitimate scenarios where you need to access these values. Let's explore how to do this safely and understand the security implications.

## Understanding Sensitive Outputs

When you mark an output as sensitive, Terraform redacts its value in the CLI output.

```hcl
# outputs.tf
output "database_password" {
  value       = random_password.db_password.result
  description = "Generated database password"
  sensitive   = true
}

output "api_key" {
  value       = aws_api_gateway_api_key.main.value
  description = "API Gateway key"
  sensitive   = true
}

output "tls_private_key" {
  value       = tls_private_key.main.private_key_pem
  description = "Generated TLS private key"
  sensitive   = true
}
```

```bash
# Normal terraform output shows:
$ terraform output
api_key = <sensitive>
database_password = <sensitive>
tls_private_key = <sensitive>
```

## Method 1: Using -json Flag

The `-json` flag outputs all values, including sensitive ones, in JSON format.

```bash
# Get all outputs as JSON
terraform output -json

# Get specific sensitive output
terraform output -json database_password

# Parse with jq
terraform output -json database_password | jq -r '.'

# Use in scripts
DB_PASSWORD=$(terraform output -json database_password | jq -r '.')
```

### Example Output

```json
{
  "database_password": {
    "sensitive": true,
    "type": "string",
    "value": "MySecureP@ssw0rd123!"
  },
  "api_key": {
    "sensitive": true,
    "type": "string",
    "value": "abc123xyz789"
  }
}
```

## Method 2: Using -raw Flag

For string outputs, `-raw` returns the value without JSON formatting.

```bash
# Get raw string value
terraform output -raw database_password

# Useful for piping to other commands
terraform output -raw tls_private_key > private.key

# Set as environment variable
export DB_PASSWORD=$(terraform output -raw database_password)
```

## Method 3: Using terraform console

The Terraform console allows you to query any value, including sensitive ones.

```bash
# Interactive console
terraform console

# Inside console:
> random_password.db_password.result
"MySecureP@ssw0rd123!"

> aws_api_gateway_api_key.main.value
"abc123xyz789"

# Exit with Ctrl+D or exit
```

```bash
# Non-interactive query
echo "random_password.db_password.result" | terraform console

# Use in scripts
DB_PASS=$(echo "random_password.db_password.result" | terraform console)
```

## Method 4: Using nonsensitive() Function

You can temporarily mark a value as non-sensitive in outputs for debugging.

```hcl
# WARNING: Only use for debugging, remove before committing!
output "debug_database_password" {
  value       = nonsensitive(random_password.db_password.result)
  description = "DEBUG: Database password (remove before production)"
}

# Safer approach: Conditional debugging
variable "debug_mode" {
  type        = bool
  default     = false
  description = "Enable debug outputs"
}

output "database_password_debug" {
  value       = var.debug_mode ? nonsensitive(random_password.db_password.result) : "debug_mode disabled"
  description = "Database password for debugging"
}
```

## Secure Patterns for Sensitive Data

### Pattern 1: Write to Secure Location

```hcl
# Write sensitive values to AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "app/database/credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.main.endpoint
    database = aws_db_instance.main.db_name
  })
}

# Output the secret ARN instead of the value
output "db_credentials_secret_arn" {
  value       = aws_secretsmanager_secret.db_credentials.arn
  description = "ARN of the secret containing database credentials"
}
```

### Pattern 2: Write to Encrypted File

```hcl
# Write sensitive data to encrypted local file
resource "local_sensitive_file" "credentials" {
  filename = "${path.module}/.secrets/credentials.json"
  content = jsonencode({
    database_password = random_password.db_password.result
    api_key           = aws_api_gateway_api_key.main.value
  })
  file_permission = "0600"
}

output "credentials_file" {
  value       = local_sensitive_file.credentials.filename
  description = "Path to credentials file"
}
```

### Pattern 3: Use SSM Parameter Store

```hcl
resource "aws_ssm_parameter" "db_password" {
  name        = "/app/database/password"
  description = "Database password"
  type        = "SecureString"
  value       = random_password.db_password.result

  tags = {
    Environment = var.environment
  }
}

output "db_password_parameter" {
  value       = aws_ssm_parameter.db_password.name
  description = "SSM parameter name for database password"
}
```

## Script for Safe Credential Retrieval

```bash
#!/bin/bash
# scripts/get-credentials.sh

set -e

OUTPUT_NAME=$1
OUTPUT_FILE=${2:-"/dev/stdout"}

if [ -z "$OUTPUT_NAME" ]; then
    echo "Usage: $0 <output_name> [output_file]"
    echo "Available sensitive outputs:"
    terraform output -json | jq -r 'to_entries | .[] | select(.value.sensitive == true) | .key'
    exit 1
fi

# Check if output exists
if ! terraform output -json | jq -e ".[\"$OUTPUT_NAME\"]" > /dev/null 2>&1; then
    echo "Error: Output '$OUTPUT_NAME' not found"
    exit 1
fi

# Check if output is sensitive
IS_SENSITIVE=$(terraform output -json | jq -r ".[\"$OUTPUT_NAME\"].sensitive")

if [ "$IS_SENSITIVE" != "true" ]; then
    echo "Warning: Output '$OUTPUT_NAME' is not marked as sensitive"
fi

# Get the value
VALUE=$(terraform output -json "$OUTPUT_NAME" | jq -r '.')

if [ "$OUTPUT_FILE" = "/dev/stdout" ]; then
    echo "$VALUE"
else
    echo "$VALUE" > "$OUTPUT_FILE"
    chmod 600 "$OUTPUT_FILE"
    echo "Value written to $OUTPUT_FILE"
fi
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve

      # Store sensitive outputs in GitHub secrets or other secure storage
      - name: Store Credentials
        run: |
          # Get sensitive outputs
          DB_PASSWORD=$(terraform output -raw database_password)
          API_KEY=$(terraform output -raw api_key)

          # Store in AWS Secrets Manager (example)
          aws secretsmanager update-secret \
            --secret-id app/credentials \
            --secret-string "{\"db_password\": \"$DB_PASSWORD\", \"api_key\": \"$API_KEY\"}"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Mask sensitive values in logs
      - name: Configure Application
        run: |
          DB_PASSWORD=$(terraform output -raw database_password)
          echo "::add-mask::$DB_PASSWORD"
          # Now use $DB_PASSWORD safely - it will be masked in logs
```

## Handling Complex Sensitive Outputs

```hcl
# Complex sensitive output
output "kubernetes_config" {
  value = {
    host                   = aws_eks_cluster.main.endpoint
    cluster_ca_certificate = aws_eks_cluster.main.certificate_authority[0].data
    token                  = data.aws_eks_cluster_auth.main.token
  }
  sensitive   = true
  description = "Kubernetes cluster configuration"
}
```

```bash
# Access nested values
terraform output -json kubernetes_config | jq -r '.host'
terraform output -json kubernetes_config | jq -r '.cluster_ca_certificate' | base64 -d > ca.crt
terraform output -json kubernetes_config | jq -r '.token'
```

## Security Best Practices

1. **Avoid displaying in CI/CD logs** - Use masking and secure storage
2. **Never commit sensitive outputs** - Add debug outputs to .gitignore
3. **Use secret managers** - Store sensitive values in AWS Secrets Manager, HashiCorp Vault, etc.
4. **Limit access** - Restrict who can run terraform output commands
5. **Audit access** - Log when sensitive outputs are accessed
6. **Rotate secrets** - Plan for secret rotation from the start
7. **Use short-lived credentials** - Prefer temporary tokens over static secrets
8. **Clean up** - Remove debug outputs and nonsensitive() calls before merging

## Summary

| Method | Use Case | Security Level |
|--------|----------|----------------|
| `terraform output -json` | Scripts, automation | Medium |
| `terraform output -raw` | Single values, piping | Medium |
| `terraform console` | Interactive debugging | Low |
| `nonsensitive()` | Temporary debugging | Low (remove before commit) |
| Secret Manager | Production workflows | High |

By understanding these methods and following security best practices, you can safely access sensitive Terraform outputs when needed while maintaining the security of your infrastructure secrets.
