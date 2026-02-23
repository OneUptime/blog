# How to Handle Module Source Authentication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Authentication, Security, Git, Registry

Description: Configure authentication for Terraform module sources including Git over SSH and HTTPS, private registries, S3 buckets, and credential management best practices.

---

When your Terraform modules live in private repositories, registries, or cloud storage, you need proper authentication to download them. Getting authentication right is critical - it needs to work for both local development and CI/CD pipelines. This post covers authentication setup for every common module source type.

## Git Authentication Over SSH

SSH is the most common authentication method for private Git repositories. It works with GitHub, GitLab, Bitbucket, and any Git server.

```hcl
# SSH-based module source
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}

# Short form (GitHub-specific)
module "vpc" {
  source = "git@github.com:myorg/terraform-aws-vpc.git?ref=v1.0.0"
}
```

### Setting Up SSH Keys

```bash
# Generate an SSH key (if you do not already have one)
ssh-keygen -t ed25519 -C "terraform@myorg.com" -f ~/.ssh/terraform_key

# Add the key to your SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/terraform_key

# Test the connection
ssh -T git@github.com
```

### SSH Configuration for Multiple Accounts

If you work with multiple Git organizations, use SSH config to route to the correct key:

```
# ~/.ssh/config

# Default GitHub account
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519

# Organization-specific key
Host github-myorg
  HostName github.com
  User git
  IdentityFile ~/.ssh/terraform_key
```

```hcl
# Use the custom host alias in your module source
module "vpc" {
  source = "git::ssh://git@github-myorg/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}
```

### SSH in CI/CD Pipelines

```yaml
# GitHub Actions - using a deploy key
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Set up SSH for private module access
      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.MODULE_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan github.com >> ~/.ssh/known_hosts

      - name: Terraform Init
        run: terraform init
```

## Git Authentication Over HTTPS

HTTPS authentication uses personal access tokens or machine tokens.

```hcl
# HTTPS module source
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}
```

### Using Git Credential Helpers

```bash
# Store credentials in a local file (development only)
git config --global credential.helper store

# Use credential cache with a timeout
git config --global credential.helper 'cache --timeout=3600'

# For macOS, use the Keychain
git config --global credential.helper osxkeychain
```

### Using Tokens in CI/CD

```bash
# Set up HTTPS authentication with a token
# Method 1: Git configuration
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"

# Method 2: Credential helper with token
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
git config --global credential.helper 'store --file ~/.git-credentials'
```

```yaml
# GitHub Actions with HTTPS token
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure Git for private modules
        run: |
          git config --global url."https://oauth2:${{ secrets.MODULE_TOKEN }}@github.com".insteadOf "https://github.com"

      - name: Terraform Init
        run: terraform init
```

## Terraform Registry Authentication

Private module registries in Terraform Cloud, Terraform Enterprise, or custom registries require API token authentication.

```hcl
# Terraform Cloud private registry
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.0.0"
}
```

### CLI Configuration for Registry Auth

```hcl
# ~/.terraformrc (macOS/Linux) or %APPDATA%\terraform.rc (Windows)
credentials "app.terraform.io" {
  token = "your-api-token-here"
}

# For custom Terraform Enterprise installations
credentials "terraform.myorg.com" {
  token = "your-enterprise-token-here"
}
```

### Using terraform login

```bash
# Interactive login to Terraform Cloud
terraform login

# Login to a custom registry
terraform login terraform.myorg.com
```

### Environment Variable Authentication

```bash
# Set the token via environment variable
export TF_TOKEN_app_terraform_io="your-token-here"

# For custom domains (replace dots with underscores)
export TF_TOKEN_terraform_myorg_com="your-token-here"
```

```yaml
# CI/CD with registry token
jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_TOKEN_app_terraform_io: ${{ secrets.TFC_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - run: terraform plan
```

## S3 Module Source Authentication

For modules stored in S3, Terraform uses standard AWS credentials.

```hcl
# S3 module source
module "custom" {
  source = "s3::https://my-terraform-modules.s3.us-east-1.amazonaws.com/vpc/v1.0.0.zip"
}
```

