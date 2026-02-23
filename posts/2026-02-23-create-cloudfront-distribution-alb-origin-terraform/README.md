# How to Create CloudFront Distribution with ALB Origin in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudFront, ALB, CDN, Infrastructure as Code

Description: Learn how to create a CloudFront distribution with an Application Load Balancer origin using Terraform, including custom headers, caching policies, and SSL termination.

---

Putting CloudFront in front of an Application Load Balancer is one of the most common patterns on AWS. You get global edge caching, DDoS protection through AWS Shield, and the ability to terminate SSL at the edge with an ACM certificate. Your ALB handles the application routing, and CloudFront handles the global distribution.

The setup is not complicated, but there are a few things that trip people up - origin protocols, cache behaviors for dynamic content, and making sure requests actually go through CloudFront rather than directly to the ALB. This guide covers all of it.

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Main provider for the ALB and other resources
provider "aws" {
  region = "us-east-1"
}

# CloudFront requires ACM certificates to be in us-east-1
# If your ALB is in another region, you need a separate provider
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
```

## Basic CloudFront Distribution with ALB Origin

Let's start with the fundamental setup. The ALB is the origin, and CloudFront forwards requests to it.

```hcl
# Reference your existing ALB
data "aws_lb" "app" {
  name = "my-app-alb"
}

# CloudFront distribution with ALB origin
resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for application ALB"
  default_root_object = ""  # No default root object for API/app traffic
  price_class         = "PriceClass_100"  # US, Canada, Europe edges only

  # The ALB as the origin
  origin {
    domain_name = data.aws_lb.app.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"  # Always use HTTPS to the ALB
      origin_ssl_protocols   = ["TLSv1.2"]

      # Timeouts - increase for slow APIs
      origin_read_timeout    = 60
      origin_keepalive_timeout = 5
    }

    # Custom header to verify requests come through CloudFront
    custom_header {
      name  = "X-CloudFront-Secret"
      value = "my-secret-value-change-this"  # Use a strong random value
    }
  }

  # Default cache behavior - forward everything for dynamic content
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    # Use a managed cache policy for dynamic content (no caching)
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Function associations (optional)
    # function_association {
    #   event_type   = "viewer-request"
    #   function_arn = aws_cloudfront_function.add_headers.arn
    # }
  }

  # Custom domain
  aliases = ["app.example.com"]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.app.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "production"
  }
}

# Managed cache policy that disables caching (for dynamic content)
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Managed origin request policy that forwards all viewer headers
data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}
```

## ACM Certificate for CloudFront

CloudFront needs an ACM certificate in us-east-1 for your custom domain.

```hcl
# SSL certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "app" {
  provider          = aws.us_east_1
  domain_name       = "app.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "app-cloudfront-cert"
  }
}

# DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "app" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# DNS record pointing your domain to CloudFront
data "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Mixed Cache Behaviors: Static and Dynamic Content

Most applications serve both static assets and dynamic API responses. You want to cache the static content aggressively and skip caching for the dynamic stuff.

```hcl
resource "aws_cloudfront_distribution" "mixed" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "Mixed static and dynamic content"

  origin {
    domain_name = data.aws_lb.app.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-CloudFront-Secret"
      value = "replace-with-real-secret"
    }
  }

  # Default behavior - dynamic content, no caching
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Cache static assets aggressively
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    # Use the managed caching optimized policy
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Cache for 1 day at minimum
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Cache images
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # API paths - forward everything, cache nothing
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  aliases = ["app.example.com"]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.app.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# Managed cache policy for static content
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}
```

## Securing the ALB: Only Allow CloudFront Traffic

Without additional protection, anyone who knows your ALB's DNS name can bypass CloudFront and hit it directly. There are two approaches to prevent this.

### Approach 1: Custom Header Verification

Add a custom header in the CloudFront origin configuration and check for it on the ALB.

