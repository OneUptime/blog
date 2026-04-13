# Validation Summary: How to Use Dapr with Azure AD B2C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware.http.bearer component)
- Azure AD B2C (consumer identity management)
- JWT / OIDC token validation
- Node.js / Express
- Azure AD B2C Identity Experience Framework (IEF) custom policies
- Kubernetes (deployment annotations)

## Sources Consulted
- Dapr bearer middleware component documentation: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Azure AD B2C token reference: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tokens-overview
- Azure AD B2C JWKS/OpenID Connect discovery endpoints: https://learn.microsoft.com/en-us/azure/active-directory-b2c/openid-connect
- Azure AD B2C custom policy (IEF) claims: https://learn.microsoft.com/en-us/azure/active-directory-b2c/custom-policy-overview
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Cross-referenced with validated Dapr+Okta and Dapr+Keycloak posts in this blog for consistency

## Issues Found
- **Curl test URL mismatch**: The curl command used `method/profile` but the Express app defines routes at `/api/profile`. Dapr service invocation forwards the path after `method/` directly to the target service, so `method/profile` would call `/profile` on the app, resulting in a 404. Fixed to `method/api/profile` to match the Express route. This is consistent with the validated Dapr+Okta post which correctly uses `method/api/reports` to match its `/api/reports` route.

## Review Notes
- The Dapr component type (`middleware.http.bearer`), metadata fields (`jwksURL`, `audience`, `issuer`), pipeline configuration, and deployment annotations are all correct and consistent with other validated Dapr middleware posts.
- Azure AD B2C-specific details are accurate: the JWKS endpoint format (`https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}/discovery/v2.0/keys`), issuer URL format (`https://{tenant}.b2clogin.com/{tenantId}/v2.0/`), and B2C-specific claims (`emails` plural, `tfp` for user flow) are all correct.
- The IEF custom policy XML and `extension_*` claim format for custom attributes are accurate.
- The post uses `x-jwt-{claimname}` headers for reading forwarded JWT claims, which is consistent with the validated Dapr+Okta post's `X-JWT-Groups` pattern. Note that the validated Dapr+Keycloak post takes an alternative approach of decoding the JWT directly from the Authorization header — both approaches are valid.
- Express.js code is syntactically correct and demonstrates proper usage patterns.
