# How to Set Up Cognito with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Terraform, Infrastructure as Code

Description: A complete Terraform configuration for setting up AWS Cognito User Pools, app clients, groups, Lambda triggers, and domain configuration with best practices for production deployments.

---

Setting up Cognito through the AWS console is fine for experimentation, but for production workloads you want infrastructure as code. Terraform gives you reproducible, version-controlled Cognito configurations that you can review, test, and deploy consistently across environments.

Let's build a complete Cognito setup with Terraform - user pool, app client, groups, Lambda triggers, domain, and all the supporting resources.

## Basic User Pool

Start with the user pool itself. This is where all your configuration decisions live.

Here's a production-ready user pool configuration:

```hcl
# variables.tf
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "myapp"
}

# main.tf
resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-${var.environment}"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Username is case-insensitive
  username_configuration {
    case_sensitive = false
  }

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Schema - define user attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
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

  # Custom attributes
  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 128
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 64
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "AUDIT"
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your ${var.app_name} verification code"
    email_message        = "Your verification code is {####}"
  }

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}
```

## App Client

The app client defines how applications interact with the user pool.

Configure the app client with token settings:

```hcl
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.app_name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]

  # No client secret for SPA/mobile apps
  generate_secret = false

  # Prevent user existence errors from leaking info
  prevent_user_existence_errors = "ENABLED"

  # OAuth configuration
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = [
    "http://localhost:3000/callback",
    "https://${var.app_name}.example.com/callback"
  ]

  logout_urls = [
    "http://localhost:3000/logout",
    "https://${var.app_name}.example.com/logout"
  ]

  supported_identity_providers = ["COGNITO"]

  # Enable token revocation
  enable_token_revocation = true
}

# Backend client (with secret)
resource "aws_cognito_user_pool_client" "backend" {
  name         = "${var.app_name}-backend-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}
```

## User Pool Domain

Set up a domain for the hosted UI and OAuth endpoints:

```hcl
# Cognito domain (subdomain of amazoncognito.com)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.app_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Or use a custom domain (requires ACM certificate)
# resource "aws_cognito_user_pool_domain" "custom" {
#   domain          = "auth.example.com"
#   certificate_arn = aws_acm_certificate.auth.arn
#   user_pool_id    = aws_cognito_user_pool.main.id
# }
```

## Groups

Create groups for role-based access control. For more on RBAC with Cognito groups, see [using Cognito groups for role-based access control](https://oneuptime.com/blog/post/2026-02-12-cognito-groups-role-based-access-control/view).

Define groups with IAM role associations:

```hcl
resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrators with full access"
  precedence   = 1
  role_arn     = aws_iam_role.cognito_admin.arn
}

resource "aws_cognito_user_group" "managers" {
  name         = "Managers"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Managers with elevated access"
  precedence   = 5
}

resource "aws_cognito_user_group" "users" {
  name         = "Users"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Standard users"
  precedence   = 10
}
```

## Lambda Triggers

Set up Lambda triggers for customizing the auth flow. For details on specific triggers, see [Cognito Lambda triggers for Pre Token Generation](https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-pre-token-generation/view).

Configure Lambda functions and attach them as triggers:

```hcl
# Pre Token Generation Lambda
resource "aws_lambda_function" "pre_token_generation" {
  filename         = "lambda/pre-token-generation.zip"
  function_name    = "${var.app_name}-pre-token-generation-${var.environment}"
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_role.arn
  timeout          = 5
  memory_size      = 128
  source_code_hash = filebase64sha256("lambda/pre-token-generation.zip")

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}

# Permission for Cognito to invoke the Lambda
resource "aws_lambda_permission" "pre_token_generation" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_token_generation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Attach Lambda triggers to the user pool
resource "aws_cognito_user_pool" "main" {
  # ... (previous configuration) ...

  lambda_config {
    pre_token_generation = aws_lambda_function.pre_token_generation.arn
    # Add more triggers as needed:
    # pre_authentication    = aws_lambda_function.pre_auth.arn
    # post_confirmation     = aws_lambda_function.post_confirm.arn
    # user_migration        = aws_lambda_function.user_migration.arn
  }
}
```

## Identity Pool

Configure an Identity Pool for AWS resource access:

```hcl
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.app_name}-${var.environment}"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.web.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }
}

# IAM roles for the Identity Pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated"   = aws_iam_role.cognito_authenticated.arn
    "unauthenticated" = aws_iam_role.cognito_unauthenticated.arn
  }

  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.main.endpoint}:${aws_cognito_user_pool_client.web.id}"
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Token"
  }
}
```

## Outputs

Export important values that other parts of your infrastructure need:

```hcl
# outputs.tf
output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "web_client_id" {
  description = "Web app client ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "identity_pool_id" {
  description = "Identity Pool ID"
  value       = aws_cognito_identity_pool.main.id
}

output "domain" {
  description = "Cognito domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "hosted_ui_url" {
  description = "Hosted UI URL"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

data "aws_region" "current" {}
```

## Environment-Specific Configurations

Use Terraform workspaces or variable files for different environments:

```hcl
# terraform.tfvars (production)
environment = "prod"
app_name    = "myapp"

# Override password policy for production
# In variables.tf, add:
variable "password_min_length" {
  default = 12
}
```

Apply the configuration:

```bash
# Initialize Terraform
terraform init

# Plan the changes
terraform plan -var-file="environments/prod.tfvars"

# Apply
terraform apply -var-file="environments/prod.tfvars"
```

If you prefer CDK over Terraform, check out [setting up Cognito with CDK](https://oneuptime.com/blog/post/2026-02-12-cognito-cdk/view).

## Wrapping Up

Terraform gives you a declarative, version-controlled way to manage Cognito infrastructure. The configuration we've built covers the most common production requirements - user pool with sensible defaults, multiple app clients, groups for RBAC, Lambda triggers for customization, and an Identity Pool for AWS resource access. Store your Terraform state remotely, use separate workspaces for environments, and review changes carefully before applying since some Cognito modifications (like schema changes) can require recreating the user pool.
