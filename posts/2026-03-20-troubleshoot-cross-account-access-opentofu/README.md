# How to Troubleshoot Cross-Account Access Issues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, AWS, Cross-Account, IAM, Infrastructure as Code

Description: Learn how to diagnose and fix cross-account access failures in OpenTofu when managing resources across multiple AWS accounts using role assumption.

## Introduction

Managing infrastructure across multiple AWS accounts is common in enterprise environments: a shared services account, separate dev/staging/prod accounts, and a security account. OpenTofu handles this through provider aliases with `assume_role` blocks. When cross-account access fails, the errors often involve IAM trust policies, STS permissions, or missing resource-based policies.

## Understanding the Error Pattern

```text
Error: configuring Terraform AWS Provider: getting caller identity:
operation error STS: GetCallerIdentity, https response error StatusCode: 403,
RequestID: ..., api error AccessDenied: User: arn:aws:iam::111111111111:user/ci-user
is not authorized to assume role: arn:aws:iam::222222222222:role/OpenTofuRole
```

The error tells you exactly: the source identity (`111111111111:user/ci-user`) cannot assume the target role (`222222222222:role/OpenTofuRole`).

## Step 1: Verify the Trust Policy

The target role must explicitly trust the source identity.

```bash
# Check the trust policy of the role you're trying to assume

aws iam get-role \
  --role-name OpenTofuRole \
  --query 'Role.AssumeRolePolicyDocument' \
  --output json \
  --profile target-account
```

The trust policy must include the source account or specific principal.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::111111111111:root"
    },
    "Action": ["sts:AssumeRole", "sts:TagSession"]
  }]
}
```

In OpenTofu, manage the cross-account role with the correct trust relationship.

```hcl
resource "aws_iam_role" "opentofu_cross_account" {
  provider = aws.target  # provider aliased to target account

  name = "OpenTofuRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        AWS = "arn:aws:iam::111111111111:root"  # source account
      }
      Action    = ["sts:AssumeRole", "sts:TagSession"]
      # Optional: restrict to specific source role
      Condition = {
        ArnEquals = {
          "aws:PrincipalArn" = "arn:aws:iam::111111111111:role/OpenTofuCIRole"
        }
      }
    }]
  })
}
```

## Step 2: Verify Source IAM Permissions

The source identity needs permission to call `sts:AssumeRole`. If the provider passes session tags, it also needs `sts:TagSession`.

```bash
# Check if the current identity can assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/OpenTofuRole \
  --role-session-name debug-session \
  --tags Key=ManagedBy,Value=opentofu

# If that fails, check the source role/user policy
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::111111111111:role/ci-role \
  --action-names sts:AssumeRole sts:TagSession \
  --resource-arns arn:aws:iam::222222222222:role/OpenTofuRole
```

## Step 3: Configure Provider Aliases Correctly

```hcl
# Correct multi-account provider setup
provider "aws" {
  region = "us-east-1"
  alias  = "source"
  # Uses default credential chain for source account
}

provider "aws" {
  region = "us-east-1"
  alias  = "target"

  assume_role {
    role_arn     = "arn:aws:iam::222222222222:role/OpenTofuRole"
    session_name = "opentofu-${terraform.workspace}"
    # Optional: tag the session for CloudTrail
    # Requires sts:TagSession in the target role trust policy
    tags = {
      ManagedBy = "opentofu"
    }
  }
}

# Use the correct provider alias for each resource
resource "aws_s3_bucket" "shared_artifacts" {
  provider = aws.target
  bucket   = "my-shared-artifacts"
}
```

## Step 4: Debug STS Assume Role Chain

For chained role assumption (source → intermediate → target), each hop must be configured.

```bash
# Test each hop in the chain manually
# Hop 1: source → intermediate
aws sts assume-role \
  --role-arn arn:aws:iam::333333333333:role/IntermediateRole \
  --role-session-name hop1

# Set the credentials from hop1, then test hop 2
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

# Hop 2: intermediate → target
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/OpenTofuRole \
  --role-session-name hop2
```

## Step 5: S3 State Bucket Cross-Account Access

If the state bucket is in a different account, the bucket policy must allow the IAM principal used by the S3 backend. Provider aliases do not configure backend access; unless the backend has its own `assume_role`, backend operations use the credentials passed to `tofu init`.

```hcl
# Add bucket policy to allow the backend identity to access state
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = {
        AWS = "arn:aws:iam::111111111111:role/OpenTofuCIRole"
      }
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.state.arn,
        "${aws_s3_bucket.state.arn}/*"
      ]
    }]
  })
}
```

## Summary

Cross-account access failures follow a checklist: verify the target role's trust policy includes the source identity, confirm the source has `sts:AssumeRole` permission for the target role ARN and `sts:TagSession` when tagging sessions, check provider alias `assume_role` configuration matches the exact role ARN, and for state buckets in another account, add a bucket policy granting the backend identity access. Use `aws sts assume-role` manually to test each hop before debugging OpenTofu - if the CLI fails, OpenTofu will too.
