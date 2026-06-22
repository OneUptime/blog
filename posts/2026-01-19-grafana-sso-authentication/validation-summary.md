# Validation Summary: How to Configure SSO Authentication in Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana authentication
- OAuth 2.0 and OpenID Connect
- Generic OAuth
- Google OAuth
- GitHub OAuth
- Microsoft Entra ID OAuth
- Okta OAuth
- SAML
- LDAP
- Helm and Kubernetes
- OpenSSL
- JMESPath

## Sources Consulted
- Grafana generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana Google OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/google/
- Grafana GitHub OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/github/
- Grafana Microsoft Entra ID OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/entraid/
- Grafana SAML documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/saml/
- Grafana SAML configuration options: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/saml/saml-configuration-options/
- Grafana LDAP documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/ldap/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana security hardening documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-security-hardening/
- Kubernetes kubectl create secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- OpenSSL req documentation: https://docs.openssl.org/master/man1/openssl-req/

## Issues Found
- The authentication overview listed SAML without noting that native Grafana SAML authentication is limited to Grafana Enterprise and Grafana Cloud. Added that caveat in the overview and SAML section.
- The generic OAuth example mapped roles from `groups` but did not request a groups scope. Added `groups` to the sample scopes so the claim is more likely to be available.
- The Microsoft Entra ID example used group names for `allowed_groups`, but Grafana expects Entra ID group object IDs. Replaced the sample with object-ID placeholders and updated the setup steps to mention app roles and group claims.
- The SAML example mapped role values from group names but did not set `assertion_attribute_role`. Added `assertion_attribute_role = groups` so `role_values_admin`, `role_values_editor`, and `role_values_viewer` have a role attribute to evaluate.
- The Helm and security examples used global `oauth_auto_login`, which Grafana marks as deprecated in favor of provider-specific `auto_login`. Updated the examples to use `auto_login` under `[auth.generic_oauth]` / `auth.generic_oauth`.
- The sign-up hardening example only disabled general user sign-up. Added provider-level `allow_sign_up = false` for generic OAuth because OAuth/SAML/LDAP providers also have their own user-creation controls.
- The TLS troubleshooting snippet omitted the provider section for OAuth TLS settings. Added `[auth.generic_oauth]` so the options are shown in the correct context.

## Review Notes
- The OAuth, LDAP, Kubernetes secret, OpenSSL certificate generation, cookie security, GitHub, and Google examples are broadly consistent with current official documentation after the corrections above.
- `GrafanaAdmin` in `role_attribute_path` is a valid role value, but granting server administrator privileges also requires `allow_assign_grafana_admin = true`; otherwise Grafana maps it to organization admin privileges.
