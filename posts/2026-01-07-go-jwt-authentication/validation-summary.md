# Validation Summary: How to Handle JWT Authentication Securely in Go

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- JSON Web Tokens (JWT)
- github.com/golang-jwt/jwt/v5
- github.com/google/uuid
- golang.org/x/crypto/bcrypt
- github.com/redis/go-redis/v9
- net/http middleware and cookies
- Redis-backed token revocation

## Sources Consulted
- Go Packages documentation for github.com/golang-jwt/jwt/v5: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- RFC 7519, JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519
- OWASP OAuth2 Cheat Sheet, refresh token protection guidance: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
- Go Packages documentation for net/http cookies: https://pkg.go.dev/net/http
- Go Packages documentation for github.com/redis/go-redis/v9: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
- The custom-claims snippet imported `github.com/google/uuid` without using it. Removed the unused import so the standalone snippet is syntactically valid Go.
- The JWT service snippet imported `github.com/golang-jwt/jwt/v5` and `github.com/google/uuid` without using either package in that code block. Removed the unused imports.
- Refresh token replay detection called `s.tokenStore.RevokeAllUserTokens`, which revoked refresh tokens but did not increment the user token version, leaving existing access tokens valid. Changed it to call `s.RevokeAllUserTokens`, matching the post's version-based mass revocation design.
- The Redis user token set used for bulk revocation was populated with `SAdd` but never given an expiration, so the set could outlive all refresh tokens. Added `Expire` with the refresh-token TTL after adding a token ID.
- `RevokeRefreshToken` reused the original token expiration as a Redis TTL without guarding against non-positive durations. Added a `ttl <= 0` guard.
- The refresh handler ignored `ParseUnverified` errors and type assertions, which could panic on malformed input. Added error handling before reading claims.

## Review Notes
The JWT library APIs used in the post (`RegisteredClaims`, `ParseWithClaims`, `WithValidMethods`, `WithIssuer`, `WithAudience`, `WithExpirationRequired`, and `ParseUnverified`) are current in `github.com/golang-jwt/jwt/v5`. The cookie fields used (`HttpOnly`, `Secure`, `SameSite`, `Path`, and `MaxAge`) match `net/http`.

Local compilation was not possible because the `go` command is not installed in this environment. The remaining caveat is architectural rather than a direct code error: the refresh handler still reads the user ID from an unverified token before `RefreshTokens` validates the signature, although malformed-token panics are now handled and the token is validated before rotation succeeds.
