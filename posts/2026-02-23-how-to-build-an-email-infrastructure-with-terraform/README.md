# How to Build an Email Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Email, SES, AWS, DNS, Infrastructure Patterns

Description: Build a production email infrastructure with Terraform using Amazon SES, DNS authentication records, sending policies, event tracking, and bounce handling.

---

Email is deceptively complex. Sending email is easy. Sending email that actually arrives in inboxes instead of spam folders requires proper DNS records (SPF, DKIM, DMARC), sender reputation management, bounce handling, and compliance with anti-spam regulations. Managing all of this by hand is tedious and error-prone.

Terraform lets you define your entire email infrastructure as code. In this guide, we will build a production-ready email sending setup on AWS using Amazon SES, complete with authentication, monitoring, and compliance.

## Architecture Overview

Our email infrastructure includes:

- Amazon SES for sending emails
- DNS records for SPF, DKIM, and DMARC authentication
- SNS topics for bounce and complaint handling
- S3 for email archiving
- CloudWatch for delivery metrics
- Lambda for processing bounces

## SES Domain Identity

First, verify your domain with SES:

```hcl
# Domain identity in SES
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# Domain verification TXT record
resource "aws_route53_record" "ses_verification" {
  zone_id = var.hosted_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id

  depends_on = [aws_route53_record.ses_verification]
}
```

## DKIM Configuration

DKIM signs outgoing emails to prove they came from your domain:

```hcl
# Generate DKIM tokens
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Create DNS records for DKIM verification
resource "aws_route53_record" "dkim" {
  count   = 3
  zone_id = var.hosted_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}
```

## SPF and DMARC Records

SPF tells receiving servers which mail servers are authorized to send email for your domain. DMARC ties SPF and DKIM together with a policy:

```hcl
# SPF record - authorize SES to send on behalf of your domain
resource "aws_route53_record" "spf" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:amazonses.com -all"
  ]
}

# MX record for receiving email (if using SES for inbound)
resource "aws_route53_record" "mx" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 3600
  records = [
    "10 inbound-smtp.${var.region}.amazonaws.com"
  ]
}

# DMARC record
resource "aws_route53_record" "dmarc" {
  zone_id = var.hosted_zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${var.domain_name}; ruf=mailto:dmarc-forensics@${var.domain_name}; pct=100; adkim=s; aspf=s"
  ]
}

# Custom MAIL FROM domain for better deliverability
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "bounce.${var.domain_name}"
}

# MX record for custom MAIL FROM
resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.hosted_zone_id
  name    = "bounce.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.region}.amazonses.com"]
}

# SPF for custom MAIL FROM
resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.hosted_zone_id
  name    = "bounce.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}
```

## SES Configuration Set

Configuration sets enable event tracking and sending policies:

```hcl
resource "aws_ses_configuration_set" "main" {
  name = "${var.project_name}-default"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_metrics_enabled = true
  sending_enabled            = true
}

# Track delivery events via SNS
resource "aws_ses_event_destination" "sns" {
  name                   = "delivery-events"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = [
    "bounce",
    "complaint",
    "delivery",
    "reject",
  ]

  sns_destination {
    topic_arn = aws_sns_topic.email_events.arn
  }
}

# Archive all sent emails to S3 via Firehose
resource "aws_ses_event_destination" "firehose" {
  name                   = "email-archive"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true

  matching_types = [
    "send",
    "delivery",
    "bounce",
    "complaint",
  ]

  kinesis_destination {
    role_arn   = aws_iam_role.ses_firehose.arn
    stream_arn = aws_kinesis_firehose_delivery_stream.email_events.arn
  }
}
```

## Bounce and Complaint Handling

Properly handling bounces and complaints is critical for maintaining sender reputation:

