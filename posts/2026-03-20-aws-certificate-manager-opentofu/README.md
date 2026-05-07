# How to Configure AWS Certificate Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ACM, SSL/TLS, Certificate, Route 53, Infrastructure as Code

Description: Learn how to provision and validate SSL/TLS certificates using AWS Certificate Manager with OpenTofu, including DNS validation with Route 53 and certificate attachment to load balancers.

## Introduction

AWS Certificate Manager (ACM) provisions, manages, and deploys SSL/TLS certificates for use with AWS services. ACM public certificates are free to use with integrated services (ALB, CloudFront, API Gateway). For OpenTofu-managed ACM requests, you can use DNS or email validation; DNS validation via Route 53 is fully automatable, and ACM can automatically renew DNS-validated certificates that remain in use.

## Prerequisites

- OpenTofu v1.6+
- A public Route 53 hosted zone for your domain
- AWS credentials with ACM, Route 53, and Elastic Load Balancing permissions (and CloudFront permissions if you use Step 5)

## Step 1: Request Certificate with DNS Validation

```hcl
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name              # e.g., "example.com"
  subject_alternative_names = [
    "*.${var.domain_name}",                         # Wildcard for subdomains
    "www.${var.domain_name}",
    "api.${var.domain_name}"
  ]
  validation_method = "DNS"  # DNS validation for automation; EMAIL is manual

  lifecycle {
    create_before_destroy = true  # Recommended for certificate rotation
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
  }
}
```

## Step 2: Create DNS Validation Records in Route 53

```hcl
# Create CNAME records for DNS validation

resource "aws_route53_record" "cert_validation" {
  # example.com and *.example.com share the same validation record.
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : replace(dvo.domain_name, "*.", "") => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }...
  }

  zone_id         = var.route53_zone_id
  name            = each.value[0].name
  type            = each.value[0].type
  records         = [each.value[0].record]
  ttl             = 60
  allow_overwrite = true  # Allow overwriting if the record exists
}

# Wait for certificate to be validated
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "75m"
  }
}
```

## Step 3: Use Certificate with ALB

```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = var.alb_arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # TLS 1.3 and TLS 1.2 policy

  # Use the validated certificate
  certificate_arn = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = var.target_group_arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = var.alb_arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## Step 4: Add Additional Certificates to ALB

```hcl
# ALB listener can have multiple certificates (SNI)
resource "aws_lb_listener_certificate" "additional" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = var.additional_cert_arn
}
```

## Step 5: CloudFront Certificate (must be in us-east-1)

```hcl
# CloudFront requires certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider = aws.us_east_1

  certificate_arn = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options :
    aws_route53_record.cert_validation[replace(dvo.domain_name, "*.", "")].fqdn
  ]
}

resource "aws_cloudfront_distribution" "main" {
  # ...
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check certificate status
aws acm describe-certificate \
  --certificate-arn <arn> \
  --query 'Certificate.{Status: Status, DomainName: DomainName, NotAfter: NotAfter}'
```

## Conclusion

ACM DNS validation via Route 53 is the recommended approach because it automates validation and, for certificates that remain in use, renewal without manual intervention. The `create_before_destroy = true` lifecycle rule helps with certificate rotation by creating a replacement certificate before the existing one is destroyed. Always use the `aws_acm_certificate_validation` resource as a dependency for any resources that use the certificate to prevent deployment of services with unvalidated certificates.
