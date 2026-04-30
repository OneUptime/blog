# How to Set Up Cross-Account IAM Assume Role with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Cross-Account, Assume Role, Multi-Account, Infrastructure as Code

Description: Learn how to configure cross-account IAM role assumption using OpenTofu to enable secure access between AWS accounts without sharing credentials.

## Introduction

Cross-account role assumption allows principals in one AWS account to assume roles in another account. This is the foundation of multi-account architectures, enabling centralized tooling, shared services, and CI/CD pipelines to access resources across your AWS organization securely.

## Prerequisites

- OpenTofu v1.6+
- AWS CLI v2
- jq (for the AWS CLI example)
- AWS credentials with IAM permissions in both accounts
- At least two AWS accounts

## Step 1: Create the Role in the Target Account

```hcl
# In the TARGET account - create a role that the source account can assume

resource "aws_iam_role" "cross_account_target" {
  name        = "CrossAccountAccessRole"
  description = "Role assumable from the central tooling account"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCentralAccountAssume"
        Effect = "Allow"
        Principal = {
          # The SOURCE account ID that is allowed to assume this role
          AWS = "arn:aws:iam::${var.source_account_id}:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          # Require MFA for human users (remove for service accounts)
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
          StringEquals = {
            # Require the expected external ID to mitigate the confused deputy problem
            "sts:ExternalId" = var.external_id
          }
        }
      }
    ]
  })

  tags = {
    Name          = "CrossAccountAccessRole"
    SourceAccount = var.source_account_id
  }
}

# Attach permissions the cross-account role should have
resource "aws_iam_role_policy_attachment" "cross_account_readonly" {
  role       = aws_iam_role.cross_account_target.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## Step 2: Grant Source Account Permission to Assume the Role

```hcl
# In the SOURCE account - grant permission to assume the target role
resource "aws_iam_policy" "assume_cross_account" {
  name        = "AssumeTargetAccountRole"
  description = "Allow assuming roles in target accounts"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowAssumeTargetRole"
      Effect = "Allow"
      Action = ["sts:AssumeRole"]
      Resource = [
        "arn:aws:iam::${var.target_account_id}:role/CrossAccountAccessRole"
      ]
    }]
  })
}

# Attach to the CI/CD role in the source account
resource "aws_iam_role_policy_attachment" "cicd_assume" {
  role       = var.cicd_role_name
  policy_arn = aws_iam_policy.assume_cross_account.arn
}
```

## Step 3: Use Multi-Provider Configuration

```hcl
# OpenTofu provider using the cross-account role
provider "aws" {
  region = var.region
  alias  = "target"

  assume_role {
    role_arn     = "arn:aws:iam::${var.target_account_id}:role/CrossAccountAccessRole"
    session_name = "OpenTofu-CrossAccount"
    external_id  = var.external_id
  }
}

# Deploy resources in the target account using the cross-account provider
resource "aws_s3_bucket" "target_bucket" {
  provider = aws.target
  bucket   = "${var.project_name}-target-account-bucket"
  tags     = { ManagedBy = "CrossAccountRole" }
}
```

## Step 4: Assume Role via AWS CLI

```bash
# Assume the cross-account role and export credentials
SOURCE_ACCOUNT_ID="111122223333"
TARGET_ACCOUNT_ID="123456789012"

CREDENTIALS=$(aws sts assume-role \
  --role-arn "arn:aws:iam::${TARGET_ACCOUNT_ID}:role/CrossAccountAccessRole" \
  --role-session-name "cli-session" \
  --external-id "my-external-id" \
  --serial-number "arn:aws:iam::${SOURCE_ACCOUNT_ID}:mfa/username" \
  --token-code "123456")

export AWS_ACCESS_KEY_ID=$(printf '%s' "$CREDENTIALS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(printf '%s' "$CREDENTIALS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(printf '%s' "$CREDENTIALS" | jq -r '.Credentials.SessionToken')

# Now commands run in the target account context
aws s3 ls  # Lists buckets in target account
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Cross-account role assumption is more secure than creating IAM users with long-lived credentials. Always use an `ExternalId` for third-party tool access to prevent the confused deputy problem. Set `session duration` appropriately: shorter for human users (1 hour) and longer for automated pipelines (up to 12 hours, subject to the role's maximum session duration). If the caller is already using temporary credentials through role chaining, the maximum session duration is 1 hour. Audit cross-account activity via CloudTrail in each account by filtering for `AssumeRole` events.
