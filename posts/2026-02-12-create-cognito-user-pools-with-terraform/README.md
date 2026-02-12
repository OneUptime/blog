# How to Create Cognito User Pools with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Cognito, Authentication

Description: A complete guide to setting up AWS Cognito user pools with Terraform, covering user attributes, app clients, hosted UI, social login, and Lambda triggers.

---

AWS Cognito handles user authentication so you don't have to build it yourself. Sign-up, sign-in, password recovery, MFA, social login - it's all built in. But Cognito has a lot of configuration options, and many of them can't be changed after creation. That makes getting the initial setup right particularly important, and it's why Terraform is so valuable here.

In this guide, we'll build a Cognito user pool from scratch, add app clients, configure the hosted UI, and wire up Lambda triggers for custom logic.

## Basic User Pool

Let's start with a user pool that uses email as the sign-in method:

```hcl
# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "myapp-users"

  # Sign-in configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User attribute schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 5
      max_length = 256
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

Important: `username_attributes` and `schema` settings with `required = true` cannot be changed after the user pool is created. Terraform will try to destroy and recreate the pool, which means losing all users. Plan these carefully.

## Custom Attributes

You can add custom attributes for application-specific data:

```hcl
# User pool with custom attributes
resource "aws_cognito_user_pool" "with_custom_attrs" {
  name                = "myapp-users-v2"
  username_attributes = ["email"]

  # Custom attributes (prefixed with "custom:" when accessed)
  schema {
    name                = "company"
    attribute_data_type = "String"
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                = "account_id"
    attribute_data_type = "Number"
    mutable             = false  # Can't be changed after creation

    number_attribute_constraints {
      min_value = 1
      max_value = 999999999
    }
  }
}
```

Custom attributes are accessed as `custom:company`, `custom:role`, etc. in tokens and API calls. Also note: custom attributes can't be removed once created. You can only add new ones.

## Email Configuration

By default, Cognito sends emails using a shared address with strict rate limits. For production, configure SES:

```hcl
# User pool with SES email configuration
resource "aws_cognito_user_pool" "with_ses" {
  name                = "myapp-production"
  username_attributes = ["email"]

  # Use SES for email delivery
  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = aws_ses_email_identity.noreply.arn
    from_email_address     = "noreply@example.com"
    reply_to_email_address = "support@example.com"
  }

  # Customize verification messages
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code"
    email_message        = "Your verification code is {####}. It expires in 24 hours."
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }
}
```

## App Client

App clients are how your applications interact with the user pool. You'll typically have separate clients for your web app, mobile app, and backend services.

This creates a client for a web application with the authorization code flow:

```hcl
# App client for web application
resource "aws_cognito_user_pool_client" "web" {
  name         = "web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Don't generate a client secret for public clients (SPAs)
  generate_secret = false

  # OAuth flows
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  # Callback URLs
  callback_urls = [
    "https://myapp.example.com/callback",
    "http://localhost:3000/callback"  # For development
  ]
  logout_urls = [
    "https://myapp.example.com",
    "http://localhost:3000"
  ]

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors (security best practice)
  prevent_user_existence_errors = "ENABLED"

  # Explicitly specify auth flows
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Read/write attributes
  read_attributes  = ["email", "name", "custom:company"]
  write_attributes = ["email", "name", "custom:company"]
}
```

For a server-side application that needs a client secret:

```hcl
# App client for backend service
resource "aws_cognito_user_pool_client" "backend" {
  name         = "backend-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = ["api/read", "api/write"]
  allowed_oauth_flows_user_pool_client = true

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
```

## Hosted UI Domain

Cognito provides a hosted login page. You need to configure a domain for it:

```hcl
# Cognito domain for hosted UI (using Cognito prefix)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "myapp-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Or use your own custom domain
resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.example.com"
  certificate_arn = aws_acm_certificate.auth.arn
  user_pool_id    = aws_cognito_user_pool.main.id
}
```

The hosted UI is at `https://myapp-auth.auth.{region}.amazoncognito.com`. It's basic but functional. Most teams use it for initial development and then build a custom UI.

## Social Login (Identity Providers)

Add Google, Facebook, or other social login providers:

```hcl
# Google identity provider
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# Update app client to support the provider
resource "aws_cognito_user_pool_client" "web_with_google" {
  name         = "web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  supported_identity_providers = [
    "COGNITO",
    aws_cognito_identity_provider.google.provider_name
  ]

  # ... rest of client config
}
```

## Lambda Triggers

Lambda triggers let you run custom logic at various points in the authentication flow:

```hcl
# User pool with Lambda triggers
resource "aws_cognito_user_pool" "with_triggers" {
  name                = "myapp-with-triggers"
  username_attributes = ["email"]

  lambda_config {
    # Run before sign-up to validate/modify the request
    pre_sign_up = aws_lambda_function.pre_signup.arn

    # Run after confirmation to add user to a group
    post_confirmation = aws_lambda_function.post_confirmation.arn

    # Customize the authentication challenge
    pre_authentication = aws_lambda_function.pre_auth.arn

    # Run after successful authentication
    post_authentication = aws_lambda_function.post_auth.arn

    # Customize token generation (add custom claims)
    pre_token_generation = aws_lambda_function.pre_token.arn

    # Custom email/SMS messages
    custom_message = aws_lambda_function.custom_message.arn
  }
}

# Lambda needs permission to be invoked by Cognito
resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.with_triggers.arn
}
```

Common use cases for triggers:
- **Pre sign-up**: Block certain email domains, auto-verify emails
- **Post confirmation**: Create a user record in your database, send a welcome email
- **Pre token generation**: Add custom claims based on user attributes
- **Custom message**: Localize or brand verification emails

For setting up the Lambda functions, see our post on [creating Lambda functions with Terraform](https://oneuptime.com/blog/post/create-lambda-functions-with-terraform/view).

## Resource Server (Custom Scopes)

If your API needs custom OAuth scopes, define a resource server:

```hcl
# Resource server for custom API scopes
resource "aws_cognito_resource_server" "api" {
  identifier   = "api"
  name         = "My API"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access"
  }
}
```

After creating the resource server, use scopes like `api/read` and `api/write` in your app clients.

## Outputs

Export the values your application needs:

```hcl
output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}

output "client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "hosted_ui_domain" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}
```

## Wrapping Up

Cognito with Terraform is a great combination because so many Cognito settings are immutable after creation. Having them in code means you can review the configuration carefully before applying, and reproduce it exactly for other environments. Plan your username attributes, required fields, and custom attributes carefully up front - those are the ones that will bite you if you need to change them later.
