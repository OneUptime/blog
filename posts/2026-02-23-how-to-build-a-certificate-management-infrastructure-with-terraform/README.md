# How to Build a Certificate Management Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Certificate Management, ACM, TLS, Security, Infrastructure Patterns

Description: Build a complete certificate management infrastructure with Terraform using ACM, Private CA, automated renewal, and certificate monitoring for secure communications.

---

TLS certificates are everywhere in modern infrastructure. Your load balancers, API gateways, CDN distributions, and internal services all need certificates. Managing them manually leads to expired certificates, which means outages and security warnings. Certificate expiration is one of the most common causes of preventable outages.

In this guide, we will build a certificate management infrastructure on AWS using Terraform. We will cover public certificates with ACM, private certificate authorities for internal services, automated DNS validation, and monitoring for certificate expiration.

## Public Certificates with ACM

AWS Certificate Manager provides free public certificates that automatically renew. The key is setting up DNS validation so renewal happens without manual intervention:

```hcl
# modules/acm_certificate/main.tf

# Request the certificate
resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  # Important: create before destroy prevents downtime during replacement
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
  }
}

# Create DNS validation records automatically
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.hosted_zone_id
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
```

## Using the Certificate Module

Create certificates for all your services:

```hcl
# Wildcard certificate for the main domain
module "wildcard_cert" {
  source      = "./modules/acm_certificate"
  domain_name = "*.${var.domain_name}"
  subject_alternative_names = [
    var.domain_name,
    "*.api.${var.domain_name}",
  ]
  hosted_zone_id = aws_route53_zone.main.zone_id
  environment    = var.environment
}

# Certificate for CloudFront (must be in us-east-1)
module "cdn_cert" {
  source = "./modules/acm_certificate"
  providers = {
    aws = aws.us_east_1
  }
  domain_name = var.domain_name
  subject_alternative_names = [
    "www.${var.domain_name}",
    "static.${var.domain_name}",
  ]
  hosted_zone_id = aws_route53_zone.main.zone_id
  environment    = var.environment
}

# Certificate for API Gateway
module "api_cert" {
  source      = "./modules/acm_certificate"
  domain_name = "api.${var.domain_name}"
  subject_alternative_names = [
    "api-v2.${var.domain_name}",
  ]
  hosted_zone_id = aws_route53_zone.main.zone_id
  environment    = var.environment
}
```

## Private Certificate Authority

For internal services that need mutual TLS (mTLS) or certificate-based authentication, set up a private CA:

```hcl
# Root CA
resource "aws_acmpca_certificate_authority" "root" {
  certificate_authority_configuration {
    key_algorithm     = "RSA_4096"
    signing_algorithm = "SHA512WITHRSA"

    subject {
      common_name         = "${var.project_name} Root CA"
      organization        = var.organization_name
      organizational_unit = "Infrastructure"
      country             = var.country_code
    }
  }

  type                            = "ROOT"
  permanent_deletion_time_in_days = 30

  revocation_configuration {
    crl_configuration {
      enabled            = true
      expiration_in_days = 7
      s3_bucket_name     = aws_s3_bucket.crl.id
      s3_object_acl      = "BUCKET_OWNER_FULL_CONTROL"
    }
  }

  tags = {
    Name = "${var.project_name}-root-ca"
  }
}

# Subordinate CA for issuing service certificates
resource "aws_acmpca_certificate_authority" "subordinate" {
  certificate_authority_configuration {
    key_algorithm     = "RSA_2048"
    signing_algorithm = "SHA256WITHRSA"

    subject {
      common_name         = "${var.project_name} Services CA"
      organization        = var.organization_name
      organizational_unit = "Services"
      country             = var.country_code
    }
  }

  type                            = "SUBORDINATE"
  permanent_deletion_time_in_days = 30

  tags = {
    Name = "${var.project_name}-services-ca"
  }
}

# Issue the subordinate CA certificate from the root CA
resource "aws_acmpca_certificate" "subordinate" {
  certificate_authority_arn   = aws_acmpca_certificate_authority.root.arn
  certificate_signing_request = aws_acmpca_certificate_authority.subordinate.certificate_signing_request
  signing_algorithm           = "SHA256WITHRSA"

  template_arn = "arn:aws:acm-pca:::template/SubordinateCACertificate_PathLen0/V1"

  validity {
    type  = "YEARS"
    value = 5
  }
}

resource "aws_acmpca_certificate_authority_certificate" "subordinate" {
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn
  certificate              = aws_acmpca_certificate.subordinate.certificate
  certificate_chain        = aws_acmpca_certificate.subordinate.certificate_chain
}
```

