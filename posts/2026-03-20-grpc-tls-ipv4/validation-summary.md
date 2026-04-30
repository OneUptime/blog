# Validation Summary: How to Secure gRPC Connections with TLS over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- TLS
- IPv4
- Python
- Go
- OpenSSL
- X.509 certificates

## Sources Consulted
- gRPC Python API reference: https://grpc.github.io/grpc/python/grpc.html
- gRPC authentication guide: https://grpc.io/docs/guides/auth/
- grpc-go package docs: https://pkg.go.dev/google.golang.org/grpc
- grpc-go credentials docs: https://pkg.go.dev/google.golang.org/grpc/credentials
- Go `crypto/tls` docs: https://pkg.go.dev/crypto/tls
- Go `crypto/x509` docs: https://pkg.go.dev/crypto/x509
- OpenSSL `req` docs: https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL `x509` docs: https://docs.openssl.org/3.3/man1/openssl-x509/
- RFC 6125 service identity verification: https://datatracker.ietf.org/doc/html/rfc6125

## Issues Found
- The OpenSSL commands used `-nodes`, which is deprecated in current OpenSSL `req`. I replaced it with `-noenc`.
- The server certificate was generated with only `CN=grpc-server`, but the clients connect to `192.168.1.10`. Modern TLS identity verification for IP-based connections requires an `iPAddress` entry in `subjectAltName`, so I added `subjectAltName = IP:192.168.1.10` and `-copy_extensions copy` to preserve the CSR extension in the signed certificate.
- The certificate examples did not constrain server and client certificate purpose. I added `extendedKeyUsage = serverAuth` to the server CSR and `extendedKeyUsage = clientAuth` to the client CSR, then copied those extensions into the signed certificates.
- The Go client example ignored errors from `os.ReadFile` and `AppendCertsFromPEM`, which could hide certificate-loading failures. I updated the snippet to return those errors properly.
- The conclusion conflated the Python server and client TLS APIs and omitted the IPv4 SAN requirement. I corrected it to use `grpc.ssl_server_credentials` for the Python server, `grpc.ssl_channel_credentials` for the Python client, and to state that the certificate must include the IPv4 address in `subjectAltName`.

## Review Notes
- The certificate commands were validated against current OpenSSL 3.x behavior. Older OpenSSL 1.1.1 environments commonly used `-nodes`, so readers on older systems may need to adapt the command syntax.
- The Go example uses `grpc.NewClient`, which is the current grpc-go API. Older codebases may still use `grpc.Dial`, but the current docs mark `grpc.Dial` as deprecated.
- The post mentions certificate rotation operationally but does not include a runnable rotation example. The updated description now reflects that more precisely.
