# Validation Summary: How to Manage Okta Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Okta Terraform Provider (`okta/okta`)
- Okta groups and group rules
- Okta OIDC applications
- Okta SAML applications
- Okta password and MFA policies

## Sources Consulted
- Okta Terraform Provider docs index: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/index.md
- `okta_group` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/group.md
- `okta_group_rule` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/group_rule.md
- `okta_app_oauth` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/app_oauth.md
- `okta_app_group_assignments` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/app_group_assignments.md
- `okta_app_saml` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/app_saml.md
- `okta_app_saml_app_settings` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/app_saml_app_settings.md
- `okta_policy_password` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/policy_password.md
- `okta_policy_mfa` resource docs: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/docs/resources/policy_mfa.md
- Official Okta provider examples for AWS SAML and MFA policy usage: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/examples/resources/okta_app_saml/user_groups.tf
- Official Okta provider examples for AWS SAML and MFA policy usage: https://raw.githubusercontent.com/okta/terraform-provider-okta/master/examples/resources/okta_policy_mfa/pr_1210.tf
- Okta Expression Language reference: https://developer.okta.com/docs/reference/okta-expression-language/
- Okta authorization server concepts: https://developer.okta.com/docs/concepts/auth-servers/
- Okta AWS integration guide: https://help.okta.com/oie/en-us/content/topics/deploymentguides/aws/aws-configure-aws-app.htm
- Okta provider releases: https://github.com/okta/terraform-provider-okta/releases

## Issues Found
- The provider block pinned the Okta provider to `~> 4.0`, which is outdated relative to the current 6.x release line. I updated it to `~> 6.0`.
- The provider example implied that `var.okta_api_token` comes from the `OKTA_API_TOKEN` environment variable. That is incorrect because Terraform input variables are not populated from provider env vars automatically. I corrected the comment and parameterized `base_url` to match official provider configuration.
- The OIDC app example used `lifecycle { ignore_changes = [client_secret] }`, which is not the documented way to control provider handling of generated OAuth client secrets. I replaced it with the supported `omit_secret = true` argument.
- The AWS SAML example used a custom SAML app shape and an `appuser.awsRole` attribute expression that was not backed by the official provider examples for AWS Account Federation. I replaced it with the provider’s supported `preconfigured_app = "amazon_aws"` pattern and matching `app_settings_json`.
- The MFA policy example used an invalid `okta_totp` attribute and block syntax that does not match the current `okta_policy_mfa` schema. I corrected it to the documented map syntax, added `is_oie = true`, and used valid authenticators.
- The issuer output hard-coded both the `okta.com` domain and the `/oauth2/default` custom authorization server path. That can be incorrect for orgs that use a different Okta base domain or don't use the default custom authorization server. I updated it to use the org issuer URL derived from `var.okta_org_name` and `var.okta_base_url`.

## Review Notes
- No remaining technical issues found after the fixes above.
- As of April 29, 2026, the latest published Okta provider release is `v6.10.0`; the post now targets the current 6.x provider line without hard-pinning to a single patch release.
- Okta’s current provider documentation recommends OAuth 2.0 client authentication for provider access over the legacy SSWS `api_token` flow. The post still uses `api_token`, which remains supported, so no change was required for correctness.
- The MFA example now explicitly targets Okta Identity Engine via `is_oie = true`, which is required for the shown authenticator style.
- If readers want to use a custom authorization server instead of the org authorization server, they should replace the issuer output with that server’s specific issuer URL, for example `https://{yourOktaDomain}/oauth2/{authorizationServerId}`.
