# How to Create a Cognito User Pool

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Authentication, Security

Description: Step-by-step guide to creating an Amazon Cognito User Pool for managing user authentication in your web and mobile applications.

---

Amazon Cognito User Pools handle the heavy lifting of user authentication - sign-up, sign-in, password recovery, email verification, and token management. Instead of building all that yourself, you get a managed service that scales automatically and integrates with the rest of AWS.

This post walks through creating a User Pool from scratch, covering both the AWS Console approach and infrastructure as code with Terraform.

## What a User Pool Does

A Cognito User Pool is essentially a user directory. It stores user profiles, handles authentication flows, and issues JWT tokens. When a user signs in, Cognito validates their credentials and returns three tokens:

- **ID Token**: Contains user profile claims (email, name, custom attributes)
- **Access Token**: Used for API authorization
- **Refresh Token**: Used to get new ID and Access tokens without re-authenticating

## Creating a User Pool via Console

Open the Cognito service in the AWS Console and click "Create user pool." The wizard walks you through several decisions.

**Sign-in options** determine what users can authenticate with:
- Username
- Email address
- Phone number

Most applications use email as the primary sign-in identifier. You can allow multiple options, but pick one as the primary.

**Password requirements** set the minimum complexity:
- Minimum length (8 characters minimum recommended)
- Require uppercase, lowercase, numbers, and special characters

**MFA configuration** adds a second factor:
- Optional (users choose)
- Required (all users must set up MFA)
- Off

**User account recovery** controls how users reset forgotten passwords:
- Email only
- SMS only
- Email preferred, SMS as backup

## Creating a User Pool with Terraform

For repeatable, version-controlled infrastructure, Terraform is the way to go.

Here's a complete User Pool configuration:

```hcl
# cognito.tf - Create a Cognito User Pool

resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  # Sign-in configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Username settings
  username_configuration {
    case_sensitive = false
  }

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration - using Cognito default
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Schema attributes
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "name"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Custom attributes
  schema {
    attribute_data_type      = "String"
    name                     = "organization"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code"
    email_message        = "Your verification code is {####}"
  }

  tags = {
    Environment = "production"
    Service     = "authentication"
  }
}

# Output the User Pool ID and ARN
output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}
```

## Creating with AWS CLI

If you prefer the CLI:

```bash
# Create a basic user pool
aws cognito-idp create-user-pool \
  --pool-name "my-app-user-pool" \
  --username-attributes "email" \
  --auto-verified-attributes "email" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 7
    }
  }' \
  --account-recovery-setting '{
    "RecoveryMechanisms": [
      {
        "Priority": 1,
        "Name": "verified_email"
      }
    ]
  }'
```

The command returns a JSON response with the User Pool ID and configuration details. Save the User Pool ID - you'll need it for everything else.

## Schema Attributes

User Pool schemas define what data you store per user. There are standard attributes (email, phone_number, name, etc.) and custom attributes you define.

Important things to know about schema attributes:

- Standard attributes follow the OpenID Connect spec
- Custom attributes are prefixed with `custom:` automatically
- Once a User Pool is created, you can't remove attributes or change their types
- You can add new attributes later, but plan your schema carefully upfront

```hcl
# Adding custom attributes for a SaaS application
schema {
  attribute_data_type = "String"
  name                = "tenant_id"
  required            = false
  mutable             = false  # Can't be changed after creation

  string_attribute_constraints {
    min_length = 1
    max_length = 64
  }
}

schema {
  attribute_data_type = "Number"
  name                = "login_count"
  required            = false
  mutable             = true

  number_attribute_constraints {
    min_value = 0
    max_value = 999999
  }
}
```

## Email Configuration

Cognito can send emails (verification codes, password resets) through two methods:

**Cognito Default**: Limited to 50 emails per day. Fine for development but not production.

**Amazon SES**: Required for production. No daily limit, custom sender addresses, better deliverability.

```hcl
# Production email configuration using SES
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = aws_ses_email_identity.auth.arn
    from_email_address     = "auth@myapp.com"
    reply_to_email_address = "support@myapp.com"
  }
}

resource "aws_ses_email_identity" "auth" {
  email = "auth@myapp.com"
}
```

## User Pool Domain

A domain is needed if you want to use the hosted UI or OAuth flows:

```hcl
# Cognito-provided domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "my-app-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Or use a custom domain
resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.myapp.com"
  certificate_arn = aws_acm_certificate.auth.arn
  user_pool_id    = aws_cognito_user_pool.main.id
}
```

## Device Tracking

Cognito can remember devices users sign in from, allowing you to skip MFA on trusted devices:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }
}
```

## Next Steps

Once your User Pool is created, you'll need to set up several additional pieces. For the sign-up and sign-in flow configuration, see [configuring Cognito User Pool sign-up and sign-in](https://oneuptime.com/blog/post/2026-02-12-configure-cognito-user-pool-sign-up-sign-in/view). You'll also want to [configure password policies](https://oneuptime.com/blog/post/2026-02-12-configure-cognito-password-policies/view) and [set up email and phone verification](https://oneuptime.com/blog/post/2026-02-12-email-phone-verification-cognito/view).

## Summary

Creating a Cognito User Pool is straightforward, but the decisions you make during creation - schema attributes, email configuration, sign-in options - are hard to change later. Take time to plan your schema before creating the pool, use SES for production email, and set up your pool with Terraform so you can version control and replicate across environments. The managed authentication service saves you from building and maintaining your own auth system, which is almost always the right trade-off.
