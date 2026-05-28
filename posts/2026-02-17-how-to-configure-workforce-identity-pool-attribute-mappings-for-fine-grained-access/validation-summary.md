# Validation Summary: Configure Workforce Identity Pool Attribute Mappings for Fine-Grained Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workforce Identity Federation
- Workforce identity pools and providers
- Google Cloud IAM allow policies and IAM Conditions
- Google Cloud CLI
- Common Expression Language (CEL)
- Terraform Google provider
- OIDC identity providers

## Sources Consulted
- Google Cloud SDK reference: `gcloud iam workforce-pools create` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create
- Google Cloud SDK reference: `gcloud iam workforce-pools providers create-oidc` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/providers/create-oidc
- Google Cloud IAM documentation: Workforce Identity Federation - https://docs.cloud.google.com/iam/docs/workforce-identity-federation
- Google Cloud IAM documentation: Configure Workforce Identity Federation - https://docs.cloud.google.com/iam/docs/configuring-workforce-identity-federation
- Google Cloud IAM documentation: Troubleshoot Workforce Identity Federation - https://docs.cloud.google.com/iam/docs/troubleshooting-workforce-identity-federation
- Google Cloud IAM documentation: Attribute reference for IAM Conditions - https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud SDK reference: `gcloud policy-intelligence troubleshoot-policy iam` - https://docs.cloud.google.com/sdk/gcloud/reference/policy-intelligence/troubleshoot-policy/iam
- Terraform Registry: `google_iam_workforce_pool_provider` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workforce_pool_provider

## Issues Found
- Corrected the opening explanation to avoid implying that every mapped Google Cloud attribute can be referenced in IAM policies. Attributes such as `google.display_name` are display-only and cannot be used in IAM allow policies.
- Added required OIDC web SSO flags to the initial `gcloud iam workforce-pools providers create-oidc` example. Current Google Cloud CLI documentation requires `--web-sso-response-type` and `--web-sso-assertion-claims-behavior` for OIDC web sign-in configuration.
- Replaced the generic mapping syntax `google.attribute=...` with `target_attribute=...` because custom mappings use `attribute.NAME`, while predefined mappings use supported `google.*` keys.
- Clarified that `google.subject` is required on the workforce identity pool provider, not on the pool itself.
- Corrected the custom attribute explanation to say custom attributes are used in IAM allow policies through `principalSet` member identifiers, not directly as IAM Conditions attributes.
- Replaced the email-domain `extract()` example with `assertion.email.split('@')[1]`, matching the documented CEL string-splitting pattern for email-derived attributes.
- Corrected the gcloud `--web-sso-assertion-claims-behavior` value from Terraform/API-style uppercase to the lowercase CLI enum `only-id-token-claims`.
- Added the required Terraform `client_secret` block for a provider using `web_sso_config.response_type = "CODE"`, because the Terraform provider documentation states code flow requires a configured client secret.
- Corrected the testing section. `gcloud iam workforce-pools providers describe` verifies saved provider configuration but does not test a sample token or show mapped token output.
- Removed the Policy Troubleshooter command as a workforce identity debugging recommendation. Official Policy Troubleshooter documentation states that only Google Accounts and service accounts are supported for `--principal-email`; workforce identities are not supported directly.
- Corrected the missing-claim pitfall. Missing claims do not simply fail silently; they can cause sign-in failures, unavailable custom attributes, or false attribute-condition evaluations.
- Reworded the attribute-condition advice to avoid requiring `assertion.email_verified == true` for all IdPs, because not every IdP or protocol provides that claim.

## Review Notes
The post is now technically valid for the documented Google Cloud CLI and Terraform provider behavior as of 2026-05-28. Future improvements could mention the 400-group limit for `google.groups`, mapped attribute size limits, and the recommendation to prefer OIDC authorization code flow over implicit flow for web sign-in.
