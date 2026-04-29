# How to Create Lambda@Edge Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda@Edge, CloudFront, Edge Computing, Infrastructure as Code

Description: Learn how to create and deploy AWS Lambda@Edge functions for advanced edge processing including A/B testing, auth, and dynamic content using OpenTofu.

## Introduction

Lambda@Edge runs Node.js or Python Lambda functions at CloudFront edge locations. Unlike CloudFront Functions, Lambda@Edge supports larger payloads, network calls, and complex logic. OpenTofu manages Lambda@Edge functions and their CloudFront associations.

## Lambda@Edge Requirements

Lambda@Edge functions must be created in `us-east-1` regardless of your primary region.

```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"  # Lambda@Edge must be in us-east-1
}
```

## IAM Role for Lambda@Edge

```hcl
resource "aws_iam_role" "lambda_edge" {
  provider = aws.us_east_1
  name     = "${var.app_name}-lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  provider   = aws.us_east_1
  role       = aws_iam_role.lambda_edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Auth Check Function

```python
# functions/auth-check/index.py

import json
import base64

def handler(event, context):
    request = event['Records'][0]['cf']['request']
    headers = request.get('headers', {})

    # Check for Authorization header
    auth_header = headers.get('authorization', [{}])[0].get('value', '')

    if not auth_header.startswith('Bearer '):
        # Return 401 Unauthorized
        return {
            'status': '401',
            'statusDescription': 'Unauthorized',
            'headers': {
                'www-authenticate': [{'key': 'WWW-Authenticate', 'value': 'Bearer realm="API"'}],
                'content-type': [{'key': 'Content-Type', 'value': 'application/json'}]
            },
            'body': json.dumps({'error': 'Unauthorized'})
        }

    # Pass request to origin
    return request
```

## Creating the Lambda@Edge Function

```hcl
data "archive_file" "auth_check" {
  type        = "zip"
  source_dir  = "${path.module}/functions/auth-check"
  output_path = "${path.module}/dist/auth-check.zip"
}

resource "aws_lambda_function" "auth_check" {
  provider      = aws.us_east_1
  filename      = data.archive_file.auth_check.output_path
  function_name = "${var.app_name}-auth-check"
  role          = aws_iam_role.lambda_edge.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  # Lambda@Edge requires publish = true to use a specific version
  publish = true

  source_code_hash = data.archive_file.auth_check.output_base64sha256

  # Keep auth checks fast; Lambda@Edge function timeout can be up to 30 seconds
  timeout     = 5
  memory_size = 128
}
```

## Associating with CloudFront

```hcl
resource "aws_cloudfront_distribution" "api" {
  enabled = true

  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "API-ALB"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "API-ALB"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization"]
      cookies { forward = "none" }
    }

    # Run auth check on every viewer request
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.auth_check.qualified_arn  # use versioned ARN
      include_body = false
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn  # ACM certificate must be in us-east-1 for CloudFront
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Lambda@Edge enables complex edge processing including authentication, A/B testing, and dynamic origin selection. OpenTofu manages function code, IAM roles, Lambda function publishing, and CloudFront associations - providing version-controlled edge compute deployments.
