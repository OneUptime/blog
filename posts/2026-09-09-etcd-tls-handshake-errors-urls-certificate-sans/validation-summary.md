# Validation Summary: How to Fix etcd TLS Handshake Errors by Auditing URLs and SANs

## Status
validated

## Post Type
Technical troubleshooting guide with command examples.

## Technologies Covered
- etcd 3.6 and 3.7, etcdctl, and cluster membership
- TLS and mutual TLS, X.509 certificates, certificate authorities, and SANs
- OpenSSL s_client and x509
- DNS, IP addressing, load balancers, and health probes

## Sources Consulted
- etcd 3.6 configuration reference: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd 3.6 transport security: https://etcd.io/docs/v3.6/op-guide/security/
- etcd 3.7 transport security: https://etcd.io/docs/v3.7/op-guide/security/
- etcd 3.7 runtime reconfiguration: https://etcd.io/docs/v3.7/op-guide/runtime-configuration/
- Official etcdctl 3.6 command reference: https://raw.githubusercontent.com/etcd-io/etcd/release-3.6/etcdctl/README.md
- OpenSSL 3.0 s_client options: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL 3.0 x509 options: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL hostname and IP matching behavior: https://docs.openssl.org/3.0/man3/X509_check_host/
- Go certificate hostname verification: https://pkg.go.dev/crypto/x509#Certificate.VerifyHostname
- Go TLS record parsing implementation: https://go.dev/src/crypto/tls/conn.go

## Issues Found
1. The member update example omitted the endpoint, CA, client certificate, and key flags used earlier. Flags from a previous invocation do not persist. Added these flags so the example targets the authenticated HTTPS endpoint described in the guide without depending on unstated environment configuration.
2. The SAN validation instructions did not explain OpenSSL's Common Name fallback. Added a caveat requiring a matching DNS SAN even when the OpenSSL hostname check succeeds, because Go's server hostname verifier ignores the legacy Common Name.
3. The diagnosis attributed any protocol error before certificate presentation to socket, scheme, or proxy behavior. Narrowed this to the first-record error and acknowledged TLS version or cipher incompatibility as other possible early failures.

## Review Notes
- Confirmed the distinction between transport mismatch, trust-chain failure, hostname mismatch, and incoming peer identity checks.
- Checked listener and advertisement option names, default client/peer ports, metrics listener separation, and configuration-file precedence.
- Confirmed membership listing and update syntax, hexadecimal member identifiers, update-before-restart ordering, and the need to retain quorum during changes.
- Verified the OpenSSL inspection and verification flags against OpenSSL 3.0 documentation; other installed OpenSSL-compatible implementations may differ.
- The linked etcd 3.6 and 3.7 documentation pages resolve and describe the relevant behavior. No deprecated command in the examples was identified.
- IP URLs require IP SANs; incoming peer checks can additionally depend on source IP and DNS lookups. Certificate trust and application authorization remain separate checks.
- Commands contain illustrative hostnames and certificate paths. Administrative certificate credentials must have the required etcd authorization when authentication is enabled.
- Validated shell syntax without running network probes or membership mutations. No live etcd cluster or deployment certificates were supplied, so runtime behavior was not integration-tested.
- Confirmed the validation JSON parses and uses the requested status and date. The post's structure and style were preserved.
