# How to Create AWS Cognito Identity Pools with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cognito, Identity, IAM, Infrastructure as Code

Description: Learn how to create AWS Cognito Identity Pools to grant authenticated and unauthenticated users temporary AWS credentials with OpenTofu.

## Introduction

Cognito Identity Pools (Federated Identities) allow your users to obtain temporary AWS credentials to directly access AWS services like S3, DynamoDB, or IoT. OpenTofu manages the identity pool, IAM roles, and role mappings as code.

## Creating an Identity Pool

```hcl
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.app_name}-identity-${var.environment}"
  allow_unauthenticated_identities = true   # set false if you don't need guest access

  # Link to a Cognito User Pool
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## IAM Roles for Authenticated and Unauthenticated Users

Create separate IAM roles for authenticated and guest users.

```hcl
# Authenticated role

resource "aws_iam_role" "authenticated" {
  name = "${var.app_name}-cognito-auth-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = "cognito-identity.amazonaws.com" }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "authenticated"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "authenticated" {
  role = aws_iam_role.authenticated.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::${var.user_bucket}/$${cognito-identity.amazonaws.com:sub}/*"
      }
    ]
  })
}

# Unauthenticated (guest) role
resource "aws_iam_role" "unauthenticated" {
  name = "${var.app_name}-cognito-unauth-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = "cognito-identity.amazonaws.com" }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "unauthenticated"
        }
      }
    }]
  })
}
```

## Attaching Roles to the Identity Pool

```hcl
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated"   = aws_iam_role.authenticated.arn
    "unauthenticated" = aws_iam_role.unauthenticated.arn
  }
}
```

## Adding Social Identity Providers

```hcl
resource "aws_cognito_identity_pool" "with_social" {
  count = var.google_client_id == "" ? 0 : 1

  identity_pool_name               = "${var.app_name}-identity"
  allow_unauthenticated_identities = false

  # Google as a social provider
  supported_login_providers = {
    "accounts.google.com" = var.google_client_id
  }
}
```

## Variables and Outputs

```hcl
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "user_bucket" { type = string }
variable "google_client_id" {
  type    = string
  default = ""
}

output "identity_pool_id" {
  value = aws_cognito_identity_pool.main.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Cognito Identity Pools bridge your application's authenticated users with AWS services by issuing scoped temporary credentials. OpenTofu manages the identity pool, IAM roles, and role attachments together, making the entire federated identity setup reproducible and auditable.
