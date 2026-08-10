# Validation Summary: Should a Backend Trust ID Token Claims or Call the OIDC UserInfo Endpoint?

## Status
validated

## Post Type
Technical reference / security guide

## Technologies Covered

- OpenID Connect Core 1.0
- OIDC UserInfo Endpoint
- OIDC Discovery and Dynamic Client Registration
- OAuth 2.0 bearer access tokens and refresh tokens
- OAuth 2.0 token introspection
- JWT, JWS, and JWE validation
- Proof Key for Code Exchange (PKCE)
- JavaScript Fetch API

## Sources Consulted

- OpenID Connect Core 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-discovery-1_0.html
- OpenID Connect Dynamic Client Registration 1.0 incorporating errata set 2: https://openid.net/specs/openid-connect-registration-1_0.html
- RFC 6749, The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7636, Proof Key for Code Exchange: https://datatracker.ietf.org/doc/html/rfc7636
- RFC 7662, OAuth 2.0 Token Introspection: https://datatracker.ietf.org/doc/html/rfc7662
- RFC 8725, JSON Web Token Best Current Practices: https://datatracker.ietf.org/doc/html/rfc8725
- RFC 9068, JWT Profile for OAuth 2.0 Access Tokens: https://datatracker.ietf.org/doc/html/rfc9068
- RFC 9700, Best Current Practice for OAuth 2.0 Security: https://datatracker.ietf.org/doc/html/rfc9700
- Node.js global Fetch API documentation: https://nodejs.org/api/globals.html#fetch
- WHATWG Fetch Standard: https://fetch.spec.whatwg.org/

## Issues Found

- The comparison table stated that an ID token is obtained from the token response without explicitly limiting that statement to the Authorization Code Flow; Implicit and Hybrid flows can return an ID token from the authorization endpoint. The table is now explicitly scoped to the Authorization Code Flow used by a typical server-side backend.
- The validation configuration wording implied that verification keys come directly from issuer metadata and did not account for allowed MAC algorithms. It now identifies issuer-bound key material as keys fetched from the metadata-advertised `jwks_uri`, or the registered client secret for an explicitly allowed MAC algorithm.
- The `aud` validation bullet checked only that the client ID was present. OIDC Core also requires rejection of additional audiences the client does not trust, so that requirement was added.
- The post required discovery to advertise `userinfo_endpoint`, although OIDC also permits trusted static or out-of-band provider configuration. The relevant guidance and example assumption now accept trusted provider configuration while retaining validated discovery as the normal source.
- The HTTP and JavaScript examples handled only the default plain JSON UserInfo response. They are now labeled accordingly, and the post explains that registered signed or encrypted responses use `application/jwt` and require the configured JWS/JWE processing before the same `sub` comparison.
- Scope was listed as a possible explanation for two returned instances of a claim having different values. The wording now distinguishes value differences from scope and release policy affecting whether a claim appears.
- The API access-token sentence presented issuer, audience, lifetime, and scope checks as universal token fields. It now requires validation against the API's token contract and marks those checks as applicable to the relevant token format before authorization policy is enforced.

## Review Notes
The JavaScript and JSON examples parsed successfully, and all external links resolved to the intended resources. The Fetch example assumes a Fetch-capable server runtime; Node.js exposes global `fetch` without a flag from Node 18 and marks it stable from Node 21. OIDC Core has a narrow, explicitly registered code-flow allowance for `alg: none` and permits TLS validation in place of signature checking for an ID token received directly from the token endpoint; the post's stricter signed-token validation policy is a valid security policy. The focused request example does not include production-specific timeout or response-size controls.