```bash
# Configure AWS credentials
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"

# Or use AWS profiles
export AWS_PROFILE="terraform-modules"

# Or use IAM roles in CI/CD (preferred)
# GitHub Actions example with OIDC
```

```yaml
# GitHub Actions with AWS OIDC authentication
jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/TerraformModuleAccess
          aws-region: us-east-1

      - run: terraform init
```

## GCS Module Source Authentication

For Google Cloud Storage module sources:

```hcl
# GCS module source
module "custom" {
  source = "gcs::https://www.googleapis.com/storage/v1/my-terraform-modules/vpc/v1.0.0.zip"
}
```

```bash
# Authenticate with Google Cloud
gcloud auth application-default login

# Or use a service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## GitLab Authentication

GitLab has its own patterns for module authentication.

```hcl
# GitLab module registry
module "vpc" {
  source = "gitlab.com/mygroup/terraform-aws-vpc/aws"
  version = "1.0.0"
}
```

```bash
# Set up GitLab token for registry access
export TF_TOKEN_gitlab_com="your-gitlab-token"

# For self-hosted GitLab
export TF_TOKEN_gitlab_myorg_com="your-token"

# For Git sources over HTTPS
git config --global url."https://oauth2:${GITLAB_TOKEN}@gitlab.com".insteadOf "https://gitlab.com"
```

## Credential Management Best Practices

### Use Machine Tokens, Not Personal Tokens

```bash
# Bad: Using a personal access token
# If the developer leaves, the token becomes invalid

# Good: Create a machine account or service token
# - GitHub: Use a GitHub App installation token
# - GitLab: Use a project or group access token
# - Terraform Cloud: Use a team token
```

### Rotate Credentials Regularly

```bash
# Script to check token age and notify
#!/bin/bash
TOKEN_CREATED=$(gh api user --jq '.created_at')
DAYS_OLD=$(( ($(date +%s) - $(date -d "$TOKEN_CREATED" +%s)) / 86400 ))

if [ "$DAYS_OLD" -gt 90 ]; then
  echo "WARNING: Token is $DAYS_OLD days old. Consider rotating."
fi
```

### Use Short-Lived Credentials

```yaml
# GitHub Actions with OIDC - no long-lived secrets
jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      # AWS credentials via OIDC - automatically expire
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/TerraformCI
          aws-region: us-east-1

      # Git credentials via GitHub App token - 1 hour expiry
      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - run: |
          git config --global url."https://x-access-token:${{ steps.app-token.outputs.token }}@github.com".insteadOf "https://github.com"
          terraform init
```

### Never Hardcode Credentials

```hcl
# Bad: Credentials in Terraform configuration
module "vpc" {
  source = "git::https://mytoken:x-oauth-basic@github.com/myorg/vpc.git"  # NEVER do this
}

# Good: Let the environment handle authentication
module "vpc" {
  source = "git::https://github.com/myorg/vpc.git?ref=v1.0.0"  # Credentials from git config
}
```

## Troubleshooting Authentication Issues

```bash
# Test Git SSH connectivity
ssh -vT git@github.com

# Test Git HTTPS connectivity
GIT_CURL_VERBOSE=1 git ls-remote https://github.com/myorg/vpc.git

# Enable Terraform debug logging for download issues
TF_LOG=DEBUG terraform init

# Check current AWS identity
aws sts get-caller-identity

# Verify Terraform Cloud token
curl -s -H "Authorization: Bearer $TF_TOKEN" \
  https://app.terraform.io/api/v2/account/details
```

## Conclusion

Module source authentication is a foundational part of any Terraform workflow. Use SSH keys for local development, machine tokens for CI/CD, and OIDC-based short-lived credentials wherever possible. Keep credentials out of your Terraform code, rotate them regularly, and use the principle of least privilege when granting access to module repositories.

For more on module management, see our posts on [how to use the terraform get command to download modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-get-command-to-download-modules/view) and [how to version Terraform modules with Git tags](https://oneuptime.com/blog/post/2026-02-23-how-to-version-terraform-modules-with-git-tags/view).
