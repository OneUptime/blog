# How to Pass Variables via Command Line with -var Flag in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, CLI, Infrastructure as Code, DevOps

Description: Learn how to pass variable values directly on the command line using the Terraform -var flag, including syntax for different types and practical use cases.

---

The `-var` flag is the most direct way to pass values to Terraform variables. You type it right on the command line when running `terraform plan`, `terraform apply`, or `terraform destroy`. It is quick, explicit, and useful for one-off overrides, scripting, and CI/CD pipelines. But it also has some gotchas you need to understand.

This post covers everything you need to know about the `-var` flag - from basic syntax to handling complex types and understanding when to use it versus other methods.

## Basic Syntax

The `-var` flag takes a key-value pair in the format `"variable_name=value"`:

```bash
# Pass a single string variable
terraform plan -var="environment=production"

# Pass a number variable
terraform apply -var="instance_count=3"

# Pass a boolean variable
terraform apply -var="enable_monitoring=true"
```

You can pass multiple variables by repeating the flag:

```bash
# Multiple -var flags
terraform apply \
  -var="environment=production" \
  -var="instance_count=3" \
  -var="enable_monitoring=true" \
  -var="region=us-west-2"
```

## Variable Declarations

The variables you pass on the command line must be declared in your configuration. Terraform will reject any variable that is not defined.

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}

variable "enable_monitoring" {
  description = "Enable CloudWatch detailed monitoring"
  type        = bool
  default     = false
}

variable "region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}
```

## Passing Different Types

### Strings

Strings are the simplest case. The value after the equals sign is treated as a string by default.

```bash
# Simple string
terraform apply -var="project_name=my-web-app"

# Strings with spaces need proper quoting
terraform apply -var='description=My Web Application'

# Strings with special characters
terraform apply -var='tag_value=team:platform/environment:prod'
```

### Numbers

Numbers are passed as-is. Terraform handles the type conversion.

```bash
terraform apply -var="instance_count=5" -var="disk_size=100"
```

### Booleans

Use `true` or `false` (lowercase).

```bash
terraform apply -var="enable_https=true" -var="create_bastion=false"
```

### Lists

Lists require HCL syntax within the value string. The exact quoting depends on your shell.

```bash
# List of strings (bash)
terraform apply -var='availability_zones=["us-east-1a", "us-east-1b", "us-east-1c"]'

# List of numbers
terraform apply -var='ports=[80, 443, 8080]'
```

The corresponding variable declarations:

```hcl
variable "availability_zones" {
  description = "List of AZs for the deployment"
  type        = list(string)
}

variable "ports" {
  description = "Ports to open in the security group"
  type        = list(number)
}
```

### Maps

Maps follow HCL syntax as well.

```bash
# Map of strings
terraform apply -var='tags={Name="my-instance", Environment="prod", Team="platform"}'

# Map with nested quoting - be careful with your shell
terraform apply -var='instance_types={dev="t3.micro", staging="t3.small", prod="t3.large"}'
```

```hcl
variable "tags" {
  description = "Resource tags"
  type        = map(string)
}

variable "instance_types" {
  description = "Instance type per environment"
  type        = map(string)
}
```

### Objects

Complex objects can be passed but the syntax gets unwieldy quickly. For complex types, a variable file is usually a better choice.

```bash
# Object variable
terraform apply -var='database_config={engine="postgres", version="15", instance_class="db.t3.medium", storage=50}'
```

```hcl
variable "database_config" {
  description = "Database configuration"
  type = object({
    engine         = string
    version        = string
    instance_class = string
    storage        = number
  })
}
```

## Shell Quoting Tips

Different shells handle quoting differently, and this is the most common source of frustration with `-var`.

### Bash and Zsh

```bash
# Single quotes are safest for complex values
terraform apply -var='tags={Name="app", Env="prod"}'

# Double quotes work but require escaping inner quotes
terraform apply -var="tags={Name=\"app\", Env=\"prod\"}"

# For multi-word strings, nest the quotes
terraform apply -var='project_name=my web app'
```

### PowerShell

```powershell
# PowerShell uses different escaping rules
terraform apply -var="environment=production"

