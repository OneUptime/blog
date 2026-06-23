# Validation Summary: How to Secure Go APIs Against OWASP Top 10

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Go
- Gin
- OWASP Top 10 2025
- Argon2id password hashing
- database/sql and PostgreSQL parameterized queries
- go-playground/validator
- rs/cors
- golang-jwt/jwt/v5
- golang.org/x/time/rate
- Zap structured logging
- HTTP security headers
- SSRF prevention

## Sources Consulted
- OWASP Top 10 2025: https://owasp.org/Top10/2025/
- OWASP Top 10 2025 Introduction: https://owasp.org/Top10/2025/0x00_2025-Introduction/
- OWASP A01:2025 Broken Access Control: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
- OWASP A10:2025 Mishandling of Exceptional Conditions: https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- Go release policy: https://go.dev/doc/devel/release
- Go security best practices: https://go.dev/doc/security/best-practices
- net/http MaxBytesReader documentation: https://pkg.go.dev/net/http#MaxBytesReader
- database/sql documentation: https://pkg.go.dev/database/sql
- os/exec documentation: https://pkg.go.dev/os/exec
- golang.org/x/crypto/argon2 documentation: https://pkg.go.dev/golang.org/x/crypto/argon2
- github.com/gin-gonic/gin documentation: https://pkg.go.dev/github.com/gin-gonic/gin
- github.com/go-playground/validator/v10 documentation: https://pkg.go.dev/github.com/go-playground/validator/v10
- github.com/rs/cors documentation: https://pkg.go.dev/github.com/rs/cors
- github.com/golang-jwt/jwt/v5 documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- golang.org/x/time/rate documentation: https://pkg.go.dev/golang.org/x/time/rate
- go.uber.org/zap documentation: https://pkg.go.dev/go.uber.org/zap
- MDN X-XSS-Protection reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The setup snippet used Go 1.22 and older dependency versions in a security-focused article. Updated the Go directive to 1.26 and refreshed the listed module versions where official package metadata showed newer current releases.
- The OWASP Top 10 overview and section headings used the 2021 category labels even though OWASP Top 10:2025 is the current release. Updated the list and category headings to the 2025 taxonomy, including noting SSRF under A01:2025 rather than A10:2021.
- The RBAC middleware imported `strings` without using it and used an unchecked type assertion on `userRole`. Removed the unused import and added a safe type assertion with an authentication-context error.
- The object-level authorization snippet referenced an undefined `Order` type and ignored a missing authenticated user ID. Added a minimal `Order` type and explicit authentication-context check.
- The Argon2id verification code parsed the encoded version but did not check it. Added a check against `argon2.Version` so incompatible hashes are rejected.
- The repository snippet used `fmt.Sprintf` and `SearchFilters` without declaring the import/type, and did not check `rows.Err()` after iteration. Added the import, a minimal `SearchFilters` type, and the final row iteration error check.
- The input sanitization middleware attempted to mutate query parameters through repeated `URL.Query()` calls, which return copies rather than updating `RawQuery`. Reworked it to mutate one `url.Values` value and assign `RawQuery = query.Encode()`.
- The input sanitizer imported unused `bytes` and `io`. Removed those unused imports.
- The security headers snippet enabled `X-XSS-Protection: 1; mode=block`, but OWASP and MDN document this header as deprecated and potentially risky. Changed it to `X-XSS-Protection: 0` and clarified that CSP should be used instead.
- The JWT access-token validation accepted any HMAC signing method and did not validate issuer or audience. Restricted validation to HS256 with `WithValidMethods`, added exact signing-method checking, and validated issuer/audience with jwt/v5 parser options.
- The JWT `Audience` configuration was a slice even though the validation example only needed one audience. Changed it to a single string and encoded it as `jwt.ClaimStrings`.
- The SSRF helper described the returned HTTP client as preventing SSRF even though the initial request URL was not validated by the client itself. Updated the comment, added `SafeGet` to validate the initial URL before making a request, and expanded blocked IP ranges.
- The introduction said the article would implement every OWASP Top 10 category, but the examples focus on selected categories. Adjusted the sentence to say "key categories."
- The input sanitization section claimed to sanitize all input, but the middleware only handles query parameters and helper-level form values. Adjusted the wording to focus on sanitizing at parsing boundaries.

## Review Notes
The Go toolchain is not installed in this environment, so I could not run `go test`, `go vet`, `go doc`, or compile extracted snippets locally. API verification was performed against official package documentation and OWASP/MDN references. Some examples remain intentionally illustrative and still require project-specific pieces such as auth handlers, database initialization, TLS termination, refresh-token rotation storage, and production egress controls.