```hcl
# SNS topic for email events
resource "aws_sns_topic" "email_events" {
  name = "${var.project_name}-email-events"
}

# Lambda function to process bounces and complaints
resource "aws_lambda_function" "bounce_handler" {
  filename         = var.bounce_handler_package
  function_name    = "${var.project_name}-bounce-handler"
  role             = aws_iam_role.bounce_handler.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 30
  source_code_hash = filebase64sha256(var.bounce_handler_package)

  environment {
    variables = {
      SUPPRESSION_TABLE = aws_dynamodb_table.suppression_list.name
    }
  }
}

# Trigger Lambda from SNS
resource "aws_sns_topic_subscription" "bounce_handler" {
  topic_arn = aws_sns_topic.email_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.bounce_handler.arn
}

resource "aws_lambda_permission" "sns_invoke" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bounce_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.email_events.arn
}

# DynamoDB table for the suppression list
resource "aws_dynamodb_table" "suppression_list" {
  name         = "${var.project_name}-email-suppression"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Purpose = "email-suppression-list"
  }
}
```

## SES Sending IAM Policy

Grant your application the minimum permissions needed to send email:

```hcl
resource "aws_iam_policy" "ses_sender" {
  name        = "${var.project_name}-ses-sender"
  description = "Allow sending email via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
          "ses:SendBulkTemplatedEmail"
        ]
        Resource = [
          aws_ses_domain_identity.main.arn,
          aws_ses_configuration_set.main.arn
        ]
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.allowed_from_addresses
          }
        }
      }
    ]
  })
}
```

## Email Templates

Store email templates in SES for transactional emails:

```hcl
resource "aws_ses_template" "welcome" {
  name    = "welcome-email"
  subject = "Welcome to ${var.project_name}!"
  html    = file("${path.module}/templates/welcome.html")
  text    = file("${path.module}/templates/welcome.txt")
}

resource "aws_ses_template" "password_reset" {
  name    = "password-reset"
  subject = "Reset Your Password"
  html    = file("${path.module}/templates/password-reset.html")
  text    = file("${path.module}/templates/password-reset.txt")
}
```

## Inbound Email Processing

If you need to receive email, SES can store incoming messages in S3 or trigger Lambda:

```hcl
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "${var.project_name}-inbound"
}

resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

resource "aws_ses_receipt_rule" "store_and_process" {
  name          = "store-and-process"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  recipients    = ["support@${var.domain_name}"]
  enabled       = true
  scan_enabled  = true

  # Store in S3
  s3_action {
    bucket_name       = aws_s3_bucket.inbound_email.id
    object_key_prefix = "inbound/"
    kms_key_arn       = aws_kms_key.email.arn
    position          = 1
  }

  # Process with Lambda
  lambda_action {
    function_arn    = aws_lambda_function.email_processor.arn
    invocation_type = "Event"
    position        = 2
  }
}
```

## Monitoring

Track email delivery metrics to catch issues early:

```hcl
resource "aws_cloudwatch_metric_alarm" "bounce_rate" {
  alarm_name          = "${var.project_name}-email-bounce-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.BounceRate"
  namespace           = "AWS/SES"
  period              = 3600
  statistic           = "Average"
  threshold           = 0.05 # 5% bounce rate
  alarm_description   = "Email bounce rate exceeds 5%"
  alarm_actions       = [var.sns_alert_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "complaint_rate" {
  alarm_name          = "${var.project_name}-email-complaint-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Reputation.ComplaintRate"
  namespace           = "AWS/SES"
  period              = 3600
  statistic           = "Average"
  threshold           = 0.001 # 0.1% complaint rate
  alarm_description   = "Email complaint rate exceeds 0.1%"
  alarm_actions       = [var.sns_alert_topic_arn]
}
```

For comprehensive DNS management alongside your email setup, see [building a DNS infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-dns-infrastructure-with-terraform/view).

## Wrapping Up

Email infrastructure has a lot of moving parts: domain verification, authentication records, bounce handling, suppression lists, and reputation monitoring. Getting any of these wrong means your emails end up in spam. Terraform lets you define all of this as code, test it in staging, and deploy it confidently. The setup we built covers outbound sending, inbound receiving, event tracking, and compliance. Start with the domain verification and authentication records, add the configuration set and event handling, and layer on monitoring to protect your sender reputation.
