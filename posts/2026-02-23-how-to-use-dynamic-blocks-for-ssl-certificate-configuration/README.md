# How to Use Dynamic Blocks for SSL Certificate Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, SSL, TLS, ACM, AWS, Infrastructure as Code

Description: Learn how to manage SSL and TLS certificate configurations dynamically in Terraform using dynamic blocks for ACM certificates, load balancers, and CloudFront.

---

SSL/TLS certificate management in AWS involves several moving pieces: ACM certificate requests, DNS validation records, load balancer listeners, and CloudFront distributions. When you manage multiple domains and certificates, dynamic blocks keep the configuration clean and scalable.

## ACM Certificate with Dynamic SANs

An ACM certificate can cover a primary domain and multiple Subject Alternative Names (SANs). Dynamic blocks are not needed here since SANs are a simple list, but the validation records that follow require dynamic generation:

```hcl
variable "domain_name" {
  description = "Primary domain name for the certificate"
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional domain names for the certificate"
  type        = list(string)
  default     = []
}

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = var.domain_name
  }
}
```

## Dynamic DNS Validation Records

Each domain on the certificate needs a DNS validation record. The number of records depends on how many domains are on the certificate:

```hcl
# Create validation records for each domain
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  # Allow overwrite in case record already exists from a previous certificate
  allow_overwrite = true
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
```

## Multi-Domain Certificate Module

For organizations managing many services, a reusable certificate module handles everything:

```hcl
variable "certificates" {
  description = "Map of certificates to create"
  type = map(object({
    domain_name               = string
    subject_alternative_names = list(string)
    zone_id                   = string
  }))
  default = {
    "api" = {
      domain_name               = "api.example.com"
      subject_alternative_names = ["api-v2.example.com"]
      zone_id                   = "Z1234567890"
    }
    "web" = {
      domain_name               = "www.example.com"
      subject_alternative_names = ["example.com", "app.example.com"]
      zone_id                   = "Z1234567890"
    }
    "internal" = {
      domain_name               = "internal.example.com"
      subject_alternative_names = ["admin.example.com", "monitoring.example.com"]
      zone_id                   = "Z0987654321"
    }
  }
}

# Create all certificates
resource "aws_acm_certificate" "certs" {
  for_each = var.certificates

  domain_name               = each.value.domain_name
  subject_alternative_names = each.value.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name    = each.key
    Domain  = each.value.domain_name
  }
}

# Flatten validation options across all certificates
locals {
  validation_records = {
    for item in flatten([
      for cert_key, cert in aws_acm_certificate.certs : [
        for dvo in cert.domain_validation_options : {
          key     = "${cert_key}-${dvo.domain_name}"
          zone_id = var.certificates[cert_key].zone_id
          name    = dvo.resource_record_name
          type    = dvo.resource_record_type
          record  = dvo.resource_record_value
        }
      ]
    ]) : item.key => item
  }
}

# Create all validation records
resource "aws_route53_record" "cert_validation" {
  for_each = local.validation_records

  zone_id         = each.value.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

# Validate all certificates
resource "aws_acm_certificate_validation" "certs" {
  for_each = var.certificates

  certificate_arn         = aws_acm_certificate.certs[each.key].arn
  validation_record_fqdns = [
    for key, record in aws_route53_record.cert_validation : record.fqdn
    if startswith(key, "${each.key}-")
  ]
}
```

## ALB with Multiple SSL Certificates

An ALB HTTPS listener has one default certificate and can have additional certificates for SNI (Server Name Indication):

```hcl
variable "default_certificate_key" {
  description = "Key from the certificates map to use as the default"
  type        = string
  default     = "web"
}

variable "additional_certificate_keys" {
  description = "Keys from the certificates map to add as additional certs"
  type        = list(string)
  default     = ["api", "internal"]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  # Default certificate
  certificate_arn = aws_acm_certificate_validation.certs[var.default_certificate_key].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.default.arn
  }
}

# Additional certificates for SNI
resource "aws_lb_listener_certificate" "additional" {
  for_each = toset(var.additional_certificate_keys)

  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate_validation.certs[each.value].certificate_arn
}
```

## CloudFront with Dynamic SSL Configuration

CloudFront distributions can use ACM certificates (must be in us-east-1) or the default CloudFront certificate:

```hcl
variable "use_custom_ssl" {
  description = "Whether to use a custom SSL certificate"
  type        = bool
  default     = true
}

variable "cloudfront_certificate_arn" {
  description = "ACM certificate ARN in us-east-1"
  type        = string
  default     = ""
}

variable "cloudfront_aliases" {
  description = "Custom domain names for the distribution"
  type        = list(string)
  default     = []
}

resource "aws_cloudfront_distribution" "main" {
  enabled     = true
  aliases     = var.use_custom_ssl ? var.cloudfront_aliases : []

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
  }

  # Dynamic viewer certificate - custom or default
  viewer_certificate {
    # Use custom certificate if enabled
    acm_certificate_arn      = var.use_custom_ssl ? var.cloudfront_certificate_arn : null
    ssl_support_method       = var.use_custom_ssl ? "sni-only" : null
    minimum_protocol_version = var.use_custom_ssl ? "TLSv1.2_2021" : null

    # Use CloudFront default certificate if custom is not enabled
    cloudfront_default_certificate = !var.use_custom_ssl
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

## Certificate Renewal Monitoring

You can also create CloudWatch alarms that monitor certificate expiration:

```hcl
locals {
  cert_arns = { for k, v in aws_acm_certificate_validation.certs : k => v.certificate_arn }
}

resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  for_each = local.cert_arns

  alarm_name          = "cert-expiry-${each.key}"
  alarm_description   = "SSL certificate for ${each.key} expires in less than 30 days"
  namespace           = "AWS/CertificateManager"
  metric_name         = "DaysToExpiry"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  period              = 86400  # 24 hours
  statistic           = "Minimum"
  threshold           = 30

  dimensions = {
    CertificateArn = each.value
  }

  alarm_actions = [var.alerts_sns_topic_arn]
}
```

## Handling Multiple Zones

When certificates span domains across different Route53 hosted zones, the validation record creation needs to route to the correct zone:

```hcl
variable "domain_zone_mapping" {
  description = "Map of domain names to their Route53 zone IDs"
  type        = map(string)
  default = {
    "example.com"     = "Z1111111111"
    "api.example.com" = "Z1111111111"
    "other-domain.io" = "Z2222222222"
  }
}

locals {
  # Match each validation option to its zone
  validation_with_zones = {
    for dvo in aws_acm_certificate.multi_domain.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      type    = dvo.resource_record_type
      record  = dvo.resource_record_value
      zone_id = lookup(var.domain_zone_mapping, dvo.domain_name, var.default_zone_id)
    }
  }
}

resource "aws_route53_record" "multi_domain_validation" {
  for_each = local.validation_with_zones

  zone_id         = each.value.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}
```

## Summary

SSL certificate configuration in Terraform naturally involves dynamic resource generation: multiple domains mean multiple validation records, multiple services mean multiple listener certificates, and environment differences mean conditional SSL configuration. The patterns shown here - flattening validation options, mapping certificates to services, and conditionally configuring SSL on CloudFront and ALBs - cover the most common scenarios. For more on load balancer configuration, see [how to use dynamic blocks for load balancer listeners](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-load-balancer-listeners/view).