```hcl
# On the ALB, create a listener rule that checks for the custom header
resource "aws_lb_listener_rule" "cloudfront_only" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    http_header {
      http_header_name = "X-CloudFront-Secret"
      values           = ["my-secret-value-change-this"]
    }
  }
}

# Default rule returns 403 for requests without the header
resource "aws_lb_listener_rule" "deny_direct" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

### Approach 2: AWS Managed Prefix List

AWS publishes a managed prefix list containing all CloudFront edge IP addresses. You can restrict your ALB's security group to only allow traffic from these IPs.

```hcl
# Get the CloudFront managed prefix list
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# ALB security group that only allows CloudFront IPs
resource "aws_security_group" "alb" {
  name_prefix = "alb-cloudfront-"
  vpc_id      = aws_vpc.main.id

  # Allow HTTPS from CloudFront edge locations only
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Using both approaches together gives you defense in depth.

## Custom Cache Policy

Sometimes the managed policies do not fit your needs. For example, you might want to cache based on specific query string parameters or headers.

```hcl
# Custom cache policy that caches based on specific query parameters
resource "aws_cloudfront_cache_policy" "custom" {
  name        = "custom-api-cache"
  comment     = "Cache based on specific query parameters"
  min_ttl     = 1
  default_ttl = 300    # 5 minutes
  max_ttl     = 3600   # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"  # Don't include cookies in cache key
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept", "Accept-Language"]  # Cache varies by these headers
      }
    }

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["page", "limit", "sort"]  # Only these params affect the cache key
      }
    }
  }
}

# Origin request policy to forward headers the ALB needs
resource "aws_cloudfront_origin_request_policy" "custom" {
  name    = "custom-origin-request"
  comment = "Forward necessary headers to ALB"

  cookies_config {
    cookie_behavior = "all"  # Forward all cookies to origin
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Host",
        "Accept",
        "Accept-Language",
        "Authorization",
        "Referer",
        "CloudFront-Forwarded-Proto",
        "CloudFront-Is-Desktop-Viewer",
        "CloudFront-Is-Mobile-Viewer"
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"  # Forward all query strings to origin
  }
}
```

## Adding a WAF

For production deployments, you should put a WAF in front of CloudFront to block malicious requests.

```hcl
# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "cloudfront" {
  provider    = aws.us_east_1  # WAF for CloudFront must be in us-east-1
  name        = "cloudfront-waf"
  description = "WAF for CloudFront distribution"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # Max 2000 requests per 5-minute window per IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
    }
  }

  # AWS managed rule for common threats
  rule {
    name     = "aws-common-rules"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-common-rules"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "cloudfront-waf"
  }
}
```

Then attach the WAF to the distribution by adding `web_acl_id = aws_wafv2_web_acl.cloudfront.arn` to your `aws_cloudfront_distribution` resource.

## Outputs

```hcl
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.app.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.app.id
  description = "Use this to invalidate the cache: aws cloudfront create-invalidation --distribution-id <id> --paths '/*'"
}
```

## Tips From Production

**Always use HTTPS between CloudFront and your ALB.** The `origin_protocol_policy = "https-only"` setting ensures traffic is encrypted in transit even though it is within AWS.

**Increase `origin_read_timeout` for slow APIs.** The default 30 seconds is not enough for some endpoints. You can go up to 180 seconds.

**Use managed cache and origin request policies when possible.** They are maintained by AWS and cover most common scenarios. Custom policies add complexity.

**Invalidate the cache after deployments.** If you are caching static assets, set up a post-deployment step that runs `aws cloudfront create-invalidation` to clear stale content.

**Monitor origin latency in CloudWatch.** CloudFront publishes metrics like `OriginLatency` and `CacheHitRate` that tell you how well your caching strategy is working.

Putting CloudFront in front of your ALB is a quick win for performance, security, and cost. The edge caching reduces load on your origin, AWS Shield provides DDoS protection at no extra cost, and the global edge network cuts latency for users worldwide.
