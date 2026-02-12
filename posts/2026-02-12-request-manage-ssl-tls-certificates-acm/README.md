# How to Request and Manage SSL/TLS Certificates with ACM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, SSL, TLS, Security

Description: Learn how to request, validate, and manage SSL/TLS certificates with AWS Certificate Manager, including DNS and email validation, wildcard certificates, and renewal.

---

SSL/TLS certificates are one of those things that seem simple until something goes wrong - like your certificate expiring on a Friday evening. AWS Certificate Manager (ACM) eliminates most of that pain by providing free certificates that automatically renew. No more calendar reminders, no more scrambling to buy and install certificates manually.

This guide covers requesting certificates, choosing between DNS and email validation, working with wildcard certificates, and managing certificate lifecycle.

## ACM Basics

ACM provides free public SSL/TLS certificates for use with AWS services like CloudFront, ALB, API Gateway, and Elastic Beanstalk. There are a few things to understand upfront:

- **Public certificates are free** - no charge for certificates used with integrated AWS services
- **Private certificates cost money** - ACM Private CA charges $400/month per CA
- **You can't download ACM certificates** - they're tied to AWS services. If you need a certificate for an on-premise server, use a different CA
- **Automatic renewal** for DNS-validated certificates as long as the CNAME record is in place
- **Regional** - certificates are regional except for CloudFront, which requires certificates in us-east-1

## Requesting a Certificate

The most common case is requesting a certificate for a domain you control.

```bash
# Request a certificate for a single domain
aws acm request-certificate \
  --domain-name "app.example.com" \
  --validation-method DNS \
  --tags '[{"Key": "Environment", "Value": "production"}]'
```

For multiple domains (Subject Alternative Names), list them all in one request.

```bash
# Request a certificate with multiple domains
aws acm request-certificate \
  --domain-name "example.com" \
  --subject-alternative-names "www.example.com" "api.example.com" "app.example.com" \
  --validation-method DNS \
  --tags '[{"Key": "Environment", "Value": "production"}]'
```

The response gives you a certificate ARN. Save it - you'll need it for everything else.

## Wildcard Certificates

Wildcard certificates cover all subdomains at one level. You can combine them with specific domain names.

```bash
# Request a wildcard certificate
aws acm request-certificate \
  --domain-name "*.example.com" \
  --subject-alternative-names "example.com" \
  --validation-method DNS
```

This covers `app.example.com`, `api.example.com`, `www.example.com`, and any other subdomain, plus the apex domain `example.com`. Note that wildcards only cover one level - `*.example.com` doesn't cover `api.staging.example.com`.

For deeper subdomains, you'd need an additional SAN.

```bash
# Cover multiple subdomain levels
aws acm request-certificate \
  --domain-name "*.example.com" \
  --subject-alternative-names "example.com" "*.staging.example.com" \
  --validation-method DNS
```

## DNS Validation

DNS validation is the recommended approach. You add a CNAME record to your DNS, and ACM uses it to verify domain ownership. The record stays in place permanently, enabling automatic renewal.

After requesting a certificate, get the validation records.

```bash
# Get the validation CNAME records
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456" \
  --query 'Certificate.DomainValidationOptions[*].{Domain:DomainName,Name:ResourceRecord.Name,Value:ResourceRecord.Value,Status:ValidationStatus}'
```

If your DNS is hosted in Route 53, you can add the records directly.

```bash
# Get the certificate details
CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456"
HOSTED_ZONE_ID="Z1234567890ABC"

# Get the validation record name and value
VALIDATION=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord')

RECORD_NAME=$(echo "$VALIDATION" | jq -r '.Name')
RECORD_VALUE=$(echo "$VALIDATION" | jq -r '.Value')

# Create the Route 53 validation record
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'"$RECORD_NAME"'",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "'"$RECORD_VALUE"'"}
          ]
        }
      }
    ]
  }'
```

Validation usually completes within 5-30 minutes after the DNS record propagates.

## Terraform Configuration

