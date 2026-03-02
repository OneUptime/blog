# How to Set Up Terraform Environment Variables for Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Authentication, Environment Variable, AWS, Azure, GCP, DevOps, Security

Description: Learn how to configure Terraform authentication using environment variables for AWS, Azure, GCP, and Terraform Cloud without hardcoding credentials in your code.

---

One of the first things you learn when working with Terraform is that you should never hardcode credentials in your configuration files. No access keys in `.tf` files, no secrets committed to Git. The clean way to handle authentication is through environment variables. Terraform and its providers are designed to read credentials from environment variables, keeping your code portable and your secrets out of version control.

This guide covers environment variable configuration for the most common providers: AWS, Azure, GCP, and Terraform Cloud itself.

## How Terraform Uses Environment Variables

Terraform recognizes two types of environment variables:

1. **TF_VAR_ variables** - These set values for Terraform input variables
2. **Provider-specific variables** - These are read directly by provider plugins (like `AWS_ACCESS_KEY_ID` for the AWS provider)

The provider-specific variables are what we focus on in this post. Each cloud provider has its own set of expected environment variable names.

## AWS Authentication

The AWS provider reads credentials from the standard AWS environment variables.

### Basic Access Key Authentication

```bash
# Set AWS credentials as environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
```

With these variables set, your Terraform configuration does not need any credential parameters:

```hcl
# No credentials needed in the provider block
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "example" {
  bucket = "my-terraform-bucket"
}
```

### Session Token (for Temporary Credentials)

If you are using temporary credentials from AWS STS (common with MFA or assumed roles):

```bash
# Include session token for temporary credentials
export AWS_ACCESS_KEY_ID="ASIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_SESSION_TOKEN="FwoGZXIvYXdzEBYaDHW...long-token-string..."
export AWS_DEFAULT_REGION="us-east-1"
```

### Using AWS Profiles

Instead of raw credentials, you can point Terraform at an AWS CLI profile:

```bash
# Use a named AWS profile
export AWS_PROFILE="production"
export AWS_DEFAULT_REGION="us-east-1"
```

This reads credentials from `~/.aws/credentials` under the specified profile name.

### Assuming a Role

```bash
# Set the role to assume
export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/TerraformRole"
export AWS_ROLE_SESSION_NAME="terraform-session"
```

## Azure Authentication

Azure authentication with Terraform supports several methods through environment variables.

### Service Principal with Client Secret

This is the most common method for automation:

```bash
# Azure Service Principal credentials
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
```

```hcl
# The Azure provider picks up credentials from environment variables
provider "azurerm" {
  features {}
}
```

### Service Principal with Client Certificate

```bash
# Azure authentication with a client certificate
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_CERTIFICATE_PATH="/path/to/certificate.pfx"
export ARM_CLIENT_CERTIFICATE_PASSWORD="cert-password"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
```

### Using Azure CLI Authentication

If you are logged in via the Azure CLI, Terraform can use those credentials:

```bash
# Log in with Azure CLI
az login

# Set the subscription
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
```

Then enable CLI authentication in your provider:

```hcl
provider "azurerm" {
  features {}
  use_cli = true
}
```

### Managed Identity (for Azure VMs)

When running Terraform on an Azure VM with a managed identity:

```bash
# Enable managed identity authentication
export ARM_USE_MSI=true
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
```

## GCP Authentication

Google Cloud Platform uses service account keys or Application Default Credentials.

### Service Account Key File

```bash
# Point to your service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_PROJECT="my-gcp-project-id"
export GOOGLE_REGION="us-central1"
```

```hcl
# GCP provider reads credentials from the environment
provider "google" {
  project = "my-gcp-project-id"
  region  = "us-central1"
}
```

### Application Default Credentials

If you are logged in via `gcloud`:

```bash
# Set up Application Default Credentials
gcloud auth application-default login

# Set the project
export GOOGLE_PROJECT="my-gcp-project-id"
```

### Impersonating a Service Account

```bash
# Impersonate a service account
export GOOGLE_IMPERSONATE_SERVICE_ACCOUNT="terraform@my-project.iam.gserviceaccount.com"
```

## Terraform Cloud / Enterprise Authentication

```bash
# Set Terraform Cloud API token
export TF_TOKEN_app_terraform_io="your-terraform-cloud-token"
```

For Terraform Enterprise on a custom domain, replace dots with underscores:

```bash
# For terraform.company.com, the variable name becomes:
export TF_TOKEN_terraform_company_com="your-enterprise-token"
```

