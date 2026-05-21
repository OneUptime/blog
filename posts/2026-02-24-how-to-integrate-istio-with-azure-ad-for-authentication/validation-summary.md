# Validation Summary: How to Integrate Istio with Azure AD for Authentication

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Istio RequestAuthentication and AuthorizationPolicy
- Microsoft Entra ID / Azure AD
- OpenID Connect and OAuth 2.0
- JWT access tokens
- Microsoft Entra group claims and app roles
- Kubernetes ServiceEntry configuration
- curl and jq testing commands

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Microsoft identity platform access tokens: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft identity platform access token claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft identity platform claims validation guidance: https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation
- Microsoft Entra protected web API app registration guidance: https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-app-configuration
- Microsoft identity platform scopes and permissions: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Entra group claims and app roles guidance: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles

## Issues Found
- The sample Application (client) ID used non-hexadecimal letters, so it was not a valid GUID. Replaced it with a valid GUID-shaped example throughout the post.
- The Istio `audiences` example used the Application ID URI (`api://istio-mesh`). Microsoft documentation says v2 access-token `aud` values are the web API's Application (client) ID, so the example and troubleshooting note were updated.
- The multi-tenant Istio example used `https://login.microsoftonline.com/common/v2.0` as the issuer. Microsoft Entra multi-tenant metadata uses an issuer template, but real tokens contain tenant-specific issuers and Istio matches issuers exactly. Replaced the snippet with explicit trusted tenant issuers.
- The scope setup wording implied the Azure portal scope names are entered as full URI values. Clarified that scopes are named values such as `read`, `write`, and `admin`, while clients request the full scope URI.
- The authorization-code URL showed unencoded spaces in the `scope` parameter. Updated the example to URL-encode spaces as `%20`.
- The curl token exchange examples used raw form values for URL-sensitive fields. Updated `redirect_uri` and `scope` parameters to use `--data-urlencode`.
- The group overage section said overage claims point to Microsoft Graph. Microsoft documentation notes some `_claim_sources` values can still reference legacy Azure AD Graph endpoints and should not be trusted directly. Updated the guidance to detect overage and call Microsoft Graph explicitly.

## Review Notes
The Istio API versions and field names used in the post are current. The post remains a practical integration guide, but production multi-tenant validation may need additional tenant, subject, actor, and authorization checks beyond the examples shown.
