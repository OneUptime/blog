# How to Create Status Pages with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Status Page, Monitoring, Incident Communication, Infrastructure as Code

Description: Learn how to create and manage public status pages using Terraform to communicate service health and incidents to your users transparently.

---

Status pages are the public face of your reliability story. They communicate the current health of your services to users, stakeholders, and partners. Managing status pages through Terraform ensures they are consistent, automatically updated, and deployed alongside your monitoring infrastructure. This guide covers creating status pages with various providers using Terraform.

## Understanding Status Pages

A status page typically shows the operational status of each service component, ongoing incidents, scheduled maintenance windows, and historical uptime data. They build trust with users by providing transparency about service health.

## Setting Up with AWS Infrastructure

You can build a custom status page using AWS services managed by Terraform:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for hosting the static status page
resource "aws_s3_bucket" "status_page" {
  bucket = "status.${var.domain}"
}

resource "aws_s3_bucket_website_configuration" "status_page" {
  bucket = aws_s3_bucket.status_page.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_public_access_block" "status_page" {
  bucket = aws_s3_bucket.status_page.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "status_page" {
  bucket = aws_s3_bucket.status_page.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.status_page.arn}/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.status_page]
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## CloudFront Distribution for Status Page

```hcl
# CloudFront distribution for the status page
resource "aws_cloudfront_distribution" "status_page" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.status_page.website_endpoint
    origin_id   = "S3-status-page"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["status.${var.domain}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-status-page"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 300
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

variable "certificate_arn" {
  type = string
}
```

## DynamoDB for Status Data

```hcl
# DynamoDB table for storing component statuses
resource "aws_dynamodb_table" "status_components" {
  name         = "status-page-components"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "component_id"

  attribute {
    name = "component_id"
    type = "S"
  }

  tags = {
    Purpose = "status-page"
  }
}

# DynamoDB table for incidents
resource "aws_dynamodb_table" "status_incidents" {
  name         = "status-page-incidents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "incident_id"
  range_key    = "created_at"

  attribute {
    name = "incident_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  tags = {
    Purpose = "status-page"
  }
}
```

## Lambda Function for Status Updates

```hcl
# Lambda function to update status page based on monitoring data
resource "aws_lambda_function" "status_updater" {
  function_name = "status-page-updater"
  runtime       = "python3.11"
  handler       = "index.handler"
  role          = aws_iam_role.status_updater.arn

  filename         = "status-updater.zip"
  source_code_hash = filebase64sha256("status-updater.zip")

  environment {
    variables = {
      COMPONENTS_TABLE = aws_dynamodb_table.status_components.name
      INCIDENTS_TABLE  = aws_dynamodb_table.status_incidents.name
      S3_BUCKET        = aws_s3_bucket.status_page.id
    }
  }
}

# IAM role for the status updater
resource "aws_iam_role" "status_updater" {
  name = "status-page-updater-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "status_updater" {
  name = "status-updater-policy"
  role = aws_iam_role.status_updater.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan"]
        Resource = [aws_dynamodb_table.status_components.arn, aws_dynamodb_table.status_incidents.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.status_page.arn}/*"
      }
    ]
  })
}

# Trigger status update from CloudWatch alarms
resource "aws_sns_topic" "status_updates" {
  name = "status-page-updates"
}

resource "aws_sns_topic_subscription" "status_lambda" {
  topic_arn = aws_sns_topic.status_updates.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.status_updater.arn
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.status_updater.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.status_updates.arn
}
```

## Route 53 DNS Configuration

```hcl
# DNS record for the status page
resource "aws_route53_record" "status_page" {
  zone_id = var.zone_id
  name    = "status.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.status_page.domain_name
    zone_id                = aws_cloudfront_distribution.status_page.hosted_zone_id
    evaluate_target_health = false
  }
}

variable "zone_id" {
  type = string
}
```

## Defining Status Page Components

```hcl
# Define service components for the status page
locals {
  status_components = {
    "api" = {
      name        = "API"
      description = "Core API endpoints"
      group       = "Core Services"
    }
    "web" = {
      name        = "Web Application"
      description = "Customer-facing web application"
      group       = "Core Services"
    }
    "database" = {
      name        = "Database"
      description = "Primary database cluster"
      group       = "Infrastructure"
    }
    "cdn" = {
      name        = "CDN"
      description = "Content delivery network"
      group       = "Infrastructure"
    }
  }
}
```

## Best Practices

Host your status page on infrastructure separate from your main application so it remains accessible during outages. Use a CDN with low TTLs so status updates propagate quickly. Automate status updates from your monitoring system rather than requiring manual updates. Include historical uptime data to build confidence with users. Define clear component groups that map to how users experience your service. Subscribe your status page updater to the same SNS topics as your alerting system.

For the monitoring infrastructure that feeds your status page, see our guide on [creating uptime monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-uptime-monitors-with-terraform/view).

## Conclusion

Status pages managed through Terraform provide a transparent, automated way to communicate service health to your users. By deploying the status page infrastructure as code and automating updates from your monitoring system, you ensure that users always have accurate, up-to-date information about service availability. The separation of infrastructure from your main application ensures the status page remains available even during outages.
