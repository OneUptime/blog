# How to Create SES Domain Identity with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, SES, Email, DNS

Description: A complete guide to setting up Amazon SES domain identity verification with Terraform, including DKIM, SPF, DMARC, and Route 53 DNS records.

---

Sending emails from your own domain through Amazon SES requires a verified domain identity. This involves creating DNS records for domain verification, DKIM signing, SPF, and DMARC - all of which you can automate with Terraform. No more copying TXT records from the console and pasting them into your DNS provider one at a time.

This guide walks through setting up a fully verified SES domain identity with all the necessary DNS records, assuming you're using Route 53 for DNS. If you use a different DNS provider, the Terraform resources for the DNS records will differ, but the SES configuration stays the same.

## The Full Picture

Before we dive into code, here's what we need to set up:

1. SES domain identity - tells SES you want to send email from your domain
2. Domain verification - proves you own the domain via DNS TXT records
3. DKIM - cryptographically signs outgoing emails
4. SPF record - tells receiving mail servers that SES is authorized to send on your behalf
5. DMARC record - sets policy for how receivers handle authentication failures
6. MX record (optional) - for receiving emails through SES

## Creating the Domain Identity

Let's start with the basic SES domain identity and verification:

```hcl
# Create the SES domain identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# Create a Route 53 TXT record for domain verification
resource "aws_route53_record" "ses_verification" {
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600

  records = [
    aws_ses_domain_identity.main.verification_token
  ]
}

# Wait for verification to complete
resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_verification]
}
```

The `aws_ses_domain_identity_verification` resource will wait during `terraform apply` until SES confirms the domain is verified. This can take a minute or two.

## Setting Up DKIM

DKIM (DomainKeys Identified Mail) adds a digital signature to your outgoing emails. It's critical for deliverability - without it, your emails are much more likely to land in spam folders.

SES generates three DKIM tokens that you publish as CNAME records:

```hcl
# Generate DKIM tokens
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Create Route 53 CNAME records for DKIM
resource "aws_route53_record" "dkim" {
  count   = 3
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600

  records = [
    "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"
  ]
}
```

The `count = 3` creates all three DKIM records in one shot. SES always generates exactly three tokens, so this is safe.

## SPF Record

SPF (Sender Policy Framework) tells receiving mail servers which IP addresses are authorized to send email for your domain. For SES, you include Amazon's SPF record:

```hcl
# SPF record - authorizes SES to send email for this domain
resource "aws_route53_record" "spf" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600

  records = [
    "v=spf1 include:amazonses.com ~all"
  ]
}
```

If you already have an SPF record for the domain (maybe for Google Workspace or another service), you'll need to merge them into a single record. DNS only allows one SPF record per domain.

## DMARC Record

DMARC (Domain-based Message Authentication, Reporting, and Conformance) builds on SPF and DKIM. It tells receivers what to do when authentication fails and where to send reports:

```hcl
# DMARC record
resource "aws_route53_record" "dmarc" {
  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600

  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${var.domain_name}"
  ]
}
```

Start with `p=quarantine` instead of `p=reject` while you're getting things set up. Once you've confirmed everything works, you can tighten the policy to `p=reject`.

## Setting Up Email Receiving (Optional)

If you want SES to receive emails for your domain, you need an MX record and a receipt rule set:

```hcl
# MX record for receiving email through SES
resource "aws_route53_record" "mx" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 600

  records = [
    "10 inbound-smtp.${var.aws_region}.amazonaws.com"
  ]
}

# Receipt rule set for incoming email
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "main-rule-set"
}

resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

# Rule to store incoming emails in S3
resource "aws_ses_receipt_rule" "store_in_s3" {
  name          = "store-incoming-emails"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  enabled       = true
  scan_enabled  = true

  recipients = [var.domain_name]

  s3_action {
    bucket_name = aws_s3_bucket.email_storage.id
    position    = 1
  }
}
```

## Mail From Domain

Setting a custom MAIL FROM domain improves deliverability further. It lets SES use your subdomain instead of amazonses.com as the envelope sender:

```hcl
# Custom MAIL FROM domain
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "bounce.${var.domain_name}"
}

# MX record for the MAIL FROM domain
resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.route53_zone_id
  name    = "bounce.${var.domain_name}"
  type    = "MX"
  ttl     = 600

  records = [
    "10 feedback-smtp.${var.aws_region}.amazonaws.com"
  ]
}

# SPF record for the MAIL FROM domain
resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.route53_zone_id
  name    = "bounce.${var.domain_name}"
  type    = "TXT"
  ttl     = 600

  records = [
    "v=spf1 include:amazonses.com ~all"
  ]
}
```

## SES Configuration Set

Configuration sets let you track email metrics like sends, bounces, complaints, and deliveries. They're essential for monitoring:

```hcl
# Configuration set for tracking email events
resource "aws_ses_configuration_set" "main" {
  name = "main-config-set"

  delivery_options {
    tls_policy = "Require"
  }
}

# Send email events to CloudWatch
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = [
    "send",
    "bounce",
    "complaint",
    "delivery",
    "reject",
  ]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:from-domain"
    value_source   = "emailHeader"
  }
}
```

## Variables

Here's the variable file to make this reusable:

```hcl
variable "domain_name" {
  description = "The domain to verify with SES"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the domain"
  type        = string
}

variable "aws_region" {
  description = "AWS region for SES"
  type        = string
  default     = "us-east-1"
}
```

## Outputs

Export the key values other modules might need:

```hcl
output "domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = aws_ses_configuration_set.main.name
}

output "verification_status" {
  description = "Whether the domain has been verified"
  value       = aws_ses_domain_identity_verification.main.id != "" ? "verified" : "pending"
}
```

## Moving Out of the SES Sandbox

One thing Terraform can't do for you is move your SES account out of the sandbox. New SES accounts are restricted to sending only to verified email addresses. You'll need to request production access through the AWS console or CLI. But everything else - the domain setup, DNS records, DKIM, SPF, DMARC - that's all handled by the Terraform code above.

## Summary

With this Terraform configuration, you get a fully verified SES domain identity with DKIM, SPF, DMARC, and a custom MAIL FROM domain. The DNS records are created automatically in Route 53, and email events flow to CloudWatch for monitoring. Drop these resources into a module, parameterize the domain name, and you can spin up verified sending domains in minutes instead of hours.

For monitoring the health of your email sending infrastructure, take a look at our guide on [setting up AWS monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view) to keep track of bounce rates and delivery metrics.
