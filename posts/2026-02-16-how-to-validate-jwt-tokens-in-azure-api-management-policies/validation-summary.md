# Validation Summary: How to Validate JWT Tokens in Azure API Management Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- APIM policies
- JWT validation
- OpenID Connect discovery
- Microsoft Entra ID / Azure AD
- Azure AD B2C
- Auth0
- Application Insights tracing

## Sources Consulted
- Microsoft Learn: Azure API Management `validate-jwt` policy reference: https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: Azure API Management policy expressions reference: https://learn.microsoft.com/en-gb/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Azure API Management error handling policies: https://learn.microsoft.com/en-us/azure/api-management/api-management-error-handling-policies
- Microsoft Learn: Azure API Management `trace` policy reference: https://learn.microsoft.com/en-us/azure/api-management/trace-policy
- Microsoft Learn: Debug APIs using request tracing in Azure API Management: https://learn.microsoft.com/en-au/azure/api-management/api-management-howto-api-inspector
- Microsoft Learn: Azure AD B2C OpenID Connect metadata endpoint: https://learn.microsoft.com/en-us/azure/active-directory-b2c/openid-connect
- Auth0 Docs: OpenID Connect discovery endpoint usage: https://auth0.com/docs/authenticate/identity-providers/enterprise-identity-providers/oidc
- Auth0 Docs: Access token audience / API identifier behavior: https://dev.auth0.com/docs/secure/tokens/access-tokens/get-access-tokens

## Issues Found
- The `scp` required-claim example checked a space-separated scope claim without specifying a separator. Added `separator=" "` and clarified why it is required for scope values.
- The claim extraction examples used direct dictionary index access, which can fail when a claim is absent. Replaced them with the documented `Jwt.Claims.GetValueOrDefault(claimName, defaultValue)` helper.
- The multi-issuer `choose` example used invalid XML quoting and checked for the literal string `v2.0` in the Authorization header, which does not reliably inspect the JWT issuer. Replaced it with a `TryParseJwt`-based condition that parses the untrusted token only for routing and leaves validation to `validate-jwt`.
- The Azure AD B2C `openid-config` URL put the user flow in a query parameter on the `b2clogin.com` endpoint. Updated it to the documented path-based metadata endpoint format.
- The tracing instructions referenced the old `Ocp-Apim-Trace` header. Updated the text to use portal tracing or the current time-limited debug token flow with the `Apim-Debug-Authorization` header.
- The `trace` policy example used `severity="warning"`, which is not a supported value. Changed it to `severity="error"` and filtered on `context.LastError.Source == "validate-jwt"`.
- The performance section said OpenID configuration keys refresh "typically every few hours." Updated it to the current documented behavior: roughly every hour, with missing `kid` retries at most once every five minutes.

## Review Notes
- Microsoft documentation now says to use `validate-azure-ad-token` for JWTs provided by Microsoft Entra ID, but `validate-jwt` remains valid for generic JWT validation and the examples are still technically usable.
- Azure AD B2C is no longer available to purchase for new customers as of May 1, 2025; existing B2C tenant examples remain relevant for existing deployments.
