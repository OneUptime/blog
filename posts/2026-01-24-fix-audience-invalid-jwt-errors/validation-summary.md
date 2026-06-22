# Validation Summary: How to Fix 'Audience Invalid' JWT Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- JSON Web Tokens (JWT)
- JWT `aud` audience claim
- Node.js `jsonwebtoken`
- Python PyJWT
- Express middleware
- Auth0
- JWKS / `jwks-rsa`
- Microsoft Entra ID / Azure AD
- MSAL Node
- `azure-ad-verify-token`

## Sources Consulted
- RFC 7519 JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- node-jsonwebtoken documentation: https://github.com/auth0/node-jsonwebtoken
- PyJWT API and usage documentation: https://pyjwt.readthedocs.io/en/stable/api.html and https://pyjwt.readthedocs.io/en/latest/usage.html
- Auth0 Node SDK documentation: https://auth0.github.io/node-auth0/
- Auth0 Authentication API documentation: https://auth0.com/docs/api/authentication
- Microsoft identity platform access token documentation: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- MSAL Node acquire token documentation: https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests
- azure-ad-verify-token package documentation: https://github.com/justinlettau/azure-ad-verify-token

## Issues Found
- The JWT payload examples were labeled as `javascript` even though they are JSON-style payloads with comments. Changed the fence to `jsonc` so the snippet type matches the content.
- The custom Node.js normalized-audience verifier used `jwt.decode()` and inspected the `aud` claim before verifying the signature. Changed it to call `jwt.verify()` first, then apply the custom audience comparison to the verified payload.
- The Express middleware claimed to normalize audiences but only normalized configured audiences before passing them to `jsonwebtoken`, which still performs exact comparisons against the unnormalized token claim. Changed the non-strict normalized path to verify the token first, then compare normalized expected and token audiences explicitly.
- The Express middleware could treat a missing or non-string `aud` as a generic runtime failure in the normalized path. Changed it to produce a JWT audience error.
- The Auth0 verification snippet used `jwt.verify()` without importing `jsonwebtoken`. Added the missing import.
- The Auth0 token request snippet used the current `auth0` SDK but read `response.access_token`; current SDK methods return a `JSONApiResponse` with token data under `response.data`. Updated the snippet to use `response.data.access_token` and included `clientSecret` in the client configuration.

## Review Notes
- The post's high-level description of the JWT audience claim is consistent with RFC 7519: `aud` can be a case-sensitive string or an array of case-sensitive strings.
- The PyJWT examples align with current PyJWT audience validation behavior, including accepting an iterable of valid audiences and using `options={"verify_aud": False}` when intentionally disabling audience verification.
- The Azure AD example is plausible for custom APIs, but Microsoft documents that access tokens should be validated by the resource API and that token version, issuer, and JWKS endpoint must match the token being validated.
