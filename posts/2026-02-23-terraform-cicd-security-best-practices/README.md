# How to Implement Terraform CI/CD Security Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Security, DevOps, Infrastructure as Code

Description: A practical guide to securing your Terraform CI/CD pipelines covering secrets management, least privilege access, state file protection, and supply chain security.

---

Running Terraform in a CI/CD pipeline introduces security risks that don't exist when you run it locally. Your pipeline has access to cloud credentials, state files with sensitive data, and the ability to modify production infrastructure. Getting security wrong here can be catastrophic.

This post walks through the security practices you should implement in your Terraform CI/CD pipelines, with concrete examples for GitHub Actions.

## Secrets Management

The most common mistake is hardcoding credentials in pipeline configuration. Every CI/CD platform provides a secrets mechanism - use it.

```yaml
# .github/workflows/terraform.yml
# Good: Use environment secrets with OIDC authentication
name: Terraform Apply
on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production  # Uses environment-specific secrets
    steps:
      - uses: actions/checkout@v4

      # Use OIDC instead of static credentials
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-ci
          aws-region: us-east-1

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
```

OIDC (OpenID Connect) is the gold standard for CI/CD authentication. Instead of storing long-lived access keys, your pipeline requests short-lived tokens that expire after the job completes.

For AWS, set up the OIDC provider:

```hcl
# oidc-provider.tf
# Create the GitHub OIDC provider in AWS
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role that GitHub Actions will assume
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
        StringEquals = {
          # Lock down to specific repo and branch
          "token.actions.githubusercontent.com:sub" = "repo:myorg/infra:ref:refs/heads/main"
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}
```

## Least Privilege IAM Policies

Your Terraform CI/CD role should only have permissions it actually needs. Start restrictive and add permissions as needed rather than starting with admin access.

```hcl
# ci-policy.tf
# Scoped-down policy for Terraform CI role
resource "aws_iam_role_policy" "terraform_ci" {
  name = "terraform-ci-policy"
  role = aws_iam_role.terraform_ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # State file access - read/write to specific bucket
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::my-terraform-state/*"
      },
      {
        # State locking via DynamoDB
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks"
      },
      {
        # Only allow managing specific resource types
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "s3:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2"]
          }
        }
      }
    ]
  })
}
```

## State File Security

Terraform state files contain sensitive information - database passwords, API keys, and resource IDs. Protect them.

```hcl
# backend.tf
# Encrypted remote backend with access logging
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true                    # Enable server-side encryption
    kms_key_id     = "alias/terraform-state" # Use customer-managed KMS key
    dynamodb_table = "terraform-locks"       # State locking
  }
}
```

```hcl
# state-bucket.tf
# S3 bucket for state with security hardening
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning for state recovery
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable access logging
resource "aws_s3_bucket_logging" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "terraform-state-logs/"
}
```

## Scanning and Static Analysis

Run security scanners before applying any changes. These catch misconfigurations early.

```yaml
# .github/workflows/terraform-security.yml
name: Terraform Security Scan
on:
  pull_request:
    paths: ['**.tf']

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # tfsec finds security issues in Terraform code
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: false  # Fail the pipeline on findings

      # checkov does broader policy-as-code scanning
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          soft_fail: false

      # Detect secrets accidentally committed
      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          extra_args: --only-verified
```

## Supply Chain Security

Pin your provider and module versions. An unpinned provider could be hijacked or introduce breaking changes.

```hcl
# versions.tf
terraform {
  # Pin Terraform version
  required_version = "= 1.7.4"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # Pin to exact version, not a range
      version = "= 5.35.0"
    }
  }
}
```

Also pin your GitHub Actions versions to commit SHAs, not tags:

```yaml
# Pin actions to commit SHA, not mutable tag
steps:
  - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
  - uses: hashicorp/setup-terraform@a1502cd9e758c50496cc9ac5308c4843bcd56d36 # v3.0.0
```

## Environment Separation

Use separate CI/CD environments with different credentials for each infrastructure environment:

```yaml
# .github/workflows/terraform.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    environment: ${{ github.event_name == 'push' && 'production' || 'staging' }}
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          # Each environment has its own role
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
```

## Audit Logging

Track who applied what changes and when. This is critical for compliance and debugging.

```yaml
# Add to your apply step
- name: Terraform Apply with Audit
  run: |
    # Capture apply output for audit trail
    terraform apply -auto-approve tfplan 2>&1 | tee apply-output.txt

    # Post summary to your audit system
    curl -X POST "${{ secrets.AUDIT_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"actor\": \"${{ github.actor }}\",
        \"commit\": \"${{ github.sha }}\",
        \"environment\": \"production\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"status\": \"success\"
      }"
```

## Putting It All Together

A secure Terraform CI/CD pipeline should check these boxes:

1. No static credentials - use OIDC or short-lived tokens
2. Least privilege IAM - only permissions you actually need
3. Encrypted state - with versioning and access logging
4. Security scanning - tfsec, checkov, and secret detection on every PR
5. Pinned versions - providers, modules, and CI actions
6. Environment separation - different credentials per environment
7. Audit logging - track every apply with actor and commit info

None of these are optional for production pipelines. Start with OIDC authentication and state encryption, then layer in scanning and audit logging. The upfront investment pays for itself the first time you avoid a credential leak or catch a misconfigured security group before it hits production.

For monitoring your Terraform pipeline execution and getting alerts when things go wrong, consider setting up [pipeline monitoring](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pipeline-monitoring/view) alongside these security controls.