# For complex types, use single quotes outside and double inside
terraform apply -var='availability_zones=["us-east-1a", "us-east-1b"]'
```

### Windows Command Prompt

```cmd
# cmd.exe uses double quotes differently
terraform apply -var "environment=production"

# Escape inner quotes with backslash
terraform apply -var "tags={Name=\"app\"}"
```

## Using -var with Different Commands

The `-var` flag works with all the major Terraform commands:

```bash
# With plan
terraform plan -var="environment=staging"

# With apply
terraform apply -var="environment=staging"

# With destroy
terraform destroy -var="environment=staging"

# With import
terraform import -var="environment=staging" aws_instance.app i-1234567890abcdef0

# With console (useful for debugging)
terraform console -var="environment=staging"
```

## Combining -var with -var-file

You can use both `-var` and `-var-file` in the same command. The `-var` flag takes precedence over values in the file.

```bash
# Load base values from file, override one specific variable
terraform apply -var-file="production.tfvars" -var="instance_count=1"
```

This is a common pattern for testing: load the production configuration but scale down the resources.

```hcl
# production.tfvars
environment      = "production"
instance_count   = 10
instance_type    = "t3.large"
enable_monitoring = true
```

```bash
# Use production config but with fewer instances for testing
terraform plan -var-file="production.tfvars" -var="instance_count=2"
```

## Practical Examples

### CI/CD Pipeline

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

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: |
          terraform apply -auto-approve \
            -var="environment=production" \
            -var="image_tag=${{ github.sha }}" \
            -var="deploy_timestamp=$(date -u +%Y%m%d%H%M%S)"
```

### Script-Based Deployment

```bash
#!/bin/bash
# deploy.sh - Deploy to a specific environment

ENVIRONMENT=$1
INSTANCE_COUNT=${2:-2}

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: ./deploy.sh <environment> [instance_count]"
  exit 1
fi

terraform apply \
  -var="environment=${ENVIRONMENT}" \
  -var="instance_count=${INSTANCE_COUNT}" \
  -var="deployed_by=$(whoami)" \
  -var="deploy_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -auto-approve
```

### Quick Overrides During Development

```bash
# Test with a single small instance instead of the default
terraform plan \
  -var="instance_type=t3.nano" \
  -var="instance_count=1" \
  -var="enable_monitoring=false"
```

## Security Considerations

There is an important security concern with `-var`: command line arguments are visible in process listings and may be logged by your shell.

```bash
# This exposes the password in shell history and `ps` output
terraform apply -var="db_password=super-secret-123"  # Avoid this!

# Better: use environment variables for secrets
export TF_VAR_db_password="super-secret-123"
terraform apply
```

In CI/CD systems, command lines often get logged. If you need to pass secrets, use environment variables (`TF_VAR_*` prefix) or encrypted variable files instead.

## Common Mistakes

### Forgetting Quotes Around Complex Values

```bash
# Wrong - the shell splits this at the space
terraform apply -var=tags={Name=app, Env=prod}

# Correct
terraform apply -var='tags={Name="app", Env="prod"}'
```

### Wrong Boolean Syntax

```bash
# Wrong - Terraform expects lowercase
terraform apply -var="enable_https=True"
terraform apply -var="enable_https=YES"

# Correct
terraform apply -var="enable_https=true"
```

### Passing Undefined Variables

```bash
# If "foo" is not declared in your configuration, this fails
terraform apply -var="foo=bar"
# Error: Value for undeclared variable
```

## When to Use -var vs Other Methods

| Method | Best For |
|--------|----------|
| `-var` flag | Quick overrides, CI/CD with simple values, scripting |
| `terraform.tfvars` | Standard variable values for a workspace |
| `.auto.tfvars` | Values that should always load automatically |
| `-var-file` | Environment-specific configurations |
| `TF_VAR_*` env vars | Secrets, CI/CD pipelines |

## Wrapping Up

The `-var` flag is straightforward for passing simple values to Terraform, and it is the highest-priority method after environment variables in Terraform's precedence order. Use it for quick overrides, CI/CD parameters, and scripted deployments. For complex types, secrets, or large numbers of variables, consider using variable files or environment variables instead.

For a deeper look at all the ways to set variable values, see our post on [variable precedence in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-variable-precedence-in-terraform/view).
