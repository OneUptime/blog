# How to Use OIDC Authentication for Terraform in GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, OIDC, Security, AWS, Azure, GCP, CI/CD, Authentication

Description: Set up OIDC authentication between GitHub Actions and cloud providers to run Terraform without storing long-lived credentials, covering AWS, Azure, and GCP configurations.

---

Storing cloud provider credentials as GitHub Actions secrets is a security liability. Those long-lived access keys sit in your repository settings, need manual rotation, and could be used by any workflow in the repository. OIDC (OpenID Connect) eliminates this problem entirely by letting GitHub Actions request temporary credentials from your cloud provider on every run.

With OIDC, there are no secrets to rotate, no keys to leak, and credentials last only for the duration of the workflow run. This post walks through setting up OIDC authentication for Terraform with AWS, Azure, and GCP.

## How OIDC Works with GitHub Actions

The flow goes like this:

1. Your GitHub Actions workflow requests an OIDC token from GitHub's token service
2. The workflow presents this token to your cloud provider (AWS STS, Azure AD, GCP STS)
3. The cloud provider validates the token against GitHub's OIDC issuer
4. If the token's claims match your trust policy (correct repository, branch, environment), the cloud provider issues temporary credentials
5. Terraform uses these temporary credentials for the duration of the run

The temporary credentials typically expire after one hour and cannot be reused.

## AWS OIDC Setup

### Step 1: Create the OIDC Identity Provider

Create the GitHub OIDC provider in your AWS account. You only need to do this once per account:

```hcl
# oidc-provider.tf
# Create the GitHub Actions OIDC identity provider

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  # The audience that GitHub Actions tokens are issued for
  client_id_list = ["sts.amazonaws.com"]

  # GitHub's OIDC provider thumbprint
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = {
    Name        = "github-actions-oidc"
    Description = "OIDC provider for GitHub Actions"
  }
}
```

### Step 2: Create the IAM Role

Create a role that GitHub Actions will assume. The trust policy controls which repositories, branches, and environments can assume the role:

```hcl
# iam-role.tf
# IAM role for GitHub Actions Terraform workflows

resource "aws_iam_role" "terraform_github_actions" {
  name = "terraform-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Allow the specific repository
            "token.actions.githubusercontent.com:sub" = [
              # Main branch deployments
              "repo:myorg/infrastructure:ref:refs/heads/main",
              # Pull request plans
              "repo:myorg/infrastructure:pull_request",
              # Environment-based deployments
              "repo:myorg/infrastructure:environment:production",
              "repo:myorg/infrastructure:environment:staging",
            ]
          }
        }
      }
    ]
  })

  # Maximum session duration (1 hour for Terraform runs)
  max_session_duration = 3600

  tags = {
    Purpose = "GitHub Actions Terraform deployments"
  }
}

# Attach a policy with the permissions Terraform needs
resource "aws_iam_role_policy" "terraform_permissions" {
  name = "terraform-permissions"
  role = aws_iam_role.terraform_github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "s3:*",
          "iam:*",
          "elasticloadbalancing:*",
          "autoscaling:*",
          "cloudwatch:*",
          "route53:*",
        ]
        Resource = "*"
      },
      {
        # Allow Terraform to manage its own state in S3
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::my-terraform-state",
          "arn:aws:s3:::my-terraform-state/*",
        ]
      },
      {
        # Allow state locking with DynamoDB
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks"
      }
    ]
  })
}
```

### Step 3: Configure the GitHub Actions Workflow

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write   # Required for requesting the OIDC JWT
  contents: read     # Required for actions/checkout
  pull-requests: write  # Required for plan comments

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Authenticate with AWS using OIDC - no secrets needed
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-github-actions
          aws-region: us-east-1
          # Optional: role session name for CloudTrail auditing
          role-session-name: github-actions-terraform-${{ github.run_id }}

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color -input=false

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-github-actions
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve -input=false
```

## Azure OIDC Setup

### Step 1: Create the Federated Identity Credential

```bash
# Create an Azure AD application
az ad app create --display-name "github-actions-terraform"

