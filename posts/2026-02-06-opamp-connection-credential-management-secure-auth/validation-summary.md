# Validation Summary: How to Configure OpAMP Connection Credential Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry OpAMP
- OpenTelemetry OpAMP Supervisor
- opamp-go server library
- Go crypto/tls and crypto/x509
- OpenTelemetry Collector TLS configuration
- OpenSSL certificate generation
- Bash certificate-renewal scripting
- WebSocket Secure (WSS)

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry Collector Management documentation: https://opentelemetry.io/docs/collector/management/
- opamp-go server package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server
- opamp-go server/types package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/server/types
- OpenTelemetry Collector supervisor config package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor/supervisor/config
- OpenTelemetry Collector configtls package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- Go crypto/x509 package documentation: https://pkg.go.dev/crypto/x509
- OpenSSL req manual: https://docs.openssl.org/master/man1/openssl-req/
- OpenSSL x509 manual: https://docs.openssl.org/master/man1/openssl-x509/
- Bash manual, process substitution: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html

## Issues Found
- The OpAMP server example used the older `server.CallbacksStruct`/`OnConnectingFunc` helper style. Current `opamp-go` exposes callbacks through `types.Callbacks` with an `OnConnecting` function field, so the example was updated to use the current API.
- Accepted `opamp-go` connections returned `types.ConnectionResponse{Accept: true}` without `ConnectionCallbacks`. The current `server/types` documentation states that `ConnectionCallbacks` must be set when accepting a connection, so the example now initializes default callbacks and includes them in accepted responses.
- Rejected `opamp-go` connections returned `Accept: false` without an HTTP status code. The current `server/types` documentation requires a non-zero `HTTPStatusCode` for rejected connections, so the examples now return `http.StatusUnauthorized` for authentication failures.
- The supervisor YAML placed `storage_dir` under `agent`. The official supervisor config defines storage as a top-level `storage.directory` field, so the snippet was corrected.

## Review Notes
- The OpenSSL commands are syntactically valid for Bash because the server certificate command uses process substitution. Users running these commands in shells that do not support process substitution should use a temporary extension file instead.
- The OpAMP connection-settings rotation claim is consistent with the OpAMP specification, which describes server-offered OpAMP connection settings for authorization headers, TLS certificates, revocation, and rotation. Actual implementation details remain server- and client-specific.
- The Go examples remain illustrative snippets: imports, `stdLogger`, `isAllowedOU`, and `tokenStore` are intentionally omitted and must be provided by the application.
