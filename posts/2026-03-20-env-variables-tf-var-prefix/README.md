# How to Set Variables Using Environment Variables with TF_VAR_ Prefix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Environment Variable, TF_VAR, Infrastructure as Code, DevOps

Description: A guide to using TF_VAR_ prefixed environment variables to set OpenTofu variable values securely.

## Introduction

OpenTofu can read variable values from environment variables prefixed with `TF_VAR_`. This is particularly useful for passing sensitive values like passwords and API keys without storing them in files, making it ideal for CI/CD pipelines and secure deployments.

## Basic TF_VAR_ Usage

```bash
# Set variable via environment variable

export TF_VAR_environment="production"
export TF_VAR_instance_count=5
export TF_VAR_enable_monitoring=true

# These are read automatically by tofu commands
tofu plan   # No -var flags needed!
tofu apply -auto-approve
```

## Variable Declaration

```hcl
# variables.tf - These variables can be set via TF_VAR_
variable "environment" {
  type = string
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "database_password" {
  type      = string
  sensitive = true  # Redacted in plan/apply output, but still stored in state
}
```

```bash
# Set all via environment variables
export TF_VAR_environment="prod"
export TF_VAR_instance_count=3
export TF_VAR_database_password="$(vault read -field=value secret/db/password)"

# Run OpenTofu - variables are read from environment
tofu apply -auto-approve
```

## Complex Types via TF_VAR_

For complex values, declare the variable with a matching type constraint so OpenTofu parses the environment variable as a complex value instead of a plain string.

```hcl
variable "availability_zones" {
  type = list(string)
}

variable "tags" {
  type = map(string)
}

variable "server_config" {
  type = object({
    instance_type = string
    count         = number
    monitoring    = bool
  })
}
```

```bash
# List variable
export TF_VAR_availability_zones='["us-east-1a", "us-east-1b", "us-east-1c"]'

# Map variable
export TF_VAR_tags='{ Environment = "prod", Team = "platform" }'

# Object variable
export TF_VAR_server_config='{ instance_type = "t3.large", count = 4, monitoring = true }'

# Apply - reads complex types from env vars
tofu plan
```

## CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.9.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy
        run: |
          tofu init
          tofu apply -auto-approve
        env:
          TF_VAR_environment: "production"
          TF_VAR_instance_count: "4"
          TF_VAR_database_password: ${{ secrets.DB_PASSWORD }}
          TF_VAR_api_key: ${{ secrets.API_KEY }}
```

## Security Best Practices

```bash
# GOOD: Use environment variables for secrets
export TF_VAR_database_password="$(aws secretsmanager get-secret-value \
  --secret-id prod/db/password \
  --query SecretString \
  --output text)"
tofu apply

# AVOID: Don't put secrets in -var flags (visible in process list and history)
# tofu apply -var="database_password=mysecret"  # BAD

# AVOID: Don't commit secrets in .tfvars files
# database_password = "mysecret"  # BAD - in tfvars committed to git
```

## Variable Precedence

```bash
# If no value is set from any source, the variable's default is used.
# Variable loading order (later sources take precedence over earlier ones):
# 1. TF_VAR_ environment variables
# 2. terraform.tfvars
# 3. terraform.tfvars.json
# 4. *.auto.tfvars / *.auto.tfvars.json (lexical order)
# 5. -var and -var-file options, in the order provided on the command line

# -var still takes precedence over TF_VAR_
export TF_VAR_instance_count=10
tofu apply -var="instance_count=5"
# Result: instance_count=5 (-var flag takes precedence over TF_VAR_)
```

## Checking Set Variables

```bash
# List all TF_VAR_ environment variables
env | grep TF_VAR_

# Verify OpenTofu picks up the variables
tofu console
> var.environment    # Should show your TF_VAR_environment value
> var.instance_count # Should show your TF_VAR_instance_count value
```

## Unsetting Variables

```bash
# Unset a TF_VAR_ environment variable
unset TF_VAR_environment
unset TF_VAR_database_password

# Verify it's unset
env | grep TF_VAR_
```

## Conclusion

`TF_VAR_` environment variables are the recommended way to pass sensitive values to OpenTofu in CI/CD pipelines. They integrate naturally with secret management systems, CI/CD platforms, and shell scripting, without requiring sensitive values to be stored in files. Combined with a secrets manager like HashiCorp Vault, AWS Secrets Manager, or GitHub Secrets, this pattern provides secure, auditable secret management for infrastructure automation.
