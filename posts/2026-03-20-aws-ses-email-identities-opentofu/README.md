# How to Create AWS SES Email Identities with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SES, Email, Infrastructure as Code, DNS

Description: Learn how to create and verify AWS SES email identities for domains and email addresses using OpenTofu, including DKIM and MAIL FROM configuration.

## Introduction

AWS Simple Email Service (SES) requires you to verify domain or email address identities before sending mail. OpenTofu automates this process and can automatically create the necessary DNS records when your DNS is managed by Route 53.

## Verifying an Email Address Identity

```hcl
# Verify a single email address (AWS sends a confirmation email)

resource "aws_ses_email_identity" "sender" {
  email = "noreply@example.com"
}
```

## Verifying a Domain Identity

```hcl
# Verify an entire domain for sending
resource "aws_ses_domain_identity" "example" {
  domain = "example.com"
}
```

## Configuring DKIM

DKIM (DomainKeys Identified Mail) adds a cryptographic signature to outgoing email. SES provides three CNAME records to add to your DNS.

```hcl
resource "aws_ses_domain_dkim" "example" {
  domain = aws_ses_domain_identity.example.domain
}
```

If your domain's DNS is in Route 53, OpenTofu can create the DKIM records automatically.

```hcl
# Create DKIM CNAME records in Route 53
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "${aws_ses_domain_dkim.example.dkim_tokens[count.index]}._domainkey.example.com"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.example.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# Add the domain verification TXT record
resource "aws_route53_record" "ses_verification" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "_amazonses.example.com"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.example.verification_token]
}

resource "aws_ses_domain_identity_verification" "example" {
  domain = aws_ses_domain_identity.example.domain

  depends_on = [aws_route53_record.ses_verification]
}
```

## Configuring a Custom MAIL FROM Domain

A custom MAIL FROM domain improves deliverability and branding.

```hcl
resource "aws_ses_domain_mail_from" "example" {
  domain           = aws_ses_domain_identity.example.domain
  mail_from_domain = "mail.example.com"
}

# MX record for the MAIL FROM subdomain
resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = aws_ses_domain_mail_from.example.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.region}.amazonses.com"]
}

# SPF TXT record for the MAIL FROM subdomain
resource "aws_route53_record" "ses_mail_from_txt" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = aws_ses_domain_mail_from.example.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
```

## Checking Verification Status

If `tofu apply` completes after `aws_ses_domain_identity_verification.example`, SES has confirmed the domain identity. You can also output the verification values for inspection.

```hcl
output "verified_domain_identity" {
  description = "Domain identity after SES verification succeeds"
  value       = aws_ses_domain_identity_verification.example.id
}

output "domain_verification_token" {
  description = "TXT record value used for domain verification"
  value       = aws_ses_domain_identity.example.verification_token
}

output "dkim_tokens" {
  description = "DKIM tokens to add as CNAME records"
  value       = aws_ses_domain_dkim.example.dkim_tokens
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

OpenTofu simplifies SES identity management by automating domain verification, DKIM record creation, and MAIL FROM configuration alongside your DNS records. This ensures your email sending infrastructure is reproducible and consistently configured across environments.
