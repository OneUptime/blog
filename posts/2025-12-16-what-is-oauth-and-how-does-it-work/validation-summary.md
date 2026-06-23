# Validation Summary: What is OAuth and How Does It Work?

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OAuth 2.0
- OpenID Connect
- Google OAuth 2.0 / Google Identity
- Node.js
- Express
- Axios
- dotenv
- Passport.js
- Auth.js / NextAuth.js
- HTTP cookies and bearer tokens

## Sources Consulted
- OAuth 2.0 Authorization Framework, RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- OAuth 2.0 Bearer Token Usage, RFC 6750: https://datatracker.ietf.org/doc/html/rfc6750
- Proof Key for Code Exchange, RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
- OAuth 2.0 for Native Apps, RFC 8252: https://datatracker.ietf.org/doc/html/rfc8252
- OAuth 2.0 Security Best Current Practice, RFC 9700: https://datatracker.ietf.org/doc/html/rfc9700
- Google OAuth 2.0 for Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Sign in with Google / OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Verify Google ID tokens: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Axios URL-encoded bodies documentation: https://axios-http.com/docs/urlencoded
- Node.js Buffer encodings documentation: https://nodejs.org/api/buffer.html
- MDN Set-Cookie header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- NextAuth.js Google provider documentation: https://next-auth.js.org/providers/google

## Issues Found
- The post described "Sign in with Google" as only OAuth. Updated the wording to clarify that OAuth is usually combined with OpenID Connect for sign-in and ID tokens.
- The "Traditional Login" diagram implied an app stores the user's plaintext password. Updated it to describe password sharing/handling, which better matches the OAuth problem being illustrated.
- The PKCE language said it is mandatory for mobile and single-page applications. Updated it to state that PKCE is mandatory for native mobile apps under RFC 8252 and recommended by current OAuth security guidance for SPAs.
- The sample token response was fenced as strict JSON but contained comments. Changed the fence to `jsonc`.
- The `.env` example included `SESSION_SECRET` with a claim about session encryption, but the manual implementation uses an in-memory `Map` and does not use that variable. Updated the comment to make it optional for a real session middleware replacement.
- The Google authorization request comment said `prompt: 'consent'` always ensures a refresh token. Updated it to say it shows the consent screen again when a refresh token needs to be issued; Google refresh token issuance has first-grant and limit behavior.
- The token storage guidance said client-side apps should use `HttpOnly` cookies. Updated it to clarify that these should be server-set cookies for browser app sessions, with `Secure` and `SameSite`.
- The token refresh section said to implement refresh token rotation, but the example implements token refresh, not rotation. Updated the wording.
- The `getValidAccessToken` helper sent the refresh-token request as JSON. Updated it to send `application/x-www-form-urlencoded` data using `URLSearchParams`, matching the OAuth token endpoint and Axios guidance.

## Review Notes
- The JavaScript code blocks were syntax-checked with Node.js v22.22.0; all 10 JavaScript snippets parsed successfully.
- The manual Express implementation is suitable as an educational demo, but production code should use a real session store, signed cookies or session middleware, output escaping for user profile fields, HTTPS-only cookies, and a maintained OAuth/OIDC library.
