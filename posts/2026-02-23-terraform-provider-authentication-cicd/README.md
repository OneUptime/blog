# How to Handle Terraform Provider Authentication in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Authentication, AWS, Azure, GCP, Security

Description: A complete guide to configuring Terraform provider authentication in CI/CD pipelines covering AWS, Azure, GCP, and multi-provider setups with OIDC and secrets management.

---

Getting Terraform to authenticate with cloud providers in a CI/CD pipeline is one of the first hurdles you hit when automating infrastructure. Locally you might use `aws configure` or `gcloud auth login`, but those interactive methods don't work in headless CI environments. This post covers authentication patterns for the major cloud providers across popular CI/CD platforms.

## The Authentication Hierarchy

Terraform providers check for credentials in a specific order. Understanding this helps you debug authentication issues:

For AWS:
1. Provider block configuration (bad - don't hardcode credentials)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. Shared credentials file (`~/.aws/credentials`)
4. EC2 instance profile / ECS task role
5. Web identity token (OIDC)

For CI/CD, you want option 2 (environment variables) backed by OIDC tokens. Never use option 1.

## AWS Authentication with OIDC

OIDC is the recommended approach. Your CI/CD platform generates a short-lived token that AWS exchanges for temporary credentials. No long-lived secrets needed.

### GitHub Actions + AWS

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # OIDC-based authentication - no static credentials stored
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-ci
          role-session-name: github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

The AWS side requires an OIDC provider and IAM role:

```hcl
# aws-oidc-github.tf
# Register GitHub as an OIDC identity provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role for Terraform CI
resource "aws_iam_role" "terraform_ci" {
  name = "terraform-ci"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          # Allow from specific repo, any branch
          "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

# Attach permissions to the role
resource "aws_iam_role_policy_attachment" "terraform_ci" {
  role       = aws_iam_role.terraform_ci.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}
```

### GitLab CI + AWS

```yaml
# .gitlab-ci.yml
terraform_apply:
  image: hashicorp/terraform:1.7.4
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com
  variables:
    # Use the OIDC token for authentication
    AWS_WEB_IDENTITY_TOKEN_FILE: $CI_JOB_JWT_FILE
    AWS_ROLE_ARN: arn:aws:iam::123456789012:role/terraform-ci
    AWS_DEFAULT_REGION: us-east-1
  script:
    - terraform init
    - terraform apply -auto-approve
```

## Azure Authentication

### GitHub Actions + Azure with OIDC

```yaml
# .github/workflows/terraform-azure.yml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login via OIDC
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        env:
          # Terraform AzureRM provider reads these
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_USE_OIDC: "true"
        run: |
          terraform init
          terraform apply -auto-approve
```

Azure OIDC requires a federated identity credential:

```hcl
# azure-oidc-github.tf
# App registration for Terraform CI
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
  subject        = "repo:myorg/infrastructure:ref:refs/heads/main"
}

# Grant Contributor role on the subscription
resource "azurerm_role_assignment" "terraform_ci" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.terraform_ci.object_id
}
```

## GCP Authentication

### GitHub Actions + GCP with Workload Identity Federation

```yaml
# .github/workflows/terraform-gcp.yml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Authenticate with GCP via Workload Identity Federation
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/123456/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: terraform-ci@my-project.iam.gserviceaccount.com

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: |
          terraform init
          terraform apply -auto-approve
```

The GCP setup for Workload Identity Federation:

```hcl
# gcp-workload-identity.tf
# Create workload identity pool
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"
}

# Create pool provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service account for Terraform
resource "google_service_account" "terraform_ci" {
  account_id   = "terraform-ci"
  display_name = "Terraform CI"
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_impersonation" {
  service_account_id = google_service_account.terraform_ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/myorg/infrastructure"
}
```

## Multi-Provider Authentication

When your Terraform config uses multiple providers, set up credentials for each:

```yaml
# .github/workflows/multi-cloud.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # AWS via OIDC
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      # GCP via Workload Identity
      - name: Configure GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      # Azure via OIDC
      - name: Configure Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Apply
        env:
          ARM_USE_OIDC: "true"
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          terraform init
          terraform apply -auto-approve
```

## Fallback: Static Credentials via Vault

If OIDC is not available, use HashiCorp Vault to generate short-lived credentials:

```yaml
- name: Get AWS Credentials from Vault
  uses: hashicorp/vault-action@v3
  with:
    url: https://vault.example.com
    method: jwt
    role: terraform-ci
    secrets: |
      aws/creds/terraform-role access_key | AWS_ACCESS_KEY_ID ;
      aws/creds/terraform-role secret_key | AWS_SECRET_ACCESS_KEY ;
      aws/creds/terraform-role security_token | AWS_SESSION_TOKEN

- name: Terraform Apply
  run: terraform apply -auto-approve
```

## Debugging Authentication Issues

When authentication fails in CI, these steps help:

```yaml
- name: Debug Authentication
  run: |
    # Check which identity Terraform will use
    aws sts get-caller-identity

    # Verify environment variables are set (masked)
    echo "AWS_ACCESS_KEY_ID is set: ${AWS_ACCESS_KEY_ID:+yes}"
    echo "AWS_SESSION_TOKEN is set: ${AWS_SESSION_TOKEN:+yes}"

    # Enable Terraform debug logging for provider auth
    export TF_LOG=DEBUG
    terraform plan 2>&1 | head -50
```

## Summary

The best authentication approach for each provider:

- AWS: OIDC via `aws-actions/configure-aws-credentials`
- Azure: OIDC via federated identity credentials
- GCP: Workload Identity Federation via `google-github-actions/auth`
- Multi-cloud: Set up OIDC for each provider independently
- Fallback: HashiCorp Vault for dynamic credential generation

Always prefer OIDC over static credentials. Short-lived tokens that expire after each pipeline run are significantly more secure than long-lived access keys sitting in your CI/CD secrets store. For more on securing your Terraform pipelines, see [Terraform CI/CD security best practices](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-security-best-practices/view).
