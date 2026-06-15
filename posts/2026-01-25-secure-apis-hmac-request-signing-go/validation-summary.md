# Validation Summary: How to Secure APIs with HMAC Request Signing in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- HMAC-SHA256
- Go `crypto/hmac`
- Go `crypto/sha256`
- Go `crypto/rand`
- Go `net/http`
- HTTP request signing
- Replay attack prevention with timestamps and nonces

## Sources Consulted
- Go `crypto/hmac` package documentation: https://pkg.go.dev/crypto/hmac
- Go `crypto/sha256` package documentation: https://pkg.go.dev/crypto/sha256
- Go `crypto/rand` package documentation: https://pkg.go.dev/crypto/rand
- Go `net/url` package documentation for `URL.RequestURI`: https://pkg.go.dev/net/url
- RFC 2104, HMAC: Keyed-Hashing for Message Authentication: https://datatracker.ietf.org/doc/html/rfc2104
- NIST policy on hash functions: https://csrc.nist.gov/projects/hash-functions/nist-policy-on-hash-functions

## Issues Found
- The original canonical string signed only `req.URL.Path` / `r.URL.Path`. That excluded the query string, so query parameters could be modified without invalidating the signature. Updated the signing component description and all canonical-string examples to use the encoded path and query string via `URL.RequestURI()`, which Go documents as returning the encoded `path?query` form used in HTTP requests.
- The comparison table described HMAC-signed requests as "tamper-proof." HMAC makes tampering detectable during verification, but it does not make requests impossible to alter in transit. Changed the wording to "tamper-evident."

## Review Notes
- The Go snippets use current standard-library APIs and align with official documentation for `hmac.New`, `hmac.Equal`, `sha256.New`, `rand.Read`, and HTTP request handling.
- Local compile verification could not be completed because the `go` binary is not installed in this workspace.