Terraform makes the whole process clean, especially with Route 53 validation.

```hcl
# Request the certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Environment = "production"
  }
}

# Create validation DNS records in Route 53
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

# Wait for validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

The `create_before_destroy` lifecycle rule is important. Without it, Terraform would try to delete the old certificate before creating the new one during updates, which would cause downtime for any services using it.

## Email Validation

If you can't modify DNS records, email validation is the alternative. ACM sends a verification email to predefined addresses for the domain.

```bash
# Request with email validation
aws acm request-certificate \
  --domain-name "example.com" \
  --validation-method EMAIL
```

ACM sends emails to these addresses:
- admin@example.com
- administrator@example.com
- hostmaster@example.com
- postmaster@example.com
- webmaster@example.com

Someone needs to click the approval link in the email. The downside of email validation is that automatic renewal requires re-approval via email, so DNS validation is almost always preferred.

## Certificate Renewal

DNS-validated certificates renew automatically 60 days before expiration. ACM handles this entirely - no action needed on your part, as long as the CNAME validation record is still in DNS.

Email-validated certificates require manual approval for renewal. ACM sends renewal emails 45 days before expiration.

You can check renewal status.

```bash
# Check certificate status and renewal info
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/abc-123" \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,RenewalSummary:RenewalSummary,InUseBy:InUseBy}'
```

Set up a CloudWatch alarm for certificates approaching expiration.

```bash
# Create an alarm for certificates expiring within 30 days
aws cloudwatch put-metric-alarm \
  --alarm-name "ACM-Certificate-Expiring" \
  --namespace "AWS/CertificateManager" \
  --metric-name "DaysToExpiry" \
  --dimensions Name=CertificateArn,Value="arn:aws:acm:us-east-1:123456789012:certificate/abc-123" \
  --statistic Minimum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator LessThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

## Listing and Managing Certificates

Keep track of your certificates and their status.

```bash
# List all certificates
aws acm list-certificates \
  --query 'CertificateSummaryList[*].{Domain:DomainName,ARN:CertificateArn,Status:Status}' \
  --output table

# List certificates including expired ones
aws acm list-certificates \
  --includes '{"keyTypes":["RSA_2048","EC_prime256v1"]}' \
  --certificate-statuses ISSUED EXPIRED PENDING_VALIDATION

# Delete an unused certificate
aws acm delete-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/old-cert-123"
```

You can't delete a certificate that's in use by an AWS service. Detach it first.

## Key Algorithm Selection

ACM supports RSA 2048 (default) and ECDSA P-256. ECDSA certificates are smaller and provide better performance for TLS handshakes.

```bash
# Request an ECDSA certificate
aws acm request-certificate \
  --domain-name "example.com" \
  --validation-method DNS \
  --key-algorithm EC_prime256v1
```

ECDSA is recommended for CloudFront distributions and any high-traffic service where TLS handshake performance matters.

## Common Issues

**Certificate stuck in PENDING_VALIDATION:** The DNS record probably hasn't propagated. Use `dig` to verify the CNAME is resolving correctly.

**Renewal failing:** Check if the validation CNAME record was accidentally deleted. Re-add it.

**Can't use certificate with CloudFront:** CloudFront requires certificates in us-east-1, regardless of where your distribution is configured.

**Certificate not showing in service dropdown:** Make sure the certificate is in the ISSUED state and in the same region as the service.

For using ACM certificates with specific services, see our guides on [ACM with CloudFront](https://oneuptime.com/blog/post/acm-certificates-cloudfront-distributions/view) and [ACM with ALB](https://oneuptime.com/blog/post/acm-certificates-application-load-balancers/view).

## Wrapping Up

ACM takes most of the pain out of certificate management on AWS. Request DNS-validated certificates, keep the validation records in place, and let automatic renewal handle the rest. The certificates are free, the renewal is automatic, and you never have to deal with CSRs, key files, or certificate chains again. Just don't forget that CloudFront needs certificates in us-east-1 - that one catches everybody at least once.
