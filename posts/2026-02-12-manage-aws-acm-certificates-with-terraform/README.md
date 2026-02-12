# How to Manage AWS ACM Certificates with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, ACM, SSL, Security

Description: Learn how to request, validate, and manage AWS Certificate Manager SSL/TLS certificates with Terraform, including DNS validation, wildcard certs, and multi-region setups.

---

SSL/TLS certificates are a non-negotiable part of modern web infrastructure. Every public-facing service needs HTTPS, and AWS Certificate Manager (ACM) provides free certificates that auto-renew. The catch is that they need to be validated, and that validation process has a few nuances that trip people up when working with Terraform.

In this post, we'll cover requesting ACM certificates, automating DNS validation, handling wildcard certificates, and dealing with the regional constraints that affect CloudFront and other services.

## Requesting a Certificate

The basic certificate request is simple. ACM supports two validation methods: DNS and email. DNS validation is strongly preferred because it can be fully automated.

This requests a certificate for a single domain with DNS validation:

```hcl
# Request an ACM certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "example.com"
  validation_method = "DNS"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }

  # Create the new certificate before destroying the old one
  lifecycle {
    create_before_destroy = true
  }
}
```

The `create_before_destroy` lifecycle rule is important. Without it, Terraform would destroy the existing certificate before creating the new one, causing downtime for any services using it.

## DNS Validation with Route 53

To complete DNS validation, you need to create specific DNS records that ACM uses to verify domain ownership. If you manage your DNS in Route 53, Terraform can handle this automatically.

This creates the validation DNS records and waits for the certificate to be validated:

```hcl
# Look up the Route 53 hosted zone
data "aws_route53_zone" "main" {
  name         = "example.com"
  private_zone = false
}

# Create DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
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
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for the certificate to be validated
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

The `aws_acm_certificate_validation` resource doesn't create anything in AWS - it's a Terraform construct that blocks until ACM confirms the certificate is valid. DNS validation usually completes within a few minutes but can sometimes take longer.

## Wildcard Certificates

Wildcard certificates cover all subdomains at one level. A common pattern is to request a certificate that covers both the apex domain and all subdomains:

```hcl
# Certificate covering apex and all subdomains
resource "aws_acm_certificate" "wildcard" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

This single certificate works for `example.com`, `www.example.com`, `api.example.com`, `app.example.com`, and any other subdomain. Note that `*.example.com` doesn't cover `example.com` itself - you need both.

The DNS validation records for the apex and wildcard are actually the same record, so the `for_each` approach from above handles this correctly without creating duplicate records.

## Multiple Domains (SAN Certificate)

You can include multiple domain names in a single certificate using Subject Alternative Names:

```hcl
# SAN certificate for multiple domains
resource "aws_acm_certificate" "multi_domain" {
  domain_name = "example.com"

  subject_alternative_names = [
    "*.example.com",
    "example.org",
    "*.example.org",
    "myapp.io",
  ]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
```

Each domain needs its own DNS validation record. If the domains are in different Route 53 hosted zones, you'll need to create records in each zone.

Here's how to handle validation across multiple hosted zones:

```hcl
# Look up all hosted zones
data "aws_route53_zone" "zones" {
  for_each = toset(["example.com", "example.org", "myapp.io"])
  name     = each.value
}

# Create validation records in the appropriate zones
resource "aws_route53_record" "multi_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.multi_domain.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
      zone_id = data.aws_route53_zone.zones[
        # Find the matching zone for this domain
        length(regexall("example\\.com$", dvo.domain_name)) > 0 ? "example.com" :
        length(regexall("example\\.org$", dvo.domain_name)) > 0 ? "example.org" :
        "myapp.io"
      ].zone_id
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = each.value.zone_id
}
```

## CloudFront Certificates (us-east-1 Requirement)

CloudFront requires certificates to be in `us-east-1`, regardless of where your other resources are. If your main Terraform config targets a different region, you need a separate provider.

This creates a certificate in us-east-1 specifically for CloudFront:

```hcl
# Provider for us-east-1 (required for CloudFront certs)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Certificate in us-east-1 for CloudFront
resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = "cdn.example.com"
  subject_alternative_names = ["static.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Validation records (Route 53 is global, no special provider needed)
resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
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
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]
}
```

For using this certificate with CloudFront, see our post on [creating CloudFront distributions with Terraform](https://oneuptime.com/blog/post/create-cloudfront-distributions-with-terraform/view).

## Using the Certificate

Once validated, reference the certificate ARN in your resources:

```hcl
# ALB HTTPS listener using the ACM certificate
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

Notice we reference `aws_acm_certificate_validation.main.certificate_arn` instead of `aws_acm_certificate.main.arn`. This ensures Terraform waits for validation to complete before creating the listener.

## Importing Existing Certificates

If you have certificates purchased from a third-party CA, you can import them into ACM:

```hcl
# Import an external certificate
resource "aws_acm_certificate" "imported" {
  private_key       = file("${path.module}/certs/private.key")
  certificate_body  = file("${path.module}/certs/certificate.pem")
  certificate_chain = file("${path.module}/certs/chain.pem")

  lifecycle {
    create_before_destroy = true
  }
}
```

Imported certificates don't auto-renew - you're responsible for updating them before they expire. ACM-issued certificates auto-renew as long as the DNS validation records are in place.

## Monitoring Certificate Expiry

Even though ACM certificates auto-renew, it's good practice to monitor them. Renewal can fail if the DNS validation records are removed or if the certificate is unused.

```hcl
# CloudWatch alarm for certificate expiry
resource "aws_cloudwatch_metric_alarm" "cert_expiry" {
  alarm_name          = "acm-cert-expiry"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = 86400
  statistic           = "Minimum"
  threshold           = 30
  alarm_description   = "ACM certificate expires in less than 30 days"

  dimensions = {
    CertificateArn = aws_acm_certificate.main.arn
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Common Issues

**Validation taking too long.** DNS validation usually completes within 5-30 minutes. If it's been longer, check that the CNAME records were created correctly. ACM is very particular about the exact record values.

**Certificate in wrong region.** CloudFront needs `us-east-1`. API Gateway needs the certificate in the same region as the API. ALBs need it in the same region as the load balancer. Getting the region wrong is one of the most common mistakes.

**Certificate deletion blocked.** You can't delete a certificate that's in use by another AWS resource. Remove the reference first, then delete the certificate.

## Wrapping Up

ACM certificates are free and auto-renewing, which makes them a no-brainer for anything on AWS. The main complexity is handling DNS validation and regional requirements. With the Terraform patterns in this post, you can fully automate certificate provisioning across any number of domains and regions. Just remember: always use `create_before_destroy`, always use DNS validation, and always check the region requirements for the service you're attaching the certificate to.
