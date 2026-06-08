# Validation Summary: How to Implement PKCE Flow

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- OAuth 2.0 / OAuth 2.1 with PKCE (Proof Key for Code Exchange)
- RFC 7636 (PKCE specification)
- Python 3 (`secrets`, `hashlib`, `base64`, `dataclasses`)
- Flask (Python web framework) with `requests`
- JavaScript / Web Crypto API (browser-native PKCE)
- React Native with Expo (`expo-crypto`, `expo-secure-store`, `expo-web-browser`, `expo-linking`)
- Node.js / Express with `jsonwebtoken` and `jwks-rsa`
- JWT validation and JWKS endpoints
- Identity providers: Auth0, Okta, Google, Microsoft Entra ID, Keycloak, AWS Cognito

## Sources Consulted
- RFC 7636 — Proof Key for Code Exchange by OAuth Public Clients (https://datatracker.ietf.org/doc/html/rfc7636)
- RFC 6749 — The OAuth 2.0 Authorization Framework (https://datatracker.ietf.org/doc/html/rfc6749)
- OAuth 2.1 Draft (https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- Python `secrets` module documentation (https://docs.python.org/3/library/secrets.html)
- Python `hashlib` module documentation (https://docs.python.org/3/library/hashlib.html)
- MDN Web Crypto API documentation (https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- Expo Crypto SDK (https://docs.expo.dev/versions/latest/sdk/crypto/)
- Expo SecureStore (https://docs.expo.dev/versions/latest/sdk/securestore/)
- `jsonwebtoken` npm package (https://www.npmjs.com/package/jsonwebtoken)
- `jwks-rsa` npm package (https://www.npmjs.com/package/jwks-rsa)
- Auth0 OAuth 2.0 docs (https://auth0.com/docs/api/authentication)
- Okta OIDC & OAuth 2.0 API (https://developer.okta.com/docs/reference/api/oidc/)
- Google OAuth 2.0 endpoints (https://developers.google.com/identity/protocols/oauth2)
- Microsoft identity platform (Entra ID) v2.0 endpoints (https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- Keycloak server documentation (OIDC endpoints)
- AWS Cognito User Pools OAuth 2.0 endpoints (https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-userpools-server-contract-reference.html)

## Issues Found

**1. Incorrect AWS Cognito endpoint parameter (fixed).**
The `cognito` provider config in `provider-configs.js` accepted `userPoolId` as a parameter and substituted it into the OAuth endpoint subdomain: `https://${userPoolId}.auth.${region}.amazoncognito.com/...`. This is wrong because Cognito's hosted-UI endpoints use the user pool's domain prefix (configured in the console, e.g. `myapp`), not the user pool ID (which has the form `us-east-1_abc123` and contains an underscore that is not valid in a DNS subdomain). Renamed the parameter to `userPoolDomain` and added a clarifying comment explaining the distinction. Verified against AWS Cognito's "Authorization endpoint" documentation.

## Review Notes

- **RFC 7636 test vector verified end-to-end.** I computed `SHA256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")` and base64url-encoded the digest (without padding), confirming the result is exactly `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM` as stated in the test, matching RFC 7636 Appendix B.
- **Verifier length math is correct.** `base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip('=')` produces an 86-character string (64 bytes → 88 base64 chars with 2 padding chars, stripped). `base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip('=')` produces 43 chars. Both meet RFC 7636's 43–128 range.
- **Character set claim is correct.** The verifier produced by `urlsafe_b64encode().rstrip('=')` only contains `A-Z`, `a-z`, `0-9`, `-`, `_`, which is a subset of RFC 7636's unreserved set `A-Z / a-z / 0-9 / "-" / "." / "_" / "~"`.
- **Web Crypto API usage is correct.** `crypto.getRandomValues`, `crypto.subtle.digest('SHA-256', …)`, and `TextEncoder().encode(...)` are all current, non-deprecated browser APIs.
- **Expo SDK usage is correct.** `Crypto.getRandomBytesAsync`, `Crypto.digestStringAsync`, `Crypto.CryptoDigestAlgorithm.SHA256`, `Crypto.CryptoEncoding.BASE64`, `SecureStore.setItemAsync/getItemAsync/deleteItemAsync`, `WebBrowser.openAuthSessionAsync`, and `Linking.createURL` are all real, current APIs in the Expo SDK.
- **Identity provider endpoints verified.** Auth0, Okta default authorization server, Google, Microsoft Entra ID v2.0, and Keycloak (OIDC) endpoint URL templates all match the providers' official documentation.
- **`jwks-rsa` usage is a slightly older idiom.** `key.publicKey || key.rsaPublicKey` works with current versions of `jwks-rsa` (kept for backward compatibility), but the newer recommended idiom is `key.getPublicKey()`. The code as written still functions correctly, so this is not an error — just a style note for future updates.
- **`base64UrlEncode` variable naming in the browser code is misleading** (the variable is named `base64` while actually holding a binary string built from `String.fromCharCode`, before `btoa()` converts it to real base64), but the logic is correct and produces valid base64url output. Left as-is since it's not a correctness issue.
- **Minor classification quibble in the error flowchart**: the diagram lists "Invalid redirect_uri" as a cause of `access_denied`, but most OAuth 2.0 authorization servers return `invalid_request` (or display an error page without redirecting) for an unregistered/mismatched `redirect_uri`. Behavior varies by provider, so this is not strictly incorrect — left as-is.
- The post correctly notes that PKCE is now recommended for **all** OAuth clients per OAuth 2.1, including confidential server-side ones, and that the `state` parameter is still required for CSRF protection even when PKCE is used.
