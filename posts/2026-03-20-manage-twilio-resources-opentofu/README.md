# How to Manage Twilio Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Twilio, SMS, Infrastructure as Code, Communications API

Description: Learn how to manage Twilio phone numbers, messaging services, and API keys using OpenTofu and the official Twilio provider.

## Introduction

Twilio provides cloud communications APIs for SMS, voice, video, and email. Managing Twilio resources through OpenTofu allows teams to provision phone numbers, configure messaging services, and manage related configuration as version-controlled infrastructure.

## Prerequisites

- OpenTofu installed (v1.6+)
- A Twilio account
- Twilio Account SID and Auth Token

## Provider Configuration

```hcl
terraform {
  required_providers {
    twilio = {
      source  = "twilio/twilio"
      version = "~> 0.18"
    }
  }
}

provider "twilio" {
}
```

```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="your-auth-token"
```

## Purchasing a Phone Number

```hcl
resource "twilio_api_accounts_incoming_phone_numbers" "sms_number" {
  area_code     = "415"
  friendly_name = "sms-number"
}
```

## Creating a Messaging Service

```hcl
resource "twilio_messaging_services_v1" "notifications" {
  friendly_name = "Notifications Service"

  inbound_request_url = "https://api.example.com/webhooks/twilio/inbound"
  status_callback     = "https://api.example.com/webhooks/twilio/status"

  fallback_url        = "https://api.example.com/webhooks/twilio/fallback"
  fallback_method     = "POST"
}
```

## Adding Phone Numbers to a Messaging Service

```hcl
resource "twilio_messaging_services_phone_numbers_v1" "main" {
  service_sid      = twilio_messaging_services_v1.notifications.sid
  phone_number_sid = twilio_api_accounts_incoming_phone_numbers.sms_number.sid
}
```

## Managing API Keys

Create API keys for application access (avoid using Account SID/Auth Token in production):

```hcl
resource "twilio_api_accounts_keys" "app_service" {
  friendly_name = "app-notifications-service"
}

output "api_key_sid" {
  value = twilio_api_accounts_keys.app_service.sid
}
```

## Configuring a Verify Service

```hcl
resource "twilio_verify_services_v2" "user_verification" {
  friendly_name         = "User Verification"
  code_length           = 6
  lookup_enabled        = true
  skip_sms_to_landlines = true
  dtmf_input_required   = true
  psd2_enabled          = false
  do_not_share_warning_enabled = true
}

output "verify_service_sid" {
  value = twilio_verify_services_v2.user_verification.sid
}
```

## Subaccounts

Target existing subaccounts for multiple clients or environments:

```hcl
resource "twilio_api_accounts_keys" "staging" {
  path_account_sid = var.staging_subaccount_sid
  friendly_name    = "staging-environment"
}

resource "twilio_api_accounts_keys" "client_a" {
  path_account_sid = var.client_a_subaccount_sid
  friendly_name    = "client-a-production"
}
```

## Storing Credentials Securely

Store the key SID in your secret manager and pass the API key secret in from an external secret workflow:

```hcl
resource "aws_secretsmanager_secret" "twilio_api_key" {
  name = "/app/twilio/api-key"
}

resource "aws_secretsmanager_secret_version" "twilio_api_key" {
  secret_id = aws_secretsmanager_secret.twilio_api_key.id
  secret_string = jsonencode({
    sid    = twilio_api_accounts_keys.app_service.sid
    secret = var.twilio_api_key_secret
  })
}
```

## Best Practices

- Use API keys instead of Account SID/Auth Token for application authentication.
- Separate messaging services by use case (notifications, marketing, alerts).
- Add multiple phone numbers to a messaging service for higher throughput and geographic redundancy.
- Enable `lookup_enabled` with `skip_sms_to_landlines` on Verify services to avoid sending SMS to landlines.
- Use subaccounts to isolate production and staging environments.

## Conclusion

OpenTofu's Twilio provider enables consistent, version-controlled management of your communications infrastructure. Phone numbers, messaging services, and related configuration are all managed as code, making it easy to replicate setups across environments and audit all configuration changes.