## Private Certificates for Services

Issue private certificates from your subordinate CA:

```hcl
# Private certificate for an internal service
resource "aws_acm_certificate" "internal_service" {
  domain_name               = "service.internal.${var.domain_name}"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name    = "service-internal-cert"
    Service = "my-service"
  }
}

# Module for creating internal service certificates
module "auth_service_cert" {
  source                   = "./modules/private_certificate"
  domain_name              = "auth.internal.${var.domain_name}"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn
}

module "payment_service_cert" {
  source                   = "./modules/private_certificate"
  domain_name              = "payment.internal.${var.domain_name}"
  certificate_authority_arn = aws_acmpca_certificate_authority.subordinate.arn
}
```

## CRL Distribution

Certificate Revocation Lists let clients check if a certificate has been revoked:

```hcl
# S3 bucket for CRL distribution
resource "aws_s3_bucket" "crl" {
  bucket = "${var.project_name}-crl-${var.account_id}"
}

resource "aws_s3_bucket_public_access_block" "crl" {
  bucket = aws_s3_bucket.crl.id

  # CRL needs to be publicly readable
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "crl" {
  bucket = aws_s3_bucket.crl.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowACMPCAWrite"
        Effect    = "Allow"
        Principal = { Service = "acm-pca.amazonaws.com" }
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.crl.arn,
          "${aws_s3_bucket.crl.arn}/*"
        ]
      },
      {
        Sid       = "AllowPublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.crl.arn}/*"
      }
    ]
  })
}
```

## Certificate Expiration Monitoring

Even with ACM auto-renewal, monitoring is important. Third-party certificates or misconfigured DNS can prevent renewal:

```hcl
# Lambda function to check certificate expiration
resource "aws_lambda_function" "cert_checker" {
  filename         = var.cert_checker_package
  function_name    = "${var.project_name}-cert-expiry-checker"
  role             = aws_iam_role.cert_checker.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  timeout          = 120
  source_code_hash = filebase64sha256(var.cert_checker_package)

  environment {
    variables = {
      SNS_TOPIC_ARN      = var.alert_sns_topic_arn
      WARNING_DAYS       = "30"
      CRITICAL_DAYS      = "7"
    }
  }
}

# Run daily
resource "aws_cloudwatch_event_rule" "daily_cert_check" {
  name                = "${var.project_name}-cert-expiry-check"
  description         = "Check for expiring certificates daily"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "cert_checker" {
  rule = aws_cloudwatch_event_rule.daily_cert_check.name
  arn  = aws_lambda_function.cert_checker.arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cert_checker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cert_check.arn
}

# CloudWatch alarm for ACM certificate expiration
resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  alarm_name          = "${var.project_name}-cert-expiring-soon"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400
  statistic           = "Minimum"
  threshold           = 30
  alarm_description   = "ACM certificate expiring within 30 days"
  alarm_actions       = [var.alert_sns_topic_arn]

  dimensions = {
    CertificateArn = module.wildcard_cert.certificate_arn
  }
}
```

For securing your secrets alongside certificates, see [building a secrets management infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-secrets-management-infrastructure-with-terraform/view).

## Wrapping Up

Certificate management is a critical piece of infrastructure security. The Terraform setup we built automates certificate provisioning with DNS validation, provides a private CA for internal services, distributes revocation lists, and monitors for expiration. The key insight is that ACM handles public certificates well, but you need a private CA for internal mTLS and certificate-based authentication. Define it all in Terraform, and certificate-related outages become a thing of the past.
