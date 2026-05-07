# How to Create AWS Cognito User Pools with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cognito, Authentication, Identity, Infrastructure as Code

Description: Learn how to create and configure AWS Cognito User Pools with password policies, MFA, email verification, and custom attributes using OpenTofu.

## Introduction

AWS Cognito User Pools provide a fully managed user directory and authentication service. OpenTofu allows you to define user pool configuration as code, ensuring consistent security settings and reproducible deployments across environments.

## Creating a User Pool

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-users-${var.environment}"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email verification mode
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Configuring MFA

```hcl
resource "aws_cognito_user_pool" "mfa" {
  name = "${var.app_name}-users-${var.environment}"

  # Optional MFA – users can opt in
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true  # TOTP-based MFA (Google Authenticator etc.)
  }
}
```

## Adding Custom Attributes

```hcl
resource "aws_cognito_user_pool" "with_attrs" {
  name = "${var.app_name}-users-${var.environment}"

  # Custom user attributes (use the bare name here; Cognito exposes them as custom:<name>)
  schema {
    name                     = "tenant_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "subscription_tier"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {}
  }
}
```

## Email Configuration with SES

```hcl
resource "aws_cognito_user_pool" "ses_email" {
  name = "${var.app_name}-users-${var.environment}"

  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = var.ses_identity_arn
    from_email_address     = "noreply@example.com"
    reply_to_email_address = "support@example.com"
  }
}
```

## User Pool Domain

```hcl
# Custom domain for the hosted UI

resource "aws_cognito_user_pool_domain" "main" {
  domain          = "auth.example.com"
  user_pool_id    = aws_cognito_user_pool.main.id
  certificate_arn = var.acm_certificate_arn  # required for custom domains; ACM certificate must be in us-east-1
}

# Or use a Cognito-provided prefix domain (no certificate needed)
resource "aws_cognito_user_pool_domain" "prefix" {
  domain       = "${var.app_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}
```

## Variables and Outputs

```hcl
variable "app_name"         { type = string }
variable "environment"      { type = string }
variable "ses_identity_arn" { type = string }
variable "acm_certificate_arn" { type = string }

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Cognito User Pools offer a rich authentication platform that can be fully configured with OpenTofu. From password policies and MFA to custom attributes and SES email delivery, managing Cognito as code ensures consistent, auditable identity configurations across all environments.
