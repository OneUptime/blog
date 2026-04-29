# How to Manage SendGrid Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, SendGrid, Email, Infrastructure as Code, API Integration

Description: Learn how to manage SendGrid API keys, sender authentication, IP pools, and email templates using OpenTofu and community providers.

## Introduction

SendGrid is a cloud-based email delivery platform used for transactional and marketing emails. Managing SendGrid resources through OpenTofu ensures your email infrastructure is version-controlled and reproducible, enabling consistent setup across environments.

## Prerequisites

- OpenTofu installed (v1.6+)
- A SendGrid account
- A SendGrid API key with full access permissions

## Provider Configuration

The current community SendGrid provider on the Terraform Registry:

```hcl
terraform {
  required_providers {
    sendgrid = {
      source  = "registry.terraform.io/kenzo0107/sendgrid"
      version = "~> 2.8"
    }
  }
}

provider "sendgrid" {
}
```

```bash
export SENDGRID_API_KEY="SG.your-api-key"
```

## Managing API Keys

Create scoped API keys for different services:

```hcl
resource "sendgrid_api_key" "transactional" {
  name = "transactional-email-service"
  scopes = [
    "mail.send",
    "templates.read",
    "suppression.read",
    "suppression.update"
  ]
}

resource "sendgrid_api_key" "marketing" {
  name = "marketing-campaigns"
  scopes = [
    "marketing.read"
  ]
}

output "transactional_api_key" {
  value     = sendgrid_api_key.transactional.api_key
  sensitive = true
}
```

## Sender Authentication (Domain Authentication)

Authenticate your sending domain to improve deliverability:

```hcl
resource "sendgrid_sender_authentication" "main" {
  domain    = "example.com"
  subdomain = "em"
  default   = true
}

output "dns_records_to_add" {
  value = sendgrid_sender_authentication.main.dns
}
```

After applying, add the output DNS records to your DNS provider to complete domain authentication.

## IP Pools

Organize sending IPs into pools for different email streams:

```hcl
resource "sendgrid_ip_pool" "transactional" {
  name = "transactional"
  ips  = ["192.0.2.10"]
}

resource "sendgrid_ip_pool" "marketing" {
  name = "marketing"
  ips  = ["192.0.2.11"]
}
```

## Email Templates

Manage dynamic transactional email templates:

```hcl
resource "sendgrid_template" "welcome_email" {
  name       = "Welcome Email"
  generation = "dynamic"
}

resource "sendgrid_template_version" "welcome_v1" {
  template_id  = sendgrid_template.welcome_email.id
  name         = "Welcome Email v1"
  active       = 1
  subject      = "Welcome to {{company_name}}, {{first_name}}!"
  html_content = file("${path.module}/templates/welcome.html")
  plain_content = file("${path.module}/templates/welcome.txt")

  test_data = jsonencode({
    first_name   = "Jane"
    company_name = "Acme Corp"
    login_url    = "https://app.example.com/login"
  })
}

output "welcome_template_id" {
  value = sendgrid_template.welcome_email.id
}
```

## Unsubscribe Groups

Manage unsubscribe groups for compliance:

```hcl
resource "sendgrid_unsubscribe_group" "marketing" {
  name        = "Marketing Emails"
  description = "Promotional emails and newsletters"
  is_default  = false
}

resource "sendgrid_unsubscribe_group" "product_updates" {
  name        = "Product Updates"
  description = "Important product feature announcements"
  is_default  = false
}
```

## Using Inbound Parse Webhooks

Configure inbound parse for incoming email processing:

```hcl
resource "sendgrid_inbound_parse_webhook" "inbound" {
  hostname   = "inbound.example.com"
  url        = "https://api.example.com/email/inbound"
  spam_check = true
  send_raw   = false
}
```

## Storing API Keys Securely

After creating API keys, store them in AWS Secrets Manager and protect your OpenTofu state accordingly:

```hcl
resource "aws_secretsmanager_secret" "sendgrid_transactional" {
  name        = "/app/sendgrid/transactional-api-key"
  description = "SendGrid API key for transactional emails"
}

resource "aws_secretsmanager_secret_version" "sendgrid_transactional" {
  secret_id     = aws_secretsmanager_secret.sendgrid_transactional.id
  secret_string = sendgrid_api_key.transactional.api_key
}
```

## Best Practices

- Create separate API keys with minimal required scopes for each application.
- Complete domain authentication before sending production emails.
- Use separate IP pools for transactional and marketing email to protect sender reputation.
- Store API key outputs as sensitive, immediately write them to a secrets manager, and protect or encrypt your OpenTofu state.
- Use template versioning and always point to specific active versions.

## Conclusion

Managing SendGrid resources through OpenTofu standardizes your email infrastructure setup. API keys, sender authentication, and templates are defined as code, enabling consistent deployments and clear audit trails for all email service changes.
