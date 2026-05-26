# Validation Summary: How to Configure Terraform Enterprise Email Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise Admin API
- Terraform Enterprise Notification Configurations API
- SMTP
- Amazon SES
- SendGrid SMTP
- Docker Compose
- curl
- jq
- swaks

## Sources Consulted
- HashiCorp Terraform Enterprise admin settings API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Terraform Enterprise notification configurations API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/notification-configurations
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- AWS CLI SES verify-domain-identity documentation: https://docs.aws.amazon.com/cli/latest/reference/ses/verify-domain-identity.html
- AWS CLI SES verify-email-identity documentation: https://docs.aws.amazon.com/cli/latest/reference/ses/verify-email-identity.html
- AWS CLI SESv2 create-email-identity documentation: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-email-identity.html
- SendGrid SMTP relay documentation: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api

## Issues Found
- The original post used unsupported `TFE_SMTP_*` deployment environment variables for Terraform Enterprise SMTP setup. Replaced those examples with the documented `PATCH /api/v2/admin/smtp-settings` API payload using the current `host`, `sender`, `auth`, and `username` attributes, and kept Docker Compose limited to the documented `TFE_TLS_REQUIRE_SMTP` setting.
- The original post referenced a non-documented `/api/v2/admin/smtp-settings/test` endpoint. Replaced it with the documented SMTP settings update flow using `test-email-address`.
- The Amazon SES section suggested creating a plain IAM user and attaching `AmazonSESFullAccess` as the SMTP credential setup. Replaced that with the current SES identity command and left the verified sender/domain steps intact.
- The workspace email notification examples used an `email-addresses` attribute with raw email addresses. Terraform Enterprise email notification configurations use a `users` relationship, so the examples now use TFE user IDs.
- The bulk notification script built an invalid recipient array by placing a comma-separated string inside a single JSON array element. Replaced it with a `jq`-built `users` relationship array.

## Review Notes
The trigger names and generic webhook notification example are consistent with HashiCorp's notification configuration API. The workspace search query should be tested against the target Terraform Enterprise version and organization tagging conventions before running it at scale.
