# Validation Summary: How to Set Up Request Authentication with Keycloak in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy
- Keycloak OpenID Connect
- JWT and JWKS
- Kubernetes and kubectl
- curl and Python JSON/base64 decoding

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio authentication task, requiring a valid token: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Keycloak OpenID Connect endpoint documentation: https://www.keycloak.org/securing-apps/oidc-layers
- Keycloak hostname v2 documentation: https://www.keycloak.org/server/hostname
- Keycloak Server Administration Guide, clients, service accounts, direct access grants, token lifespan, and audience mappers: https://www.keycloak.org/docs/latest/server_admin/

## Issues Found
- The first RequestAuthentication example was introduced as if Keycloak was running inside the cluster, but the example used the external Keycloak URL for both issuer and JWKS. Changed the lead-in to say it is for Keycloak exposed through an external domain.
- The Keycloak client setup omitted the "Service accounts roles" prerequisite for service-to-service client credentials usage. Added that requirement.
- The issuer explanation said Keycloak sets the issuer based on the URL clients use to obtain tokens. Current Keycloak versions derive frontend URLs from the configured hostname/base URL. Updated the wording to match current Keycloak hostname behavior.
- The audience section said Keycloak access tokens include an `aud` claim by default. This is configuration-dependent, though many default setups include `account`. Updated the wording and noted audience mappers in client scopes.
- The JWT payload inspection command used plain `base64 -d`, which is not reliable for JWT base64url payloads and missing padding. Replaced it with a Python base64url decode command.
- The password grant example did not mention that Direct Access Grants must be enabled for the client. Added that prerequisite to the example text.
- The frontend URL gotcha referenced only the older realm-level "Frontend URL" setting. Updated it to mention the current Keycloak `hostname` option while preserving the note for older installations.

## Review Notes
The Istio API snippets use the current `security.istio.io/v1` API and valid fields. The `DENY` policy with `notRequestPrincipals: ["*"]` matches Istio's documented pattern for requiring a valid JWT. Nested JWT claim matching with `request.auth.claims[realm_access][roles]` is supported for string and list-of-string claims, which fits the Keycloak role array example.
