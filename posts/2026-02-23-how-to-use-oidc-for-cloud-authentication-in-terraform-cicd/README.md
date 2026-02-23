# How to Use OIDC for Cloud Authentication in Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, OIDC, CI/CD, Security, AWS, Azure, GCP, GitHub Actions

Description: Learn how to use OpenID Connect for keyless cloud authentication in Terraform CI/CD pipelines, eliminating static credentials with GitHub Actions, GitLab CI, and more.

---

Static cloud credentials in CI/CD are a ticking time bomb. API keys and secret access keys get leaked in logs, committed to repositories, or stolen from pipeline variable stores. OIDC (OpenID Connect) eliminates this entire class of risk by letting your CI/CD platform authenticate directly with your cloud provider using short-lived tokens. No static credentials stored anywhere.

## How OIDC Authentication Works

The flow is straightforward:

1. Your CI/CD platform (GitHub Actions, GitLab CI, etc.) generates a signed JWT token for each pipeline run
2. The pipeline presents this token to your cloud provider (AWS, GCP, Azure)
3. The cloud provider validates the token against the CI/CD platform's OIDC endpoint
4. If valid, the cloud provider issues short-lived credentials for that specific run
5. The credentials expire when the pipeline run ends

The result is that your pipeline gets temporary credentials scoped to exactly what it needs, with no static secrets to manage or rotate.

## OIDC with AWS and GitHub Actions

### Step 1: Create the OIDC Identity Provider in AWS

```hcl
# oidc.tf - Set up GitHub as an OIDC provider in AWS
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}
```

### Step 2: Create an IAM Role for Terraform

```hcl
# role.tf - IAM role that GitHub Actions can assume via OIDC
resource "aws_iam_role" "terraform_cicd" {
  name = "terraform-cicd-role"

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
            # Lock down to specific repository
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Only allow from main branch of your repo
            "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# Attach permissions for Terraform operations
resource "aws_iam_role_policy_attachment" "terraform_permissions" {
  role       = aws_iam_role.terraform_cicd.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}

resource "aws_iam_policy" "terraform_permissions" {
  name = "terraform-cicd-permissions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "s3:*",
          "dynamodb:*",
          "iam:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### Step 3: Use OIDC in the GitHub Actions Workflow

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  push:
    branches: [main]

# OIDC requires these permissions
permissions:
  id-token: write   # Needed to request the OIDC JWT
  contents: read     # Needed to checkout code

jobs:
  apply:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # This step uses OIDC to get temporary AWS credentials
      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd-role
          aws-region: us-east-1
          # No access key or secret key needed

      - name: Verify identity
        run: aws sts get-caller-identity

      - name: Terraform Init
        run: terraform init -no-color

      - name: Terraform Apply
        run: terraform apply -no-color -auto-approve
```

## OIDC with GCP and GitHub Actions

### Set Up Workload Identity Federation

```hcl
# gcp-oidc.tf - Workload Identity Federation for GitHub Actions
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

  # Map GitHub token claims to Google attributes
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  # Only allow tokens from your organization
  attribute_condition = "assertion.repository_owner == 'myorg'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service account for Terraform
resource "google_service_account" "terraform" {
  project      = var.project_id
  account_id   = "terraform-cicd"
  display_name = "Terraform CI/CD"
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_terraform" {
  service_account_id = google_service_account.terraform.name
  role               = "roles/iam.workloadIdentityUser"

  # Restrict to specific repository
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/myorg/infrastructure"
}
```

### Use in GitHub Actions

```yaml
# .github/workflows/terraform-gcp.yml
permissions:
  id-token: write
  contents: read

jobs:
  apply:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Authenticate to GCP via OIDC
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/123456/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
          service_account: "terraform-cicd@myproject.iam.gserviceaccount.com"

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: |
          terraform init -no-color
          terraform apply -no-color -auto-approve
```

## OIDC with Azure and GitHub Actions

```hcl
# azure-oidc.tf - Azure AD application with federated credentials
resource "azuread_application" "terraform" {
  display_name = "terraform-cicd"
}

resource "azuread_service_principal" "terraform" {
  client_id = azuread_application.terraform.client_id
}

# Federated credential for GitHub Actions
resource "azuread_application_federated_identity_credential" "github" {
  application_id = azuread_application.terraform.id
  display_name   = "github-actions-main"
  description    = "GitHub Actions from main branch"

  audiences = ["api://AzureADTokenExchange"]
  issuer    = "https://token.actions.githubusercontent.com"

  # Restrict to main branch of your repo
  subject = "repo:myorg/infrastructure:ref:refs/heads/main"
}

# Assign permissions
resource "azurerm_role_assignment" "terraform" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.terraform.object_id
}
```

```yaml
# GitHub Actions with Azure OIDC
- name: Azure Login via OIDC
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
    # No client secret needed - OIDC handles authentication
```

## OIDC with GitLab CI

GitLab CI also supports OIDC tokens:

```yaml
# .gitlab-ci.yml with OIDC
apply:
  stage: apply
  image: hashicorp/terraform:1.7.0
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.com  # The audience claim
  script:
    # Exchange the OIDC token for AWS credentials
    - >
      export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s"
      $(aws sts assume-role-with-web-identity
      --role-arn arn:aws:iam::123456789012:role/terraform-cicd
      --role-session-name gitlab-ci
      --web-identity-token $GITLAB_OIDC_TOKEN
      --duration-seconds 3600
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text))

    - terraform init -no-color
    - terraform apply -no-color -auto-approve
```

## Scoping OIDC Permissions

The key security benefit of OIDC is the ability to scope permissions based on claims in the JWT token. Here are common patterns:

```hcl
# AWS - Different roles per branch
# Production role - only main branch
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:ref:refs/heads/main"
  }
}

# Plan-only role - any branch (for PR plans)
Condition = {
  StringLike = {
    "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:*"
  }
}

# Environment-specific roles
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:environment:production"
  }
}
```

## Troubleshooting OIDC Issues

Common problems and their fixes:

```bash
# Debug: Print the OIDC token claims (GitHub Actions)
- name: Debug OIDC token
  run: |
    TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com")

    # Decode the JWT (without verification, for debugging only)
    echo $TOKEN | jq -r '.value' | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

Common issues:
- **"Not authorized to perform sts:AssumeRoleWithWebIdentity"** - Check the subject claim matches your condition
- **"Audience not allowed"** - Verify the audience matches what the OIDC provider expects
- **"Token expired"** - OIDC tokens have a short TTL; make sure your pipeline does not take too long between token generation and use

## Summary

OIDC is the way to go for cloud authentication in Terraform CI/CD. It eliminates static credentials entirely, provides short-lived tokens that cannot be reused, and lets you scope permissions down to specific repositories, branches, and environments. The initial setup is a bit more involved than dropping in an access key, but the security improvement is substantial.

For more on secrets management, see our guide on [handling Terraform secrets in CI/CD pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-secrets-in-cicd-pipelines/view).
