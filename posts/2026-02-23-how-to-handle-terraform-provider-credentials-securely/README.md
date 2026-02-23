# How to Handle Terraform Provider Credentials Securely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Credentials, AWS, Secrets Management

Description: Practical strategies for managing Terraform provider credentials without exposing secrets in your codebase or state files.

---

Every Terraform configuration needs credentials to talk to cloud providers. How you handle those credentials is one of the most important security decisions in your Terraform workflow. Get it wrong, and you risk exposing keys that can be used to spin up resources, access data, or even delete your entire infrastructure. Get it right, and your team can work confidently knowing that credentials are protected.

This guide covers the most practical approaches to handling provider credentials securely, from local development to CI/CD pipelines.

## The Problem with Provider Credentials

Terraform providers need authentication to create and manage resources. For AWS, that means access keys or IAM roles. For Azure, it is service principals or managed identities. For GCP, it is service accounts. The question is always the same: where do these credentials live, and who can access them?

The wrong answers include:

- Hardcoded in `.tf` files
- Committed to version control
- Shared in chat messages or emails
- Stored in plain text on developer machines

## AWS: Use IAM Roles, Not Access Keys

The best approach for AWS is to avoid long-lived access keys entirely. Use IAM roles wherever possible.

### For Local Development: AWS SSO/Identity Center

```bash
# Configure AWS SSO
aws configure sso
# Follow the prompts to set up your SSO profile

# Set the profile for Terraform
export AWS_PROFILE=my-sso-profile

# Terraform will automatically use this profile
terraform plan
```

Your Terraform provider block stays clean:

```hcl
# No credentials in the provider block
provider "aws" {
  region = "us-east-1"

  # Terraform picks up credentials from the environment
  # via AWS_PROFILE, AWS_ACCESS_KEY_ID, or instance profile
}
```

### For CI/CD: OIDC Federation

Instead of storing AWS access keys in your CI/CD system, use OIDC federation. This gives your pipeline temporary credentials without any stored secrets.

```hcl
# Create an OIDC provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

# IAM role that GitHub Actions can assume
resource "aws_iam_role" "terraform_ci" {
  name = "terraform-ci-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-infra-repo:*"
          }
        }
      }
    ]
  })
}
```

In your GitHub Actions workflow:

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-ci-role
          aws-region: us-east-1
          # No access keys needed

      - name: Terraform Plan
        run: terraform plan
```

### For EC2: Instance Profiles

If Terraform runs on EC2 (like a Jenkins server), attach an IAM role to the instance:

```hcl
resource "aws_iam_instance_profile" "terraform_runner" {
  name = "terraform-runner"
  role = aws_iam_role.terraform_runner.name
}

resource "aws_iam_role" "terraform_runner" {
  name = "terraform-runner"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

## Azure: Use Managed Identity or Service Principal with OIDC

```hcl
# For Azure, prefer managed identity when running on Azure resources
provider "azurerm" {
  features {}

  # When running on an Azure VM or AKS with managed identity
  use_msi = true
  subscription_id = var.subscription_id
}
```

For CI/CD, use workload identity federation:

```hcl
# Azure AD application for CI/CD
resource "azuread_application" "terraform_ci" {
  display_name = "terraform-ci"
}

resource "azuread_service_principal" "terraform_ci" {
  client_id = azuread_application.terraform_ci.client_id
}

# Federated credential for GitHub Actions
resource "azuread_application_federated_identity_credential" "github" {
  application_id = azuread_application.terraform_ci.id
  display_name   = "github-actions"
  description    = "GitHub Actions OIDC"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:my-org/my-infra-repo:ref:refs/heads/main"
}
```

## GCP: Use Workload Identity Federation

```hcl
# GCP Workload Identity Pool for CI/CD
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

## When You Must Use Access Keys

Sometimes IAM roles are not an option. In those cases, follow these rules:

1. **Rotate keys regularly** (every 90 days at most)
2. **Use separate keys per environment** (never share prod and dev keys)
3. **Scope keys to minimum permissions**
4. **Store keys in a secrets manager**, not in environment variables on developer machines

```hcl
# Use AWS Secrets Manager to store and rotate access keys
resource "aws_secretsmanager_secret" "terraform_credentials" {
  name        = "terraform/provider-credentials"
  description = "Terraform provider credentials - auto-rotated"

  tags = {
    Purpose = "terraform-provider-auth"
  }
}

# Set up automatic rotation
resource "aws_secretsmanager_secret_rotation" "terraform_credentials" {
  secret_id           = aws_secretsmanager_secret.terraform_credentials.id
  rotation_lambda_arn = aws_lambda_function.rotate_credentials.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Multi-Account Provider Configuration

When working across multiple AWS accounts, use `assume_role` instead of separate credentials:

```hcl
# Base provider uses your default credentials
provider "aws" {
  region = "us-east-1"
}

# Production account via role assumption
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::111111111111:role/TerraformAccess"
    session_name = "terraform-production"
    external_id  = var.external_id
  }
}

# Staging account via role assumption
provider "aws" {
  alias  = "staging"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::222222222222:role/TerraformAccess"
    session_name = "terraform-staging"
  }
}
```

## Wrapping Up

The golden rule for Terraform provider credentials is: use temporary credentials whenever possible, and when you cannot, store long-lived credentials in a secrets manager with automatic rotation. OIDC federation for CI/CD pipelines and SSO for local development eliminate the vast majority of credential management headaches. The initial setup takes some effort, but the security improvement is significant.

For monitoring your infrastructure after deployment, [OneUptime](https://oneuptime.com) provides comprehensive monitoring and incident management to keep your services running reliably.
