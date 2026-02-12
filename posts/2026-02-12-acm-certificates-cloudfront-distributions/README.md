# How to Set Up ACM Certificates for CloudFront Distributions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, CloudFront, SSL, CDN

Description: Learn how to configure ACM SSL/TLS certificates with CloudFront distributions for HTTPS, including custom domains, certificate requirements, and common pitfalls.

---

CloudFront distributions need SSL certificates to serve content over HTTPS with custom domain names. Without ACM, you'd be buying certificates from a third-party CA, converting them to PEM format, and uploading them manually. ACM makes this dramatically simpler - free certificates that auto-renew, directly attached to your distribution.

But CloudFront has some specific requirements around certificates that catch people off guard. Let's walk through the setup step by step.

## The Us-East-1 Requirement

This is the number one gotcha. CloudFront is a global service, but it only accepts ACM certificates from the **us-east-1** region. It doesn't matter where your origin server or S3 bucket is located. Your certificate must be in us-east-1.

If you try to use a certificate from any other region, it simply won't appear in the CloudFront console dropdown.

```bash
# Request the certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --region us-east-1 \
  --domain-name "cdn.example.com" \
  --subject-alternative-names "example.com" "*.example.com" \
  --validation-method DNS
```

## Full Setup: Certificate to Distribution

Let's walk through the entire process from certificate request to working distribution.

Step 1: Request and validate the certificate.

```bash
# Request the certificate
CERT_ARN=$(aws acm request-certificate \
  --region us-east-1 \
  --domain-name "example.com" \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get the validation records
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.DomainValidationOptions[*].ResourceRecord'
```

Step 2: Add the DNS validation records (see our [ACM certificate guide](https://oneuptime.com/blog/post/request-manage-ssl-tls-certificates-acm/view) for details). Wait for validation to complete.

```bash
# Check validation status
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.Status'
```

Step 3: Create or update the CloudFront distribution with the certificate.

```bash
# Create a CloudFront distribution with ACM certificate
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "my-distribution-2026",
    "Comment": "Production CDN",
    "Enabled": true,
    "Aliases": {
      "Quantity": 2,
      "Items": ["cdn.example.com", "example.com"]
    },
    "ViewerCertificate": {
      "ACMCertificateArn": "'"$CERT_ARN"'",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "myS3Origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
      "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
      "ForwardedValues": {"QueryString": false, "Cookies": {"Forward": "none"}},
      "MinTTL": 0,
      "DefaultTTL": 86400,
      "MaxTTL": 31536000,
      "Compress": true
    },
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "myS3Origin",
          "DomainName": "my-bucket.s3.amazonaws.com",
          "S3OriginConfig": {"OriginAccessIdentity": ""}
        }
      ]
    },
    "DefaultRootObject": "index.html"
  }'
```

## Terraform Configuration

Terraform handles the multi-region requirement cleanly with provider aliases.

```hcl
# Provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ACM certificate in us-east-1
resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Purpose = "cloudfront"
  }
}

# DNS validation records
resource "aws_route53_record" "cloudfront_cert" {
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

# Wait for certificate validation
resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert : record.fqdn]
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Production CDN"
  default_root_object = "index.html"
  aliases             = ["cdn.example.com", "example.com"]

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "s3-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  depends_on = [aws_acm_certificate_validation.cloudfront]
}
```

The `depends_on` on the certificate validation is essential. Without it, Terraform might try to create the distribution before the certificate is validated, which will fail.

## SSL Support Method: SNI vs Dedicated IP

CloudFront offers two SSL support methods:

**SNI-only (recommended):** Uses Server Name Indication to determine which certificate to present. This is free and works with all modern browsers (anything from the last 10+ years).

**Dedicated IP:** Assigns dedicated IP addresses to your distribution for clients that don't support SNI. This costs $600/month. You almost certainly don't need this unless you're supporting very old devices.

```hcl
viewer_certificate {
  acm_certificate_arn      = aws_acm_certificate.cloudfront.arn
  ssl_support_method       = "sni-only"  # Free. Use this.
  minimum_protocol_version = "TLSv1.2_2021"
}
```

## Minimum TLS Protocol Version

Always set the minimum protocol version to TLSv1.2 or higher. Older protocols have known vulnerabilities.

Available options:
- `TLSv1.2_2021` - Recommended. Supports modern ciphers only.
- `TLSv1.2_2019` - Slightly broader cipher support.
- `TLSv1.2_2018` - Broader still but less secure.
- `TLSv1.1_2016`, `TLSv1_2016` - Don't use these unless you have a specific legacy requirement.

## Setting Up DNS

After your distribution is deployed, point your domain to CloudFront.

```bash
# Create an A record alias pointing to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "cdn.example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "d1234567890.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      }
    ]
  }'
```

The hosted zone ID `Z2FDTNDATAQYW2` is always the same for CloudFront distributions. It's a constant.

In Terraform:

```hcl
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "cdn.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

## HTTPS Redirect

Always redirect HTTP to HTTPS. Set the viewer protocol policy in your cache behavior.

```hcl
default_cache_behavior {
  viewer_protocol_policy = "redirect-to-https"
  # ... other settings
}
```

Options are:
- `redirect-to-https` - Recommended. Automatically redirects HTTP requests to HTTPS.
- `https-only` - Drops HTTP connections entirely. More strict but may confuse users.
- `allow-all` - Serves both HTTP and HTTPS. Not recommended.

## Updating Certificates

When you need to replace a certificate (maybe adding new SANs), use the `create_before_destroy` lifecycle to avoid downtime.

```bash
# Request a new certificate with updated domains
NEW_CERT=$(aws acm request-certificate \
  --region us-east-1 \
  --domain-name "example.com" \
  --subject-alternative-names "*.example.com" "*.staging.example.com" \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

# After validation, update the distribution
aws cloudfront get-distribution-config \
  --id E1234567890ABC > dist-config.json

# Edit the ViewerCertificate.ACMCertificateArn in dist-config.json
# Then update
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config file://dist-config.json \
  --if-match "ETAG_FROM_GET_COMMAND"
```

## Troubleshooting

**Certificate not appearing in CloudFront:** Check that it's in us-east-1 and in ISSUED status.

**ERR_CERT_COMMON_NAME_INVALID:** Your domain doesn't match any name on the certificate. Check SANs.

**Distribution stuck in "In Progress":** CloudFront deployments take 5-15 minutes. Wait it out.

**Mixed content warnings:** Your pages reference HTTP resources. Update those references to HTTPS or use protocol-relative URLs.

For details on importing existing certificates, see our guide on [importing external SSL certificates into ACM](https://oneuptime.com/blog/post/import-external-ssl-certificates-acm/view).

## Wrapping Up

Setting up ACM certificates with CloudFront is straightforward once you know the us-east-1 requirement. Use DNS validation for automatic renewal, SNI for SSL support, and TLSv1.2_2021 for the minimum protocol. The combination of free certificates, automatic renewal, and CloudFront's global edge network gives you enterprise-grade HTTPS without the enterprise-grade hassle.
