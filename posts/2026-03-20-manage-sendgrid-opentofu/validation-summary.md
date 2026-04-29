# Validation Summary: How to Manage SendGrid Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Twilio SendGrid
- AWS Route53
- AWS Secrets Manager

## Sources Consulted
- Terraform Registry API for `kenzo0107/sendgrid`: https://registry.terraform.io/v1/providers/kenzo0107/sendgrid
- Terraform Registry API for `davidji99/sendgrid`: https://registry.terraform.io/v1/providers/davidji99/sendgrid
- `kenzo0107/sendgrid` provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/index.md
- `sendgrid_api_key` resource docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/api_key.md
- `sendgrid_sender_authentication` resource docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/sender_authentication.md
- `sendgrid_link_branding` resource docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/link_branding.md
- `sendgrid_ip_pool` resource docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/ip_pool.md
- Twilio SendGrid API key permissions: https://www.twilio.com/docs/sendgrid/api-reference/api-key-permissions
- Twilio SendGrid domain authentication API: https://www.twilio.com/docs/sendgrid/api-reference/domain-authentication/authenticate-a-domain
- Twilio SendGrid link branding setup docs: https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-link-branding
- Twilio SendGrid IP pool API docs: https://www.twilio.com/docs/sendgrid/api-reference/ip-pools/create-an-ip-pool

## Issues Found
- The provider block referenced `davidji99/sendgrid` with version `~> 0.2`, but the `davidji99` provider's latest published version is `0.1.1`, so the version constraint was invalid. I updated the post to the currently published `kenzo0107/sendgrid` provider and version series `~> 2.8`.
- The API key scope examples used invalid permission names such as `suppressions.read`, `suppression_groups.read`, and `templates.write`. I replaced them with current Twilio SendGrid scope names that exist in the official permissions list.
- The post used the obsolete `sendgrid_domain_authentication` resource and outdated attributes such as `is_default`. I updated the example to the current `sendgrid_sender_authentication` resource and `default` attribute.
- The DNS example indexed `dns[0]`, `dns[1]`, and `dns[2]`, but the current provider exposes `dns` as a set of nested objects, not a positional list. I rewrote the Route53 example to derive the DKIM and mail CNAME records from that set without relying on invalid positional indexing, and normalized record types for Route53.
- The link branding example used `click.example.com` as the `domain`, but Twilio's link branding docs require the root domain there and use `subdomain` for the branded hostname label. I corrected the example to `domain = "example.com"` and `subdomain = "click"`.
- The IP pool example omitted the required `ips` argument in the current provider. I added `ips` inputs for both pools.
- The output example referenced the old `sendgrid_domain_authentication` resource. I updated it to `sendgrid_sender_authentication`.

## Review Notes
- Twilio's domain authentication API supports options such as `automatic_security`, but the current `kenzo0107/sendgrid` provider schema does not expose that argument. The post now matches the provider's supported configuration surface instead of the raw API.
- Twilio documents that IP pools require dedicated IPs with reverse DNS configured before they can be used.
- The `valid` fields for sender authentication and link branding can remain `false` immediately after apply until DNS records propagate.
