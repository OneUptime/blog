# Validation Summary: How to Add mTLS (Mutual TLS) to gRPC Services

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough with code in Go, Python, Node.js, plus shell, YAML, and Kubernetes config)

## Technologies Covered
- gRPC (Go `google.golang.org/grpc`, Python `grpcio`, Node.js `@grpc/grpc-js`)
- Mutual TLS (mTLS) / TLS 1.2+
- OpenSSL certificate generation (CA, server, client certs, CSRs, x509 extensions)
- Go `crypto/tls` and `crypto/x509` (including `RevocationList` / CRL parsing)
- Certificate rotation and CRL-based revocation
- Kubernetes Secrets, Deployments, and cert-manager `Certificate` CRD
- grpcurl for testing

## Sources Consulted
- gRPC Authentication guide — https://grpc.io/docs/guides/auth/
- Go `crypto/tls` package docs (Config, ClientAuth, RequireAndVerifyClientCert, GetConfigForClient) — https://pkg.go.dev/crypto/tls
- Go `crypto/x509` package docs (`ParseRevocationList`, `RevocationList.RevokedCertificateEntries`, added in Go 1.21) — https://pkg.go.dev/crypto/x509
- gRPC-Go credentials package (`credentials.NewTLS`, `credentials.TLSInfo`, `peer.FromContext`) — https://pkg.go.dev/google.golang.org/grpc/credentials
- Python gRPC API (`ssl_server_credentials`, `ssl_channel_credentials`, `ServicerContext.auth_context`) — https://grpc.github.io/grpc/python/grpc.html
- @grpc/grpc-js `getAuthContext` proposal (gRFC L35) and `AuthContext` source — https://github.com/grpc/grpc-node, https://raw.githubusercontent.com/grpc/grpc-node/master/packages/grpc-js/src/auth-context.ts
- grpc-node issue #2730 (exposing peer client certificate in server calls) — https://github.com/grpc/grpc-node/issues/2730
- cert-manager Certificate resource docs — https://cert-manager.io/docs/usage/certificate/

## Issues Found
1. **Go server snippet — missing imports (would not compile).** The first Go server example used `context.Context`, `status.Error`, `codes.Unauthenticated`, and `codes.PermissionDenied`, but the import block omitted `context`, `google.golang.org/grpc/codes`, and `google.golang.org/grpc/status`. Added the three missing imports so the example compiles.

2. **Go CRL checker — missing `log` import (would not compile).** `refreshCRLs` calls `log.Printf`, but the `CRLChecker` file's import block did not include `log`. Added `"log"` to the import block.

3. **Node.js server — wrong auth-context API shape.** The example read the client common name via `authContext['x509_common_name']`, which is the C-core (`grpc`) auth-context key convention, not `@grpc/grpc-js`. In grpc-js, `call.getAuthContext()` returns an `AuthContext` object with `transportSecurityType` and `sslPeerCertificate` (a Node TLS `PeerCertificate`). Replaced the lookup with `authContext.sslPeerCertificate.subject.CN`, which is the correct way to read the client CN in grpc-js.

## Review Notes
- `call.getAuthContext()` in `@grpc/grpc-js` was added in v1.14.0 (gRFC L35). Readers on older grpc-js releases will not have this method; for those versions client-certificate identity is not readily exposed on the server call object. Worth a version note but not a correctness error.
- The TLS handshake sequence diagram is a simplified depiction. In a real TLS 1.2 handshake the server sends `CertificateRequest` as part of the same flight as its `Certificate`/`ServerHelloDone` (before the client responds), rather than after the client has verified the server cert as the diagram's ordering implies. Pedagogically acceptable; left as-is.
- The Go examples use `grpc.Dial` / `grpc.WithTransportCredentials`, which still work but are deprecated in newer gRPC-Go in favor of `grpc.NewClient`. Not changed since the post does not pin a version and `Dial` remains functional.
- `io/ioutil` is deprecated (Go 1.16+) in favor of `os`/`io`, but the functions still work and compile; left as-is to avoid stylistic churn.
- The cert-generation script relies on the system OpenSSL default config applying `v3_ca` (CA:TRUE) to the self-signed CA created via `openssl req -x509`. This is the standard behavior on common distributions; acceptable for a tutorial.
- Python `ssl_server_credentials(..., require_client_auth=True)` and `ssl_channel_credentials(...)`, plus `context.auth_context()['x509_common_name']`, are correct for the C-core Python `grpcio` package and were left unchanged.
