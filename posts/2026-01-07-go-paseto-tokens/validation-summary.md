# Validation Summary: How to Use PASETO Instead of JWT in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- PASETO
- aidanwoods.dev/go-paseto
- github.com/o1egl/paseto
- github.com/golang-jwt/jwt/v5
- Ed25519
- XChaCha20 and BLAKE2b
- HTTP middleware

## Sources Consulted
- PASETO official site: https://paseto.io/
- PASETO v4 protocol specification: https://github.com/paseto-standard/paseto-spec/blob/master/docs/01-Protocol-Versions/Version4.md
- go-paseto package documentation: https://pkg.go.dev/aidanwoods.dev/go-paseto
- o1egl/paseto package documentation: https://pkg.go.dev/github.com/o1egl/paseto
- golang-jwt/jwt package documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- Go standard library crypto/ed25519 documentation: https://pkg.go.dev/crypto/ed25519

## Issues Found
- The setup command used `go get github.com/o1egl/paseto/v2`, but the code imports `github.com/o1egl/paseto` and the documented module path is `github.com/o1egl/paseto`. Updated the command to match the library documentation and examples.
- The setup command installed `golang.org/x/crypto/ed25519`, but the examples use Go's standard-library `crypto/ed25519` package. Removed the unnecessary dependency command.
- The v4 primitive summary described local tokens as `XChaCha20-Poly1305 with BLAKE2b` and public tokens as `Ed25519 with improved key derivation`. The v4 spec uses XChaCha20 with BLAKE2b authentication for local tokens and Ed25519 signatures for public tokens. Updated the wording accordingly.
- The key-rotation example attempted to pass the key ID as the `V4Encrypt` implicit assertion instead of setting it as a footer, then parsed the token with a nil implicit assertion. Updated the example to use `token.SetFooter([]byte(kid))`, encrypt with nil implicit data, extract the footer with `UnsafeParseFooter(paseto.V4Local, tokenString)`, and select the matching key by key ID.
- The key-rotation validation path requested the current key ID after the current-key parse failed, which meant it retried the current key instead of the previous key. Updated validation to use the footer key ID for current or previous key lookup.
- The middleware section claimed to cover the standard library and popular frameworks, but the code only uses `net/http`. Updated the sentence to say it covers the standard library.
- The migration example imports `github.com/golang-jwt/jwt/v5`, but the dependency was not listed. Added the `go get github.com/golang-jwt/jwt/v5` command before the migration code.
- The migration example imported `crypto/ed25519` and `crypto/rand` without using them. Removed those imports from the snippet.

## Review Notes
The local environment did not have the `go` binary installed, so examples could not be compiled in this workspace. API checks were performed against official package documentation and the PASETO v4 specification.