# Get the application ID
APP_ID=$(az ad app list --display-name "github-actions-terraform" --query "[0].appId" -o tsv)

# Create a service principal
az ad sp create --id $APP_ID

# Create a federated identity credential for the main branch
az ad app federated-credential create --id $APP_ID --parameters '{
    "name": "github-actions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:myorg/infrastructure:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"],
    "description": "GitHub Actions main branch"
}'

# Create another for pull requests
az ad app federated-credential create --id $APP_ID --parameters '{
    "name": "github-actions-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:myorg/infrastructure:pull_request",
    "audiences": ["api://AzureADTokenExchange"],
    "description": "GitHub Actions pull requests"
}'

# Assign the Contributor role to the service principal
az role assignment create \
    --assignee $APP_ID \
    --role "Contributor" \
    --scope "/subscriptions/YOUR_SUBSCRIPTION_ID"
```

### Step 2: Configure the Workflow

```yaml
name: Terraform Azure

on:
  push:
    branches: [main]
  pull_request:

permissions:
  id-token: write
  contents: read

env:
  ARM_CLIENT_ID: "your-app-client-id"
  ARM_SUBSCRIPTION_ID: "your-subscription-id"
  ARM_TENANT_ID: "your-tenant-id"

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Authenticate with Azure using OIDC
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ env.ARM_CLIENT_ID }}
          tenant-id: ${{ env.ARM_TENANT_ID }}
          subscription-id: ${{ env.ARM_SUBSCRIPTION_ID }}

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        env:
          ARM_USE_OIDC: true

      - name: Terraform Plan
        run: terraform plan
        env:
          ARM_USE_OIDC: true
```

## GCP OIDC Setup

### Step 1: Create the Workload Identity Pool

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create "github-actions" \
    --location="global" \
    --display-name="GitHub Actions"

# Create a provider within the pool
gcloud iam workload-identity-pools providers create-oidc "github" \
    --location="global" \
    --workload-identity-pool="github-actions" \
    --display-name="GitHub" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-condition="assertion.repository=='myorg/infrastructure'"

# Create a service account for Terraform
gcloud iam service-accounts create terraform-github-actions \
    --display-name="Terraform GitHub Actions"

# Grant the service account the needed roles
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:terraform-github-actions@my-project.iam.gserviceaccount.com" \
    --role="roles/editor"

# Allow the workload identity to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
    terraform-github-actions@my-project.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/github-actions/attribute.repository/myorg/infrastructure"
```

### Step 2: Configure the Workflow

```yaml
name: Terraform GCP

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

      # Authenticate with GCP using OIDC
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/github-actions/providers/github'
          service_account: 'terraform-github-actions@my-project.iam.gserviceaccount.com'

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan
```

## Multi-Account OIDC

For organizations using separate cloud accounts per environment, use different roles:

```yaml
jobs:
  deploy-dev:
    environment: dev
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/terraform-github-actions
          aws-region: us-east-1

  deploy-production:
    environment: production
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::222222222222:role/terraform-github-actions
          aws-region: us-east-1
```

Each AWS account has its own OIDC provider and role, and the trust policy on the production role restricts access to the production environment.

## Troubleshooting OIDC

**Error: "Not authorized to perform sts:AssumeRoleWithWebIdentity"**
The trust policy condition does not match the token claims. Check that the `sub` claim matches your repository, branch, or environment. Print the token claims for debugging:

```yaml
- name: Debug OIDC token
  run: |
    TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r '.value')
    echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

**Error: "Audience validation failed"**
Ensure the `client_id_list` in your OIDC provider includes `sts.amazonaws.com`.

## Conclusion

OIDC authentication is the most secure way to run Terraform in GitHub Actions. No long-lived credentials to store, no keys to rotate, and fine-grained control over which workflows can access which cloud accounts. The initial setup requires creating the OIDC provider and trust relationships, but once configured, your workflows become simpler and more secure. If your cloud provider supports OIDC with GitHub Actions, there is no good reason to use stored credentials.

For more on GitHub Actions environments, see our guide on [using environments for Terraform deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-use-github-actions-environments-for-terraform/view).