## Core Terraform Environment Variables

Beyond provider authentication, Terraform itself recognizes several environment variables:

```bash
# Set Terraform log level for debugging
export TF_LOG="DEBUG"          # Options: TRACE, DEBUG, INFO, WARN, ERROR
export TF_LOG_PATH="/tmp/terraform.log"  # Write logs to a file

# Set input variable values
export TF_VAR_instance_type="t3.medium"
export TF_VAR_environment="staging"

# Disable interactive prompts (useful in CI/CD)
export TF_INPUT=0

# Set parallelism for resource operations
export TF_CLI_ARGS_plan="-parallelism=30"
export TF_CLI_ARGS_apply="-parallelism=30"

# Point to a custom CLI config file
export TF_CLI_CONFIG_FILE="/path/to/custom/terraformrc"

# Skip provider verification (not recommended for production)
# export TF_SKIP_PROVIDER_VERIFY=1
```

## Making Environment Variables Persistent

### Using Shell Profile Files

Add environment variables to your shell profile so they persist across sessions:

```bash
# Add to ~/.bashrc or ~/.zshrc
export AWS_DEFAULT_REGION="us-east-1"
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
```

### Using .env Files with direnv

direnv is a great tool that loads environment variables when you enter a directory:

```bash
# Install direnv
# macOS
brew install direnv

# Ubuntu/Debian
sudo apt-get install direnv
```

Create a `.envrc` file in your project directory:

```bash
# .envrc - loaded automatically by direnv
export AWS_PROFILE="staging"
export AWS_DEFAULT_REGION="us-west-2"
export TF_VAR_environment="staging"
```

Allow the file:

```bash
# Allow direnv to load this file
direnv allow
```

Now these variables are set automatically when you `cd` into the project directory and unset when you leave.

Important: Add `.envrc` to `.gitignore` if it contains secrets:

```bash
echo ".envrc" >> .gitignore
```

### Using a Secrets Manager

For production environments, consider loading credentials from a secrets manager:

```bash
# Load AWS credentials from AWS Secrets Manager
eval $(aws secretsmanager get-secret-value \
  --secret-id terraform/aws-credentials \
  --query 'SecretString' \
  --output text | jq -r 'to_entries | .[] | "export \(.key)=\(.value)"')

# Load from HashiCorp Vault
eval $(vault kv get -format=json secret/terraform/aws | \
  jq -r '.data.data | to_entries | .[] | "export \(.key)=\(.value)"')
```

## Security Best Practices

### Never Export Credentials in Scripts Committed to Git

```bash
# BAD - do not commit this
export AWS_SECRET_ACCESS_KEY="actual-secret-key"

# GOOD - reference a secrets manager or prompt for input
export AWS_SECRET_ACCESS_KEY=$(vault kv get -field=secret_key secret/aws)
```

### Use Short-Lived Credentials

Prefer temporary credentials (AWS STS, Azure managed identity, GCP workload identity) over long-lived access keys:

```bash
# Generate temporary AWS credentials via STS
eval $(aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/TerraformRole \
  --role-session-name terraform \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text | awk '{print "export AWS_ACCESS_KEY_ID="$1"\nexport AWS_SECRET_ACCESS_KEY="$2"\nexport AWS_SESSION_TOKEN="$3}')
```

### Clear Credentials After Use

```bash
# Unset credentials when done
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
```

### Check for Leaked Variables

Before committing code, make sure no credentials slipped into your Terraform files:

```bash
# Search for potential credential leaks
grep -r "AKIA\|secret_key\|password\|token" *.tf
```

## Verifying Authentication

After setting up environment variables, verify that authentication works:

```bash
# AWS - test authentication
aws sts get-caller-identity

# Azure - test authentication
az account show

# GCP - test authentication
gcloud auth application-default print-access-token > /dev/null && echo "GCP auth OK"
```

Then test with Terraform:

```bash
# Initialize and plan to verify provider authentication
terraform init
terraform plan
```

If authentication is configured correctly, `terraform plan` will connect to your cloud provider without errors.

## Conclusion

Environment variables are the standard way to handle Terraform authentication. They keep credentials out of your code, work seamlessly in CI/CD pipelines, and are supported by every major cloud provider. Combined with tools like direnv for per-project configuration and secrets managers for production credentials, you get a secure and ergonomic workflow. The key principle is simple: credentials belong in the environment, never in the code.
