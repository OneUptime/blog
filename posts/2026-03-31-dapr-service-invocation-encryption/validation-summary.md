# Validation Summary: How to Use Dapr Service Invocation with mTLS Encryption

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Mutual TLS (mTLS)
- Kubernetes
- X.509 Certificates / SPIFFE
- OpenSSL
- dapr-sentry (Dapr certificate authority)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr source code (pkg/security/spiffe/spiffe.go) for SPIFFE ID format verification

## Issues Found

1. **Incorrect SPIFFE ID format**: The post claimed the SPIFFE ID format was `spiffe://cluster.local/ns/{namespace}/dapr-id/{app-id}`. The correct format per Dapr source code is `spiffe://cluster.local/ns/{namespace}/{app-id}` (no `dapr-id/` path segment). Fixed by removing the `dapr-id/` segment.

2. **Incorrect secret key name for custom root certificate**: The `dapr-trust-bundle` Kubernetes secret expects the root certificate under the key `ca.crt`, not `root.crt`. Changed `--from-file=root.crt=root.crt` to `--from-file=ca.crt=root.crt`.

3. **Undocumented certificate file path for monitoring**: The post used `kubectl exec` to read `/var/run/secrets/dapr.io/tls/tls.crt` from the daprd container. This path is not documented in Dapr's official docs and may not exist. Replaced with a command that reads the issuer certificate from the `dapr-trust-bundle` Kubernetes secret, which is the documented and reliable approach.

4. **Invalid `dapr init --enable-mtls` command for self-hosted mode**: The `--enable-mtls` flag on `dapr init` is not a valid command for enabling mTLS in self-hosted mode. The actual procedure requires running the Sentry service manually and launching daprd with `--enable-mtls` and `--sentry-address` flags pointing to the local Sentry instance. Replaced with the correct multi-step procedure.

## Review Notes
- The `kubectl get configuration` command on line 21 uses the singular resource name. While Kubernetes often accepts both singular and plural, the official Dapr docs use `configurations` (plural). This is minor and works correctly either way, so it was left as-is.
- The OpenSSL command for generating the root CA uses RSA 4096-bit keys. The official Dapr docs demonstrate ECDSA (prime256v1) keys. RSA keys will work but diverge from the documented procedure. Left as-is since it is technically valid.
- The post's summary mentions monitoring "certificate expiry and rotation through sidecar logs and Kubernetes secret TTLs" which is reasonable general guidance.
