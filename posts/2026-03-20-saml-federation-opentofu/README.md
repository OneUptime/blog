# How to Set Up SAML Federation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, SAML, Federation, AWS, IAM, SSO, Infrastructure as Code

Description: Learn how to configure SAML 2.0 federation with AWS IAM using OpenTofu to enable Single Sign-On from external identity providers like Okta or Azure AD.

## Introduction

SAML (Security Assertion Markup Language) federation allows users to authenticate with an external Identity Provider (IdP) and assume AWS IAM roles without requiring separate AWS credentials. OpenTofu manages the SAML provider and role trust policies as code.

## Creating an IAM SAML Identity Provider

```hcl
# The metadata XML is obtained from your IdP (Okta, Microsoft Entra ID, etc.)

resource "aws_iam_saml_provider" "corporate_idp" {
  name                   = "corporate-sso"
  saml_metadata_document = file("${path.module}/saml-metadata.xml")
}
```

## Creating IAM Roles for SAML Federation

```hcl
# Role for standard users
resource "aws_iam_role" "saml_readonly" {
  name = "saml-readonly-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_saml_provider.corporate_idp.arn
      }
      Action = "sts:AssumeRoleWithSAML"
      Condition = {
        StringEquals = {
          "SAML:aud" = "https://signin.aws.amazon.com/saml"
        }
      }
    }]
  })
}

# Attach read-only access policy
resource "aws_iam_role_policy_attachment" "saml_readonly" {
  role       = aws_iam_role.saml_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Role for administrators
resource "aws_iam_role" "saml_admin" {
  name = "saml-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_saml_provider.corporate_idp.arn
      }
      Action = "sts:AssumeRoleWithSAML"
      Condition = {
        StringEquals = {
          "SAML:aud" = "https://signin.aws.amazon.com/saml"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "saml_admin" {
  role       = aws_iam_role.saml_admin.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Scoping Access with SAML Attributes

Restrict which SAML subjects can assume a role using supported SAML condition attributes.

```hcl
resource "aws_iam_role" "saml_devops" {
  name = "saml-devops-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_saml_provider.corporate_idp.arn
      }
      Action = "sts:AssumeRoleWithSAML"
      Condition = {
        StringEquals = {
          "SAML:aud" = "https://signin.aws.amazon.com/saml"
        }
        # Only allow SAML subjects that match the configured prefix
        "StringLike" = {
          "SAML:sub" = "devops-*"
        }
      }
    }]
  })
}
```

## Outputs

```hcl
output "saml_provider_arn" {
  description = "ARN to configure in your IdP application settings"
  value       = aws_iam_saml_provider.corporate_idp.arn
}

output "readonly_role_arn" {
  value = aws_iam_role.saml_readonly.arn
}

output "admin_role_arn" {
  value = aws_iam_role.saml_admin.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

SAML federation with AWS allows your organization to use existing corporate identity infrastructure for AWS access. OpenTofu manages the SAML provider registration, IAM role trust policies, and permissions - enabling auditable, code-driven SSO configuration.
