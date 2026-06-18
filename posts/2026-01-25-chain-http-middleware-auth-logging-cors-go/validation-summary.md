# Validation Summary: How to Chain HTTP Middleware for Auth, Logging, and CORS in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go `net/http`
- HTTP middleware
- CORS
- JWT authentication
- Request logging
- Go request contexts

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `context` package documentation: https://pkg.go.dev/context
- `github.com/golang-jwt/jwt/v5` package documentation: https://pkg.go.dev/github.com/golang-jwt/jwt/v5
- MDN `Access-Control-Allow-Origin` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- MDN `Access-Control-Allow-Credentials` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
- RFC 7519, JSON Web Token (JWT): https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The CORS middleware used `fmt.Sprintf` but only imported `net/http`, so the snippet would not compile as written. Added `fmt` to the import block.
- The CORS middleware reflects the request `Origin` value when it is allowed. Added `Vary: Origin`, matching HTTP caching guidance for responses whose `Access-Control-Allow-Origin` value varies by request origin.
- The JWT validator accepted any HMAC signing method class and did not use the current `golang-jwt/jwt/v5` parser option for allowed methods. Updated it to use `jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()})`.
- The JWT validator used direct type assertions for `sub`, `email`, and `role`, which could panic if a claim was absent or had an unexpected type. Replaced them with checked assertions that return errors.

## Review Notes
Local compilation could not be performed because `go` is not installed on PATH in this environment. The examples were reviewed against official Go package documentation, MDN CORS references, RFC 7519, and the current `golang-jwt/jwt/v5` API documentation.
