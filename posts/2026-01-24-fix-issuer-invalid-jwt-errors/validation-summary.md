# Validation Summary: How to Fix 'Issuer Invalid' JWT Errors

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- JWT
- OAuth 2.0
- OpenID Connect discovery
- Node.js
- jsonwebtoken
- Express
- Python
- PyJWT
- Google Identity Services
- Microsoft identity platform / Azure AD
- Okta
- Auth0
- Keycloak
- Amazon Cognito

## Sources Consulted
- RFC 7519: JSON Web Token (JWT), issuer claim: https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html
- RFC 8414: OAuth 2.0 Authorization Server Metadata: https://datatracker.ietf.org/doc/html/rfc8414
- jsonwebtoken README/API options: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- PyJWT API Reference: https://pyjwt.readthedocs.io/en/stable/api.html
- Google ID token verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Microsoft identity platform access token validation: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Okta authorization servers: https://developer.okta.com/docs/concepts/auth-servers/
- Auth0 OIDC/JWKS discovery and issuer guidance: https://auth0.com/docs/secure/tokens/json-web-tokens/locate-json-web-key-sets
- Keycloak OpenID Connect endpoint documentation: https://www.keycloak.org/securing-apps/oidc-layers
- Amazon Cognito ID token claims: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html

## Issues Found
- The JavaScript and Python examples normalized issuer strings by lowercasing them, removing trailing slashes, or rewriting `http://` to `https://`. JWT `iss` values are case-sensitive strings, and OIDC/OAuth metadata issuer values must match exactly, so I changed these examples to use exact configured issuer strings or explicit alias lists.
- The PyJWT multiple-issuer example claimed PyJWT did not natively support multiple issuers. Current PyJWT accepts a container of issuer strings for the `issuer` parameter, so I updated the example to use the native API.
- The PyJWT issuer examples did not pass an audience even though the example token includes an `aud` claim. PyJWT raises audience validation errors when a token contains `aud` and no expected audience is supplied, so I added `expected_audience` parameters.
- The Express middleware manually accepted a normalized issuer and then verified the signature without passing the expected issuer to `jwt.verify`. I updated it to use exact issuer matching and to pass the issuer list into `jwt.verify`.
- The OIDC discovery example fetched metadata from the unverified token's `iss` value before comparing it to the expected issuer, which can lead to untrusted issuer discovery. I changed it to discover the expected issuer first and then compare the token issuer exactly to the discovered issuer.
- The Google provider note said the issuer is always `https://accounts.google.com`. Google documentation accepts both `accounts.google.com` and `https://accounts.google.com`, so I updated the note.

## Review Notes
The examples remain simplified and omit production concerns such as JWKS caching, key rotation error handling, algorithm allow-lists for asymmetric keys, and audience validation in the Node.js snippets. Those are reasonable future improvements but not issuer-specific correctness blockers.
