# Validation Summary: How to Implement OAuth2 Server in Go with fosite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OAuth 2.0
- ORY fosite
- PKCE
- Token introspection
- PostgreSQL
- HTTP middleware

## Sources Consulted
- ORY fosite GitHub repository: https://github.com/ory/fosite
- ORY fosite package documentation: https://pkg.go.dev/github.com/ory/fosite
- ORY fosite compose package documentation: https://pkg.go.dev/github.com/ory/fosite/compose
- ORY fosite OAuth2 storage interface source: https://github.com/ory/fosite/blob/master/handler/oauth2/storage.go
- ORY fosite PKCE storage interface source: https://github.com/ory/fosite/blob/master/handler/pkce/storage.go
- ORY fosite reference memory storage: https://github.com/ory/fosite/blob/master/storage/memory.go
- RFC 6749, The OAuth 2.0 Authorization Framework: https://www.rfc-editor.org/rfc/rfc6749
- RFC 7636, Proof Key for Code Exchange by OAuth Public Clients: https://www.rfc-editor.org/rfc/rfc7636
- RFC 7662, OAuth 2.0 Token Introspection: https://www.rfc-editor.org/rfc/rfc7662
- Go net/url package documentation: https://pkg.go.dev/net/url
- lib/pq package documentation: https://pkg.go.dev/github.com/lib/pq

## Issues Found
- The configuration snippet imported unused fosite compose and JWT packages and generated an RSA key that was not used by the HMAC-based provider. Removed the unused imports and RSA key field/generation so the snippet matches the provider strategy shown later.
- The custom client implementation returned plain `[]string` values where fosite expects `fosite.Arguments`. Added explicit conversions for grant types, response types, scopes, and audience.
- The memory storage example used the outdated `CreateRefreshTokenSession(ctx, signature, request)` signature. Updated it to the current fosite signature with `accessSignature`.
- The memory storage example deleted authorization codes when invalidating them. Updated it to retain invalidated codes and return `fosite.ErrInvalidatedAuthorizeCode`, which fosite expects for replay detection.
- The memory storage example did not implement `RotateRefreshToken`, which is required by fosite's current refresh token storage interface. Added a rotation method that revokes related refresh and access tokens.
- The main provider composition used nonexistent or stale factory names from `handler/oauth2` and `handler/pkce`. Replaced them with the documented `compose.OAuth2...Factory` functions.
- The session example imported and stored JWT claims even though the provider uses opaque HMAC tokens and no OpenID Connect/JWT access-token strategy. Removed the unused JWT claims field and import.
- The PKCE authorization URL builder assembled query strings with `fmt.Sprintf` and `strings.Join`, which does not URL-escape redirect URIs, scopes, or state values. Replaced it with `net/url.Values`.
- The PostgreSQL example passed fosite argument slices directly into PostgreSQL `TEXT[]` columns. Updated the snippet to use `pq.Array` and clarified that the section is a partial PostgreSQL example, not a complete fosite storage implementation.

## Review Notes
The post is now technically aligned with the current fosite documentation and interfaces based on static review. The local environment does not have the Go toolchain installed, so I could not run `go test` against an extracted project.
