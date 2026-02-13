# How to Configure AWS Provider Authentication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Authentication, IAM

Description: Learn every method for authenticating the Terraform AWS provider, from environment variables and shared credentials to assume role and OIDC federation.

---

Every Terraform AWS project starts the same way - configuring the provider to authenticate with your AWS account. Get it wrong and nothing works. Get it right but insecurely and you've got credentials leaking everywhere. This guide covers every authentication method for the Terraform AWS provider, when to use each one, and the security implications.

## The AWS Provider Block

At its most basic, the AWS provider just needs a region.

```hcl
# Minimal provider configuration
provider "aws" {
  region = "us-east-1"
}
```

But where do the credentials come from? Terraform follows a credential resolution chain, similar to the AWS CLI. It checks multiple sources in order, using the first valid credentials it finds.

## Credential Resolution Order

Terraform checks these sources in order:

1. Provider block configuration (hardcoded - don't do this)
2. Environment variables
3. Shared credentials file (`~/.aws/credentials`)
4. Shared configuration file (`~/.aws/config`)
5. Container credentials (ECS task role)
6. Instance profile credentials (EC2 instance role)

Let's go through each method.

## Method 1: Environment Variables (Recommended for CI/CD)

The simplest and most common method for CI/CD pipelines.

```bash
# Set environment variables before running Terraform
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# Optional: for temporary credentials (STS)
export AWS_SESSION_TOKEN="AQoDYXdzEJr..."
```

Your provider block stays clean.

```hcl
# Provider picks up credentials from environment variables
provider "aws" {
  region = "us-east-1"
}
```

In GitHub Actions:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      AWS_DEFAULT_REGION: us-east-1
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - run: terraform apply -auto-approve
```

## Method 2: Shared Credentials File (Local Development)

For local development, the AWS CLI's credentials file is the most convenient option.

```bash
# Configure credentials with the AWS CLI
aws configure

# This creates ~/.aws/credentials with your keys
# and ~/.aws/config with your default region
```

Your credentials file looks like this:

```ini
# ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[staging]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

Use a specific profile in Terraform.

```hcl
# Use a named profile instead of default
provider "aws" {
  region  = "us-east-1"
  profile = "staging"
}
```

Or set it via environment variable.

```bash
export AWS_PROFILE=staging
terraform plan
```

## Method 3: Assume Role (Cross-Account Access)

For multi-account setups, assume role is the standard pattern. You authenticate with one account and assume a role in another.

```hcl
# Assume a role in a different account
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::987654321098:role/TerraformDeployRole"
    session_name = "terraform-deploy"
    external_id  = "my-external-id"  # Optional but recommended
  }
}
```

This is the recommended approach for production deployments. Your CI/CD pipeline authenticates with its own credentials, then assumes a role in the target account. The target account controls what the role can do.

For more detail on assume role patterns, see our dedicated guide on [Terraform with assume role for cross-account access](https://oneuptime.com/blog/post/2026-02-12-terraform-assume-role-cross-account-access/view).

## Method 4: OIDC Federation (Best for GitHub Actions)

OIDC removes the need for long-lived AWS credentials in your CI/CD platform. GitHub Actions (and GitLab CI) can get temporary credentials directly from AWS using identity federation.

```hcl
# No credentials needed - OIDC handles it
provider "aws" {
  region = "us-east-1"
}
```

In GitHub Actions:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # Required for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      # Get temporary AWS credentials via OIDC
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - run: terraform init
      - run: terraform apply -auto-approve
```

You need to set up an OIDC identity provider in AWS first.

```hcl
# Terraform to create the OIDC provider (one-time setup)
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Role that GitHub Actions can assume
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
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
          # Restrict to your specific repo
          "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
        }
      }
    }]
  })
}

# Attach policies to the role
resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess" # Scope this down
}
```

## Method 5: EC2 Instance Profile

When running Terraform from an EC2 instance (like a Jenkins server), use instance profiles. No credentials to manage.

```hcl
# Terraform automatically uses the instance profile
provider "aws" {
  region = "us-east-1"
}
```

The instance needs an IAM role attached with the permissions Terraform requires.

## Method 6: ECS Task Role

Same concept as instance profiles but for containers running in ECS.

```hcl
# Terraform running in an ECS task picks up the task role automatically
provider "aws" {
  region = "us-east-1"
}
```

## Multiple Provider Configurations

You often need to work with multiple regions or accounts in the same Terraform configuration.

```hcl
# Default provider for us-east-1
provider "aws" {
  region = "us-east-1"
}

# Aliased provider for eu-west-1
provider "aws" {
  alias  = "europe"
  region = "eu-west-1"
}

# Aliased provider for a different account
provider "aws" {
  alias  = "production"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::999888777666:role/TerraformRole"
  }
}

# Use the aliased provider on specific resources
resource "aws_s3_bucket" "eu_bucket" {
  provider = aws.europe
  bucket   = "my-eu-bucket"
}
```

## What NOT to Do

Never hardcode credentials in your Terraform files.

```hcl
# NEVER DO THIS
provider "aws" {
  region     = "us-east-1"
  access_key = "AKIAIOSFODNN7EXAMPLE"           # NO!
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY" # NO!
}
```

Even if your repo is private, credentials in code are a security risk. They end up in state files, logs, and version control history. Use any of the other methods instead.

## Debugging Authentication Issues

When Terraform can't authenticate, here's how to diagnose.

```bash
# Check which credentials Terraform would use
aws sts get-caller-identity

# Enable debug logging to see credential resolution
export TF_LOG=DEBUG
terraform plan 2>&1 | grep -i "credential\|auth\|assume"

# Verify the role you're trying to assume
aws sts assume-role \
  --role-arn arn:aws:iam::987654321098:role/TerraformRole \
  --role-session-name test
```

## Wrapping Up

For local development, use shared credentials with named profiles. For CI/CD, use OIDC federation if your platform supports it, or environment variables with temporary credentials. For cross-account deployments, use assume role. Whatever you do, keep credentials out of your Terraform code and state files.

For managing your Terraform state securely, check out our guide on [Terraform state with S3 backend and DynamoDB locking](https://oneuptime.com/blog/post/2026-02-12-terraform-state-with-s3-backend-and-dynamodb-locking/view).
