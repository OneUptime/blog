# Validation Summary: How to Configure OAuth2 Scopes Properly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OAuth 2.0 scopes
- OpenID Connect scopes and claims
- Bearer token authorization
- JavaScript and Node.js
- Express.js
- express-jwt
- Python
- FastAPI
- PyJWT
- Mermaid diagrams

## Sources Consulted
- OAuth 2.0 Authorization Framework, RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- OAuth 2.0 Bearer Token Usage, RFC 6750: https://www.rfc-editor.org/info/rfc6750/
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- express-jwt README: https://github.com/auth0/express-jwt/blob/master/README.md
- FastAPI OAuth2 scopes documentation: https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/
- FastAPI OAuth2 with JWT documentation: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- PyJWT API documentation: https://pyjwt.readthedocs.io/en/stable/api.html

## Issues Found
- The JavaScript scope configuration referenced `settings:read` and `settings:write` from the `admin` scope without defining those scopes. Added definitions so the hierarchy resolves consistently.
- The client scope validator called `.split()` on `requestedScopes` without handling `undefined` and did not filter empty string values in string input. Updated parsing to safely default to an empty string and filter empty entries.
- The Express scope middleware returned `insufficient_scope` responses without a `WWW-Authenticate` Bearer challenge. Added the appropriate header to 403 scope failures.
- The Python FastAPI example decoded JWTs with signature verification disabled. Replaced it with verified `jwt.decode()` usage that accepts a key, algorithms, and optional audience and issuer values.
- The Python validator only expanded one level of included scopes inside `validate()`. Updated it to use the existing recursive `expand()` helper.
- The Express example used the older `express-jwt` CommonJS import style and `req.user`-era expectations. Updated the import to `const { expressjwt: jwt } = require('express-jwt');`, which matches current `express-jwt` documentation.
- The Express example configured RS256 validation with `JWT_SECRET`. Changed the variable name to `JWT_PUBLIC_KEY` to match asymmetric JWT verification expectations.

## Review Notes
The examples are illustrative and still omit production details such as key rotation, issuer and audience checks in the Express middleware, real route handler implementations, and full consent-screen behavior. These are acceptable omissions for the guide, but should be added in a production implementation.
