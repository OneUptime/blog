# How to Manage Twilio Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Twilio, SMS, Communication, Messaging

Description: Learn how to manage Twilio phone numbers, messaging services, and Verify services using OpenTofu for reproducible communications infrastructure.

## Introduction

The Twilio provider for OpenTofu manages phone numbers, messaging services, Verify services, and other Twilio resources. Managing these as code ensures consistent configuration and makes provisioning new phone numbers for different environments repeatable.

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
  username = var.twilio_account_sid
  password = var.twilio_auth_token
}
```

## Phone Number Management

```hcl
# Purchase a phone number in area code 415
resource "twilio_api_accounts_incoming_phone_numbers" "main" {
  area_code     = "415"
  friendly_name = "prod-main-number"

  # Webhooks for incoming messages and calls
  sms_url         = "https://api.example.com/webhooks/sms"
  sms_method      = "POST"
  voice_url       = "https://api.example.com/webhooks/voice"
  voice_method    = "POST"
  status_callback = "https://api.example.com/webhooks/status"
}
```

## Messaging Service

```hcl
resource "twilio_messaging_services_v1" "notifications" {
  friendly_name = "App Notifications"

  # Sticky sender ensures same number used per recipient
  sticky_sender   = true
  mms_converter   = true
  smart_encoding  = true
  validity_period = 14400  # 4 hours

  status_callback = "https://api.example.com/webhooks/message-status"
}

# Add the phone number to the messaging service
resource "twilio_messaging_services_phone_numbers_v1" "main" {
  service_sid      = twilio_messaging_services_v1.notifications.sid
  phone_number_sid = twilio_api_accounts_incoming_phone_numbers.main.sid
}
```

## Verify Service for 2FA

```hcl
resource "twilio_verify_services_v2" "app_verify" {
  friendly_name = "My App Verification"

  # Code length
  code_length = 6

  # Enable SMS channel
  # (SMS is enabled by default, additional channels below)

  # Push notification channel
  push_apn_credential_sid = var.apn_credential_sid
  push_fcm_credential_sid = var.fcm_credential_sid

  # TOTP support
  totp_issuer      = "MyApp"
  totp_code_length = 6
  totp_time_step   = 30
  totp_skew        = 1
}
```

## Subaccount Management

```hcl
# Use separate existing subaccounts per environment
provider "twilio" {
  alias       = "staging"
  username    = var.staging_account_sid
  password    = var.staging_auth_token
  account_sid = var.staging_account_sid
}

provider "twilio" {
  alias       = "production"
  username    = var.production_account_sid
  password    = var.production_auth_token
  account_sid = var.production_account_sid
}

# Outputs for use in application configuration
output "staging_account_sid" {
  value = var.staging_account_sid
}
```

## Outputs for Application Use

```hcl
output "messaging_service_sid" {
  value       = twilio_messaging_services_v1.notifications.sid
  description = "Twilio Messaging Service SID for application configuration"
}

output "verify_service_sid" {
  value       = twilio_verify_services_v2.app_verify.sid
  description = "Twilio Verify Service SID for 2FA implementation"
}

output "phone_number" {
  value       = twilio_api_accounts_incoming_phone_numbers.main.phone_number
  description = "The provisioned phone number in E.164 format"
}
```

## Storing Twilio Config in Parameter Store

```hcl
resource "aws_ssm_parameter" "twilio_messaging_sid" {
  name  = "/${var.environment}/twilio/messaging-service-sid"
  type  = "SecureString"
  value = twilio_messaging_services_v1.notifications.sid
}

resource "aws_ssm_parameter" "twilio_verify_sid" {
  name  = "/${var.environment}/twilio/verify-service-sid"
  type  = "SecureString"
  value = twilio_verify_services_v2.app_verify.sid
}
```

## Conclusion

Managing Twilio resources with OpenTofu ensures consistent messaging infrastructure across environments. Separate subaccounts for staging and production keep resources and activity isolated. Storing Twilio SIDs in SSM Parameter Store makes them available to applications without hard-coding them in configuration files.
