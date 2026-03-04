# How to Pass Variables via Environment Variables (TF_VAR_) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Environment Variables, CI/CD, Security

Description: Learn how to use TF_VAR_ prefixed environment variables to pass values to Terraform, including best practices for secrets, CI/CD integration, and type handling.

---

Terraform can read variable values directly from environment variables. Any environment variable that starts with `TF_VAR_` followed by the variable name is automatically picked up by Terraform. This is one of the most practical methods for passing secrets and for integrating Terraform into CI/CD pipelines where you want to avoid putting sensitive values in files.

This post covers how the `TF_VAR_` convention works, how to handle different types, and the real-world patterns that make this approach shine.

## How TF_VAR_ Works

The convention is simple: take your Terraform variable name, prefix it with `TF_VAR_`, and export it as an environment variable.

```bash
# If your variable is named "environment"
export TF_VAR_environment="production"

# If your variable is named "instance_count"
export TF_VAR_instance_count=3

# If your variable is named "enable_monitoring"
export TF_VAR_enable_monitoring=true

# Now run Terraform - it reads TF_VAR_* automatically
terraform plan
```

The matching variable declarations:

```hcl
# variables.tf

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = false
}
```

When Terraform starts, it scans all environment variables, finds those beginning with `TF_VAR_`, strips the prefix, and matches the remainder against declared variable names. The match is case-sensitive: `TF_VAR_environment` maps to `variable "environment"`, not `variable "Environment"`.

## Passing Different Types

Environment variables are always strings at the OS level, but Terraform converts them to the appropriate type based on your variable declaration.

### Strings

```bash
export TF_VAR_region="us-west-2"
export TF_VAR_project_name="web-store"
```

### Numbers

```bash
# Terraform converts the string "5" to the number 5
export TF_VAR_instance_count=5
export TF_VAR_disk_size_gb=100
```

### Booleans

```bash
# Use lowercase true/false
export TF_VAR_enable_https=true
export TF_VAR_create_bastion=false
```

### Lists

For complex types, you pass HCL-formatted values:

```bash
# List of strings
export TF_VAR_availability_zones='["us-east-1a", "us-east-1b", "us-east-1c"]'

# List of numbers
export TF_VAR_allowed_ports='[80, 443, 8080]'
```

### Maps

```bash
# Map of strings
export TF_VAR_tags='{"Environment":"production","Team":"platform","Project":"web-store"}'

# Map of instance types
export TF_VAR_instance_types='{"dev":"t3.micro","staging":"t3.small","prod":"t3.large"}'
```

### Objects

```bash
# Object with mixed types
export TF_VAR_database_config='{"engine":"postgres","version":"15.4","instance_class":"db.r6g.large","storage":100,"multi_az":true}'
```

Note that for complex types in environment variables, you can use either HCL or JSON syntax. JSON tends to be easier since most tools can generate it.

## The Primary Use Case: Secrets

The biggest advantage of environment variables for Terraform is keeping secrets out of files. Files can be accidentally committed, logged, or shared. Environment variables stay in memory.

```bash
# Set secrets as environment variables
export TF_VAR_db_password="$(aws secretsmanager get-secret-value \
  --secret-id myapp/db-password \
  --query SecretString \
  --output text)"

export TF_VAR_api_key="$(vault kv get -field=key secret/myapp/api)"

# Run Terraform - secrets never touch disk
terraform apply
```

```hcl
# variables.tf

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "External API key"
  type        = string
  sensitive   = true
}
```

By combining `TF_VAR_` with the `sensitive = true` flag, the value is not written to any file and is not displayed in the terminal output.

## CI/CD Integration

