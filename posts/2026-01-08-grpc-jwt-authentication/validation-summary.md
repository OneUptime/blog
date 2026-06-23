# Validation Summary: How to Implement JWT Authentication in gRPC

## Status
validated

## Post Type
Tutorial / Guide (multi-language implementation walkthrough)

## Technologies Covered
- gRPC (Go, Python, Node.js)
- JWT (JSON Web Tokens)
- golang-jwt/jwt v5 (Go)
- PyJWT (Python)
- jsonwebtoken (Node.js)
- google.golang.org/grpc interceptors and per-RPC credentials
- go-redis v8 (token blacklist)
- RSA / HMAC signing (RS256 / HS256)

## Sources Consulted
- golang-jwt/jwt v5 documentation — https://pkg.go.dev/github.com/golang-jwt/jwt/v5 (RegisteredClaims, NewNumericDate, ParseWithClaims, SigningMethodHMAC/RSA, NewWithClaims)
- gRPC-Go API reference — https://pkg.go.dev/google.golang.org/grpc (UnaryServerInterceptor, StreamServerInterceptor, ChainUnaryInterceptor, PerRPCCredentials, metadata)
- Go language spec — unused/missing import rules
- PyJWT documentation — https://pyjwt.readthedocs.io/ (encode/decode, ExpiredSignatureError, InvalidTokenError)
- grpc Python API — https://grpc.github.io/grpc/python/ (ServerInterceptor, AuthMetadataPlugin, metadata_call_credentials)
- jsonwebtoken (node) — https://github.com/auth0/node-jsonwebtoken (sign/verify, expiresIn, issuer)
- @grpc/grpc-js — https://www.npmjs.com/package/@grpc/grpc-js

## Issues Found
1. **Go "Go JWT Utilities" block — broken imports (compile error).** The import block declared `crypto/rsa` (never used in the file) and omitted `fmt`, which is used by `generateTokenID()` via `fmt.Sprintf`. Go treats both an unused import and an undefined identifier as compile errors. Replaced `"crypto/rsa"` with `"fmt"` so the file compiles.

2. **Go client block — unused imports (compile error).** `google.golang.org/grpc/credentials` and `google.golang.org/grpc/credentials/oauth` were imported but never referenced. Removed both unused imports.

3. **Redis blacklist block — missing imports (compile error).** `ValidateTokenWithBlacklist` uses `fmt.Errorf` and `errors.New`, but the import block only listed `context`, `time`, and the redis package. Added `"errors"` and `"fmt"`.

4. **Secure configuration block — missing import (compile error).** `Validate()` uses `errors.New` twice but the file only imported `time`. Added `"errors"`.

5. **Python `serve()` — missing import (NameError).** `serve()` calls `futures.ThreadPoolExecutor(...)` but `futures` was never imported. Added `from concurrent import futures` (the standard idiom shown in the official gRPC Python examples).

## Review Notes
- The golang-jwt v5 usage (RegisteredClaims, NewNumericDate, ParseWithClaims with a keyfunc that asserts the signing method, RS256/HS256) is correct and matches the current v5 API. The signing-method type assertions (`*jwt.SigningMethodHMAC`, `*jwt.SigningMethodRSA`) are the recommended way to prevent algorithm-confusion attacks.
- **Deprecation (not changed — still functional):** the Go client/server examples use `grpc.Dial` + `grpc.WithInsecure()`. As of recent grpc-go releases these are deprecated in favor of `grpc.NewClient` and `grpc.WithTransportCredentials(insecure.NewCredentials())`. They still compile and work, and remain extremely common in tutorials, so they were left intact.
- **Deprecation (not changed):** `io/ioutil.ReadFile` (RSA manager) is deprecated since Go 1.16 in favor of `os.ReadFile`, but still works.
- **Deprecation (not changed):** Python `datetime.utcnow()` is deprecated in Python 3.12+ (prefer `datetime.now(timezone.utc)`), but still functions and PyJWT handles the naive datetime correctly for `exp`/`iat`.
- The Node.js `createAuthInterceptor` uses a simplified/illustrative server-interceptor signature; `@grpc/grpc-js` server-side interceptor support is more limited than the snippet implies (server interceptors landed later than client interceptors and have a different shape). The code communicates the concept clearly but would need adaptation against the real grpc-js server-interceptor API in production. Left as-is since it is illustrative and rewriting it would restructure the section.
- Security guidance (short-lived access tokens, refresh tokens, TLS, validate all claims, revocation, rate limiting, no tokens in URLs) is accurate and aligns with OWASP/JWT best-practice recommendations.
- The RSA manager parses the private key with `x509.ParsePKCS1PrivateKey` (PKCS#1 / "RSA PRIVATE KEY" PEM) and the public key with `ParsePKIXPublicKey` (SPKI / "PUBLIC KEY" PEM) — these are consistent with standard key generation, though PKCS#8 private keys would require `ParsePKCS8PrivateKey` instead. Worth a caveat for readers, but not an error.
