# How to Manage SendGrid Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, SendGrid, Email, Transactional Email, Marketing

Description: Learn how to manage SendGrid API keys, sender authentication, email templates, and IP pools using OpenTofu for reproducible email infrastructure management.

## Introduction

The SendGrid provider for OpenTofu manages API keys, domain authentication, IP pools, and template configurations. Managing email infrastructure as code prevents the common problem of production email settings diverging from staging and ensures domain authentication records stay synchronized with DNS configurations.

## Provider Configuration

```hcl
terraform {
  required_providers {
    sendgrid = {
      source  = "kenzo0107/sendgrid"
      version = "~> 2.8"
    }
  }
}

provider "sendgrid" {
  api_key = var.sendgrid_api_key
}
```

## API Key Management

```hcl
# API key with restricted permissions for application use

resource "sendgrid_api_key" "app_transactional" {
  name = "app-transactional-${var.environment}"

  scopes = [
    "mail.send",
  ]
}

# API key for email template management (CI/CD)
resource "sendgrid_api_key" "template_manager" {
  name = "template-manager-cicd"

  scopes = [
    "templates.create",
    "templates.delete",
    "templates.read",
    "templates.update",
    "templates.versions.create",
    "templates.versions.delete",
    "templates.versions.read",
    "templates.versions.update",
  ]
}

# Store the API key in AWS Secrets Manager
resource "aws_secretsmanager_secret" "sendgrid_api_key" {
  name = "/${var.environment}/sendgrid/api-key"
}

resource "aws_secretsmanager_secret_version" "sendgrid_api_key" {
  secret_id     = aws_secretsmanager_secret.sendgrid_api_key.id
  secret_string = sendgrid_api_key.app_transactional.api_key
}
```

## Domain Authentication

```hcl
resource "sendgrid_sender_authentication" "main" {
  domain    = "example.com"
  subdomain = "em"
  default   = true
}

locals {
  sendgrid_sender_authentication_dns = {
    dkim1 = one([
      for record in sendgrid_sender_authentication.main.dns : record
      if startswith(record.host, "s1._domainkey.")
    ])
    dkim2 = one([
      for record in sendgrid_sender_authentication.main.dns : record
      if startswith(record.host, "s2._domainkey.")
    ])
    mail_cname = one([
      for record in sendgrid_sender_authentication.main.dns : record
      if !startswith(record.host, "s1._domainkey.") && !startswith(record.host, "s2._domainkey.")
    ])
  }
}

# Create the required DNS records via OpenTofu
# sendgrid_sender_authentication outputs the DNS records to create
resource "aws_route53_record" "sendgrid_dkim1" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.sendgrid_sender_authentication_dns.dkim1.host
  type    = upper(local.sendgrid_sender_authentication_dns.dkim1.type)
  ttl     = 300
  records = [local.sendgrid_sender_authentication_dns.dkim1.data]
}

resource "aws_route53_record" "sendgrid_dkim2" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.sendgrid_sender_authentication_dns.dkim2.host
  type    = upper(local.sendgrid_sender_authentication_dns.dkim2.type)
  ttl     = 300
  records = [local.sendgrid_sender_authentication_dns.dkim2.data]
}

resource "aws_route53_record" "sendgrid_mail_cname" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.sendgrid_sender_authentication_dns.mail_cname.host
  type    = upper(local.sendgrid_sender_authentication_dns.mail_cname.type)
  ttl     = 300
  records = [local.sendgrid_sender_authentication_dns.mail_cname.data]
}
```

## Link Branding

```hcl
resource "sendgrid_link_branding" "main" {
  domain    = "example.com"
  subdomain = "click"
  default   = true
}
```

## IP Pool Configuration

```hcl
resource "sendgrid_ip_pool" "transactional" {
  name = "transactional"
  ips  = var.transactional_ips
}

resource "sendgrid_ip_pool" "marketing" {
  name = "marketing"
  ips  = var.marketing_ips
}
```

## Unsubscribe Groups

```hcl
resource "sendgrid_unsubscribe_group" "marketing_emails" {
  name         = "Marketing Emails"
  description  = "Weekly newsletters and promotional content"
  is_default   = false
}

resource "sendgrid_unsubscribe_group" "product_updates" {
  name         = "Product Updates"
  description  = "New feature announcements and release notes"
  is_default   = false
}
```

## Outputs

```hcl
output "sendgrid_domain_authenticated" {
  value = sendgrid_sender_authentication.main.valid
}

output "transactional_api_key_name" {
  value       = sendgrid_api_key.app_transactional.name
  description = "API key stored in Secrets Manager at /${var.environment}/sendgrid/api-key"
}
```

## Conclusion

SendGrid infrastructure managed with OpenTofu ensures domain authentication records are synchronized with your DNS configuration (both managed in the same `tofu apply`), API keys have the minimum required permissions per use case, and unsubscribe groups are consistently configured across environments. The integration between the SendGrid provider and AWS Route53 provider for DNS record creation is a key benefit of managing both in the same OpenTofu configuration.
