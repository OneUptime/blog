# Validation Summary: Optimize Calico etcd Certificate Generation

## Status
validated

## Post Type
Tutorial / Optimization Guide

## Technologies Covered
- Calico (Kubernetes networking)
- etcd
- TLS / x509 certificates
- OpenSSL (ecparam, req, s_client)
- ECDSA (P-256, P-384) vs RSA
- cert-manager (cert-manager.io/v1 Certificate)
- kubectl / netstat

## Sources Consulted
- etcd configuration reference (https://etcd.io/docs/v3.5/op-guide/configuration/) for `--tls-min-version`, `--cipher-suites`, `--auto-tls` flags
- OpenSSL man pages (ecparam, req, s_client) for command syntax
- cert-manager Certificate spec (https://cert-manager.io/docs/usage/certificate/) for `duration` and `renewBefore` fields
- RFC 8446 (TLS 1.3) for built-in PSK session resumption and AEAD cipher suite names (TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384)
- NIST SP 800-57 for ECDSA/RSA key-size security equivalence
- Project Calico documentation for etcd datastore TLS configuration

## Issues Found
- **etcd `--tls-min-version` value was incorrect.** The original command used `--tls-min-version=VersionTLS12`, which is Go's internal constant name and not a value accepted by etcd's CLI. etcd accepts `TLS1.2` or `TLS1.3` as values for this flag. Updated to `--tls-min-version=TLS1.2`, which matches the surrounding intent (allow TLS 1.3 while requiring at least TLS 1.2).

## Review Notes
- The claim that ECDSA P-256 provides "equivalent security to RSA-2048" is a common simplification. Per NIST SP 800-57, P-256 actually maps to ~128-bit security (closer to RSA-3072), while RSA-2048 maps to ~112-bit. The post's phrasing is not technically wrong (P-256 is at least equivalent), and the practical recommendation is sound, so no change was made.
- The Optimization 3 example sets `--tls-min-version=TLS1.2` while the comment says "Ensure TLS 1.3 is enabled." This is consistent: setting the minimum to TLS 1.2 allows clients to negotiate TLS 1.3 (which Go/etcd will prefer when both peers support it). If the author wanted to *require* TLS 1.3, they would set `TLS1.3`.
- The `netstat` command in Optimization 5 assumes `netstat` is installed in the `calico-node` container image, which may not be the case on minimal images. `ss` or checking `/proc/net/tcp` may be more reliable in some environments, but the example is still illustrative.
- The cipher suite list in Optimization 3 includes only TLS 1.3 suites. If clients are pinned to TLS 1.2, additional TLS 1.2 suites would need to be allowed. Worth noting if readers fully lock down the cipher list in production.
- All OpenSSL commands (`ecparam -name prime256v1 -genkey -noout`, `req -new -key ... -subj ...`, `s_client -connect -cert -key -CAfile -verify_return_error`) are syntactically valid against modern OpenSSL (1.1.1+/3.x).
- cert-manager fields `duration` and `renewBefore` accept Go-style durations; `720h` and `168h` are valid.
