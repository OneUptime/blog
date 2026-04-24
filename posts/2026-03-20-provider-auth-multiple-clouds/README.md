# How to Authenticate OpenTofu Providers Across Multiple Clouds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Authentication, AWS, Azure, GCP, OIDC, Multi-Cloud, Security

Description: Learn how to configure keyless authentication for AWS, Azure, and GCP providers in OpenTofu CI/CD pipelines using OIDC, Workload Identity Federation, and short-lived credentials.

## Introduction

Multi-cloud OpenTofu deployments need to authenticate to multiple providers in the same CI run. The modern approach uses OIDC (OpenID Connect) to exchange short-lived tokens from your CI provider (GitHub Actions, GitLab) for cloud credentials - no long-lived secrets stored in CI variables.

## AWS: OIDC with GitHub Actions

Set up an IAM OIDC identity provider and role:

```hcl
# AWS OIDC provider for GitHub Actions

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:*"
        }
      }
    }]
  })
}
```

GitHub Actions workflow:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v6
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: us-east-1
```

## Azure: OIDC with Federated Credentials

```bash
# Create Azure service principal and federated credential (CLI)
APP_ID=$(az ad app create --display-name "opentofu-github-actions" --query appId -o tsv)

az ad sp create --id $APP_ID

# Add federated credential for GitHub Actions
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com/",
    "subject": "repo:my-org/my-repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

```hcl
# Azure provider with OIDC
provider "azurerm" {
  features {}
  use_oidc        = true
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  client_id       = var.azure_client_id  # App registration client ID
}
```

GitHub Actions:

```yaml
- name: Azure login via OIDC
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

## GCP: Workload Identity Federation

```hcl
# GCP: Create Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com/"
  }

  attribute_mapping = {
    "google.subject"            = "assertion.sub"
    "attribute.repository"      = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.actor"           = "assertion.actor"
  }

  attribute_condition = "assertion.repository_owner == 'my-org'"
}

resource "google_service_account" "opentofu" {
  account_id   = "opentofu-github-actions"
  display_name = "OpenTofu GitHub Actions"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.opentofu.id
  role               = "roles/iam.workloadIdentityUser"
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/my-org/my-repo"
}
```

GitHub Actions:

```yaml
- name: Authenticate to GCP
  uses: google-github-actions/auth@v3
  with:
    workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
    service_account: opentofu-github-actions@my-project.iam.gserviceaccount.com
```

## Complete Multi-Cloud GitHub Actions Workflow

```yaml
name: Multi-Cloud OpenTofu Apply

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      # AWS
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1

      # Azure
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # GCP
      - uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
          service_account: ${{ vars.GCP_SA_EMAIL }}

      - uses: opentofu/setup-opentofu@v1

      - run: tofu init && tofu apply -auto-approve
```

## Conclusion

Use OIDC/Workload Identity Federation for all three major cloud providers - it eliminates long-lived credentials from CI. For AWS, configure an IAM OIDC provider; for Azure, use federated credentials on an App Registration; for GCP, create a Workload Identity Pool. Set `permissions: id-token: write` in GitHub Actions to enable token exchange. No secrets need to be stored in CI variables when using these keyless authentication patterns.
