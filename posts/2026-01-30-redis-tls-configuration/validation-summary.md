# Validation Summary: How to Build Redis TLS Configuration Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server configuration, redis.conf TLS directives, redis-cli)
- OpenSSL (CA, server, and client certificate generation; signing; verification)
- TLS 1.2 and TLS 1.3 (protocols, cipher suites, mTLS)
- redis-py (Python Redis client)
- ioredis (Node.js Redis client)
- go-redis v9 (Go Redis client)
- Bash scripting (certificate generation, automated rotation, verification)
- Python (certificate expiry monitoring with the `ssl` and `smtplib` modules)

## Sources Consulted
- [Redis TLS support documentation](https://redis.io/docs/management/security/encryption/)
- [redis-py SSL Connection Examples](https://redis.readthedocs.io/en/stable/examples/ssl_connection_examples.html)
- [redis-py source on GitHub](https://github.com/redis/redis-py)
- [ioredis README on GitHub](https://github.com/redis/ioredis)
- [go-redis v9 documentation on pkg.go.dev](https://pkg.go.dev/github.com/redis/go-redis/v9)
- OpenSSL `req`, `x509`, `genrsa`, `verify`, and `s_client` man pages
- Mozilla SSL Configuration Generator (cipher suite recommendations)
- NIST SP 800-52 Rev. 2 (TLS guidelines)

## Issues Found

1. **Python redis-py used an unsupported `ssl_context` parameter.** The original example constructed an `ssl.SSLContext` and passed it to `redis.Redis(..., ssl_context=ssl_context, ...)`. The `redis.Redis` constructor does not accept an `ssl_context` argument; instead it accepts individual SSL parameters (`ssl_ca_certs`, `ssl_certfile`, `ssl_keyfile`, `ssl_cert_reqs`, `ssl_check_hostname`, `ssl_min_version`). Replaced the SSL context construction with the official redis-py parameter set so the example matches the documented API and will actually work as written. Kept `import ssl` so the `ssl.TLSVersion.TLSv1_2` constant remains available.

## Review Notes
- The Redis configuration directives (`tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`, `tls-auth-clients`, `tls-protocols`, `tls-prefer-server-ciphers`, `tls-ciphers`, `tls-ciphersuites`, `tls-replication`, `tls-cluster`, `tls-session-caching`, `tls-session-cache-size`, `tls-session-cache-timeout`) are all valid and correctly described.
- The OpenSSL commands (CA, server certificate, client certificate, signing, verification, `s_client` checks) are correct and follow standard practice. Using `-CAcreateserial` is fine for a small private CA but a long-running production CA would normally use a persisted serial file (`-CAserial`); leaving as-is since the post is illustrative.
- The TLS 1.2 cipher list (`ECDHE-ECDSA-AES256-GCM-SHA384`, etc.) and the TLS 1.3 ciphersuites (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, `TLS_AES_128_GCM_SHA256`) are accurate OpenSSL/IANA names and align with current Mozilla/NIST guidance.
- The ioredis example correctly passes a `tls` options object containing Node.js `tls.connect()` properties (`ca`, `cert`, `key`, `rejectUnauthorized`, `servername`, `minVersion`).
- The go-redis v9 example uses the correct import path `github.com/redis/go-redis/v9` and `redis.Options.TLSConfig`.
- The Python certificate-expiry monitor parses `notAfter` with `strptime('%b %d %H:%M:%S %Y %Z')`; Python accepts `GMT` for `%Z`, so this works, but readers should be aware that comparing the result against a naive `datetime.now()` assumes UTC clock skew is small. Not corrected — it is a minor caveat rather than a bug.
- The rotation script uses `redis-cli CONFIG SET tls-cert-file` and `tls-key-file` to reload certs at runtime, which is the supported Redis approach.
