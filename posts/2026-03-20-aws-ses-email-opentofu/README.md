# How to Set Up AWS SES for Email with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SES, Email, Infrastructure as Code, DKIM, Transactional Email

Description: Learn how to configure AWS Simple Email Service (SES) using OpenTofu for transactional email with domain verification, DKIM signing, and sending authorization.

---

AWS SES is a cost-effective email sending service for transactional and marketing emails. Setting up SES properly - with domain verification, DKIM, DMARC, and appropriate identity policies - is essential for deliverability. OpenTofu manages this configuration as code, making domain identity setup repeatable.

## Domain Identity and Verification

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Create the SES domain identity
resource "aws_ses_domain_identity" "main" {
  domain = var.email_domain
}

# DKIM configuration for signing outbound emails
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}
```

## Creating DNS Records for Verification

```hcl
# dns.tf
# Using Route 53 - add the SES verification TXT record
resource "aws_route53_record" "ses_verification" {
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.email_domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# Add DKIM CNAME records (3 records required)
resource "aws_route53_record" "dkim" {
  count   = 3
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.email_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# Configure a custom MAIL FROM domain for aligned SPF
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.email_domain}"
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Add DMARC record
resource "aws_route53_record" "dmarc" {
  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.email_domain}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none; rua=mailto:dmarc@${var.email_domain}; pct=100"]
}

# Wait for domain verification before using SES
resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.domain

  depends_on = [aws_route53_record.ses_verification]
}
```

## Setting Up Email Templates

```hcl
# templates.tf
resource "aws_ses_template" "welcome" {
  name    = "WelcomeEmail"
  subject = "Welcome to {{company_name}}, {{first_name}}!"

  html = <<-HTML
    <html>
      <body>
        <h1>Welcome, {{first_name}}!</h1>
        <p>Thank you for signing up for {{company_name}}.</p>
        <p><a href="{{verify_link}}">Verify your email address</a> to get started.</p>
      </body>
    </html>
  HTML

  text = "Welcome, {{first_name}}! Please verify your email: {{verify_link}}"
}
```

## SES Identity Policy for Sending Authorization

```hcl
# authorization.tf
# Policy attached to the SES identity for a delegate sender
data "aws_iam_policy_document" "ses_sender" {
  statement {
    effect = "Allow"

    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ses:SendTemplatedEmail",
    ]

    resources = [aws_ses_domain_identity.main.arn]

    principals {
      type        = "AWS"
      identifiers = [var.delegate_sender_iam_arn]
    }

    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = ["*@${var.email_domain}"]
    }
  }
}

resource "aws_ses_identity_policy" "ses_sender" {
  identity = aws_ses_domain_identity.main.arn
  name     = "SESSenderPolicy"
  policy   = data.aws_iam_policy_document.ses_sender.json
}

data "aws_caller_identity" "current" {}

resource "aws_sns_topic" "ses_feedback" {
  name = "ses-feedback"
}

data "aws_iam_policy_document" "ses_feedback" {
  statement {
    effect = "Allow"

    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.ses_feedback.arn]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_ses_domain_identity.main.arn]
    }
  }
}

resource "aws_sns_topic_policy" "ses_feedback" {
  arn    = aws_sns_topic.ses_feedback.arn
  policy = data.aws_iam_policy_document.ses_feedback.json
}

# Bounce and complaint handling with SNS
resource "aws_ses_identity_notification_topic" "bounce" {
  topic_arn                = aws_sns_topic.ses_feedback.arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = false

  depends_on = [aws_sns_topic_policy.ses_feedback]
}

resource "aws_ses_identity_notification_topic" "complaint" {
  topic_arn                = aws_sns_topic.ses_feedback.arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = false

  depends_on = [aws_sns_topic_policy.ses_feedback]
}
```

## Best Practices

- Set up DKIM and DMARC. If you want SPF-based DMARC alignment, configure a custom MAIL FROM domain with MX and SPF records, and start DMARC with `p=none` before moving to stricter policies.
- Subscribe to bounce and complaint notifications via SNS and handle them in your application to maintain a healthy sending reputation.
- Use the account-level suppression list and remove hard-bouncing or complaint-generating addresses from your own recipient lists.
- Request production access (move out of sandbox) before going live - sandbox only allows sending to verified recipients, except for Amazon SES mailbox simulator addresses.
- Monitor your hard bounce rate (keep below 5%) and complaint rate (keep below 0.1%) to maintain healthy sending reputation.
