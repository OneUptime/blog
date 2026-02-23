# How to Implement Terraform for Edge Computing Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Edge Computing, CloudFront, Lambda@Edge, CDN, DevOps

Description: Learn how to use Terraform to deploy edge computing infrastructure including CloudFront distributions, Lambda@Edge functions, edge locations, and IoT gateway configurations.

---

Edge computing brings computation closer to users by running workloads at the network edge rather than in centralized data centers. Terraform manages edge infrastructure by defining CloudFront distributions, Lambda@Edge functions, IoT gateways, and edge location configurations. This combination delivers lower latency and better user experiences.

In this guide, we will cover how to deploy edge computing infrastructure with Terraform.

## CloudFront with Lambda@Edge

```hcl
# edge/cloudfront.tf
# CloudFront distribution with Lambda@Edge functions

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  aliases             = [var.domain_name]

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "app-origin"

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
    target_origin_id       = "app-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    # Lambda@Edge for request/response processing
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.edge_auth.qualified_arn
      include_body = false
    }

    lambda_function_association {
      event_type = "origin-response"
      lambda_arn = aws_lambda_function.edge_headers.qualified_arn
    }
  }

  # Static content cache behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "app-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    min_ttl     = 0
    default_ttl = 86400     # 1 day
    max_ttl     = 31536000  # 1 year

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = var.common_tags
}

# Lambda@Edge for authentication at the edge
resource "aws_lambda_function" "edge_auth" {
  provider = aws.us_east_1  # Lambda@Edge must be in us-east-1

  function_name = "edge-auth"
  runtime       = "nodejs20.x"
  handler       = "auth.handler"
  role          = aws_iam_role.edge_lambda.arn
  publish       = true  # Required for Lambda@Edge

  filename         = "edge-auth.zip"
  source_code_hash = filebase64sha256("edge-auth.zip")
}

# Lambda@Edge for security headers
resource "aws_lambda_function" "edge_headers" {
  provider = aws.us_east_1

  function_name = "edge-security-headers"
  runtime       = "nodejs20.x"
  handler       = "headers.handler"
  role          = aws_iam_role.edge_lambda.arn
  publish       = true

  filename         = "edge-headers.zip"
  source_code_hash = filebase64sha256("edge-headers.zip")
}
```

## IoT Edge Gateway

```hcl
# edge/iot-gateway.tf
# IoT edge gateway infrastructure

resource "aws_iot_thing" "edge_gateway" {
  for_each = var.edge_locations

  name = "edge-gateway-${each.key}"

  attributes = {
    location    = each.value.location
    region      = each.value.region
    gateway_type = "production"
  }
}

resource "aws_iot_thing_group" "edge_gateways" {
  name = "edge-gateways-${var.environment}"

  properties {
    description = "Edge computing gateways"
  }
}

resource "aws_iot_policy" "edge_gateway" {
  name = "edge-gateway-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["iot:Connect"]
        Resource = ["arn:aws:iot:*:*:client/edge-gateway-*"]
      },
      {
        Effect   = "Allow"
        Action   = ["iot:Publish", "iot:Subscribe", "iot:Receive"]
        Resource = ["arn:aws:iot:*:*:topic/edge/*"]
      }
    ]
  })
}
```

## Edge Content Caching Strategy

```hcl
# edge/caching.tf
# Cache policies for different content types

resource "aws_cloudfront_cache_policy" "static" {
  name        = "static-content-cache"
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_cache_policy" "api" {
  name        = "api-cache"
  default_ttl = 0
  max_ttl     = 60
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Accept"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}
```

## Edge Function Monitoring

Monitor your edge functions to ensure they perform well across all locations:

```hcl
# edge/monitoring.tf
# Monitor edge function performance

resource "aws_cloudwatch_metric_alarm" "edge_errors" {
  provider = aws.us_east_1

  alarm_name          = "edge-function-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "origin_latency" {
  alarm_name          = "edge-origin-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "p90"
  threshold           = 2000  # 2 seconds

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Best Practices

Deploy Lambda@Edge functions in us-east-1 since CloudFront requires this region for edge functions. Use a provider alias to ensure resources are created in the correct region.

Use cache policies appropriate for each content type. Static content should have long TTLs while API responses should have short or zero TTLs. Matching cache policies to content characteristics maximizes cache hit rates and minimizes origin load.

Monitor edge function performance carefully. Edge functions run at every edge location and high latency multiplies across all users. Keep edge functions lightweight and fast, ideally completing in under 5 milliseconds.

Implement proper error handling at the edge. Edge function failures should fall back gracefully rather than serving errors to users. Use try-catch blocks and return sensible defaults when edge logic fails.

Test edge configurations in staging before production. CloudFront changes can take 15-30 minutes to propagate globally. Test thoroughly in a staging distribution before deploying to production.

Use CloudFront Functions instead of Lambda@Edge for simple transformations. CloudFront Functions run at all edge locations, execute faster, and cost less than Lambda@Edge for simple tasks like URL rewrites and header manipulation.

## Conclusion

Edge computing with Terraform brings your application closer to users, reducing latency and improving the user experience. By managing CloudFront distributions, Lambda@Edge functions, IoT gateways, and edge caching policies as code, you create a consistent, repeatable edge deployment that can be versioned and tested like any other infrastructure. The key is proper caching strategies, careful Lambda@Edge design, comprehensive monitoring, and thorough testing before global deployment.
