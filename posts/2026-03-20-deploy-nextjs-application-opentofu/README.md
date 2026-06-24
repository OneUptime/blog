# How to Deploy a Next.js Application with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Next.js, AWS, ECS, CloudFront, Infrastructure as Code

Description: Learn how to deploy a Next.js application on AWS using OpenTofu, supporting both static export and server-side rendering with ECS Fargate and CloudFront.

## Introduction

Next.js supports multiple deployment approaches, including static export and self-hosting a Node.js server. This guide deploys a Next.js app in standalone server mode on ECS Fargate with CloudFront as the CDN, supporting SSR and API routes, and supporting ISR when the Next.js cache is persisted or shared across tasks.

## Architecture Overview

```text
CloudFront Distribution
├── /_next/static/* → S3 Bucket (Next.js built assets)
└── /* → ECS Fargate (Next.js standalone server)
```

## S3 for Static Assets

```hcl
resource "aws_s3_bucket" "nextjs_static" {
  bucket = "myapp-nextjs-static-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "nextjs_static" {
  bucket                  = aws_s3_bucket.nextjs_static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "nextjs-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "nextjs_static" {
  bucket = aws_s3_bucket.nextjs_static.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.nextjs_static.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.nextjs.arn
        }
      }
    }]
  })
}
```

## ECS for Next.js Server

```hcl
resource "aws_ecs_task_definition" "nextjs" {
  family                   = "myapp-nextjs"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "nextjs-app"
    image = "${aws_ecr_repository.nextjs.repository_url}:${var.app_version}"
    # Built with: next build and output: 'standalone'
    # Run with: node .next/standalone/server.js
    # Dockerfile: COPY --from=builder /app/.next/standalone ./
    #             COPY --from=builder /app/public ./public
    # Static build assets from /app/.next/static are uploaded to S3

    environment = [
      { name = "NODE_ENV",       value = "production" },
      { name = "PORT",           value = "3000" },
      { name = "NEXT_TELEMETRY_DISABLED", value = "1" },
    ]

    secrets = [
      { name = "DATABASE_URL",   valueFrom = aws_secretsmanager_secret.db_url.arn },
      { name = "NEXTAUTH_SECRET", valueFrom = aws_secretsmanager_secret.auth_secret.arn },
    ]

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/myapp-nextjs"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "nextjs"
      }
    }
  }])
}
```

## CloudFront with Multiple Origins

```hcl
resource "aws_cloudfront_cache_policy" "nextjs_static_assets" {
  name        = "nextjs-static-assets"
  comment     = "Long-lived cache policy for immutable Next.js build assets"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "nextjs" {
  enabled             = true
  is_ipv6_enabled     = true
  aliases             = [var.domain_name]
  default_root_object = ""

  # Origin 1: ECS for SSR pages and API routes
  origin {
    domain_name = aws_lb.nextjs.dns_name
    origin_id   = "ECS-nextjs"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 for static assets
  origin {
    domain_name              = aws_s3_bucket.nextjs_static.bucket_regional_domain_name
    origin_id                = "S3-nextjs-static"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Default: serve from ECS
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ECS-nextjs"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled for SSR
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"  # AllViewer
  }

  # Static Next.js assets - served from S3, long-lived cache
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-nextjs-static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.nextjs_static_assets.id
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.app.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }
}
```

## Summary

Deploying Next.js in standalone mode on ECS Fargate with OpenTofu uses a multi-origin CloudFront distribution: static `/_next/static/` assets are served from S3 with year-long caching, while SSR pages and API routes go to the ECS containers. Build Next.js with `output: 'standalone'` in `next.config.js` to create a self-contained server bundle, and run the generated `server.js` in your container. Use separate cache policies - caching disabled for SSR pages and long TTLs for hashed static assets. If you rely on ISR across multiple ECS tasks, configure a shared or persistent Next.js cache.
