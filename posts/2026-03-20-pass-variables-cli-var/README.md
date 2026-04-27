# How to Pass Variables via the CLI with -var in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, CLI, Infrastructure as Code, DevOps

Description: A guide to passing OpenTofu variable values directly on the command line using the -var flag.

## Introduction

The `-var` flag allows you to pass variable values directly to `tofu plan`, `tofu apply`, and other commands from the command line. This is useful for one-off overrides, CI/CD pipelines, and testing different values without modifying files.

## Basic -var Usage

```bash
# Pass a single string variable

tofu plan -var="environment=production"

# Pass a number variable
tofu plan -var="instance_count=5"

# Pass a boolean variable
tofu plan -var="enable_monitoring=true"

# Multiple -var flags
tofu apply \
  -var="environment=staging" \
  -var="instance_count=3" \
  -var="instance_type=t3.small"
```

## Passing Complex Variable Types

### Lists

```bash
# Pass a list variable (JSON syntax)
tofu plan -var='availability_zones=["us-east-1a","us-east-1b"]'

# Alternative with env variable to avoid shell escaping issues
export TF_VAR_availability_zones='["us-east-1a","us-east-1b"]'
tofu plan
```

### Maps

```bash
# Pass a map variable
tofu plan -var='tags={"Environment":"prod","Team":"platform"}'

# Complex map with proper quoting
tofu plan -var='instance_tags={"Name":"web-server","Environment":"production"}'
```

### Objects

```bash
# Pass an object variable
tofu apply -var='server_config={"instance_type":"t3.small","disk_size":40,"monitoring":true}'
```

## Variable Declaration in Configuration

```hcl
# variables.tf - Declarations for the variables being set via CLI

variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}
```

## Using -var in Scripts

```bash
#!/bin/bash
# deploy.sh - Deploy with environment-specific settings

ENVIRONMENT="${1:-dev}"
INSTANCE_COUNT="${2:-1}"

case "$ENVIRONMENT" in
  prod)
    INSTANCE_TYPE="t3.large"
    ;;
  staging)
    INSTANCE_TYPE="t3.small"
    ;;
  *)
    INSTANCE_TYPE="t3.micro"
    ;;
esac

tofu apply \
  -var="environment=$ENVIRONMENT" \
  -var="instance_count=$INSTANCE_COUNT" \
  -var="instance_type=$INSTANCE_TYPE" \
  -auto-approve

echo "Deployed to $ENVIRONMENT with $INSTANCE_COUNT x $INSTANCE_TYPE"
```

## Variable Precedence with -var

The `-var` flag has the highest precedence along with `-var-file`, overriding values from environment variables, `.tfvars` files, and defaults:

```bash
# Precedence (lowest to highest):
# 1. Default values in variable blocks
# 2. TF_VAR_ environment variables
# 3. terraform.tfvars and terraform.tfvars.json
# 4. *.auto.tfvars and *.auto.tfvars.json (lexical order)
# 5. -var and -var-file flags (in the order they appear on the command line)

# This -var overrides any .tfvars file value
tofu apply -var-file="prod.tfvars" -var="instance_count=10"
# instance_count from prod.tfvars will be overridden by the -var flag
# because -var comes after -var-file on the command line
```

## Security Considerations

```bash
# AVOID: Don't pass secrets on the command line (visible in process list)
tofu apply -var="database_password=mysecret123"  # Bad! Visible in ps output

# BETTER: Use environment variables for sensitive values
export TF_VAR_database_password="mysecret123"
tofu apply

# BEST: Use a secrets manager
tofu apply -var="database_password=$(aws secretsmanager get-secret-value \
  --secret-id prod/db/password \
  --query SecretString \
  --output text)"
```

## Conclusion

The `-var` flag is the most direct way to pass values to OpenTofu configurations for one-off operations, testing, and scripted deployments. For sensitive values, use environment variables (`TF_VAR_`) instead of `-var` to avoid exposing secrets in command history and process listings. For multiple variables or environment-specific settings, `-var-file` is more maintainable than multiple `-var` flags.
