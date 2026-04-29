# Validation Summary: How to Manage Twilio Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Twilio Terraform Provider (`twilio/twilio`)
- Twilio Phone Numbers
- Twilio Messaging Services
- Twilio Verify
- AWS Systems Manager Parameter Store

## Sources Consulted
- Twilio Terraform Provider README: https://github.com/twilio/terraform-provider-twilio/blob/main/README.md
- Twilio Terraform Provider resource index: https://github.com/twilio/terraform-provider-twilio/blob/main/twilio/resources/README.md
- Twilio Terraform Provider API v2010 resource docs: https://github.com/twilio/terraform-provider-twilio/blob/main/twilio/resources/api/v2010/README.md
- Twilio Terraform Provider Messaging v1 resource docs: https://github.com/twilio/terraform-provider-twilio/blob/main/twilio/resources/messaging/v1/README.md
- Twilio Terraform Provider Verify v2 resource docs: https://github.com/twilio/terraform-provider-twilio/blob/main/twilio/resources/verify/v2/README.md
- Twilio Incoming Phone Number API docs: https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
- Twilio Messaging Service API docs: https://www.twilio.com/docs/messaging/api/service-resource
- Twilio Messaging Service Phone Numbers API docs: https://www.twilio.com/docs/messaging/services/api/phonenumber-resource
- Twilio Verify Service API docs: https://www.twilio.com/docs/verify/api/service
- Twilio Verify email configuration docs: https://www.twilio.com/docs/verify/email
- Twilio Subaccounts API docs: https://www.twilio.com/docs/iam/api/subaccounts

## Issues Found
- The post used several non-existent provider identifiers: `twilio_phone_numbers_available_local`, `twilio_phone_numbers_incoming`, `twilio_messaging_services`, `twilio_messaging_services_phone_numbers`, `twilio_verify_services`, and `twilio_accounts_subaccounts`. I replaced them with the provider's actual supported resource names where equivalents exist.
- The phone number section used a data source to search available numbers, but the official `twilio/twilio` provider exposes no data sources. I replaced the example with `twilio_api_accounts_incoming_phone_numbers`, which can purchase an available number by `area_code`.
- The messaging and Verify examples included unsupported `account_sid` arguments. I removed those fields because the official resource schemas for `twilio_messaging_services_v1`, `twilio_messaging_services_phone_numbers_v1`, and `twilio_verify_services_v2` do not accept them.
- The Verify example used nested `push {}` and `totp {}` blocks, but the provider exposes flattened attributes such as `push_apn_credential_sid`, `push_fcm_credential_sid`, `totp_issuer`, `totp_time_step`, `totp_code_length`, and `totp_skew`. I rewrote the example accordingly.
- The Verify example claimed to configure "code length and expiry", but only `code_length` was being set. I corrected the comment to avoid implying expiry is configured there.
- The Verify example used `mailer_sid`, which is not exposed by the official Terraform provider even though Twilio Verify's API supports email integrations. I removed that line to keep the example provider-accurate.
- The subaccount section claimed OpenTofu could create Twilio subaccounts through the provider. The official provider does not expose a subaccount resource, so I replaced that example with aliased provider configuration for existing subaccounts.
- The outputs and AWS SSM parameter examples referenced the old incorrect resource names. I updated those references to match the corrected resources.
- The conclusion claimed separate subaccounts prevent test traffic from affecting production usage limits. I changed that to the narrower, documented claim that subaccounts keep resources and activity isolated.

## Review Notes
- The latest published `twilio/twilio` provider version is `0.18.46` as of 2026-04-29, and the official repository currently marks the provider as being in "PILOT" and not under active development/maintenance.
- The provider implementation uses `username` and `password` fields with environment-variable fallbacks to Twilio API keys or account credentials. The post's provider block is valid as written, despite some documentation using `account_sid` / `auth_token` terminology.
- The AWS SSM Parameter Store snippets are syntactically valid, but they assume the AWS provider is configured elsewhere in the stack.
