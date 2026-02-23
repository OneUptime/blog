# How to Use Environment-Specific Variable Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Variables, Environments, DevOps, Infrastructure as Code

Description: Learn how to organize Terraform variable files for multiple environments like dev, staging, and production, with patterns for managing shared and environment-specific configuration.

---

Most Terraform projects deploy to multiple environments - development, staging, and production at minimum. Each environment needs different values: smaller instances in dev, more replicas in production, different CIDR blocks, different domain names. Environment-specific variable files are the standard way to manage these differences without duplicating your entire Terraform configuration.

This post covers the patterns for organizing tfvars files, selecting them at apply time, and handling the shared vs. environment-specific split.

## The Basic Pattern

Create a separate `.tfvars` file for each environment:

```
infrastructure/
  main.tf
  variables.tf
  outputs.tf
  locals.tf
  providers.tf
  envs/
    dev.tfvars
    staging.tfvars
    production.tfvars
```

Each file contains only the values that are specific to that environment:

```hcl
# envs/dev.tfvars
environment    = "dev"
instance_type  = "t3.micro"
instance_count = 1
domain_name    = "dev.example.com"
enable_waf     = false
db_instance    = "db.t3.micro"
db_storage_gb  = 20
```

```hcl
# envs/staging.tfvars
environment    = "staging"
instance_type  = "t3.small"
instance_count = 2
domain_name    = "staging.example.com"
enable_waf     = true
db_instance    = "db.t3.medium"
db_storage_gb  = 50
```

```hcl
# envs/production.tfvars
environment    = "production"
instance_type  = "m5.large"
instance_count = 4
domain_name    = "example.com"
enable_waf     = true
db_instance    = "db.r5.large"
db_storage_gb  = 500
```

Select the environment at plan/apply time:

```bash
# Deploy to dev
terraform plan -var-file="envs/dev.tfvars"
terraform apply -var-file="envs/dev.tfvars"

# Deploy to production
terraform plan -var-file="envs/production.tfvars"
terraform apply -var-file="envs/production.tfvars"
```

## Separating Shared and Environment-Specific Values

Some values are the same across all environments. Put those in a shared file:

```
infrastructure/
  main.tf
  variables.tf
  envs/
    shared.tfvars
    dev.tfvars
    staging.tfvars
    production.tfvars
```

```hcl
# envs/shared.tfvars
project     = "orderservice"
team        = "platform"
aws_region  = "us-east-1"
owner_email = "platform@company.com"
```

```hcl
# envs/production.tfvars
environment    = "production"
instance_type  = "m5.large"
instance_count = 4
```

Load both files at apply time:

```bash
# Shared values + environment-specific values
terraform plan \
  -var-file="envs/shared.tfvars" \
  -var-file="envs/production.tfvars"
```

The second file takes precedence for any values that appear in both files.

## Using a Wrapper Script

Typing the var-file flags every time is error-prone. Wrap it in a script:

```bash
#!/bin/bash
# deploy.sh - Wrapper for environment-specific deployments

set -euo pipefail

ENV="${1:?Usage: ./deploy.sh <environment> [plan|apply|destroy]}"
ACTION="${2:-plan}"

# Validate environment
if [[ ! -f "envs/${ENV}.tfvars" ]]; then
  echo "Error: envs/${ENV}.tfvars not found"
  echo "Available environments:"
  ls envs/*.tfvars | sed 's/envs\//  /' | sed 's/.tfvars//'
  exit 1
fi

# Build the var-file arguments
VAR_FILES="-var-file=envs/shared.tfvars -var-file=envs/${ENV}.tfvars"

# Add secrets file if it exists
if [[ -f "envs/${ENV}.secrets.tfvars" ]]; then
  VAR_FILES="${VAR_FILES} -var-file=envs/${ENV}.secrets.tfvars"
fi

echo "Running terraform ${ACTION} for environment: ${ENV}"
terraform "${ACTION}" ${VAR_FILES}
```

Usage:

```bash
./deploy.sh dev plan
./deploy.sh production apply
./deploy.sh staging destroy
```

## Using Terraform Workspaces with Variable Files

Terraform workspaces can be combined with variable files. The workspace name determines which file to load:

```hcl
# main.tf
locals {
  # Use workspace name to determine environment
  environment = terraform.workspace
}
```

```bash
# Create and switch workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Select workspace and use its var file
terraform workspace select production
terraform plan -var-file="envs/production.tfvars"
```

Some teams automate this mapping:

