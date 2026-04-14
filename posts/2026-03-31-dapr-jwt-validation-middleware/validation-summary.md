# Validation Summary: How to Implement JWT Validation with Dapr Middleware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP Bearer Middleware (`middleware.http.bearer`)
- JWT (JSON Web Tokens)
- JWKS (JSON Web Key Sets)
- OpenID Connect discovery
- Google Identity Platform
- Microsoft Entra ID (Azure AD)
- Express.js (Node.js)
- Kubernetes (Deployment annotations)

## Sources Consulted
- Dapr official documentation for bearer middleware component (docs.dapr.io)
- Dapr source code: `middleware/http/bearer/bearer_middleware.go` and `metadata.go` — confirms the middleware validates tokens but does NOT forward claims as headers
- Google OpenID Connect discovery endpoint: `https://accounts.google.com/.well-known/openid-configuration`
- Microsoft Entra ID v2.0 JWKS endpoint documentation

## Issues Found

### 1. MAJOR: Incorrect claim about Dapr forwarding JWT claims as headers
- **What was wrong:** The post stated that "your application can read claims from the forwarded headers" and showed code reading `x-jwt-claim-sub`, `x-jwt-claim-email`, and `x-jwt-claim-scope` headers. Dapr's bearer middleware does NOT forward JWT claims as headers. It only validates the token and passes or rejects the request. The original request (including the `Authorization` header) is forwarded unchanged.
- **What was changed:** Updated the section text and JavaScript code to decode claims directly from the JWT payload in the `Authorization` header using base64url decoding. Since Dapr has already validated the token, the application can safely decode without re-verifying the signature.
- **Why:** The Dapr bearer middleware source code confirms that after successful validation, `next.ServeHTTP(w, r)` is called with the unmodified request — no headers are injected.

### 2. MINOR: Summary section repeated the incorrect claim
- **What was wrong:** The summary stated apps "can read validated claims from forwarded headers."
- **What was changed:** Updated to "can decode validated claims directly from the JWT in the `Authorization` header."

## Review Notes
- The `jwksURL` for Google is set to the OpenID Connect discovery endpoint (`https://accounts.google.com/.well-known/openid-configuration`) rather than the actual JWKS URI (`https://www.googleapis.com/oauth2/v3/certs`). Dapr handles this correctly by extracting the `jwks_uri` from the discovery document, so it works. However, since `jwksURL` is optional and Dapr can auto-discover it from the `issuer` field, the `jwksURL` field could be omitted entirely for OpenID Connect providers.
- The metadata field names (`issuer`, `audience`, `jwksURL`) are all correct. Note that `issuerURL` and `clientID` are accepted aliases for `issuer` and `audience` respectively.
- The component type, version, Configuration YAML structure, and Kubernetes annotations are all correct.
- The Express.js code is syntactically correct and would work as shown after the fix.
