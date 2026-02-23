# How to Create Serverless Web Application Backend with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Serverless, Web Application, CloudFront, Cognito

Description: Learn how to build a complete serverless web application backend with Terraform including authentication, API, storage, and CDN for production-ready web apps.

---

A serverless web application backend handles everything your frontend needs without managing servers. This includes user authentication, API endpoints, file storage, real-time communication, and content delivery. AWS provides a comprehensive set of serverless services that, when combined with Terraform, give you a production-ready backend that scales automatically and costs nothing when idle.

This guide walks through building a complete serverless web application backend with Terraform, covering authentication with Cognito, API with API Gateway and Lambda, storage with S3 and DynamoDB, and content delivery with CloudFront.

## Architecture Overview

The serverless web application backend includes:

- **CloudFront + S3**: Static website hosting and CDN
- **Cognito**: User authentication and authorization
- **API Gateway**: RESTful API endpoints
- **Lambda**: Business logic
- **DynamoDB**: Application data storage
- **S3**: File uploads and media storage

## Static Website Hosting

```hcl
# S3 bucket for static website content
resource "aws_s3_bucket" "website" {
  bucket = "my-web-app-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "website-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3Website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # API origin
  origin {
    domain_name = replace(aws_apigatewayv2_stage.api.invoke_url, "https://", "")
    origin_id   = "APIGateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior for static content
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Website"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # API behavior - route /api/* to API Gateway
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# S3 bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}
```

## User Authentication with Cognito

```hcl
# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "web-app-users"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # Email verification
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your verification code"
    email_message        = "Your verification code is {####}"
  }

  # Schema attributes
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

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "web" {
  name         = "web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # OAuth configuration
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["https://${var.domain_name}/callback"]
  logout_urls                          = ["https://${var.domain_name}/logout"]
  supported_identity_providers         = ["COGNITO"]

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

# Cognito Domain for hosted UI
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "my-web-app-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}
```

## API with Authorization

```hcl
# HTTP API with Cognito JWT authorizer
resource "aws_apigatewayv2_api" "main" {
  name          = "web-app-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Content-Type", "Authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["https://${var.domain_name}"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

# JWT authorizer using Cognito
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# Protected API route
resource "aws_apigatewayv2_route" "get_profile" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/profile"
  target    = "integrations/${aws_apigatewayv2_integration.get_profile.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_integration" "get_profile" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_profile.invoke_arn
  payload_format_version = "2.0"
}
```

## File Upload with Pre-Signed URLs

```hcl
# S3 bucket for user file uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "web-app-uploads-${var.environment}"
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["https://${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lambda function to generate pre-signed upload URLs
resource "aws_lambda_function" "get_upload_url" {
  filename         = data.archive_file.api_functions.output_path
  function_name    = "get-upload-url"
  role             = aws_iam_role.lambda_api.arn
  handler          = "upload.getUrl"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.api_functions.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      UPLOAD_BUCKET = aws_s3_bucket.uploads.id
    }
  }
}
```

## DynamoDB for Application Data

```hcl
# Users table
resource "aws_dynamodb_table" "users" {
  name         = "web-app-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }
}

# Content table
resource "aws_dynamodb_table" "content" {
  name         = "web-app-content"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "content_id"
  range_key    = "created_at"

  attribute {
    name = "content_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserContentIndex"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }
}
```

## Outputs

```hcl
output "website_url" {
  description = "CloudFront distribution URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API Gateway URL"
  value       = aws_apigatewayv2_stage.api.invoke_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = aws_cognito_user_pool_client.web.id
}

output "upload_bucket" {
  description = "S3 bucket for file uploads"
  value       = aws_s3_bucket.uploads.id
}
```

## Monitoring with OneUptime

A serverless web application has many components that need monitoring. OneUptime can monitor your CloudFront distribution, API endpoints, and authentication flows to ensure your users always have a great experience. Set up synthetic monitors that test your complete user journey from login to data access. Visit [OneUptime](https://oneuptime.com) for full-stack monitoring.

## Conclusion

A serverless web application backend built with Terraform gives you a complete, production-ready infrastructure that scales automatically and costs nothing during idle periods. CloudFront and S3 handle static content delivery with global edge caching. Cognito provides secure authentication without building your own auth system. API Gateway and Lambda handle business logic with automatic scaling. DynamoDB stores application data with consistent performance at any scale. By defining everything in Terraform, you can spin up identical environments for development, staging, and production with a single command.

For more serverless patterns, see [How to Create Serverless API Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-api-backend-with-terraform/view) and [How to Create Serverless Cron Jobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-cron-jobs-with-terraform/view).