```bash
#!/bin/bash
# Auto-select var file based on workspace
WORKSPACE=$(terraform workspace show)
terraform plan -var-file="envs/${WORKSPACE}.tfvars"
```

## Environment-Specific Backend Configuration

Different environments should use different state files. Use backend configuration files alongside your variable files:

```
infrastructure/
  main.tf
  variables.tf
  backends/
    dev.hcl
    staging.hcl
    production.hcl
  envs/
    dev.tfvars
    staging.tfvars
    production.tfvars
```

```hcl
# backends/production.hcl
bucket         = "mycompany-terraform-state"
key            = "production/orderservice/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
```

```hcl
# backends/dev.hcl
bucket         = "mycompany-terraform-state"
key            = "dev/orderservice/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "terraform-locks"
encrypt        = true
```

Initialize with the correct backend:

```bash
# Initialize for production
terraform init -backend-config="backends/production.hcl"

# Plan with production values
terraform plan -var-file="envs/production.tfvars"
```

## Handling Secrets per Environment

Secrets should not be in your tfvars files that get committed to version control. Common approaches:

### Approach 1: Separate Secrets Files (gitignored)

```
infrastructure/
  .gitignore
  envs/
    dev.tfvars
    dev.secrets.tfvars        # In .gitignore
    production.tfvars
    production.secrets.tfvars  # In .gitignore
```

```gitignore
# .gitignore
*.secrets.tfvars
```

```bash
terraform plan \
  -var-file="envs/production.tfvars" \
  -var-file="envs/production.secrets.tfvars"
```

### Approach 2: Environment Variables

```bash
# Set secrets as environment variables
export TF_VAR_database_password="$(aws secretsmanager get-secret-value \
  --secret-id production/db-password \
  --query SecretString --output text)"

export TF_VAR_api_key="$(vault kv get -field=api_key secret/production/api)"

terraform plan -var-file="envs/production.tfvars"
```

### Approach 3: Data Sources for Secrets

```hcl
# Pull secrets from AWS Secrets Manager instead of variables
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "${var.project}/${var.environment}/db-password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ...
}
```

## Validating Environment Files

Add a CI check to ensure all environment files define the required variables:

```bash
#!/bin/bash
# validate-envs.sh - Ensure all env files are complete

REQUIRED_VARS=(
  "environment"
  "instance_type"
  "instance_count"
  "domain_name"
)

for env_file in envs/*.tfvars; do
  echo "Checking ${env_file}..."
  for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}" "${env_file}"; then
      echo "  ERROR: Missing ${var} in ${env_file}"
      exit 1
    fi
  done
  echo "  OK"
done
```

## Environment File Templates

Provide a template so team members know what values to set:

```hcl
# envs/template.tfvars.example
# Copy this file to <environment>.tfvars and fill in the values

environment    = ""           # Required: dev, staging, or production
instance_type  = "t3.micro"   # EC2 instance type
instance_count = 1            # Number of instances
domain_name    = ""           # Required: domain for this environment
enable_waf     = false        # Enable WAF (recommended for production)
db_instance    = "db.t3.micro" # RDS instance class
db_storage_gb  = 20           # RDS storage in GB
```

## Complete Example

Here is a full project setup with environment-specific files:

```hcl
# variables.tf
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

variable "project" {
  type    = string
  default = "orderservice"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "enable_monitoring" {
  type    = bool
  default = false
}
```

```hcl
# locals.tf
locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

```hcl
# envs/dev.tfvars
environment       = "dev"
instance_type     = "t3.micro"
instance_count    = 1
enable_monitoring = false
```

```hcl
# envs/production.tfvars
environment       = "production"
instance_type     = "m5.large"
instance_count    = 4
enable_monitoring = true
```

```bash
# Deploy
terraform init -backend-config="backends/production.hcl"
terraform plan -var-file="envs/production.tfvars"
terraform apply -var-file="envs/production.tfvars"
```

## Summary

Environment-specific variable files keep your Terraform configuration DRY while letting each deployment have its own settings. Put variable definitions in `variables.tf`, environment values in separate tfvars files, and shared values in a common file. Use wrapper scripts to reduce the chance of loading the wrong file. Keep secrets out of committed files - use environment variables, gitignored files, or cloud secrets managers instead. This structure scales from two environments to dozens without changing your core Terraform code.

For more on managing Terraform variables, see our guide on [terraform.tfvars vs variables.tf](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-tfvars-vs-variables-tf-properly/view).
