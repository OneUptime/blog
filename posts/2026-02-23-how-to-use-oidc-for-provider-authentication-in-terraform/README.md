# How to Use OIDC for Provider Authentication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, OIDC, Authentication, Security, IaC, CI/CD, DevOps

Description: Learn how to use OpenID Connect (OIDC) for Terraform provider authentication, eliminating static credentials in CI/CD pipelines with GitHub Actions, GitLab CI, and other platforms.

---

Static credentials for Terraform - long-lived access keys stored as CI/CD secrets - are a significant security risk. If they leak, an attacker has persistent access to your cloud environment. OpenID Connect (OIDC) eliminates this risk by letting your CI/CD platform authenticate directly with cloud providers using short-lived tokens. No static credentials to store, rotate, or worry about leaking.

## How OIDC Authentication Works

The flow is straightforward:

1. Your CI/CD platform (GitHub Actions, GitLab CI, etc.) issues a JWT token that identifies the running workflow
2. This token is sent to your cloud provider's OIDC endpoint
3. The cloud provider validates the token against the CI/CD platform's public keys
4. If valid, the cloud provider issues short-lived credentials
5. Terraform uses these credentials to manage resources
6. Credentials expire automatically after the workflow completes

No static secrets are stored anywhere. The trust relationship is configured once between your cloud provider and CI/CD platform.

## AWS OIDC with GitHub Actions

### Setting Up the Trust Relationship

First, create an OIDC identity provider and IAM role in AWS:

```hcl
# Create the OIDC identity provider for GitHub
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC thumbprint
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Create an IAM role that GitHub Actions can assume
resource "aws_iam_role" "github_actions" {
  name = "github-actions-terraform"

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
            # Restrict to specific repository and branch
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# Attach the necessary policies
resource "aws_iam_role_policy_attachment" "terraform_access" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_permissions.arn
}
```

### Using OIDC in GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Authenticate to AWS using OIDC - no static credentials needed
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color
        if: github.event_name == 'pull_request'

      - name: Terraform Apply
        run: terraform apply -auto-approve
        if: github.ref == 'refs/heads/main'
```

## Azure OIDC with GitHub Actions

### Setting Up Federated Credentials

```hcl
# Create an Azure AD application
resource "azuread_application" "github_actions" {
  display_name = "github-actions-terraform"
}

# Create a service principal
resource "azuread_service_principal" "github_actions" {
  client_id = azuread_application.github_actions.client_id
}

# Create federated credential for GitHub
resource "azuread_application_federated_identity_credential" "github" {
  application_id = azuread_application.github_actions.id
  display_name   = "github-main-branch"
  description    = "GitHub Actions for main branch"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:my-org/my-repo:ref:refs/heads/main"
}

# Grant the service principal access to the subscription
resource "azurerm_role_assignment" "terraform" {
  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github_actions.object_id
}
```

### Using Azure OIDC in GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Authenticate to Azure using OIDC
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_USE_OIDC: true

      - name: Terraform Apply
        run: terraform apply -auto-approve
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_USE_OIDC: true
```

## GCP OIDC with GitHub Actions

### Setting Up Workload Identity Federation

```hcl
# Create a Workload Identity Pool
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

# Create a provider in the pool
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == 'my-org/my-repo'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Create a service account for Terraform
resource "google_service_account" "terraform" {
  account_id   = "terraform-deployer"
  display_name = "Terraform Deployer"
}

# Allow the workload identity to impersonate the service account
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.terraform.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/my-org/my-repo"
}

# Grant the service account necessary permissions
resource "google_project_iam_member" "terraform" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.terraform.email}"
}
```

### Using GCP OIDC in GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Authenticate to GCP using OIDC
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
          service_account: "terraform-deployer@my-project.iam.gserviceaccount.com"

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

## GitLab CI OIDC

GitLab CI also supports OIDC authentication:

```yaml
# .gitlab-ci.yml
terraform:
  image: hashicorp/terraform:1.7.0
  variables:
    # AWS OIDC configuration
    AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/gitlab-terraform"
  id_tokens:
    GITLAB_OIDC_TOKEN:
      aud: https://gitlab.example.com
  script:
    # Assume the AWS role using the OIDC token
    - >
      export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s"
      $(aws sts assume-role-with-web-identity
      --role-arn ${AWS_ROLE_ARN}
      --role-session-name "GitLabCI-${CI_PIPELINE_ID}"
      --web-identity-token ${GITLAB_OIDC_TOKEN}
      --duration-seconds 3600
      --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]'
      --output text))
    - terraform init
    - terraform apply -auto-approve
```

## Securing OIDC Trust Policies

The subject claim in the OIDC token contains details about what triggered the workflow. Use conditions to restrict access:

```hcl
# AWS: Restrict by repository, branch, and environment
resource "aws_iam_role" "github_actions" {
  name = "github-actions-terraform"

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
            # Only allow from main branch of specific repo
            "token.actions.githubusercontent.com:sub" = [
              "repo:my-org/infrastructure:ref:refs/heads/main",
              "repo:my-org/infrastructure:environment:production"
            ]
          }
        }
      }
    ]
  })
}
```

## Troubleshooting OIDC

Common issues:

**Token validation failed**: Verify the issuer URL matches exactly, including trailing slashes.

**Subject claim mismatch**: Print the token claims to see the actual subject:

```yaml
# Debug: Print the OIDC token claims
- name: Debug OIDC Token
  run: |
    TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com")
    echo "$TOKEN" | jq -R 'split(".") | .[1] | @base64d | fromjson'
```

**Thumbprint mismatch**: For AWS, regenerate the OIDC provider thumbprint if it has changed.

## Monitoring Your Infrastructure

OIDC authentication secures how Terraform accesses your cloud, but you still need to monitor what it deploys. [OneUptime](https://oneuptime.com) provides uptime monitoring and alerting for your services, helping you verify that infrastructure changes work correctly in production.

## Conclusion

OIDC authentication eliminates the need for long-lived static credentials in your CI/CD pipelines. The initial setup requires creating trust relationships between your CI/CD platform and cloud providers, but once configured, every Terraform run uses fresh, short-lived credentials that expire automatically. This is a significant security improvement with minimal operational overhead.

For more on Terraform authentication, see our guides on [using IAM roles for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-iam-roles-for-terraform-authentication/view) and [implementing least privilege for service accounts](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-for-terraform-service-accounts/view).
