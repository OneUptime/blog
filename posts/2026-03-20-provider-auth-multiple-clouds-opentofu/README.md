# Provider Authentication for Multiple Clouds with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Azure, GCP, Multi-Cloud, Authentication

Description: Learn how to configure and manage provider authentication for AWS, Azure, and Google Cloud simultaneously in a single OpenTofu configuration.

## Why Multi-Cloud Authentication Matters

Modern infrastructure often spans multiple cloud providers. OpenTofu supports this through provider configurations that can authenticate to AWS, Azure, GCP, and other clouds simultaneously within a single project.

## Project Structure

```text
multi-cloud/
├── main.tf
├── providers.tf
├── variables.tf
└── terraform.tfvars
```

## Configuring AWS Authentication

```hcl
# providers.tf

provider "aws" {
  region = var.aws_region

  # Option 1: Environment variables or shared config
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN

  # Option 2: Assume Role (recommended for cross-account)
  # assume_role {
  #   role_arn     = var.aws_role_arn
  #   session_name = "opentofu-session"
  # }

  default_tags {
    tags = {
      ManagedBy   = "opentofu"
      Environment = var.environment
    }
  }
}
```

```bash
# Environment variable authentication
export AWS_ACCESS_KEY_ID=your-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

## Configuring Azure Authentication

```hcl
provider "azurerm" {
  features {}

  # Option 1: Service Principal credentials in the provider block
  # subscription_id = var.azure_subscription_id
  # client_id       = var.azure_client_id
  # client_secret   = var.azure_client_secret
  # tenant_id       = var.azure_tenant_id

  # Option 2: Use Azure CLI (for local development)
  use_cli = true
}
```

```bash
# Azure CLI authentication (local development)
az login
az account set --subscription "your-subscription-id"

# Service Principal via environment variables (CI/CD)
export ARM_CLIENT_ID=your-client-id
export ARM_CLIENT_SECRET=your-client-secret
export ARM_TENANT_ID=your-tenant-id
export ARM_SUBSCRIPTION_ID=your-subscription-id
```

## Configuring Google Cloud Authentication

```hcl
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region

  # Option 1: Service Account Key File
  # credentials = file(var.gcp_credentials_file)

  # Option 2: Application Default Credentials
  # (uses GOOGLE_APPLICATION_CREDENTIALS env var or gcloud auth)
}
```

```bash
# Application Default Credentials (local development)
gcloud auth application-default login

# Service account via Application Default Credentials (CI/CD)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Combining All Three in a Single Configuration

```hcl
# main.tf
resource "aws_s3_bucket" "backup" {
  bucket_prefix = "my-backup-bucket-${var.environment}-"
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment}"
  location = var.azure_region
}

resource "google_storage_bucket" "archive" {
  name     = "archive-${var.gcp_project_id}"
  location = var.gcp_region
}
```

## Using Variables for Credentials

```hcl
# variables.tf
variable "aws_role_arn" {
  type      = string
  sensitive = true
}

variable "azure_client_secret" {
  type      = string
  sensitive = true
}

variable "gcp_credentials_file" {
  type = string
}
```

## CI/CD Pipeline Authentication

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Configure Azure
        uses: azure/login@v3
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Configure GCP
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: projects/123/locations/global/workloadIdentityPools/pool/providers/github
          service_account: opentofu@my-project.iam.gserviceaccount.com

      - name: Run OpenTofu
        run: |
          tofu init
          tofu apply -auto-approve
```

## Best Practices

1. **Use OIDC/Workload Identity** instead of long-lived service account keys in CI/CD
2. **Never commit credentials** to version control - use environment variables or secret managers
3. **Use separate service accounts** with minimum required permissions per cloud
4. **Rotate credentials regularly** and audit access logs
5. **Use `sensitive = true`** on credential variables to reduce exposure in plan and apply output, and secure state separately

## Conclusion

OpenTofu makes multi-cloud authentication manageable by supporting provider-specific credential mechanisms for AWS, Azure, and GCP. By using environment variables and OIDC-based authentication in CI/CD, you can securely deploy infrastructure across all three major clouds from a single configuration.
