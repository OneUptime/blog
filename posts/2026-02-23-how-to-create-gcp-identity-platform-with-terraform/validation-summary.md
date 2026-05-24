# Validation Summary: How to Create GCP Identity Platform with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Google provider)
- Google Cloud Identity Platform (Identity Toolkit API)
- Firebase Authentication backend
- OAuth identity providers (Google, GitHub, Microsoft, Apple)
- SAML 2.0 inbound federation
- OpenID Connect (OIDC) identity providers
- Multi-tenancy (Identity Platform tenants)
- Multi-factor authentication (PHONE_SMS, TOTP)
- Cloud Functions (2nd gen) as blocking functions

## Sources Consulted
- Terraform Google provider docs: `google_identity_platform_config` (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/identity_platform_config)
- Terraform Google provider docs: `google_identity_platform_default_supported_idp_config`
- Terraform Google provider docs: `google_identity_platform_inbound_saml_config`
- Terraform Google provider docs: `google_identity_platform_oauth_idp_config`
- Terraform Google provider docs: `google_identity_platform_tenant`
- Terraform Google provider docs: `google_identity_platform_tenant_default_supported_idp_config`
- Terraform Google provider docs: `google_cloudfunctions2_function`
- HashiCorp terraform-provider-google GitHub source (website/docs/r/*.html.markdown) for ground-truth argument references

## Issues Found
1. **Duplicate `google_identity_platform_config` resource** — The "Blocking Functions" section declared a second `google_identity_platform_config "auth_with_blocking"` resource alongside the main `"auth"` resource earlier in the post. Per the official docs, this resource is a singleton: "This entity is created only once during initialization and cannot be deleted." Declaring two of them in the same project will fail at apply time. Replaced the duplicate resource with a documented inline patch showing how `blocking_functions` should be added to the existing `auth` resource, with an explicit note explaining the singleton constraint.

2. **Misleading `disable_auth` comment in the tenant section** — The comment read "Disable anonymous auth for this tenant", but per the Terraform docs, `disable_auth` blocks ALL sign-in for the tenant ("the users under the disabled tenant are not allowed to sign-in"), not just anonymous auth. Corrected the comment to accurately describe the field's behavior.

3. **Misleading `api_key` output label** — The output named the value `api_key` but assigned `google_identity_platform_config.auth.id`, which is the resource ID, not an API key. Identity Platform API keys are managed separately (e.g., via `google_apikeys_key`). Renamed the output field to `config_id` to reflect what is actually being returned.

## Review Notes
- Resource arguments verified against the upstream provider docs are all valid: `sign_in.email.{enabled, password_required}`, `sign_in.phone_number.{enabled, test_phone_numbers}`, `sign_in.anonymous.enabled`, `sign_in.allow_duplicate_emails`, `authorized_domains`, `mfa.{state, enabled_providers, provider_configs}` (including `provider_configs.state` and `provider_configs.totp_provider_config.adjacent_intervals`), and `blocking_functions.triggers.{event_type, function_uri}`.
- `mfa.enabled_providers` is correctly used with `PHONE_SMS` (the only allowed value for that field), and `provider_configs` correctly carries the TOTP config (per the docs, `provider_configs` does not support phone-based MFA).
- The `name` fields for SAML (`saml.corporate-sso`) and OIDC (`oidc.custom-provider`) follow the required `saml.`/`oidc.` prefixes.
- `google_cloudfunctions2_function ... .service_config[0].uri` is a valid computed output attribute.
- The post uses `var.environment`, `var.region`, `var.functions_bucket`, `var.blocking_function_source`, `var.allowed_email_domains`, `var.saml_idp_certificate`, `var.oidc_*`, `var.microsoft_oauth_*`, `var.apple_*` without declaring them in the variables example - acceptable for an illustrative tutorial, but readers should declare those alongside the ones shown.
- The Email Templates section is intentionally light because Terraform support for templates is genuinely limited; this caveat is accurately presented.
- The claim that Identity Platform and Firebase Authentication share the same backend, and that enabling Identity Platform is a one-way upgrade, is accurate.