Environment variables are the natural way to pass values in CI/CD pipelines, since all major platforms have built-in secret management.

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      # Non-sensitive values
      TF_VAR_environment: production
      TF_VAR_region: us-east-1
      TF_VAR_instance_count: "3"
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
        env:
          # Sensitive values from GitHub Secrets
          TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
          TF_VAR_api_key: ${{ secrets.API_KEY }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
variables:
  TF_VAR_environment: production
  TF_VAR_region: us-east-1

deploy:
  stage: deploy
  script:
    - terraform init
    - terraform apply -auto-approve
  variables:
    # From GitLab CI/CD Variables (masked)
    TF_VAR_db_password: $DB_PASSWORD
    TF_VAR_api_key: $API_KEY
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        TF_VAR_environment = 'production'
        TF_VAR_region      = 'us-east-1'
    }

    stages {
        stage('Deploy') {
            steps {
                withCredentials([
                    string(credentialsId: 'db-password', variable: 'TF_VAR_db_password'),
                    string(credentialsId: 'api-key', variable: 'TF_VAR_api_key')
                ]) {
                    sh 'terraform init'
                    sh 'terraform apply -auto-approve'
                }
            }
        }
    }
}
```

## Using a .env File (Not Auto-Loaded)

Unlike `.auto.tfvars` files, Terraform does not read `.env` files. But you can source them in your shell:

```bash
# .env.terraform (not committed to git)
export TF_VAR_db_password="my-secret-password"
export TF_VAR_api_key="sk-1234567890"
export TF_VAR_tls_cert_body="-----BEGIN CERTIFICATE-----..."
```

```bash
# Source the file, then run Terraform
source .env.terraform
terraform apply
```

```gitignore
# .gitignore
.env.terraform
.env.*
```

## Using direnv for Automatic Loading

The `direnv` tool automatically loads environment variables when you enter a directory. This pairs well with `TF_VAR_`:

```bash
# .envrc (auto-loaded by direnv)
export TF_VAR_environment="dev"
export TF_VAR_region="us-east-1"
export TF_VAR_project="web-store"

# Load secrets from a password manager or vault
export TF_VAR_db_password="$(op item get 'DB Password' --field password)"
```

```bash
# Allow the .envrc file
direnv allow

# Now just cd into the directory and run terraform
cd my-terraform-project
terraform plan
# All TF_VAR_* are set automatically
```

## Precedence

Environment variables have specific precedence in Terraform's variable value resolution. According to the Terraform documentation, the precedence from lowest to highest is:

1. Default values in variable declarations
2. `terraform.tfvars`
3. `terraform.tfvars.json`
4. `*.auto.tfvars` (alphabetical)
5. `-var-file` flags (in order specified)
6. `-var` flags (in order specified)
7. `TF_VAR_` environment variables

Wait - this is actually a point of confusion. Terraform's official documentation has varied on this, but in practice, **environment variables have the lowest precedence after defaults**. The `-var` flag and `-var-file` override environment variables.

Let me correct that. The actual precedence from lowest to highest is:

1. Default values
2. Environment variables (`TF_VAR_*`)
3. `terraform.tfvars`
4. `terraform.tfvars.json`
5. `*.auto.tfvars` (alphabetical)
6. `-var-file` flags (in order)
7. `-var` flags (in order)

So environment variables override defaults but are overridden by tfvars files and command-line flags. This means you can set baseline values with `TF_VAR_` and still override them with a tfvars file when needed.

## Debugging TF_VAR_ Issues

If your environment variable is not being picked up, here are common issues to check:

```bash
# Verify the variable is set
env | grep TF_VAR_

# Check for case sensitivity issues
# TF_VAR_Environment is NOT the same as TF_VAR_environment
env | grep -i tf_var_

# Make sure there are no extra spaces
export TF_VAR_region="us-east-1"    # Correct
export TF_VAR_region = "us-east-1"  # Wrong - spaces around =

# Use terraform console to check variable values
terraform console
> var.region
"us-east-1"
```

## Unsetting Variables

To remove a `TF_VAR_` value:

```bash
# Unset a specific variable
unset TF_VAR_db_password

# Verify it is gone
env | grep TF_VAR_db_password
```

This is important in scripts where you want to make sure a secret does not persist in the shell after Terraform runs.

## Best Practices

1. **Use TF_VAR_ for secrets.** It is the safest way to pass sensitive values since they never touch disk.

2. **Combine with sensitive = true.** Mark the variable as sensitive in your declaration so the value does not appear in output either.

3. **Unset after use in scripts.** If you set secrets in a script, unset them afterward to minimize exposure.

4. **Use your CI/CD platform's secret store.** Do not hardcode `TF_VAR_` values in pipeline definitions. Use the platform's secret management features.

5. **Document required environment variables.** Since they are invisible in the codebase, document which `TF_VAR_` values your configuration expects.

```hcl
# variables.tf

# Required environment variables:
# TF_VAR_db_password - Database master password
# TF_VAR_api_key     - External API key

variable "db_password" {
  description = "Database password. Set via TF_VAR_db_password environment variable."
  type        = string
  sensitive   = true
}
```

## Wrapping Up

The `TF_VAR_` prefix is Terraform's bridge between the operating system's environment and your infrastructure configuration. It is the preferred method for passing secrets since values stay in memory rather than in files. It integrates naturally with CI/CD pipelines and secret management tools. Just remember that environment variables sit low in the precedence chain, so tfvars files and command-line flags will override them.

For a full comparison of all variable-setting methods, see our guide on [variable precedence in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-variable-precedence-in-terraform/view).
