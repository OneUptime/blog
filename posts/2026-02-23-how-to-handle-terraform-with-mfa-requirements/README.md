# How to Handle Terraform with MFA Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, MFA, Security, Authentication

Description: Learn practical approaches to running Terraform with AWS MFA requirements including assume role patterns, session tokens, and CI/CD integration.

---

Multi-factor authentication is a security requirement in most organizations, and for good reason. But when your AWS account requires MFA for API access, running Terraform becomes more complicated. Terraform itself does not have a built-in MFA prompt, so you need a workflow that satisfies MFA requirements without breaking automation.

This guide covers practical patterns for running Terraform in environments where MFA is mandatory, from local development to CI/CD pipelines.

## Understanding the MFA Challenge

When an IAM policy requires MFA, AWS checks for the `aws:MultiFactorAuthPresent` condition key. Standard access keys do not satisfy this condition. You need to obtain temporary credentials through STS by providing an MFA token code.

A typical MFA enforcement policy looks like this:

```hcl
# This is what your security team has probably applied
resource "aws_iam_policy" "require_mfa" {
  name = "require-mfa"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowWithMFA"
        Effect = "Allow"
        Action = "*"
        Resource = "*"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}
```

## Pattern 1: Assume Role with MFA

The cleanest approach is to use an assume-role pattern where the role trust policy requires MFA. Your user authenticates with MFA to get temporary credentials, then assumes a role that grants the actual permissions.

First, create the Terraform execution role:

```hcl
resource "aws_iam_role" "terraform_executor" {
  name = "terraform-executor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          NumericLessThan = {
            # Session must be less than 1 hour old
            "aws:MultiFactorAuthAge" = "3600"
          }
        }
      }
    ]
  })

  max_session_duration = 3600
}

# Attach appropriate permissions to the role
resource "aws_iam_role_policy_attachment" "terraform_admin" {
  role       = aws_iam_role.terraform_executor.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

Configure your AWS CLI profile to use this role with MFA:

```ini
# ~/.aws/config
[profile terraform]
role_arn = arn:aws:iam::123456789012:role/terraform-executor
source_profile = default
mfa_serial = arn:aws:iam::123456789012:mfa/your-username
region = us-east-1
```

Then configure Terraform to use this profile:

```hcl
provider "aws" {
  profile = "terraform"
  region  = "us-east-1"
}
```

When you run `terraform plan`, the AWS SDK will prompt you for your MFA code.

## Pattern 2: Pre-authenticate with a Wrapper Script

If you prefer more control over the authentication flow, use a wrapper script that obtains temporary credentials before running Terraform:

```bash
#!/bin/bash
# terraform-mfa.sh - Wrapper script for Terraform with MFA

MFA_SERIAL="arn:aws:iam::123456789012:mfa/your-username"
ROLE_ARN="arn:aws:iam::123456789012:role/terraform-executor"
DURATION=3600

# Check if we already have valid credentials
if [ -n "$AWS_SESSION_TOKEN" ]; then
  # Test if credentials are still valid
  aws sts get-caller-identity > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "Using existing session credentials"
    terraform "$@"
    exit $?
  fi
fi

# Prompt for MFA token
read -p "Enter MFA token code: " MFA_TOKEN

# Get temporary credentials via assume-role with MFA
CREDS=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name "terraform-$(date +%s)" \
  --serial-number "$MFA_SERIAL" \
  --token-code "$MFA_TOKEN" \
  --duration-seconds "$DURATION" \
  --output json)

if [ $? -ne 0 ]; then
  echo "Failed to assume role with MFA"
  exit 1
fi

# Export temporary credentials
export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.Credentials.SessionToken')

echo "Authenticated successfully. Session valid for $DURATION seconds."

# Run Terraform with the temporary credentials
terraform "$@"
```

Usage:

```bash
chmod +x terraform-mfa.sh
./terraform-mfa.sh plan
./terraform-mfa.sh apply
```

## Pattern 3: Use aws-vault

The `aws-vault` tool handles MFA sessions automatically and stores credentials securely in your OS keychain:

```bash
# Install aws-vault
brew install aws-vault

# Add your credentials
aws-vault add my-profile

# Configure the role with MFA in ~/.aws/config
# [profile terraform]
# role_arn = arn:aws:iam::123456789012:role/terraform-executor
# source_profile = my-profile
# mfa_serial = arn:aws:iam::123456789012:mfa/your-username

# Run Terraform through aws-vault
aws-vault exec terraform -- terraform plan
aws-vault exec terraform -- terraform apply
```

`aws-vault` caches the session tokens so you only need to enter your MFA code once per session duration.

## Pattern 4: CI/CD Without MFA

CI/CD pipelines cannot enter MFA codes interactively. The standard approach is to use IAM roles that do not require MFA but are restricted to the CI/CD environment:

```hcl
# Role for CI/CD that does NOT require MFA
# but is restricted by other conditions
resource "aws_iam_role" "ci_terraform" {
  name = "ci-terraform-executor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          # Only the CI/CD runner role can assume this
          AWS = "arn:aws:iam::123456789012:role/github-actions-runner"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            # Restrict to specific source
            "aws:PrincipalTag/Environment" = "ci"
          }
          IpAddress = {
            # Restrict to known CI/CD IP ranges
            "aws:SourceIp" = var.ci_runner_cidrs
          }
        }
      }
    ]
  })
}
```

For GitHub Actions, use OIDC federation to avoid storing any credentials:

```hcl
# GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Role that GitHub Actions can assume
resource "aws_iam_role" "github_actions_terraform" {
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
            # Only from specific repo and branch
            "token.actions.githubusercontent.com:sub" = "repo:your-org/your-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}
```

## Backend Configuration with MFA

When using S3 for Terraform state, the backend also needs to handle MFA. Configure the backend to use the same assume-role pattern:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"

    # Use the same role assumption for state access
    role_arn = "arn:aws:iam::123456789012:role/terraform-executor"
    profile  = "terraform"
  }
}
```

## Session Duration Considerations

MFA sessions expire. Plan accordingly:

```bash
# For long-running applies, request a longer session
aws sts assume-role \
  --role-arn "arn:aws:iam::123456789012:role/terraform-executor" \
  --role-session-name "terraform-long-apply" \
  --serial-number "arn:aws:iam::123456789012:mfa/your-username" \
  --token-code "123456" \
  --duration-seconds 7200  # 2 hours for large applies
```

The maximum session duration is controlled by the role's `max_session_duration` setting (up to 12 hours).

## Summary

Handling MFA with Terraform comes down to choosing the right authentication pattern for each context. For local development, use assume-role with MFA in your AWS profile or a tool like aws-vault. For CI/CD, use OIDC federation or restricted IAM roles that compensate for the lack of MFA with other controls. The key is that every path to your cloud credentials should have appropriate authentication strength for its risk level.

For more Terraform security patterns, see our guide on [how to implement IAM policy best practices with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-iam-policy-best-practices-with-terraform/view).
